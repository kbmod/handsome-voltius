import type { PluginAPI } from "@/plugins/api";
import {
  createGist,
  getManifest,
  getDeviceBlobs,
  patchFiles,
  deleteDeviceFile,
  deleteGistById,
  GistApiError,
  type GistManifest,
  type GistDevice,
  type DeviceBlob,
} from "./gist-api";
import { generateSaltHex } from "./crypto";
import { invoke } from "@tauri-apps/api/core";
import type { SyncStatus } from "@/services/sync";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GistRegistration {
  id: string;
  label?: string;
  addedAt: string;
}

export interface GistSyncState {
  status: SyncStatus;
  lastSync: Date | null;
  error: string | null;
  blobSizeBytes: number | null;
  configured: boolean;
}

// ─── Public sync state ────────────────────────────────────────────────────────

let _gistStatus: SyncStatus = "idle";
let _gistLastSync: Date | null = null;
let _gistError: string | null = null;
let _gistBlobSizeBytes: number | null = null;
let _gistConfigured = false;
const _gistListeners = new Set<() => void>();

export function getGistSyncState(): GistSyncState {
  return {
    status: _gistStatus,
    lastSync: _gistLastSync,
    error: _gistError,
    blobSizeBytes: _gistBlobSizeBytes,
    configured: _gistConfigured,
  };
}

export function onGistSyncStateChange(fn: () => void): () => void {
  _gistListeners.add(fn);
  return () => { _gistListeners.delete(fn); };
}

function setGistState(status: SyncStatus, error?: string) {
  _gistStatus = status;
  _gistError = error ?? null;
  if (status === "success") _gistLastSync = new Date();
  _gistListeners.forEach((fn) => fn());
}

// ─── Internal state ───────────────────────────────────────────────────────────

let _api: PluginAPI | undefined;
let _pollInterval: ReturnType<typeof setInterval> | null = null;
let _consecutiveFailures = 0;
let _failureBannerId: { dismiss(): void } | null = null;
// deviceId → last known pushedAt (change detection for pull)
const _lastSeenPushedAt: Record<string, string> = {};
/**
 * Registered Gists that were found to no longer exist.
 *
 * Surfaced so the settings page can name them and offer removal. They are not
 * unlinked automatically: GitHub answers 404 both for a deleted Gist and for
 * one the token can no longer see, and silently discarding a user's
 * configuration over a scope change would be worse than leaving it visible.
 */
let _unreachableGistIds: string[] = [];

export function getUnreachableGistIds(): string[] {
  return _unreachableGistIds;
}

/**
 * Record what a sync attempt learned about which Gists still exist.
 *
 * Only Gists the attempt actually settled are re-judged. Push and pull touch
 * different sets — export destinations versus the import source — so judging
 * anything else would let a successful push erase a dead import source that
 * pull had just found, and the warning would vanish while sync stayed broken.
 * Inconclusive failures (a timeout, a 500) belong in neither list: they are no
 * evidence either way, and treating them as proof of existence would clear a
 * warning that is still true.
 */
function markGistReachability(reachable: string[], missing: string[]): void {
  const next = _unreachableGistIds.filter((id) => !reachable.includes(id));
  for (const id of missing) if (!next.includes(id)) next.push(id);

  const changed =
    next.length !== _unreachableGistIds.length || next.some((id, i) => id !== _unreachableGistIds[i]);
  if (!changed) return;
  _unreachableGistIds = next;
  _gistListeners.forEach((fn) => fn());
}

export function init(api: PluginAPI) {
  _api = api;
  isConfigured().then((c) => {
    _gistConfigured = c;
    _gistListeners.forEach((fn) => fn());
  }).catch(() => {});
}

/**
 * True once the plugin has registered and handed us its API. Core code drives
 * this engine as the app's only sync path, so it must be able to ask whether
 * the engine is usable rather than throwing on an undefined plugin API.
 */
export function isReady(): boolean {
  return _api !== undefined;
}

/**
 * The plugin API for operations that cannot proceed without it. Callers that
 * can degrade gracefully should check `isReady()` or use the null-returning
 * config helpers instead.
 */
function requireApi(): PluginAPI {
  if (!_api) throw new Error("Gist sync is not initialised");
  return _api;
}

