import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useUIStore } from "@/stores/uiStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useThemeStore } from "@/stores/themeStore";
import { getConnectionIcon, getConnectionIconColor } from "@/utils/icons";
import { type SyncStatus } from "@/services/sync";
import { selectEffectiveSyncStatus } from "@/services/syncStatus";
import { getGistSyncState, onGistSyncStateChange } from "@/plugins/gist-sync/sync-engine";
import { useRipple } from "@/hooks/useRipple";
import { useTeamSessionStore } from "@/stores/teamSessionStore";
import { ShareMenu } from "@/components/terminal/ShareMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { usePfToastBridge } from "@/hooks/usePfToastBridge";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { SyncDropdown } from "@/components/layout/SyncDropdown";
import { shouldStartWindowDrag } from "@/components/layout/titleBarDrag";
import { useDragStore } from "@/stores/dragStore";
import { findLeaf, firstLeaf, getPaneSessionIds, useLayoutStore } from "@/stores/layoutStore";
import { shouldSuppressDragClick } from "@/components/panes/usePaneDragController";
import { mergeTitlebarItems } from "@/utils/titlebarOrder";
import { useAllConnections } from "@/hooks/useAllConnections";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "@/components/shared/ContextMenu";
import { Modal, ModalCard } from "@/components/shared/Modal";
import { useTerminalActivityStore } from "@/stores/terminalActivityStore";

const appWindow = getCurrentWindow();

type TitlebarItem =
  | { key: string; type: "split"; tab: ReturnType<typeof useLayoutStore.getState>["splitTabs"][number] }
  | { key: string; type: "session"; session: ReturnType<typeof useSessionStore.getState>["sessions"][number] };

