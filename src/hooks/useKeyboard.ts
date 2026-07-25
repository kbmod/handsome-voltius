import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useTeamSessionStore } from "@/stores/teamSessionStore";
import { matchShortcut } from "@/stores/shortcutStore";
import { useHistoryStore } from "@/stores/historyStore";
import { getPaneSessionIds, useLayoutStore } from "@/stores/layoutStore";
import { launchLocalShell } from "@/services/launch";
import { openTerminalSearch, getTerminalApi, getTerminalSearchController } from "@/hooks/useTerminal";

interface ShortcutDispatchOptions {
  /** xterm's hidden textarea is an input, but app shortcuts must still win there. */
  ignoreInput?: boolean;
  terminalSessionId?: string;
}

function activateSession(sessionId: string) {
  const ui = useUIStore.getState();
  ui.closeNewTab();
  ui.setSftpPanelOpen(false);
  ui.setActiveNav("terminal");
  useLayoutStore.getState().setSplitTabActive(false);
  useSessionStore.getState().setActive(sessionId);
}

function closeActiveTab() {
  const ui = useUIStore.getState();
  if (ui.newTabOpen) {
    ui.closeNewTab();
    return;
  }

  const layout = useLayoutStore.getState();
  if (layout.splitTabActive && layout.activeSplitTabId) {
    const tab = layout.splitTabs.find((candidate) => candidate.id === layout.activeSplitTabId);
    const ids = tab ? getPaneSessionIds(tab.root) : [];
    layout.closeSplitTab(layout.activeSplitTabId);
    for (const id of ids) closeSession(id);
    return;
  }

  const activeId = useSessionStore.getState().activeSessionId;
  if (activeId) closeSession(activeId);
}

function closeSession(sessionId: string) {
  const sessionStore = useSessionStore.getState();
  const session = sessionStore.sessions.find((candidate) => candidate.id === sessionId);
  const multiplayer = useTeamSessionStore.getState().connections[sessionId];
  if (multiplayer) {
    if (multiplayer.role === "host") {
      void useTeamSessionStore.getState().stopSharing(sessionId);
    } else {
      useTeamSessionStore.getState().leaveSession(sessionId);
    }
  }
  if (session?.status === "connected" || session?.status === "connecting") {
    void sessionStore.disconnect(sessionId);
  }
  sessionStore.removeSession(sessionId);
  useLayoutStore.getState().removeSession(sessionId);
}

function cycleSession(direction: 1 | -1) {
  const { sessions, activeSessionId } = useSessionStore.getState();
  if (sessions.length === 0) return;
  const current = Math.max(0, sessions.findIndex((session) => session.id === activeSessionId));
  const next = sessions[(current + direction + sessions.length) % sessions.length];
  activateSession(next.id);
}