// ─── Config helpers ───────────────────────────────────────────────────────────

async function getPat(): Promise<string | null> {
  if (!_api) return null;
  return _api.vault.get("pat");
}

async function getPassphrase(): Promise<string | null> {
  if (!_api) return null;
  return _api.vault.get("passphrase");
}

/** Returns all registered gists, migrating from legacy single-gistId storage if needed. */
export async function getRegisteredGists(): Promise<GistRegistration[]> {
  if (!_api) return [];
  const gists = await requireApi().storage.get<GistRegistration[]>("registeredGists");
  if (gists !== null) return gists;

  // Migrate from legacy single gistId
  const legacyId = await requireApi().storage.get<string>("gistId");
  if (legacyId) {
    const entry: GistRegistration = { id: legacyId, addedAt: new Date().toISOString() };
    await Promise.all([
      requireApi().storage.set("registeredGists", [entry]),
      requireApi().storage.set("importSourceId", legacyId),
      requireApi().storage.set("exportDestinationIds", [legacyId]),
      requireApi().storage.delete("gistId"),
    ]);
    return [entry];
  }
  return [];
}

async function saveRegisteredGists(gists: GistRegistration[]): Promise<void> {
  await requireApi().storage.set("registeredGists", gists);
}

export async function getImportSourceId(): Promise<string | null> {
  return requireApi().storage.get<string>("importSourceId");
}

export async function getExportDestinationIds(): Promise<string[]> {
  return (await requireApi().storage.get<string[]>("exportDestinationIds")) ?? [];
}

export async function setImportSource(gistId: string): Promise<void> {
  await requireApi().storage.set("importSourceId", gistId);
}

export async function setExportDestinations(gistIds: string[]): Promise<void> {
  await requireApi().storage.set("exportDestinationIds", gistIds);
}

export async function getDeviceId(): Promise<string> {
  let id = await requireApi().storage.get<string>("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    await requireApi().storage.set("deviceId", id);
  }
  return id;
}

async function getDeviceLabel(): Promise<string> {
  const stored = await requireApi().storage.get<string>("deviceLabel");
  if (stored) return stored;
  const ua = navigator.userAgent;
  const match = ua.match(/\(([^)]+)\)/);
  return match ? match[1].split(";")[0].trim() : "Unknown device";
}

export async function isConfigured(): Promise<boolean> {
  const [pat, gists] = await Promise.all([getPat(), getRegisteredGists()]);
  return !!(pat && gists.length > 0);
}

function deriveKey(secret: string, salt: string): Promise<string> {
  return invoke<string>("derive_gist_key", { passphrase: secret, saltHex: salt });
}

async function getEncKey(salt: string): Promise<string> {
  const [passphrase, pat] = await Promise.all([getPassphrase(), getPat()]);
  const secret = passphrase ?? pat!;
  return deriveKey(secret, salt);
}

/**
 * The key a given passphrase would produce for this Gist. An empty passphrase
 * means "no passphrase", which falls back to the PAT exactly as `getEncKey`
 * does, so verification matches what sync would actually use.
 */
async function encKeyForPassphrase(salt: string, passphrase: string): Promise<string> {
  const secret = passphrase.trim() || (await getPat());
  if (!secret) throw new Error("Gist sync is not configured");
  return deriveKey(secret, salt);
}

// ─── Passphrase verification ─────────────────────────────────────────────────

/**
 * The configured passphrase cannot read what is already in the Gist.
 *
 * Uploading anyway would overwrite this device's blob with ciphertext no other
 * device can decrypt, so a push that raises this must not have written.
 */
export class GistPassphraseError extends Error {
  constructor() {
    super(
      "Sync passphrase does not match this Gist. Nothing was uploaded — check the " +
        "passphrase, or use Change passphrase to re-encrypt with a new one.",
    );
    this.name = "GistPassphraseError";
  }
}

function hexToBytes(hex: string): number[] {
  return Array.from(new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16))));
}