export default function TitleBar() {
  const { t } = useTranslation();
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const setHomeView = useUIStore((s) => s.setHomeView);
  const newTabOpen = useUIStore((s) => s.newTabOpen);
  const closeNewTab = useUIStore((s) => s.closeNewTab);
  const activeNav = useUIStore((s) => s.activeNav);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const sftpPanelOpen = useUIStore((s) => s.sftpPanelOpen);
  const setSftpPanelOpen = useUIStore((s) => s.setSftpPanelOpen);
  const activeThemeName = useThemeStore((s) => s.getActiveTheme().name);
  const { sessions, activeSessionId, setActive, renameSession, disconnect, removeSession } = useSessionStore();
  const connections = useAllConnections();
  const splitTabs = useLayoutStore((s) => s.splitTabs);
  const activeSplitTabId = useLayoutStore((s) => s.activeSplitTabId);
  const splitTabActive = useLayoutStore((s) => s.splitTabActive);
  const splitRoot = useLayoutStore((s) => s.root);
  const maximizedPaneId = useLayoutStore((s) => s.maximizedPaneId);
  const setSplitTabActive = useLayoutStore((s) => s.setSplitTabActive);
  const activateSplitTab = useLayoutStore((s) => s.activateSplitTab);
  const renameSplitTab = useLayoutStore((s) => s.renameSplitTab);
  const closeSplitTab = useLayoutStore((s) => s.closeSplitTab);
  const titlebarOrder = useLayoutStore((s) => s.titlebarOrder);
  const syncTitlebarOrder = useLayoutStore((s) => s.syncTitlebarOrder);
  const isDraggingTitlebarItem = useDragStore((s) => s.isDragging && s.dragType === "tab");
  const isDraggingPane = useDragStore((s) => s.isDragging && s.dragType === "pane");
  const draggedSessionId = useDragStore((s) => s.sessionId);
  const dropTarget = useDragStore((s) => s.dropTarget);
  const titlebarDropActive = isDraggingPane && dropTarget?.type === "titlebar";

  usePfToastBridge();

  const [gistSyncState, setGistSyncState] = useState(getGistSyncState);
  useEffect(() => { return onGistSyncStateChange(() => setGistSyncState(getGistSyncState())); }, []);

  const accountMode = useSubscriptionStore((s) => s.accountMode);

  const {
    configured: effectiveConfigured,
    status: effectiveSyncStatus,
    lastSync: effectiveLastSync,
    error: effectiveError,
  } = selectEffectiveSyncStatus({ gist: gistSyncState });

  const [syncDropdownOpen, setSyncDropdownOpen] = useState(false);
  const syncButtonRef = useRef<HTMLButtonElement>(null);

  const showTerminal = activeSessionId !== null && sessions.length > 0 && activeNav === "terminal" && !sftpPanelOpen;
  const isVaultsActive = !newTabOpen && !sftpPanelOpen && activeNav !== "terminal";
  const isVaultCompact = !isVaultsActive && sessions.length > 0;

  const mpConnections = useTeamSessionStore((s) => s.connections);
  const leaveMultiplayerSession = useTeamSessionStore((s) => s.leaveSession);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const tier = useSubscriptionStore((s) => s.tier);
  const openSettings = useUIStore((s) => s.openSettings);
  const openCloudAuth = useUIStore((s) => s.openCloudAuth);
  const tabContextMenu = useContextMenu();
  const [tabContextTarget, setTabContextTarget] = useState<
    { type: "session" | "split"; id: string } | null
  >(null);
  const [renameTarget, setRenameTarget] = useState<
    { type: "session" | "split"; id: string; currentName: string } | null
  >(null);
  const unreadSessions = useTerminalActivityStore((s) => s.unread);
  const clearUnread = useTerminalActivityStore((s) => s.clearUnread);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const isActiveSessionMultiplayer = activeSession?.type === "multiplayer";
  const isActiveSessionSharing = activeSessionId ? !!mpConnections[activeSessionId] && !mpConnections[activeSessionId]?.ended : false;
  const isActiveSessionEnded = activeSessionId ? !!mpConnections[activeSessionId]?.ended : false;

  const isSftpCompact = !sftpPanelOpen && sessions.length > 0;
  const splitSessionIds = splitTabs.flatMap((tab) => getPaneSessionIds(tab.root));
  const splitSessionIdSet = new Set(splitSessionIds);
  const visibleSessions = sessions.filter((session) => !splitSessionIdSet.has(session.id));
  const draggedSession = titlebarDropActive ? sessions.find((session) => session.id === draggedSessionId) : null;
  const splitItems: TitlebarItem[] = splitTabs.map((tab) => ({ key: `split:${tab.id}`, type: "split", tab }));
  const sessionItems: TitlebarItem[] = visibleSessions.map((session) => ({ key: `session:${session.id}`, type: "session", session }));
  const titlebarItemMap = new Map([...splitItems, ...sessionItems].map((item) => [item.key, item]));
  const visibleItemKeys = [...splitItems, ...sessionItems].map((item) => item.key);
  const orderedItemKeys = mergeTitlebarItems(titlebarOrder, visibleItemKeys);
  const titlebarItems = orderedItemKeys.flatMap((key) => {
    const item = titlebarItemMap.get(key);
    return item ? [item] : [];
  });

  useEffect(() => {
    syncTitlebarOrder(visibleItemKeys);
  }, [syncTitlebarOrder, visibleItemKeys.join("|")]);

  // Ensure the user never gets stuck on an empty terminal view.
  // When all sessions are gone, fall back to Vaults.
  useEffect(() => {
    if (sessions.length === 0 && activeNav === "terminal") {
      setActiveNav("hosts");
    }
  }, [sessions.length, activeNav, setActiveNav]);

  // Output handlers mark every session. Clear only terminals that are truly
  // visible, so background tabs gain a badge while the current terminal does
  // not flash one. A maximized split pane leaves its siblings unread.
  useEffect(() => {
    if (newTabOpen || sftpPanelOpen || activeNav !== "terminal") return;
    if (!splitTabActive) {
      if (activeSessionId) clearUnread([activeSessionId]);
      return;
    }
    if (!splitRoot) return;
    if (maximizedPaneId) {
      const maximized = findLeaf(splitRoot, maximizedPaneId);
      if (maximized) clearUnread([maximized.sessionId]);
      return;
    }
    clearUnread(getPaneSessionIds(splitRoot));
  }, [
    newTabOpen,
    sftpPanelOpen,
    activeNav,
    splitTabActive,
    splitRoot,
    maximizedPaneId,
    activeSessionId,
    clearUnread,
  ]);

  const handleTabClick = (sessionId: string) => {
    if (shouldSuppressDragClick()) return;
    closeNewTab();
    setSftpPanelOpen(false);
    setSplitTabActive(false);
    setActive(sessionId);
    setActiveNav("terminal");
  };

  const closeSessionById = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    const mpConn = useTeamSessionStore.getState().connections[sessionId];
    if (mpConn) {
      if (mpConn.role === "host") {
        useTeamSessionStore.getState().stopSharing(sessionId).catch(() => {});
      } else {
        leaveMultiplayerSession(sessionId);
      }
    }
    // disconnect() is async; remove synchronously so the session can't linger as an ungrouped tab
    if (session?.type !== "multiplayer" && (session?.status === "connected" || session?.status === "connecting")) {
      disconnect(sessionId);
    }
    removeSession(sessionId);
  };

  const handleTabClose = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    closeSessionById(sessionId);
    useLayoutStore.getState().removeSession(sessionId);
    if (sessions.length <= 1) setActiveNav("hosts");
  };

  const duplicateSessionTab = (sessionId: string, splitHorizontally = false) => {
    const duplicateId = useSessionStore.getState().duplicateSession(sessionId);
    if (!duplicateId) return;
    closeNewTab();
    setSftpPanelOpen(false);
    setActiveNav("terminal");
    if (splitHorizontally) {
      useLayoutStore.getState().createSplitTab(sessionId, duplicateId, "bottom");
    } else {
      useLayoutStore.getState().setSplitTabActive(false);
    }
    setActive(duplicateId);
  };

  const handleUnifiedTabClick = (tabId: string) => {
    if (shouldSuppressDragClick()) return;
    closeNewTab();
    setSftpPanelOpen(false);
    activateSplitTab(tabId);
    const layout = useLayoutStore.getState();
    const leaf = findLeaf(layout.root, layout.activePaneId) ?? firstLeaf(layout.root);
    if (leaf) setActive(leaf.sessionId);
    setActiveNav("terminal");
  };

  const closeUnifiedTabById = (tabId: string) => {
    const tab = useLayoutStore.getState().splitTabs.find((candidate) => candidate.id === tabId);
    const ids = tab ? getPaneSessionIds(tab.root) : [];
    closeSplitTab(tabId);
    ids.forEach(closeSessionById);
    if (sessions.length <= ids.length) setActiveNav("hosts");
  };

  const handleUnifiedTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeUnifiedTabById(tabId);
  };

  const splitTabLabel = (tab: (typeof splitTabs)[number]) => {
    if (tab.name?.trim()) return tab.name;
    const ids = getPaneSessionIds(tab.root);
    const activeLeaf = findLeaf(tab.root, tab.activePaneId) ?? firstLeaf(tab.root);
    const active = activeLeaf ? sessions.find((session) => session.id === activeLeaf.sessionId) : null;
    const base = active?.connectionName ?? t("layout.titleBar.splitFallback");
    return ids.length > 1
      ? `${base}${t("layout.titleBar.splitCountSuffix", { count: ids.length - 1 })}`
      : base;
  };

  const beginRename = (target: { type: "session" | "split"; id: string }) => {
    const currentName = target.type === "session"
      ? sessions.find((session) => session.id === target.id)?.connectionName
      : (() => {
          const tab = splitTabs.find((candidate) => candidate.id === target.id);
          return tab ? splitTabLabel(tab) : undefined;
        })();
    if (currentName) setRenameTarget({ ...target, currentName });
  };

  const handleDragRegionMouseDown = (e: React.MouseEvent) => {
    if (shouldStartWindowDrag(e.target as HTMLElement, e.button)) {
      appWindow.startDragging();
    }
  };

  const updateTitlebarDropTarget = (e: React.MouseEvent<HTMLDivElement>) => {
    const drag = useDragStore.getState();
    if (drag.dragType !== "pane" && drag.dragType !== "tab") return;
    const tab = (e.target as HTMLElement).closest<HTMLElement>("[data-titlebar-key]");
    if (!tab || !e.currentTarget.contains(tab)) {
      useDragStore.getState().setDropTarget({ type: "titlebar", targetKey: null, placement: "after" });
      return;
    }
    const rect = tab.getBoundingClientRect();
    useDragStore.getState().setDropTarget({
      type: "titlebar",
      targetKey: tab.dataset.titlebarKey ?? null,
      placement: e.clientX < rect.left + rect.width / 2 ? "before" : "after",
    });
  };

  const renderTitlebarDropCue = (itemKey: string | null, placement: "before" | "after") => {
    if (dropTarget?.type !== "titlebar" || dropTarget.targetKey !== itemKey || (dropTarget.placement ?? "after") !== placement) return null;
    if (titlebarDropActive && draggedSession) return <DetachedPanePreview key={`preview-${itemKey ?? "end"}-${placement}`} session={draggedSession} />;
    if (!isDraggingTitlebarItem) return null;
    return <div key={`marker-${itemKey ?? "end"}-${placement}`} className="h-7 w-0.5 rounded-full shrink-0 bg-(--t-accent)" />;
  };

  const tabContextItems: ContextMenuItem[] = tabContextTarget?.type === "session"
    ? [
        {
          label: t("common.action.duplicate"),
          icon: "lucide:copy",
          onClick: () => duplicateSessionTab(tabContextTarget.id),
        },
        {
          label: t("common.action.rename"),
          icon: "lucide:pencil",
          onClick: () => beginRename(tabContextTarget),
        },
        {
          label: t("layout.titleBar.splitHorizontally"),
          icon: "lucide:rows-2",
          onClick: () => duplicateSessionTab(tabContextTarget.id, true),
        },
        {
          label: t("layout.titleBar.close"),
          icon: "lucide:x",
          danger: true,
          divider: true,
          onClick: () => {
            closeSessionById(tabContextTarget.id);
            useLayoutStore.getState().removeSession(tabContextTarget.id);
            if (sessions.length <= 1) setActiveNav("hosts");
          },
        },
      ]
    : tabContextTarget?.type === "split"
      ? [
          {
            label: t("common.action.rename"),
            icon: "lucide:pencil",
            onClick: () => beginRename(tabContextTarget),
          },
          {
            label: t("layout.titleBar.closeWorkspace"),
            icon: "lucide:x",
            danger: true,
            divider: true,
            onClick: () => closeUnifiedTabById(tabContextTarget.id),
          },
        ]
      : [];

  return (
    <div
      onMouseDown={handleDragRegionMouseDown}
      className="flex items-center h-12 shrink-0 select-none bg-transparent"
    >
      {/* Tabs row */}
      <div
        className="flex items-center flex-1 h-full gap-1 px-1 min-w-0"
      >
        {/* Vaults button */}
        <button
          onClick={() => {
            closeNewTab();
            setSftpPanelOpen(false);
            setActiveNav("hosts");
            setHomeView(false);
          }}
          className="flex items-center gap-2 h-8 shrink-0 transition-all"
          style={{
            marginLeft: "0.75rem",
            background: isVaultsActive ? "var(--t-vault-tab-active-bg)" : "var(--t-vault-tab-bg)",
            color: isVaultsActive ? "var(--t-text-primary)" : "var(--t-text-secondary)",
            borderRadius: "0.5rem",
            padding: isVaultCompact ? "0 0.5rem" : "0 0.75rem",
          }}
          onMouseEnter={(e) => {
            if (!isVaultsActive) (e.currentTarget as HTMLButtonElement).style.background = "var(--t-vault-tab-active-bg)";
          }}
          onMouseLeave={(e) => {
            if (!isVaultsActive) {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-secondary)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--t-vault-tab-bg)";
            }
          }}
        >
          <Icon icon="lucide:vault" width={17} />
          {!isVaultCompact && <span>{t("common.entity.vaults")}</span>}
        </button>

        {/* SFTP button */}
        <button
          onClick={() => {
            closeNewTab();
            const nextOpen = !sftpPanelOpen;
            if (nextOpen) setRightPanelOpen(false);
            setSftpPanelOpen(nextOpen);
          }}
          className="flex items-center gap-2 h-8 shrink-0 transition-all"
          style={{
            background: sftpPanelOpen ? "var(--t-vault-tab-active-bg)" : "var(--t-vault-tab-bg)",
            color: sftpPanelOpen ? "var(--t-text-primary)" : "var(--t-text-secondary)",
            borderRadius: "0.5rem",
            padding: isSftpCompact ? "0 0.5rem" : "0 0.75rem",
          }}
          title={t("layout.titleBar.sftpTitle")}
          onMouseEnter={(e) => {
            if (!sftpPanelOpen) {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--t-vault-tab-active-bg)";
            }
          }}
          onMouseLeave={(e) => {
            if (!sftpPanelOpen) {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-secondary)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--t-vault-tab-bg)";
            }
          }}
        >
          <Icon icon="lucide:folder-closed" width={17} />
          {!isSftpCompact && <span>{t("layout.titleBar.sftp")}</span>}
        </button>

        {/* Separator */}
        {sessions.length > 0 && (
          <div className="shrink-0 w-px h-[1.667rem] bg-(--t-bg-card-hover)" />
        )}

        {/* Scrollable session tabs */}
        <div
          className="flex items-center gap-1 overflow-x-auto flex-1 h-full min-w-0 rounded-lg transition-colors"
          style={{
            background: titlebarDropActive
              ? "color-mix(in srgb, var(--t-accent) 10%, transparent)"
              : undefined,
          }}
          onMouseEnter={updateTitlebarDropTarget}
          onMouseMove={updateTitlebarDropTarget}
          onMouseLeave={() => {
            if (useDragStore.getState().dropTarget?.type === "titlebar") useDragStore.getState().setDropTarget(null);
          }}
        >
        {titlebarItems.map((item) => {
          if (item.type === "split") {
            const tab = item.tab;
            const isActiveSplitTab = splitTabActive && activeSplitTabId === tab.id && activeNav === "terminal" && !sftpPanelOpen;
            const hasUnreadOutput = getPaneSessionIds(tab.root).some((sessionId) => unreadSessions[sessionId]);

            return (
              <div key={item.key} className="contents">
                {renderTitlebarDropCue(item.key, "before")}
                <button
                  data-titlebar-key={item.key}
                  onClick={() => handleUnifiedTabClick(tab.id)}
                  onMouseDown={(e) => {
                    if (e.button === 0) useDragStore.getState().beginSplitTabDrag(tab.id, e.clientX, e.clientY);
                    if (e.button === 1) { e.preventDefault(); handleUnifiedTabClose(e, tab.id); }
                  }}
                  onContextMenu={(e) => {
                    setTabContextTarget({ type: "split", id: tab.id });
                    tabContextMenu.open(e);
                  }}
                  className="group relative flex items-center gap-1.5 h-8 px-2 rounded-lg text-sm font-medium shrink-0 transition-all"
                  title={t("layout.titleBar.unifiedSplitTab")}
                  style={{
                    background: isActiveSplitTab ? "var(--t-terminal-tab-active-bg)" : "var(--t-tab-bg)",
                    color: isActiveSplitTab ? "var(--t-terminal-active-text)" : "var(--t-text-secondary)",
                    border: isActiveSplitTab ? "1px solid var(--t-terminal-active-border)" : "1px solid transparent",
                  }}
                >
                  <TabLeadingControl
                    active={isActiveSplitTab}
                    unread={hasUnreadOutput}
                    onClose={(event) => handleUnifiedTabClose(event, tab.id)}
                  >
                    <Icon icon="lucide:layout-dashboard" width={16} />
                  </TabLeadingControl>
                  <span className="max-w-[140px] truncate">
                    {splitTabLabel(tab)}
                  </span>
                </button>
                {renderTitlebarDropCue(item.key, "after")}
              </div>
            );
          }

          const session = item.session;
          const isActive = session.id === activeSessionId && activeNav === "terminal" && !sftpPanelOpen && !splitTabActive;
          const statusColor =
            session.status === "connected"  ? "var(--t-status-connected)" :
            session.status === "error"      ? "var(--t-status-error)" :
            session.status === "connecting" ? "var(--t-status-connecting)" :
                                              "var(--t-text-muted)";
          const connection = connections.find((c) => c.id === session.connectionId);
          const isLocal = session.type === "local";
          const connectionIcon = !isLocal && connection ? (connection.icon || connection.distro) : null;
          const distroIcon = connectionIcon ? getConnectionIcon(connectionIcon) : null;
          const distroBg = connectionIcon ? getConnectionIconColor(connectionIcon) : null;
          const hasUnreadOutput = !!unreadSessions[session.id];

          return (
            <div key={item.key} className="contents">
              {renderTitlebarDropCue(item.key, "before")}
              <button
                data-titlebar-key={item.key}
                onClick={() => handleTabClick(session.id)}
                onMouseDown={(e) => {
                  if (e.button === 0) useDragStore.getState().beginTabDrag(session.id, e.clientX, e.clientY, item.key);
                  if (e.button === 1) { e.preventDefault(); handleTabClose(e, session.id); }
                }}
                onContextMenu={(e) => {
                  setTabContextTarget({ type: "session", id: session.id });
                  tabContextMenu.open(e);
                }}
                className="group relative flex items-center gap-1.5 h-8 px-2 rounded-lg text-sm font-medium shrink-0 transition-all"
                style={{
                  background: isActive ? "var(--t-terminal-tab-active-bg)" : "var(--t-tab-bg)",
                  color: isActive ? "var(--t-terminal-active-text)" : "var(--t-text-secondary)",
                  border: isActive ? "1px solid var(--t-terminal-active-border)" : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--t-bg-toolbar)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--t-tab-bg)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-secondary)";
                  }
                }}
              >
                <TabLeadingControl
                  active={isActive}
                  unread={hasUnreadOutput}
                  onClose={(event) => handleTabClose(event, session.id)}
                >
                  {distroIcon ? (
                    <span
                      className="flex size-5 items-center justify-center rounded-sm"
                      style={{ background: distroBg ?? "transparent", color: "#fff" }}
                    >
                      <Icon icon={distroIcon} width={14} />
                    </span>
                  ) : isLocal ? (
                    <span
                      className="flex size-5 items-center justify-center rounded-sm"
                      style={{ color: isActive ? "var(--t-terminal-active-text)" : statusColor }}
                    >
                      <Icon icon="lucide:terminal" width={14} />
                    </span>
                  ) : (
                    <span
                      className="size-2 rounded-full"
                      style={{ background: statusColor }}
                    />
                  )}
                </TabLeadingControl>
                <span className="max-w-[140px] truncate">{session.connectionName}</span>
              </button>
              {renderTitlebarDropCue(item.key, "after")}
            </div>
          );
        })}

        {renderTitlebarDropCue(null, "after")}

        {newTabOpen && (
          <button
            className="group relative flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-(--t-terminal-active-border) bg-(--t-terminal-tab-active-bg) px-2 text-sm font-medium text-(--t-terminal-active-text)"
            title={t("layout.titleBar.newTab")}
          >
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                closeNewTab();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") closeNewTab();
              }}
              className="rounded-sm p-0.5 text-(--t-terminal-active-text) transition-colors hover:text-(--t-status-error)"
            >
              <Icon icon="lucide:x" width={15} />
            </span>
            <span className="max-w-[140px] truncate">{t("layout.titleBar.newTab")}</span>
          </button>
        )}

        {/* New tab button */}
        <NewTabButton />
        </div>
      </div>

      {accountMode === "server" && <SubscriptionBadge />}

      {/* Sync indicator */}
      <SyncIndicator
        anchorRef={syncButtonRef}
        status={effectiveSyncStatus}
        lastSync={effectiveLastSync}
        error={effectiveError}
        active={syncDropdownOpen}
        configured={effectiveConfigured}
        onClick={() => setSyncDropdownOpen((o) => !o)}
      />
      <SyncDropdown
        anchorRef={syncButtonRef}
        open={syncDropdownOpen}
        onClose={() => setSyncDropdownOpen(false)}
      />

      {/* Watching / Ended badge — guest in a multiplayer session */}
      {showTerminal && isActiveSessionMultiplayer && (
        <div className="flex items-center px-1 shrink-0">
          {isActiveSessionEnded ? (
            <span
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
              style={{
                background: "color-mix(in srgb, var(--t-status-error) 12%, transparent)",
                color: "var(--t-status-error)",
                border: "1px solid color-mix(in srgb, var(--t-status-error) 25%, transparent)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--t-status-error)" }} />
              {t("layout.titleBar.ended")}
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
              style={{
                background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                color: "var(--t-accent)",
                border: "1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--t-accent)" }} />
              {t("layout.titleBar.watching")}
            </span>
          )}
        </div>
      )}

      {/* Share button — only in terminal view for non-multiplayer sessions */}
      {showTerminal && !isActiveSessionMultiplayer && (
        <div className="flex items-center px-1 shrink-0" data-no-drag>
          <button
            ref={shareButtonRef}
            onClick={() => setShareDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all"
            style={{
              background: isActiveSessionSharing
                ? "color-mix(in srgb, var(--t-accent) 15%, transparent)"
                : shareDropdownOpen ? "var(--t-bg-elevated)" : "transparent",
              color: isActiveSessionSharing ? "var(--t-accent)" : "var(--t-text-secondary)",
              border: isActiveSessionSharing
                ? "1px solid color-mix(in srgb, var(--t-accent) 30%, transparent)"
                : "1px solid transparent",
            }}
            title={
              isActiveSessionSharing        ? t("layout.titleBar.sharingCurrently") :
              accountMode !== "server"      ? t("layout.titleBar.signInToShare") :
              tier === "free"               ? t("layout.titleBar.sharingRequiresPro") :
                                              t("layout.titleBar.shareTerminal")
            }
            onMouseEnter={(e) => {
              if (!isActiveSessionSharing && !shareDropdownOpen) {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-primary)";
                (e.currentTarget as HTMLButtonElement).style.background = "var(--t-bg-elevated)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActiveSessionSharing && !shareDropdownOpen) {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-secondary)";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }
            }}
          >
            <Icon icon="lucide:radio" width={13} />
            {isActiveSessionSharing ? t("layout.titleBar.sharing") : t("layout.titleBar.share")}
          </button>
          {activeSessionId && (
            <ShareMenu
              anchorRef={shareButtonRef}
              open={shareDropdownOpen}
              onClose={() => setShareDropdownOpen(false)}
              activeSessionId={activeSessionId}
              connectionName={activeSession?.connectionName ?? t("layout.titleBar.terminalFallback")}
              connectionVaultId={connections.find((c) => c.id === activeSession?.connectionId)?.vault_id}
              isLoggedIn={accountMode === "server"}
              tier={tier}
              onSignIn={() => { setShareDropdownOpen(false); openCloudAuth("signin"); }}
              onUpgrade={() => { setShareDropdownOpen(false); openSettings("account"); }}
            />
          )}
        </div>
      )}

      {/* Right panel toggle — only in terminal view */}
      {showTerminal && (
        <div className="flex items-center px-2 shrink-0" data-no-drag>
          <button
            onClick={() => toggleRightPanel()}
            className="p-1.5 rounded-md transition-all"
            style={{
              background: rightPanelOpen ? "var(--t-tab-active-bg)" : "transparent",
              color: rightPanelOpen ? "var(--t-tab-active-text)" : "var(--t-text-secondary)",
              border: rightPanelOpen ? "1px solid var(--t-tab-active-border)" : "1px solid transparent",
            }}
            title={t("layout.titleBar.themesTools", { theme: activeThemeName })}
            onMouseEnter={(e) => { if (!rightPanelOpen) { (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-bright)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--t-bg-elevated)"; } }}
            onMouseLeave={(e) => { if (!rightPanelOpen) { (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-secondary)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; } }}
          >
            <Icon icon="lucide:panel-right" width={16} />
          </button>
        </div>
      )}

      <NotificationBell />

      {/* Window controls */}
      <div className="flex items-center gap-0.5 px-2 shrink-0" data-no-drag>
        <TitleBarBtn onClick={() => appWindow.minimize()} title={t("layout.titleBar.minimize")}>
          <Icon icon="lucide:minus" width={16} />
        </TitleBarBtn>
        <TitleBarBtn onClick={() => appWindow.toggleMaximize()} title={t("layout.titleBar.maximize")}>
          <Icon icon="lucide:square" width={13} />
        </TitleBarBtn>
        <TitleBarBtn onClick={() => appWindow.close()} title={t("layout.titleBar.close")}>
          <Icon icon="lucide:x" width={16} />
        </TitleBarBtn>
      </div>
      {tabContextMenu.pos && tabContextItems.length > 0 && (
        <ContextMenu
          items={tabContextItems}
          pos={tabContextMenu.pos}
          onClose={() => {
            tabContextMenu.close();
            setTabContextTarget(null);
          }}
        />
      )}
      {renameTarget && (
        <RenameTabModal
          initialName={renameTarget.currentName}
          onClose={() => setRenameTarget(null)}
          onSave={(name) => {
            if (renameTarget.type === "session") renameSession(renameTarget.id, name);
            else renameSplitTab(renameTarget.id, name);
            setRenameTarget(null);
          }}
        />
      )}
    </div>
  );
}

