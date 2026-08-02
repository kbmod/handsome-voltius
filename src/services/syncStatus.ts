/** Pure selection of the "effective" sync status from the Gist sync engine.
 *  No React/stores — node-testable. Shared by the desktop TitleBar and the
 *  mobile header so the two can't drift. */
import type { SyncStatus } from "./sync";

interface SyncStateLike {
  status: SyncStatus;
  lastSync: Date | null;
  error: string | null;
}

export interface EffectiveSync {
  /** Gist sync is set up: a PAT plus at least one registered Gist. */
  configured: boolean;
  status: SyncStatus;
  lastSync: Date | null;
  error: string | null;
}

/**
 * Personal sync is encrypted GitHub Gist sync and nothing else, so the surfaced
 * status is simply the engine's own.
 *
 * This deliberately does not consult the gist plugin's enabled flag. Sync is
 * driven by the app itself now, so an install can be syncing perfectly well
 * while that flag is false — keying the indicator off it reported "not
 * configured" (and a struck-through cloud icon) on a working install.
 */
export function selectEffectiveSyncStatus(i: {
  gist: SyncStateLike & { configured: boolean };
}): EffectiveSync {
  return {
    configured: i.gist.configured,
    status: i.gist.status,
    lastSync: i.gist.lastSync,
    error: i.gist.error,
  };
}

/** Lucide icon for a sync status (matches SyncDropdown). */
export function syncStatusIcon(status: SyncStatus): string {
  if (status === "syncing") return "lucide:refresh-cw";
  if (status === "success") return "lucide:cloud-check";
  if (status === "error") return "lucide:cloud-alert";
  if (status === "offline") return "lucide:wifi-off";
  return "lucide:cloud";
}

/** Theme color var for a sync status (matches SyncDropdown). */
export function syncStatusColor(status: SyncStatus): string {
  if (status === "success") return "var(--t-status-connected)";
  if (status === "error") return "var(--t-status-error)";
  if (status === "syncing") return "var(--t-text-primary)";
  if (status === "offline") return "var(--t-text-dim)";
  return "var(--t-text-muted)";
}
