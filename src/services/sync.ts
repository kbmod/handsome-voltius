import { invoke } from "@tauri-apps/api/core";
import i18n from "@/i18n";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useTeamStore } from "@/stores/teamStore";
import { handleMembershipChangedEvent } from "@/services/teamMembershipEvents";
import { appFetch } from "@/services/http";
import { SseDataLineParser } from "@/services/realtimeSseEvents";
import { connectNativeSse } from "@/services/nativeSseStream";
import { parseUsingEvent } from "@/services/presenceEvent";
import {
  getGistSyncState,
  onGistSyncStateChange,
  isConfigured as isGistConfigured,
  syncNow as gistSyncNow,
  push as gistPush,
} from "@/plugins/gist-sync/sync-engine";

export interface BlobPayload {
  files: Record<string, string>;
  secrets: Record<string, string>;
  /** Per-secret last-write timestamps; a key here but not in `secrets` is a deletion tombstone. */
  secret_clocks?: Record<string, string>;
}

/** Must mirror ENTITY_FILES in src-tauri/src/commands/sync.rs. */
export const ENTITY_FILES = [
  "connections.json",
  "identities.json",
  "ssh_keys.json",
  "folders.json",
  "snippets.json",
  "snippet_folders.json",
  "port_forwarding_rules.json",
  "known_hosts.json",
] as const;

export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline";

// ─── Sync state (module-level, not a store) ──────────────────────────────────

/**
 * Whether a Legacy Voltius Cloud realtime stream is currently attached. This is
 * only about the optional team/multiplayer stream — personal data sync no
 * longer goes through the paid service at all.
 */
let _cloudActive = false;
const _listeners = new Set<() => void>();

/**
 * App-wide sync state.
 *
 * Personal sync is encrypted GitHub Gist sync, so the status, timestamp,
 * error, and blob size all come from that engine. `cloudActive` remains a
 * separate signal for the optional team stream.
 */
export function getSyncState() {
  const gist = getGistSyncState();
  return {
    status: gist.status,
    lastSync: gist.lastSync,
    error: gist.error,
    cloudActive: _cloudActive,
    blobSizeBytes: gist.blobSizeBytes,
    configured: gist.configured,
  };
}