function RenameTabModal({
  initialName,
  onClose,
  onSave,
}: {
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();

  return (
    <Modal onClose={onClose} blur={false}>
      <ModalCard solid className="w-[22rem] max-w-[90vw] p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed) onSave(trimmed);
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <h2 className="text-base font-semibold text-(--t-text-primary)">
              {t("layout.titleBar.renameTabTitle")}
            </h2>
            <p className="mt-1 text-xs text-(--t-text-dim)">
              {t("layout.titleBar.renameTabDescription")}
            </p>
          </div>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            placeholder={t("layout.titleBar.renameTabPlaceholder")}
            className="h-9 w-full rounded-lg border border-(--t-border) bg-(--t-bg-input) px-3 text-sm text-(--t-text-primary) outline-none focus:border-(--t-accent)"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-lg px-3 text-sm text-(--t-text-secondary) hover:bg-(--t-bg-card-hover)"
            >
              {t("common.action.cancel")}
            </button>
            <button
              type="submit"
              disabled={!trimmed}
              className="h-8 rounded-lg bg-(--t-accent) px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("common.action.rename")}
            </button>
          </div>
        </form>
      </ModalCard>
    </Modal>
  );
}

function NewTabButton() {
  const { t } = useTranslation();
  const { createRipple, rippleEls } = useRipple();
  const openNewTab = useUIStore((s) => s.openNewTab);
  const newTabOpen = useUIStore((s) => s.newTabOpen);
  return (
      <button
        onClick={openNewTab}
        onMouseDown={createRipple}
        className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors relative overflow-hidden"
        style={{
          color: newTabOpen ? "var(--t-tab-active-text)" : "var(--t-text-dim)",
          background: newTabOpen ? "var(--t-bg-toolbar)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!newTabOpen) {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--t-tab-active-text)";
            (e.currentTarget as HTMLButtonElement).style.background = "var(--t-bg-toolbar)";
          }
        }}
        onMouseLeave={(e) => {
          if (!newTabOpen) {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-dim)";
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }
        }}
        title={t("layout.titleBar.newSession")}
      >
        {rippleEls}
        <Icon icon="lucide:plus" width={18} />
      </button>
  );
}

