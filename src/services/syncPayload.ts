import { invoke } from "@tauri-apps/api/core";
import {
  buildUserDataBundle,
  mergeUserDataBundle,
  applyUserDataBundle,
} from "@/services/user-data/registry";
import type { UserDataBundle } from "@/services/user-data/formats";

/**
 * Non-entity parts of a sync blob.
 *
 * `ENTITY_FILES` are CRDT arrays merged per-entity and written straight back to
 * disk. `settings.json` is different: it is a single `UserDataBundle` holding
 * application settings, keyboard shortcuts, and UI preferences, so it needs a
 * bundle-level merge and a live apply rather than a file write.
 */

/**
 * Write the current in-memory user-data bundle to `settings.json` so a
 * subsequent `backup_export` uploads current settings rather than whatever was
 * last persisted.
 */
export async function refreshLocalSettingsSnapshot(): Promise<void> {
  try {
    const bundle = buildUserDataBundle();
    await invoke("settings_save", { state: JSON.stringify(bundle) });
  } catch {
    // A failed snapshot must never abort a sync — the previous settings.json
    // is still valid, just possibly stale.
  }
}

/** Asks the user whether to apply incoming settings; true means apply. */
export type SettingsPullConfirm = (keys: string[]) => Promise<boolean>;

/**
 * Bundles this device already declined this session, keyed by `exported_at`.
 *
 * Without this, declining would re-prompt on every poll, because the remote
 * bundle keeps winning the merge until the other device changes it again.
 */
const _declinedBundles = new Set<string>();

/** Test seam — forget declined bundles. */
export function resetDeclinedSettingsPulls(): void {
  _declinedBundles.clear();
}

/**
 * Merge a remote blob's `settings.json` into local settings and apply the keys
 * that actually changed, after confirming with the user.
 *
 * Returns true when something was applied, so callers can report whether a pull
 * changed anything.
 */
export async function applyRemoteSettings(
  files: Record<string, string>,
  confirm?: SettingsPullConfirm,
): Promise<boolean> {
  try {
    const remoteRaw = files["settings.json"];
    if (!remoteRaw) return false;
    const remote = JSON.parse(remoteRaw) as UserDataBundle;
    if (remote.type !== "voltius-user-data") return false;
    if (_declinedBundles.has(remote.exported_at)) return false;

    const localRaw = await invoke<string | null>("settings_load");
    const local = localRaw ? (JSON.parse(localRaw) as UserDataBundle) : null;
    const { merged, updatedKeys } = mergeUserDataBundle(local, remote);
    if (updatedKeys.length === 0) return false;

    // Entities merge silently, but settings, shortcuts, and UI preferences are
    // this device's own configuration — changing them without asking would let
    // another device silently rewrite how this one behaves.
    if (local !== null && confirm) {
      const apply = await confirm(updatedKeys);
      if (!apply) {
        _declinedBundles.add(remote.exported_at);
        return false;
      }
    }

    await invoke("settings_save", { state: JSON.stringify(merged) });
    await applyUserDataBundle(merged, updatedKeys, { adoptTimestamps: true });
    return true;
  } catch {
    return false;
  }
}