export function onSyncStateChange(fn: () => void): () => void {
  _listeners.add(fn);
  const offGist = onGistSyncStateChange(fn);
  return () => {
    _listeners.delete(fn);
    offGist();
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getJwt(): Promise<string | null> {
  return invoke<string | null>("keychain_get", { key: "jwt" });
}

export async function getServerUrl(): Promise<string | null> {
  return invoke<string | null>("keychain_get", { key: "server_url" });
}

/** Try to refresh the access token using the stored refresh_token. Returns new JWT or null. */
async function tryRefreshJwt(): Promise<string | null> {
  const [refreshToken, serverUrl] = await Promise.all([
    invoke<string | null>("keychain_get", { key: "refresh_token" }),
    getServerUrl(),
  ]);
  if (!refreshToken || !serverUrl) return null;

  const res = await appFetch(`${serverUrl}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;

  const { jwt_token } = await res.json();
  await invoke("keychain_set", { key: "jwt", value: jwt_token });

  const wasProBefore = useSubscriptionStore.getState().isPro;
  const wasTeamsBefore = useSubscriptionStore.getState().isTeams;
  await useSubscriptionStore.getState().load().catch(() => {});
  const isProNow = useSubscriptionStore.getState().isPro;
  const isTeamsNow = useSubscriptionStore.getState().isTeams;

  if (wasProBefore && !isProNow) {
    const { useNotificationStore } = await import("@/stores/notificationStore");
    const { useUIStore } = await import("@/stores/uiStore");
    useNotificationStore.getState().addToast({
      pluginId: "system",
      pluginName: "Handsome Voltius",
      type: "toast",
      message: i18n.t("common.toast.proSubscriptionEnded"),
      severity: "warning",
      duration: 0,
      action: {
        label: i18n.t("common.toast.managePlan"),
        onClick: () => useUIStore.getState().openSettings("account"),
      },
    });
  }

  // Subscription restored to teams — retry any vaults that were blocked on 402
  if (!wasTeamsBefore && isTeamsNow) {
    const { useTeamVaultStateStore } = await import("@/stores/teamVaultStateStore");
    const { useTeamStore } = await import("@/stores/teamStore");
    const { fetchTeamData } = await import("@/services/teamVaultSync");
    const { statusByTeamId } = useTeamVaultStateStore.getState();
    const teams = useTeamStore.getState().teams;
    for (const team of teams) {
      if (statusByTeamId[team.id] === "payment_required") {
        fetchTeamData(team.id).catch(() => {});
      }
    }
  }

  return jwt_token;
}

function isJwtExpiredOrExpiring(jwt: string): boolean {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return Date.now() > payload.exp * 1000 - 60_000; // refresh 60s before expiry
  } catch {
    return true;
  }
}

/** fetch() wrapper that proactively refreshes the JWT before expiry and backs off on 429. */
export async function fetchWithAuth(url: string, init: RequestInit): Promise<Response> {
  let jwt = await getJwt();

  if (!jwt || isJwtExpiredOrExpiring(jwt)) {
    jwt = await tryRefreshJwt();
    if (!jwt) throw new Error(i18n.t("common.error.sessionExpired"));
  }

  const makeHeaders = (token: string) => ({
    ...(init.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  });

  let res = await appFetch(url, { ...init, headers: makeHeaders(jwt) });

  // Fallback: if server still returns 401, try one more refresh
  if (res.status === 401) {
    const newJwt = await tryRefreshJwt();
    if (!newJwt) throw new Error(i18n.t("common.error.sessionExpired"));
    res = await appFetch(url, { ...init, headers: makeHeaders(newJwt) });
  }

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    throw new Error(i18n.t("common.error.rateLimited", { seconds: retryAfter }));
  }

  return res;
}

let _deviceId: string | null = null;

/**
 * Returns a stable device ID that persists across app restarts.
 *
 * Uses localStorage so the ID survives process restarts (unlike sessionStorage,
 * which generated a new UUID on every launch and accumulated orphaned blobs on
 * the server). The SSE self-push filter still works correctly for the common
 * single-instance case. In the rare scenario of two simultaneous instances they
 * share the ID, which means one won't receive live SSE nudges from itself — a
 * minor degradation that's acceptable vs. unbounded blob accumulation.
 */
async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  let id = localStorage.getItem("voltius.device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("voltius.device_id", id);
  }
  _deviceId = id;
  return id;
}

// ─── Core sync operations ────────────────────────────────────────────────────

/**
 * Run a full personal sync cycle.
 *
 * Personal sync is encrypted GitHub Gist sync. The paid Voltius Cloud blob
 * endpoints are no longer used, so this is a thin wrapper that keeps the
 * app-wide entry point stable for callers.
 */
export async function syncNow(options: { showProgress?: boolean } = {}): Promise<void> {
  await gistSyncNow({ showProgress: options.showProgress ?? false });
}

/**
 * Flush local state upstream immediately, without first pulling.
 *
 * Used by flows that are about to tear down or re-key the session and need the
 * current state persisted first. A no-op when Gist sync is not configured.
 */
export async function push(): Promise<void> {
  if (!(await isGistConfigured())) return;
  await gistPush();
}


// ─── Debounced sync on mutations ──────────────────────────────────────────────

let _syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * How long to wait after the last local mutation before syncing.
 *
 * Deliberately long: an accidental edit that is undone within the window never
 * reaches the Gist at all, so it cannot be pulled back down on the next
 * session. Quitting still flushes immediately via the sync engine's
 * before-quit hook, so a pending change is not lost by closing the app.
 */
export const SYNC_DEBOUNCE_MS = 30_000;

/**
 * Schedule a sync once the mutation burst has settled (debounced).
 *
 * Callers are free to invoke this on every local mutation: it is a no-op until
 * Gist sync is actually configured, so an install with no sync set up never
 * does any work.
 */
export function scheduleSync() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    _syncTimer = null;
    void (async () => {
      if (!(await isGistConfigured())) return;
      await syncNow();
    })().catch(() => {});
  }, SYNC_DEBOUNCE_MS);
}

// ─── Real-time SSE sync ───────────────────────────────────────────────────────

const _teamEventListeners = new Set<(teamId: string) => void>();

export function onTeamSseEvent(fn: (teamId: string) => void): () => void {
  _teamEventListeners.add(fn);
  return () => { _teamEventListeners.delete(fn); };
}

let _sseAbort: AbortController | null = null;

/**
 * Open a persistent SSE connection to the server. When another device uploads
 * a blob, the server sends its device_id. Team blob pushes from other members
 * arrive as "team:{team_id}" events on the same stream — no per-team SSE needed.
 * Auto-reconnects on disconnect with a 5 s back-off.
 */
export function startRealtimeSync(): void {
  stopRealtimeSync();
  _sseAbort = new AbortController();
  void _sseLoop(_sseAbort.signal);
}

export function stopRealtimeSync(): void {
  _sseAbort?.abort();
  _sseAbort = null;
}

async function _sseLoop(signal: AbortSignal): Promise<void> {
  while (!signal.aborted) {
    try {
      await _sseConnect(signal);
    } catch {
      // connection dropped or failed — fall through to reconnect delay
    }
    if (!signal.aborted) {
      await new Promise<void>((r) => setTimeout(r, 5_000));
    }
  }
}

async function handleRealtimeEvent(eventData: string, myDeviceId: string): Promise<void> {
  if (eventData.startsWith("team:")) {
    const teamId = eventData.slice(5);
    _teamEventListeners.forEach((fn) => fn(teamId));
    const { fetchTeamData } = await import("@/services/teamVaultSync");
    fetchTeamData(teamId, { background: true }).catch(() => {});
  } else if (eventData.startsWith("team_members:")) {
    const teamId = eventData.slice("team_members:".length);
    const prevMemberIds = new Set(
      (useTeamStore.getState().membersByTeam[teamId] ?? []).map((m) => m.user_id),
    );
    await Promise.all([
      useTeamStore.getState().loadTeams(),
      useTeamStore.getState().loadMembers(teamId),
      useTeamStore.getState().loadRoles(teamId),
    ]);
    const newMembers = (useTeamStore.getState().membersByTeam[teamId] ?? []).filter(
      (m) => !prevMemberIds.has(m.user_id) && m.public_key,
    );
    if (newMembers.length > 0) {
      const { distributeKeyToNewMember } = await import("@/services/teamVaultSync");
      await Promise.allSettled(
        newMembers.map((m) => distributeKeyToNewMember(teamId, m.user_id, m.public_key)),
      );
    }
    useTeamStore.getState().loadPendingInvitations(teamId).catch(() => {});
  } else if (eventData.startsWith("pending_invitations_changed:")) {
    useTeamStore.getState().loadMyPendingInvitations().catch(() => {});
  } else if (eventData === "membership_changed") {
    handleMembershipChangedEvent({
      getTeamIds: () => useTeamStore.getState().teams.map((t) => t.id),
      loadTeams: () => useTeamStore.getState().loadTeams(),
      onTeamAdded: async (teamId) => {
        const { joinAndLoadTeamVault } = await import("@/services/teamDataManager");
        await joinAndLoadTeamVault(teamId);
      },
      onTeamRemoved: async (tid) => {
        // Evict the in-memory vault key immediately so the kicked member can't
        // use a cached key to decrypt data after losing access.
        const { deleteTeamKey } = await import("@/services/teamVaultSync");
        deleteTeamKey(tid);

        // Remove all per-team slices from the team store (members, roles, etc.)
        useTeamStore.getState().removeTeam(tid);

        // Unlink any local vault that was pointing at this team so the vault
        // button disappears from the sidebar rather than staying as a broken
        // cloud-linked vault.
        const { useVaultStore } = await import("@/stores/vaultStore");
        const vaultStore = useVaultStore.getState();
        for (const vault of vaultStore.vaults.filter((v) => v.teamId === tid)) {
          vaultStore.setVaultTeamId(vault.id, null);
        }

        const [
          { useTeamVaultStateStore },
          { useConnectionStore },
          { useIdentityStore },
          { useKeyStore },
          { useFolderStore },
          { useSnippetStore },
          { useSnippetFolderStore },
          { usePortForwardingStore },
        ] = await Promise.all([
          import("@/stores/teamVaultStateStore"),
          import("@/stores/connectionStore"),
          import("@/stores/identityStore"),
          import("@/stores/keyStore"),
          import("@/stores/folderStore"),
          import("@/stores/snippetStore"),
          import("@/stores/snippetFolderStore"),
          import("@/stores/portForwardingStore"),
        ]);
        useTeamVaultStateStore.getState().setStatus(tid, "forbidden");
        useConnectionStore.getState().clearTeamConnections(tid);
        useIdentityStore.getState().clearTeamIdentities(tid);
        useKeyStore.getState().clearTeamKeys(tid);
        useFolderStore.getState().clearTeamFolders(tid);
        useSnippetStore.getState().clearTeamSnippets(tid);
        useSnippetFolderStore.getState().clearTeamSnippetFolders(tid);
        usePortForwardingStore.getState().clearTeamRules(tid);
      },
    }).catch(() => {});
  } else if (eventData.startsWith("presence:")) {
    const parts = eventData.split(":");
    const userId = parts[1];
    const online = parts[2] === "online";
    useTeamStore.getState().setMemberOnline(userId, online);
  } else if (eventData.startsWith("using:")) {
    const parsed = parseUsingEvent(eventData);
    if (parsed) {
      const { useConnectionPresenceStore } = await import("@/stores/connectionPresenceStore");
      const store = useConnectionPresenceStore.getState();
      if (parsed.inUse) store.addUser(parsed.connectionId, parsed.userId);
      else store.removeUser(parsed.connectionId, parsed.userId);
    }
  } else if (eventData === "token_invalidated") {
    tryRefreshJwt().catch(() => {});
  } else if (eventData !== myDeviceId) {
    syncNow().catch(() => {});
  }
}

async function _sseConnect(signal: AbortSignal): Promise<void> {
  const [serverUrl, storedJwt, myDeviceId] = await Promise.all([
    getServerUrl(),
    getJwt(),
    getDeviceId(),
  ]);
  if (!serverUrl) return;

  let jwt = storedJwt;
  if (!jwt || isJwtExpiredOrExpiring(jwt)) jwt = await tryRefreshJwt();
  if (!jwt) return;

  _cloudActive = true;
  _listeners.forEach((fn) => fn());

  // Sync immediately on (re)connect to catch any events missed while offline
  syncNow().catch(() => {});

  // Seed connection-presence snapshot so we render correct state even before any
  // SSE event arrives this session.
  (async () => {
    const [{ fetchCurrentConnectionUsage }, { useConnectionPresenceStore }] = await Promise.all([
      import("@/services/connectionPresence"),
      import("@/stores/connectionPresenceStore"),
    ]);
    const entries = await fetchCurrentConnectionUsage();
    useConnectionPresenceStore.getState().setSnapshot(entries);
  })().catch(() => {});

  const parser = new SseDataLineParser();
  const connect = (token: string) => connectNativeSse(
    `${serverUrl}/v1/sync/stream`,
    { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
    signal,
    (text) => {
      // Each SSE data line contains either the pusher's device_id (personal sync)
      // or "team:{team_id}" (team blob pushed by another member).
      for (const eventData of parser.push(text)) {
        handleRealtimeEvent(eventData, myDeviceId).catch(() => {});
      }
    },
  );
  const connectAndFlush = async (token: string) => {
    await connect(token);
    for (const eventData of parser.flush()) {
      await handleRealtimeEvent(eventData, myDeviceId);
    }
  };

  try {
    await connectAndFlush(jwt);
  } catch (err) {
    if (err instanceof Error && err.message.includes("401")) {
      const refreshedJwt = await tryRefreshJwt();
      if (refreshedJwt) await connectAndFlush(refreshedJwt);
    } else {
      throw err;
    }
  } finally {
    _cloudActive = false;
    _listeners.forEach((fn) => fn());
  }
}
