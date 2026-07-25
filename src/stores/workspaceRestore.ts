import {
  readWorkspaceSnapshot,
  clearWorkspaceSnapshot,
  startWorkspaceSnapshotSync,
} from "./workspaceSnapshotStore";
import { getToggle } from "./toggleSettingsStore";
import { resolveRemoteSessions } from "./liveSessionManifestCore";
import { useCrossDeviceSessionsStore } from "./crossDeviceSessionsStore";
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
  return {
    id: s.id,
    connectionId: s.connectionId,
    connectionName: s.connectionName,
    status: "connecting",
    persist: s.persist,
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
  useSessionStore
    .getState()
    .restoreSessions(snapshot.sessions.map(toTerminalSession), snapshot.activeSessionId);
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
    const advertisedIds = snapshot.sessions
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

  for (const s of snapshot.sessions) {
    if (closed.has(s.id)) continue; // killed on another device
    if (s.type === "ssh" || s.type === "serial") {
      // Launch restore is allowed to recreate a missing persistent tmux/screen
      // session. Attach-only is reserved for joining a session advertised by
      // another device and for reconnecting a previously live channel.
      await reconnect(s.id, { restore: s.persist, attachOnly: false });
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