function TabLeadingControl({
  active,
  unread,
  onClose,
  children,
}: {
  active: boolean;
  unread: boolean;
  onClose: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center">
      <span
        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          active ? "opacity-0" : "opacity-100 group-hover:opacity-0"
        }`}
      >
        {children}
        {unread && (
          <span
            data-terminal-unread
            className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full"
            style={{
              background:
                "var(--t-terminal-activity)",
              boxShadow: "0 0 0 1px var(--t-tab-bg)",
            }}
          />
        )}
      </span>
      <span
        onClick={onClose}
        className={`absolute inset-0 flex items-center justify-center rounded-sm text-(--t-terminal-active-text) transition-opacity hover:text-(--t-status-error) [&_path]:stroke-[2.1] ${
          active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <Icon icon="lucide:x" width={16} />
      </span>
    </span>
  );
}

function DetachedPanePreview({ session }: { session: ReturnType<typeof useSessionStore.getState>["sessions"][number] }) {
  const connections = useAllConnections();
  const connection = connections.find((c) => c.id === session.connectionId);
  const isLocal = session.type === "local";
  const connectionIcon = !isLocal && connection ? (connection.icon || connection.distro) : null;
  const distroIcon = connectionIcon ? getConnectionIcon(connectionIcon) : null;
  const distroBg = connectionIcon ? getConnectionIconColor(connectionIcon) : null;
  const statusColor =
    session.status === "connected"  ? "var(--t-status-connected)" :
    session.status === "error"      ? "var(--t-status-error)" :
    session.status === "connecting" ? "var(--t-status-connecting)" :
                                      "var(--t-text-muted)";

  return (
    <div
      className="pointer-events-none flex items-center gap-1.5 h-8 px-2 rounded-lg text-sm font-medium shrink-0 transition-all"
      style={{
        background: "var(--t-terminal-tab-active-bg)",
        color: "var(--t-terminal-active-text)",
        border: "1px solid var(--t-terminal-active-border)",
        boxShadow: "0 0 0 1px color-mix(in srgb, var(--t-terminal-active-border) 35%, transparent)",
      }}
    >
      {distroIcon ? (
        <span
          className="flex items-center justify-center size-6 rounded-md shrink-0"
          style={{ background: distroBg ?? "transparent", color: "#fff" }}
        >
          <Icon icon={distroIcon} width={16} />
        </span>
      ) : isLocal ? (
        <span
          className="flex items-center justify-center size-6 rounded-md shrink-0"
          style={{ color: "var(--t-terminal-active-text)" }}
        >
          <Icon icon="lucide:terminal" width={14} />
        </span>
      ) : (
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor }} />
      )}
      <span className="max-w-[140px] truncate">{session.connectionName}</span>
    </div>
  );
}

