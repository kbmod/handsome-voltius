import {
  readWorkspaceSnapshot,
  clearWorkspaceSnapshot,
  startWorkspaceSnapshotSync,
} from "./workspaceSnapshotStore";
import { getToggle } from "./toggleSettingsStore";
import { resolvePersistSession } from "./connectivitySettingsStore";
import { resolveRemoteSessions } from "./liveSessionManifestCore";
import { useCrossDeviceSessionsStore } from "./crossDeviceSessionsStore";
import { useConnectionStore } from "./connectionStore";
import { useSessionStore } from "./sessionStore";
import { useLayoutStore, getPaneSessionIds, type SplitTab } from "./layoutStore";
import { useUIStore } from "./uiStore";
import { localConnect } from "@/services/local";
import {
  getTerminalOutputVersion,
  setRestoreScrollOffset,
  waitForTerminalListeners,
  waitForTerminalOutput,
} from "@/hooks/useTerminal";
import type { SerialConnectParams, TerminalSession } from "@/types";
import type { SnapshotSession } from "./workspaceSnapshotCore";

function toTerminalSession(s: SnapshotSession): TerminalSession {
  const connection = s.type === "ssh"
    ? useConnectionStore.getState().connections.find((item) => item.id === s.connectionId)
      ?? Object.values(useConnectionStore.getState().teamConnections)
        .flat()
        .find((item) => item.id === s.connectionId)
    : undefined;
  return {
    id: s.id,
    connectionId: s.connectionId,
    connectionName: s.connectionName,
    status: "connecting",
    // Re-evaluate persistence from the current global/per-host setting instead
    // of carrying an old default through an existing workspace snapshot.
    persist: s.type === "ssh"
      ? resolvePersistSession(connection?.persist_session)
      : false,
    // Snapshot sessions existed on the host: reconnects must attach, not create.
    everConnected: true,
    type: s.type,
    encoding: s.encoding,
    localShell: s.localShell,
    serialConfig: s.serialConfig as SerialConnectParams | undefined,
  };
}

let ran = false;

/**
 * One-shot launch restore. Always ends by starting the snapshot sync —
 * never before the restore decision, so the boot-empty session store can't
 * clobber the snapshot we're about to read.
 */
export async function restoreWorkspaceOnLaunch(): Promise<void> {
  if (ran) return;
  ran = true;

  if (!getToggle("restore-workspace")) {
    clearWorkspaceSnapshot();
    startWorkspaceSnapshotSync();
    return;
  }

  const snapshot = readWorkspaceSnapshot();
  if (!snapshot || snapshot.sessions.length === 0 || useSessionStore.getState().sessions.length > 0) {
    startWorkspaceSnapshotSync();
    return;
  }

  // 1. Tabs + layout reappear immediately, all "connecting".
  const restoredSessions = snapshot.sessions.map(toTerminalSession);
  useSessionStore
    .getState()
    .restoreSessions(restoredSessions, snapshot.activeSessionId);
  useLayoutStore.getState().hydrate({
    splitTabs: snapshot.layout.splitTabs as SplitTab[],
    activeSplitTabId: snapshot.layout.activeSplitTabId,
    splitTabActive: snapshot.layout.splitTabActive,
    titlebarOrder: snapshot.layout.titlebarOrder,
  });

  // Prune layout leaves whose sessions weren't snapshotable (e.g. a
  // multiplayer pane inside a split).
  const restoredIds = new Set(snapshot.sessions.map((s) => s.id));
  const layout = useLayoutStore.getState();
  for (const tab of layout.splitTabs) {
    for (const sid of getPaneSessionIds(tab.root)) {
      if (!restoredIds.has(sid)) useLayoutStore.getState().removeSession(sid);
    }
  }

  useUIStore.getState().setActiveNav("terminal");
  useUIStore.getState().setSidebarOpen(false);

  // 2. Wait for every split/non-split terminal's native output and close
  // listeners. Spawning on an arbitrary animation-frame delay loses the first
  // prompt on slower multi-pane mounts and leaves an apparently dead shell.
  await waitForTerminalListeners(snapshot.sessions.map((session) => session.id));
  startWorkspaceSnapshotSync();

  // 3. Reconnect in snapshot order. Starting several interactive shells at
  // once can race expensive profile initialization and used to leave one pane
  // marked connected without a prompt. Vault unlock also stays single-flight.
  const { reconnect, markConnected, markError } = useSessionStore.getState();
  for (const s of snapshot.sessions) {
    if (s.scrollLinesFromBottom) setRestoreScrollOffset(s.id, s.scrollLinesFromBottom);
  }

  // Cross-device tombstones only govern persistent SSH sessions advertised by
  // that feature. They must never prune ordinary workspace tabs, especially
  // while cross-device sessions are disabled.
  let closedIds: string[] = [];
  if (getToggle("cross-device-sessions")) {
    const cds = useCrossDeviceSessionsStore.getState();
    const advertisedIds = restoredSessions
      .filter((session) => session.type === "ssh" && session.persist)
      .map((session) => session.id);
    closedIds = resolveRemoteSessions({
      manifests: Object.values(cds.manifests),
      myDeviceId: localStorage.getItem("voltius.device_id") ?? "",
      myTombstones: cds.tombstones,
      myOpenSessionIds: advertisedIds,
    }).closedIds;
  }
  const closed = new Set(closedIds);
  for (const id of closedIds) useSessionStore.getState().removeSession(id);

  const restoredById = new Map(restoredSessions.map((session) => [session.id, session]));
  for (const s of snapshot.sessions) {
    if (closed.has(s.id)) continue; // killed on another device
    if (s.type === "ssh" || s.type === "serial") {
      // Launch restore is allowed to recreate a missing persistent tmux/screen
      // session. Attach-only is reserved for joining a session advertised by
      // another device and for reconnecting a previously live channel.
      await reconnect(s.id, {
        restore: restoredById.get(s.id)?.persist ?? false,
        attachOnly: false,
      });
    } else {
      try {
        const outputVersion = getTerminalOutputVersion(s.id);
        await localConnect(s.id, 80, 24, s.localShell, s.cwd, getToggle("shell-integration"));
        await waitForTerminalOutput(s.id, outputVersion);
        markConnected(s.id);
      } catch (err) {
        markError(s.id, err instanceof Error ? err.message : String(err));
      }
    }
  }
}