async function canDecrypt(encKeyHex: string, blobB64: string): Promise<boolean> {
  try {
    const blob = Array.from(Uint8Array.from(atob(blobB64), (c) => c.charCodeAt(0)));
    await invoke("backup_decrypt", { encKey: hexToBytes(encKeyHex), blob });
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether `encKey` can read any blob already in this Gist.
 *
 * `null` means "nothing to check against" — an empty Gist accepts any
 * passphrase because there is no existing ciphertext to contradict it.
 *
 * The blobs are XChaCha20-Poly1305 AEAD, so a successful decrypt authenticates
 * the key; no separate verifier token has to be stored in the manifest.
 */
async function keyReadsGist(
  pat: string,
  gistId: string,
  manifest: GistManifest,
  encKey: string,
): Promise<boolean | null> {
  const deviceIds = manifest.devices.map((d) => d.id);
  if (deviceIds.length === 0) return null;

  const blobs = await getDeviceBlobs(pat, gistId, deviceIds);
  if (blobs.length === 0) return null;

  for (const { blob } of blobs) {
    if (await canDecrypt(encKey, blob)) return true;
  }
  return false;
}

/**
 * Check the configured passphrase against a registered Gist without syncing.
 *
 * Returns "ok" when it decrypts existing data, "empty" when the Gist has no
 * blobs to verify against, and "mismatch" when the data is unreadable.
 */
export async function verifyPassphrase(
  gistId: string,
): Promise<"ok" | "empty" | "mismatch"> {
  const pat = await getPat();
  if (!pat) throw new Error("Gist sync is not configured");
  const manifest = await getManifest(pat, gistId);
  const encKey = await getEncKey(manifest.salt);
  const verdict = await keyReadsGist(pat, gistId, manifest, encKey);
  return verdict === null ? "empty" : verdict ? "ok" : "mismatch";
}

/** Raised when the passphrase offered as the current one cannot read the Gist. */
export class GistCurrentPassphraseError extends Error {
  constructor() {
    super("Current passphrase is incorrect — nothing was changed.");
    this.name = "GistCurrentPassphraseError";
  }
}

/**
 * Rotate the sync passphrase and re-encrypt every export destination.
 *
 * Knowledge of the current passphrase is required and is proved by decrypting
 * data already in the Gist. That keeps the passphrase a real second factor:
 * holding the PAT alone grants access to ciphertext, but not the ability to
 * re-encrypt a Gist and lock its owner out.
 *
 * The check runs against every destination before anything is written, and the
 * previous passphrase is restored if re-encryption fails, so a partial rotation
 * cannot leave the vault holding a passphrase that reads nothing.
 */
export async function changePassphrase(current: string, next: string): Promise<void> {
  const [pat, exportIds] = await Promise.all([getPat(), getExportDestinationIds()]);
  if (!pat) throw new Error("Gist sync is not configured");

  for (const gistId of exportIds) {
    const manifest = await getManifest(pat, gistId);
    const currentKey = await encKeyForPassphrase(manifest.salt, current);
    // `null` means the Gist holds nothing to verify against, which cannot
    // disprove the passphrase — treat it as passing rather than blocking.
    if ((await keyReadsGist(pat, gistId, manifest, currentKey)) === false) {
      throw new GistCurrentPassphraseError();
    }
  }

  const previous = await getPassphrase();
  const trimmed = next.trim();
  await (trimmed ? requireApi().vault.set("passphrase", trimmed) : requireApi().vault.delete("passphrase"));

  try {
    await push({ reencrypt: true });
  } catch (e) {
    await (previous ? requireApi().vault.set("passphrase", previous) : requireApi().vault.delete("passphrase"));
    throw e;
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

export async function setupNewGist(pat: string): Promise<{ id: string; url: string }> {
  const salt = generateSaltHex();
  const deviceId = await getDeviceId();
  const deviceLabel = await getDeviceLabel();

  const manifest: GistManifest = {
    schema: 1,
    salt,
    devices: [{ id: deviceId, label: deviceLabel, pushedAt: new Date().toISOString() }],
  };

  const { id, url } = await createGist(pat, manifest);

  // Push initial state
  const encKey = await getEncKey(salt);
  const blob = await requireApi().sync.exportState(encKey, deviceId);
  await patchFiles(pat, id, {
    [`device-${deviceId}.b64`]: { filename: `device-${deviceId}.b64`, content: blob },
  });

  // Register and auto-select
  const existing = await getRegisteredGists();
  await saveRegisteredGists([...existing, { id, addedAt: new Date().toISOString() }]);
  if (!(await getImportSourceId())) await setImportSource(id);
  const exportIds = await getExportDestinationIds();
  if (!exportIds.includes(id)) await setExportDestinations([...exportIds, id]);

  _gistConfigured = true;
  _gistListeners.forEach((fn) => fn());

  return { id, url };
}

export async function linkExistingGist(pat: string, gistId: string): Promise<void> {
  await getManifest(pat, gistId); // validate accessible
  const existing = await getRegisteredGists();
  if (existing.find((g) => g.id === gistId)) return; // already registered
  await saveRegisteredGists([...existing, { id: gistId, addedAt: new Date().toISOString() }]);
  if (!(await getImportSourceId())) await setImportSource(gistId);
  const exportIds = await getExportDestinationIds();
  if (!exportIds.includes(gistId)) await setExportDestinations([...exportIds, gistId]);

  if (!_gistConfigured) {
    _gistConfigured = true;
    _gistListeners.forEach((fn) => fn());
  }
}

export async function unlinkGist(gistId: string): Promise<void> {
  const gists = await getRegisteredGists();
  const remaining = gists.filter((g) => g.id !== gistId);
  await saveRegisteredGists(remaining);
  const [importSourceId, exportIds] = await Promise.all([
    getImportSourceId(),
    getExportDestinationIds(),
  ]);
  if (importSourceId === gistId)
    await requireApi().storage.set("importSourceId", remaining[0]?.id ?? null);
  await setExportDestinations(exportIds.filter((id) => id !== gistId));

  // An unregistered Gist has no row to warn on, and a stale entry would make a
  // later re-link look dead before anything had been tried.
  markGistReachability([gistId], []);

  const nowConfigured = await isConfigured();
  if (_gistConfigured !== nowConfigured) {
    _gistConfigured = nowConfigured;
    _gistListeners.forEach((fn) => fn());
  }
}

export async function deleteGist(pat: string, gistId: string): Promise<void> {
  try {
    await deleteGistById(pat, gistId);
  } catch (e) {
    // A Gist someone else already deleted answers 404. The intent — stop using
    // it — is still satisfiable, and refusing here used to strand the entry:
    // Delete failed because the Gist was gone, so it could never be removed.
    if (!(e instanceof GistApiError) || e.status !== 404) throw e;
  }
  await unlinkGist(gistId);
}

export async function removeDevice(pat: string, gistId: string, deviceId: string): Promise<void> {
  await deleteDeviceFile(pat, gistId, deviceId);
  const manifest = await getManifest(pat, gistId);
  const updated: GistManifest = {
    ...manifest,
    devices: manifest.devices.filter((d) => d.id !== deviceId),
  };
  await patchFiles(pat, gistId, {
    "manifest.json": { filename: "manifest.json", content: JSON.stringify(updated, null, 2) },
  });
}

// ─── Push — writes to all export destinations ─────────────────────────────────

/**
 * Upload local state to every export destination.
 *
 * With `reencrypt`, an unreadable Gist is adopted rather than refused: local
 * state becomes the source of truth and is re-uploaded under the current
 * passphrase. Only use that for a deliberate passphrase change — other devices'
 * blobs stay behind encrypted under the old key until they push again.
 */
export async function push(options: { reencrypt?: boolean } = {}): Promise<void> {
  const [pat, exportIds] = await Promise.all([getPat(), getExportDestinationIds()]);
  if (!pat || exportIds.length === 0) return;

  const deviceId = await getDeviceId();
  const deviceLabel = await getDeviceLabel();
  const now = new Date().toISOString();

  let firstBlobSize: number | null = null;

  const results = await Promise.allSettled(
    exportIds.map(async (gistId) => {
      const manifest = await getManifest(pat, gistId);
      const encKey = await getEncKey(manifest.salt);

      // Refuse to overwrite readable data with ciphertext derived from a
      // passphrase that cannot read it. Without this a wrong passphrase was
      // silently accepted: pull short-circuits when no remote device changed,
      // so nothing ever attempted a decrypt, and the push reported success
      // while leaving the Gist unreadable to every other device.
      if (!options.reencrypt) {
        const readable = await keyReadsGist(pat, gistId, manifest, encKey);
        if (readable === false) throw new GistPassphraseError();
      }

      const blob = await requireApi().sync.exportState(encKey, deviceId);

      // Track size from any one export (content is the same, only key differs)
      if (firstBlobSize === null) firstBlobSize = Math.round(blob.length * 3 / 4);

      const existingDevice = manifest.devices.find((d) => d.id === deviceId);
      const updatedDevices: GistDevice[] = existingDevice
        ? manifest.devices.map((d) => (d.id === deviceId ? { ...d, pushedAt: now } : d))
        : [...manifest.devices, { id: deviceId, label: deviceLabel, pushedAt: now }];

      await patchFiles(pat, gistId, {
        [`device-${deviceId}.b64`]: { filename: `device-${deviceId}.b64`, content: blob },
        "manifest.json": {
          filename: "manifest.json",
          content: JSON.stringify({ ...manifest, devices: updatedDevices }, null, 2),
        },
      });
    }),
  );

  // One dead destination must not stop the live ones. A Gist deleted by
  // another user answers 404 forever, and failing the whole push on it left
  // sync permanently broken with no way to make progress.
  const failures = results.flatMap((r, i) =>
    r.status === "rejected" ? [{ gistId: exportIds[i], reason: r.reason as unknown }] : [],
  );

  // Record what this attempt proved before deciding whether it failed: with a
  // single destination the push does throw, and that 404 is exactly the fact
  // the settings page needs to explain why.
  markGistReachability(
    exportIds.filter((id) => !failures.some((f) => f.gistId === id)),
    failures
      .filter((f) => f.reason instanceof GistApiError && f.reason.status === 404)
      .map((f) => f.gistId),
  );

  if (failures.length === exportIds.length) throw failures[0].reason;

  if (firstBlobSize !== null) _gistBlobSizeBytes = firstBlobSize;
  _lastSeenPushedAt[deviceId] = now;
}

// ─── Pull — reads from import source only ────────────────────────────────────

/**
 * The Gist to read from, moving off one that no longer exists.
 *
 * When another user deletes the shared Gist, this device keeps it as its import
 * source and every sync fails on it — including the pushes that would otherwise
 * have succeeded. Linking a replacement did not help, because the import source
 * only auto-populates when unset. Repoint to a registered Gist that is actually
 * reachable, so adding the new one is enough to recover.
 *
 * Only the pointer moves; nothing is unlinked or deleted, and the unreachable
 * id is reported so the settings page can offer to remove it.
 */
async function resolveImportSource(pat: string, current: string): Promise<string | null> {
  try {
    await getManifest(pat, current);
    markGistReachability([current], []);
    return current;
  } catch (e) {
    if (!(e instanceof GistApiError) || e.status !== 404) throw e;
  }

  const candidates = (await getRegisteredGists()).map((g) => g.id).filter((id) => id !== current);
  for (const candidate of candidates) {
    try {
      await getManifest(pat, candidate);
    } catch {
      continue;
    }
    await setImportSource(candidate);
    markGistReachability([current, candidate], [current]);
    return candidate;
  }

  // Nothing else to read from — report the missing Gist rather than pretending
  // the pull simply had nothing to do.
  markGistReachability([current], [current]);
  throw new GistApiError(404, `Sync Gist ${current} no longer exists`);
}

export async function pull(): Promise<boolean> {
  const [pat, initialSourceId] = await Promise.all([getPat(), getImportSourceId()]);
  if (!pat || !initialSourceId) return false;

  const importSourceId = await resolveImportSource(pat, initialSourceId);
  if (!importSourceId) return false;

  const deviceId = await getDeviceId();
  const manifest = await getManifest(pat, importSourceId);
  const encKey = await getEncKey(manifest.salt);

  const remoteDevices = manifest.devices.filter((d) => d.id !== deviceId);
  if (remoteDevices.length === 0) return false;

  const changedDevices = remoteDevices.filter((d) => d.pushedAt !== _lastSeenPushedAt[d.id]);
  if (changedDevices.length === 0) return false;

  const blobs = await getDeviceBlobs(pat, importSourceId, changedDevices.map((d) => d.id));
  if (blobs.length === 0) return false;

  // Import only what this key can actually read. A device left on an older
  // passphrase — or a corrupted blob — must not block the rest: `importStates`
  // decrypts every blob it is handed, so one bad entry would abort the whole
  // merge and stall syncing entirely.
  const readable: DeviceBlob[] = [];
  for (const entry of blobs) {
    if (await canDecrypt(encKey, entry.blob)) readable.push(entry);
  }

  // Nothing decrypted at all, so this is a wrong passphrase rather than one
  // device being out of step.
  if (readable.length === 0) throw new GistPassphraseError();

  await requireApi().sync.importStates(encKey, readable.map((e) => e.blob));

  // Only devices whose blob was merged count as seen, so an unreadable one is
  // retried rather than being skipped forever.
  const merged = new Set(readable.map((e) => e.deviceId));
  for (const d of changedDevices) {
    if (merged.has(d.id)) _lastSeenPushedAt[d.id] = d.pushedAt;
  }
  return true;
}

// ─── Sync cycle ───────────────────────────────────────────────────────────────

export async function syncNow(opts: { showProgress?: boolean } = {}): Promise<void> {
  if (!(await isConfigured())) return;
  if (_gistStatus === "syncing") return;

  setGistState("syncing");

  let progress: ReturnType<PluginAPI["notifications"]["progress"]> | null = null;
  if (opts.showProgress)
    progress = requireApi().notifications.progress("Syncing via GitHub Gist…", { indeterminate: true });

  try {
    await pull();
    await push();
    _consecutiveFailures = 0;
    if (_failureBannerId) { _failureBannerId.dismiss(); _failureBannerId = null; }
    if (progress) progress.finish("Gist sync complete");
    else if (opts.showProgress)
      requireApi().notifications.toast("Gist sync complete", { severity: "success" });
    await requireApi().storage.set("lastSync", new Date().toISOString());
    setGistState("success");
  } catch (err) {
    if (progress) progress.error("Gist sync failed");
    _onSyncError(err);
  }
}

function _onSyncError(err: unknown) {
  _consecutiveFailures++;
  // A wrong passphrase is a configuration problem, not a transient failure:
  // retrying cannot fix it, and calling it "offline?" would be misleading.
  if (err instanceof GistPassphraseError) {
    stopPoll();
    setGistState("error", err.message);
    if (!_failureBannerId)
      _failureBannerId = requireApi().notifications.banner(`Gist Sync: ${err.message}`, {
        severity: "error",
      });
    return;
  }
  if (err instanceof GistApiError) {
    if (err.status === 401) {
      stopPoll();
      setGistState("error", "GitHub PAT is invalid or expired");
      if (!_failureBannerId)
        _failureBannerId = requireApi().notifications.banner(
          "Gist Sync: GitHub PAT is invalid or expired",
          { severity: "error" },
        );
      return;
    }
    if (err.status === 404) {
      stopPoll();
      setGistState("error", "Gist not found — re-configure in Settings");
      if (!_failureBannerId)
        _failureBannerId = requireApi().notifications.banner(
          "Gist Sync: Gist not found — re-configure in Settings",
          { severity: "error" },
        );
      return;
    }
  }
  const isOffline = !navigator.onLine;
  const msg = err instanceof Error ? err.message : String(err);
  setGistState(isOffline ? "offline" : "error", isOffline ? undefined : msg);
  if (_consecutiveFailures >= 3 && !_failureBannerId)
    _failureBannerId = requireApi().notifications.banner(
      `Gist Sync: repeated failures — ${msg}`,
      { severity: "warning" },
    );
  else if (_consecutiveFailures < 3)
    requireApi().notifications.toast("Gist sync skipped — offline?", { severity: "warning" });
}

// ─── Poll loop ────────────────────────────────────────────────────────────────

export function startPoll(intervalSeconds: number) {
  stopPoll();
  _pollInterval = setInterval(() => syncNow().catch(() => {}), intervalSeconds * 1000);
}

export function stopPoll() {
  if (_pollInterval !== null) { clearInterval(_pollInterval); _pollInterval = null; }
}
