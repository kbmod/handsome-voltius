import { useEffect, useState } from "react";
import { getGistSyncState, onGistSyncStateChange } from "@/plugins/gist-sync/sync-engine";
import { selectEffectiveSyncStatus, type EffectiveSync } from "@/services/syncStatus";

/** Subscribes to the sync engine and returns the effective sync status (the same
 *  selection the desktop TitleBar uses). For non-desktop shells. */
export function useEffectiveSyncStatus(): EffectiveSync {
  const [gistSyncState, setGistSyncState] = useState(getGistSyncState);
  useEffect(() => onGistSyncStateChange(() => setGistSyncState(getGistSyncState())), []);

  return selectEffectiveSyncStatus({ gist: gistSyncState });
}