function TitleBarBtn({ onClick, title, children }: {
  onClick: (() => void) | undefined;
  title: string;
  children: React.ReactNode;
}) {
  const { createRipple, rippleEls } = useRipple();
  return (
    <button
      onClick={onClick}
      onMouseDown={createRipple}
      title={title}
      className="flex items-center justify-center size-7 rounded-md transition-colors text-(--t-text-dim) bg-transparent relative overflow-hidden"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--t-bg-elevated)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {rippleEls}
      {children}
    </button>
  );
}


function SubscriptionBadge() {
  const { t } = useTranslation();
  const openSettings = useUIStore((s) => s.openSettings);
  const { tier, trialEndsAt, trialUsed, trialKnown, isTrialActive } = useSubscriptionStore();
  const [hovered, setHovered] = useState(false);

  const isPremium = tier !== "free";

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : 0;

  const hoverLabel = isTrialActive
    ? t("layout.titleBar.plan.proTrial", { daysLeft })
    : tier === "teams" ? t("layout.titleBar.plan.teams")
    : tier === "business" ? t("layout.titleBar.plan.business")
    : tier === "pro" ? t("layout.titleBar.plan.pro")
    : trialKnown && !trialUsed ? t("layout.titleBar.plan.upgradeTrial")
    : t("layout.titleBar.plan.upgrade");

  return (
    <div className="flex items-center px-1 shrink-0">
      <button
        onClick={() => openSettings("account")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex items-center gap-1.5 h-7 rounded-lg overflow-hidden transition-all"
        style={{
          maxWidth: hovered ? "10rem" : "2rem",
          padding: hovered ? "0 0.5rem" : "0 0.375rem",
          whiteSpace: "nowrap",
          transition: "max-width 250ms ease, padding 250ms ease, color 150ms ease",
          color: hovered
            ? isPremium ? "#f59e0b" : "var(--t-accent)"
            : isPremium ? "#f59e0b" : "var(--t-text-secondary)",
          background: hovered ? "var(--t-bg-elevated)" : "transparent",
        }}
        title={hoverLabel}
      >
        <Icon
          icon={isPremium ? "lucide:crown" : "lucide:circle-fading-arrow-up"}
          width={14}
          className="shrink-0"
        />
        <span className="text-xs font-medium overflow-hidden" style={{ opacity: hovered ? 1 : 0, transition: "opacity 150ms ease" }}>
          {hoverLabel}
        </span>
      </button>
    </div>
  );
}

function SyncIndicator({
  anchorRef,
  status,
  lastSync,
  error,
  active,
  configured,
  onClick,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  status: SyncStatus;
  lastSync: Date | null;
  error: string | null;
  active: boolean;
  configured: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const { createRipple, rippleEls } = useRipple();
  const icon = !configured ? "lucide:cloud-off" :
    status === "syncing" ? "lucide:refresh-cw" :
    status === "success" ? "lucide:cloud-check" :
    status === "error"   ? "lucide:cloud-alert" :
    status === "offline" ? "lucide:wifi-off" :
                           "lucide:cloud";

  const color = !configured ? "var(--t-text-dim)" :
    status === "syncing" ? "var(--t-text-primary)" :
    status === "success" ? "var(--t-status-connected)" :
    status === "error"   ? "var(--t-status-error)" :
    status === "offline" ? "var(--t-text-dim)" :
                           "var(--t-text-muted)";

  const title = !configured ? t("layout.sync.status.notConfigured") :
    status === "syncing" ? t("layout.sync.status.syncing") :
    status === "success" ? (lastSync ? t("layout.sync.status.syncedAt", { time: lastSync.toLocaleTimeString() }) : t("layout.sync.status.synced")) :
    status === "error"   ? t("layout.sync.status.errorDetail", { error: error ?? t("layout.sync.status.unknown") }) :
    status === "offline" ? t("layout.sync.status.offline") :
                           t("layout.sync.status.default");

  return (
    <div className="flex items-center px-1 shrink-0">
      <button
        ref={anchorRef}
        onClick={onClick}
        onMouseDown={createRipple}
        className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors relative overflow-hidden cursor-pointer"
        style={{
          color: active ? "var(--t-tab-active-text)" : color,
          background: active ? "var(--t-tab-active-bg)" : "transparent",
          border: active ? "1px solid var(--t-tab-active-border)" : "1px solid transparent",
        }}
        title={title}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--t-bg-toolbar)";
            (e.currentTarget as HTMLButtonElement).style.color = status === "error"
              ? "var(--t-status-error)" : "var(--t-tab-active-text)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = color;
          }
        }}
      >
        {rippleEls}
        <Icon
          icon={icon}
          width={18}
          className={status === "syncing" ? "animate-spin" : ""}
        />
      </button>
    </div>
  );
}