/** Shared by the document listener and xterm's custom key handler. */
export function handleAppKeyDown(
  e: KeyboardEvent,
  { ignoreInput = false, terminalSessionId }: ShortcutDispatchOptions = {},
): boolean {
  const target = e.target instanceof HTMLElement ? e.target : null;
  const tag = target?.tagName;
  const isInput = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
  const isTerminalInput = target?.classList.contains("xterm-helper-textarea") ?? false;

  if (matchShortcut("omni", e)) {
    e.preventDefault();
    const ui = useUIStore.getState();
    if (ui.newTabOpen) {
      window.dispatchEvent(new CustomEvent("voltius:focus-new-tab-search"));
    } else {
      ui.setOmniOpen(true);
    }
    return true;
  }

  if (matchShortcut("jump-to", e)) {
    e.preventDefault();
    useUIStore.getState().setOmniOpen(true);
    return true;
  }

  if (matchShortcut("shortcuts", e)) {
    e.preventDefault();
    const { settingsOpen, settingsSection, setSettingsOpen, openSettings } = useUIStore.getState();
    if (settingsOpen && settingsSection === "shortcuts") setSettingsOpen(false);
    else openSettings("shortcuts");
    return true;
  }

  if (matchShortcut("themes", e)) {
    e.preventDefault();
    const { settingsOpen, setSettingsOpen } = useUIStore.getState();
    setSettingsOpen(!settingsOpen);
    return true;
  }

  if (matchShortcut("new-tab", e)) {
    e.preventDefault();
    useUIStore.getState().openNewTab();
    return true;
  }

  const isEditableInput = !ignoreInput && isInput && !isTerminalInput;

  // Termius-compatible direct tab selection: Ctrl+1 through Ctrl+9.
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && /^[1-9]$/.test(e.key)) {
    const session = useSessionStore.getState().sessions[Number(e.key) - 1];
    if (session) {
      e.preventDefault();
      activateSession(session.id);
      return true;
    }
  }

  if (matchShortcut("terminal-search", e)) {
    e.preventDefault();
    const { rightPanelOpen, rightPanelSection, activeNav } = useUIStore.getState();
    const searchableSections = ["snippets", "history", "plugin:docker"];
    if (rightPanelOpen && searchableSections.includes(rightPanelSection)) {
      window.dispatchEvent(new CustomEvent("voltius:focus-panel-search"));
    } else if (activeNav === "terminal") {
      const activeId = terminalSessionId ?? useSessionStore.getState().activeSessionId;
      if (activeId) openTerminalSearch(activeId);
    }
    return true;
  }

  if (e.ctrlKey && !e.altKey && (e.key === "g" || e.key === "G")) {
    e.preventDefault();
    const activeId = terminalSessionId ?? useSessionStore.getState().activeSessionId;
    const controller = activeId ? getTerminalSearchController(activeId) : undefined;
    if (controller?.getSnapshot().open) {
      if (e.shiftKey) controller.prev();
      else controller.next();
    }
    return true;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "a" && isTerminalInput) {
    e.preventDefault();
    const activeId = terminalSessionId ?? useSessionStore.getState().activeSessionId;
    if (activeId) getTerminalApi(activeId)?.selectAll();
    return true;
  }

  if (isEditableInput && (
    matchShortcut("undo", e)
    || matchShortcut("redo", e)
    || matchShortcut("delete", e)
    || ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "a")
  )) {
    return false;
  }

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "a" && !isTerminalInput) {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("voltius:select-all"));
    return true;
  }

  if (matchShortcut("undo", e)) {
    e.preventDefault();
    const { canUndo, undo } = useHistoryStore.getState();
    if (canUndo) undo();
    return true;
  }

  if (matchShortcut("redo", e)) {
    e.preventDefault();
    const { canRedo, redo } = useHistoryStore.getState();
    if (canRedo) redo();
    return true;
  }

  if (matchShortcut("delete", e)) {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("voltius:delete"));
    return true;
  }

  if (matchShortcut("history", e)) {
    e.preventDefault();
    useUIStore.getState().toggleRightPanel("history");
    return true;
  }

  if (matchShortcut("snippets", e)) {
    e.preventDefault();
    useUIStore.getState().toggleRightPanel("snippets");
    return true;
  }

  if (matchShortcut("panel-themes", e)) {
    e.preventDefault();
    useUIStore.getState().toggleRightPanel();
    return true;
  }

  if (matchShortcut("sidebar", e)) {
    e.preventDefault();
    useUIStore.getState().toggleSidebar();
    return true;
  }

  if (matchShortcut("local-terminal", e)) {
    e.preventDefault();
    launchLocalShell();
    return true;
  }

  if (matchShortcut("serial", e)) {
    e.preventDefault();
    useUIStore.getState().closeNewTab();
    void useSessionStore.getState().connectSerialEphemeral();
    useUIStore.getState().setActiveNav("terminal");
    return true;
  }

  if (matchShortcut("port-forwarding", e)) {
    e.preventDefault();
    const ui = useUIStore.getState();
    ui.closeNewTab();
    ui.setSftpPanelOpen(false);
    ui.setHomeView(false);
    ui.setActiveNav("port-forwarding");
    return true;
  }

  if (matchShortcut("broadcast", e)) {
    e.preventDefault();
    const layout = useLayoutStore.getState();
    if (layout.splitTabActive) layout.toggleBroadcast();
    return true;
  }

  if (matchShortcut("workspace-view", e)) {
    e.preventDefault();
    const layout = useLayoutStore.getState();
    if (layout.splitTabActive && layout.activePaneId) {
      layout.setMaximized(layout.maximizedPaneId === layout.activePaneId ? null : layout.activePaneId);
    }
    return true;
  }

  if (matchShortcut("close-tab", e)) {
    e.preventDefault();
    closeActiveTab();
    return true;
  }

  if (matchShortcut("next-tab", e)) {
    e.preventDefault();
    cycleSession(1);
    return true;
  }

  if (matchShortcut("prev-tab", e)) {
    e.preventDefault();
    cycleSession(-1);
    return true;
  }

  return false;
}

export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (handleAppKeyDown(event)) event.stopPropagation();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);
}
