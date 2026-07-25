import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { ConnectionAvatar } from "@/components/shared/ConnectionAvatar";
import { useAllConnections } from "@/hooks/useAllConnections";
import { useLocalShells } from "@/hooks/useLocalShells";
import { launchHost, launchLocalShell, launchQuickConnect } from "@/services/launch";
import { parseQuickConnect } from "@/services/quickConnect";
import { useSessionStore } from "@/stores/sessionStore";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";
import { useTeamStore } from "@/stores/teamStore";
import { partitionLauncherHosts, shellIcon, shellLabel } from "./newSessionItems";

export default function NewTabPage() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const connections = useAllConnections();
  const shells = useLocalShells();
  const sessions = useSessionStore((s) => s.sessions);
  const closeNewTab = useUIStore((s) => s.closeNewTab);
  const vaults = useVaultStore((s) => s.vaults);
  const teams = useTeamStore((s) => s.teams);

  const activeConnectionIds = useMemo(
    () => new Set(sessions.map((session) => session.connectionId)),
    [sessions],
  );
  const { recent, hosts } = useMemo(
    () => partitionLauncherHosts(connections, activeConnectionIds, query, 8, true),
    [connections, activeConnectionIds, query],
  );
  const quickIntent = useMemo(() => parseQuickConnect(query), [query]);
  const visibleHosts = query.trim() ? hosts : recent;
  const visibleShells = useMemo(
    () => (shells.length ? shells : [{ name: "Local shell", path: "" }]),
    [shells],
  );
  const quickOffset = quickIntent ? 1 : 0;
  const localOffset = quickOffset + visibleHosts.length;
  const serialIndex = localOffset + visibleShells.length;
  const itemCount = serialIndex + 1;

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const focusSearch = () => inputRef.current?.focus();
    window.addEventListener("voltius:focus-new-tab-search", focusSearch);
    return () => window.removeEventListener("voltius:focus-new-tab-search", focusSearch);
  }, []);

  const vaultName = (vaultId?: string) => {
    const id = vaultId ?? "personal";
    return vaults.find((vault) => vault.id === id || vault.teamId === id)?.name
      ?? teams.find((team) => team.id === id)?.name
      ?? "Personal";
  };

  const activateHost = (id: string) => {
    closeNewTab();
    launchHost(id);
  };

  const activateLocal = (path?: string) => {
    closeNewTab();
    launchLocalShell(path);
  };

  const activateSerial = () => {
    closeNewTab();
    void useSessionStore.getState().connectSerialEphemeral();
    useUIStore.getState().setActiveNav("terminal");
  };

  const activateQuickConnect = () => {
    if (!quickIntent) return;
    closeNewTab();
    launchQuickConnect(quickIntent);
  };

  return (
    <div className="h-full overflow-y-auto bg-(--t-bg-base) px-6 py-10">
      <div className="mx-auto flex w-full max-w-[48rem] flex-col gap-5">
        <div className="relative">
          <Icon
            icon="lucide:search"
            width={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-(--t-text-muted)"
          />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((current) => Math.min(current + 1, itemCount - 1));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((current) => Math.max(current - 1, 0));
                return;
              }
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (quickIntent && selected === 0) {
                activateQuickConnect();
                return;
              }
              const host = visibleHosts[selected - quickOffset];
              if (host) {
                activateHost(host.id);
                return;
              }
              const shell = visibleShells[selected - localOffset];
              if (shell) {
                activateLocal(shell.path || undefined);
                return;
              }
              if (selected === serialIndex) activateSerial();
            }}
            placeholder={t("layout.newSession.pageSearchPlaceholder")}
            className="h-10 w-full rounded-lg border border-(--t-border) bg-(--t-bg-input) pl-10 pr-20 text-sm text-(--t-text-primary) outline-hidden focus:border-(--t-accent)"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--t-text-muted)">
            Ctrl+K
          </span>
        </div>

        <section className="overflow-hidden rounded-2xl border border-(--t-border) bg-(--t-bg-card)">
          <div className="flex items-center justify-between border-b border-(--t-border) px-4 py-3">
            <h2 className="text-sm font-semibold text-(--t-text-primary)">
              {query.trim() ? t("layout.newSession.searchResults") : t("layout.newSession.recentConnections")}
            </h2>
            <span className="text-xs text-(--t-text-muted)">{visibleHosts.length}</span>
          </div>

          {quickIntent && (
            <button
              onClick={activateQuickConnect}
              onMouseEnter={() => setSelected(0)}
              className="flex w-full items-center gap-3 border-b border-(--t-border) px-4 py-3 text-left transition-colors hover:bg-(--t-bg-card-hover)"
              style={{ background: selected === 0 ? "var(--t-bg-card-hover)" : undefined }}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-(--t-bg-elevated) text-(--t-accent)">
                <Icon icon="lucide:corner-down-left" width={15} />
              </span>
              <span className="flex-1 text-sm font-medium text-(--t-text-primary)">
                {t("layout.newSession.quickConnectQuery", { query: query.trim() })}
              </span>
            </button>
          )}

          {visibleHosts.map((connection, index) => {
            const rowIndex = quickOffset + index;
            return (
            <button
              key={connection.id}
              onClick={() => activateHost(connection.id)}
              onMouseEnter={() => setSelected(rowIndex)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-(--t-bg-card-hover)"
              style={{ background: selected === rowIndex ? "var(--t-bg-card-hover)" : undefined }}
            >
              <ConnectionAvatar connection={connection} size={25} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-(--t-text-primary)">
                {connection.name || `${connection.username}@${connection.host}`}
              </span>
              <span className="truncate text-xs text-(--t-text-muted)">
                {vaultName(connection.vault_id)} / {connection.username}
              </span>
            </button>
            );
          })}

          {!quickIntent && visibleHosts.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-(--t-text-muted)">
              {query.trim()
                ? t("layout.newSession.noHostsMatch", { query: query.trim() })
                : t("layout.newSession.noRecentConnections")}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-(--t-border) bg-(--t-bg-card)">
          <div className="border-b border-(--t-border) px-4 py-3">
            <h2 className="text-sm font-semibold text-(--t-text-primary)">
              {t("layout.newSession.startSession")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
            {visibleShells.map((shell, index) => {
              const rowIndex = localOffset + index;
              return (
              <button
                key={shell.path || "default"}
                onClick={() => activateLocal(shell.path || undefined)}
                onMouseEnter={() => setSelected(rowIndex)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-(--t-bg-card-hover)"
                style={{ background: selected === rowIndex ? "var(--t-bg-card-hover)" : undefined }}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-(--t-bg-elevated) text-(--t-accent)">
                  <Icon icon={shell.path ? shellIcon(shell.name) : "lucide:square-terminal"} width={17} />
                </span>
                <span className="text-sm font-medium text-(--t-text-primary)">
                  {shell.path ? shellLabel(shell.name) : t("layout.newSession.localShellFallback")}
                </span>
              </button>
              );
            })}
            <button
              onClick={activateSerial}
              onMouseEnter={() => setSelected(serialIndex)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-(--t-bg-card-hover)"
              style={{ background: selected === serialIndex ? "var(--t-bg-card-hover)" : undefined }}
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-(--t-bg-elevated) text-(--t-accent)">
                <Icon icon="lucide:ethernet-port" width={17} />
              </span>
              <span className="text-sm font-medium text-(--t-text-primary)">
                {t("layout.newSession.serialConnection")}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
