import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { Icon } from "@iconify/react";
import { PortRow } from "@/components/terminal/PortRow";
import { PortsPanelHeader } from "@/components/terminal/PortsPanelHeader";
import { QuickForwardRow } from "@/components/terminal/QuickForwardRow";
import { useSessionStore } from "@/stores/sessionStore";
import { usePortForwardingStore } from "@/stores/portForwardingStore";
import { useAllPortForwardingRules } from "@/hooks/useAllPortForwardingRules";
import {
  getPfState,
  openPfTunnel,
  closePfTunnel,
  resumeAutoPort,
  type PfSessionState,
} from "@/services/portForwardingTunnels";
import { createPfRule, updatePfRule, deletePfRule } from "@/services/portForwardingRules";
import { useDefaultVaultId, resolveVaultIdForSave } from "@/hooks/useWritableVaultIds";
import { formatActiveTunnelLabel, formatRuleLabel, getLocalTunnelHttpUrl } from "@/utils/tunnelFormat";
import type { ActiveTunnel, PortForwardingRule } from "@/types";

interface PfStatePayload {
  session_id: string;
  tunnels: ActiveTunnel[];
  suppressed_ports: number[];
}

export interface RuleTunnelOwner {
  sessionId: string;
  tunnel: ActiveTunnel;
}

export function getRuleTunnelOwners(
  sessionStates: Map<string, PfSessionState>,
): Map<string, RuleTunnelOwner> {
  const owners = new Map<string, RuleTunnelOwner>();
  for (const [sessionId, state] of sessionStates) {
    for (const tunnel of state.tunnels) {
      if (tunnel.origin.type === "rule" && !owners.has(tunnel.origin.rule_id)) {
        owners.set(tunnel.origin.rule_id, { sessionId, tunnel });
      }
    }
  }
  return owners;
}

export function PortsPanel() {
  const { t } = useTranslation();
  const { sessions, activeSessionId } = useSessionStore();
  const loadRules = usePortForwardingStore((s) => s.loadRules);
  const rules = useAllPortForwardingRules();
  const [sessionStates, setSessionStates] = useState<Map<string, PfSessionState>>(new Map());
  // Ports the user deleted from this panel — hidden even when suppressed
  const [hiddenPorts, setHiddenPorts] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const quickForwardInputRef = useRef<HTMLInputElement>(null);
  const savingTunnelsRef = useRef<Set<string>>(new Set());
  const defaultVaultId = useDefaultVaultId();
  const [renamingRuleId, setRenamingRuleId] = useState<string | null>(null);

  async function handleSaveAsRule(tunnel: ActiveTunnel) {
    if (!activeSessionId) return;
    if (savingTunnelsRef.current.has(tunnel.id)) return;
    savingTunnelsRef.current.add(tunnel.id);
    const key = `save-${tunnel.id}`;
    setBusyKey(key, true);
    try {
      const defaultName = `Port ${tunnel.remote_port}`;
      const rule = await createPfRule({
        name: defaultName,
        local_port: tunnel.local_port,
        remote_port: tunnel.remote_port,
        remote_host: tunnel.remote_host || "127.0.0.1",
        tunnel_type: "local",
        bind_host: "127.0.0.1",
        target_host: "127.0.0.1",
        connection_ids: activeSession?.connectionId ? [activeSession.connectionId] : [],
        vault_id: resolveVaultIdForSave(defaultVaultId),
      });
      await loadRules();
      // Re-open the running tunnel as rule-backed so it migrates ACTIVE → SAVED.
      await closePfTunnel(activeSessionId, tunnel.id);
      await openPfTunnel({
        sessionId: activeSessionId,
        localPort: tunnel.local_port,
        remotePort: tunnel.remote_port,
        remoteHost: tunnel.remote_host,
        tunnelType: "local",
        ruleId: rule.id,
        ruleName: rule.name,
      });
      setRenamingRuleId(rule.id);
    } catch (e) {
      console.error("save as rule failed:", e);
    } finally {
      setBusyKey(key, false);
      savingTunnelsRef.current.delete(tunnel.id);
    }
  }

  async function commitRename(ruleId: string, name: string) {
    setRenamingRuleId(null);
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule || name === rule.name) return;
    try {
      await updatePfRule(ruleId, {
        name,
        local_port: rule.local_port,
        remote_port: rule.remote_port,
        remote_host: rule.remote_host,
        tunnel_type: rule.tunnel_type,
        bind_host: rule.bind_host,
        target_host: rule.target_host,
        description: rule.description,
        connection_ids: rule.connection_ids,
        folder_id: rule.folder_id,
        vault_id: rule.vault_id,
      });
      await loadRules();
    } catch (e) {
      console.error("rename rule failed:", e);
    }
  }

  async function handleQuickForward(remotePort: number, localPort?: number) {
    if (!activeSessionId) return;
    await openPfTunnel({
      sessionId: activeSessionId,
      remotePort,
      localPort: localPort ?? remotePort,
      tunnelType: "local",
    });
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const isSshSession = activeSession?.type === "ssh";
  const sshSessionIds = sessions
    .filter((session) => session.type === "ssh" && session.status === "connected")
    .map((session) => session.id);
  const sshSessionIdKey = sshSessionIds.join(",");

  useEffect(() => { loadRules(); }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(sshSessionIds.map(async (sessionId) => {
      const state = await getPfState(sessionId);
      return [sessionId, state] as const;
    }))
      .then((entries) => {
        if (!cancelled) setSessionStates(new Map(entries));
      })
      .catch(() => {});

    let cleanup: (() => void) | undefined;
    listen<PfStatePayload>("pf-state-changed", ({ payload }) => {
      if (!sshSessionIds.includes(payload.session_id)) return;
      setSessionStates((previous) => new Map(previous).set(payload.session_id, {
        tunnels: payload.tunnels,
        suppressed_ports: payload.suppressed_ports,
      }));
    }).then((u) => { cleanup = u; });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sshSessionIdKey]);

  useEffect(() => {
    setHiddenPorts(new Set());
  }, [activeSessionId]);

  function setBusyKey(key: string, on: boolean) {
    setBusy((prev) => {
      const s = new Set(prev);
      if (on) s.add(key);
      else s.delete(key);
      return s;
    });
  }

  // ── Rule actions ──────────────────────────────────────────────────────────

  async function handleRuleEnable(rule: PortForwardingRule) {
    if (!activeSessionId) return;
    setBusyKey(rule.id, true);
    try {
      await openPfTunnel({
        sessionId: activeSessionId,
        localPort: rule.local_port,
        remotePort: rule.remote_port,
        remoteHost: rule.remote_host,
        tunnelType: rule.tunnel_type,
        bindHost: rule.bind_host,
        targetHost: rule.target_host,
        ruleId: rule.id,
        ruleName: rule.name,
      });
    } catch (e) { console.error("pf_tunnel_open failed:", e); }
    finally { setBusyKey(rule.id, false); }
  }

  async function handleRuleDisable(ownerSessionId: string, tunnelId: string, ruleId: string) {
    setBusyKey(ruleId, true);
    try { await closePfTunnel(ownerSessionId, tunnelId); }
    catch (e) { console.error("pf_tunnel_close failed:", e); }
    finally { setBusyKey(ruleId, false); }
  }

  async function handleRuleDelete(rule: PortForwardingRule, owner?: RuleTunnelOwner) {
    setBusyKey(`del-${rule.id}`, true);
    try {
      if (owner) await closePfTunnel(owner.sessionId, owner.tunnel.id);
      await deletePfRule(rule.id);
      await loadRules();
    } catch (e) { console.error("rule delete failed:", e); }
    finally { setBusyKey(`del-${rule.id}`, false); }
  }

  // ── Auto/adhoc tunnel actions ──────────────────────────────────────────────

  async function handleAutoResume(port: number) {
    if (!activeSessionId) return;
    setBusyKey(`port-${port}`, true);
    try { await resumeAutoPort(activeSessionId, port); }
    catch (e) { console.error("pf_tunnel_resume_auto failed:", e); }
    finally { setBusyKey(`port-${port}`, false); }
  }

  async function handleTunnelStop(tunnelId: string, key: string) {
    if (!activeSessionId) return;
    setBusyKey(key, true);
    try { await closePfTunnel(activeSessionId, tunnelId); }
    catch (e) { console.error("pf_tunnel_close failed:", e); }
    finally { setBusyKey(key, false); }
  }

  async function handleTunnelDelete(tunnelId: string, port: number, key: string) {
    if (!activeSessionId) return;
    setBusyKey(`del-${key}`, true);
    try {
      await closePfTunnel(activeSessionId, tunnelId);
      setHiddenPorts((prev) => new Set([...prev, port]));
    } catch (e) { console.error("pf_tunnel_close failed:", e); }
    finally { setBusyKey(`del-${key}`, false); }
  }

  function handleSuppressedDelete(port: number) {
    setHiddenPorts((prev) => new Set([...prev, port]));
  }

  if (!isSshSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center text-(--t-text-dim)">
        <Icon icon="lucide:network" width={24} />
        <span className="text-xs">{t("terminal.ports.sshRequired")}</span>
      </div>
    );
  }

  const currentState = activeSessionId ? sessionStates.get(activeSessionId) : undefined;
  const tunnels = currentState?.tunnels ?? [];
  const suppressedPorts = currentState?.suppressed_ports ?? [];
  const ruleOwners = getRuleTunnelOwners(sessionStates);
  const unclaimedTunnels: ActiveTunnel[] = [];
  for (const t of tunnels) {
    if (t.origin.type !== "rule") unclaimedTunnels.push(t);
  }

  const rulePorts = new Set(rules.map((r) => r.remote_port));
  const suppressedRows = suppressedPorts.filter(
    (p) => !rulePorts.has(p) && !hiddenPorts.has(p),
  );
  const visibleUnclaimed = unclaimedTunnels.filter((t) => !hiddenPorts.has(t.remote_port));

  const isEmpty = rules.length === 0 && visibleUnclaimed.length === 0 && suppressedRows.length === 0;
  const activeCount = tunnels.filter((t) => t.state === "active").length;

  return (
    <div className="flex flex-col h-full">
      <PortsPanelHeader activeCount={activeCount} onAdd={() => quickForwardInputRef.current?.focus()} />
      <div className="flex-1 min-h-0 overflow-y-auto">
      {isEmpty && (
        <div className="px-3 py-4 text-xs text-(--t-text-dim)">
          {t("terminal.ports.empty")}
        </div>
      )}

      {/* Saved rules */}
      {rules.length > 0 && (
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-(--t-text-dim)">
          {t("terminal.ports.sectionSaved")}
        </div>
      )}
      {rules.map((rule) => {
        const owner = ruleOwners.get(rule.id);
        const tunnel = owner?.tunnel;
        const ownerSession = owner
          ? sessions.find((session) => session.id === owner.sessionId)
          : undefined;
        const ownerConnectionId = ownerSession?.connectionId;
        const activeConnectionId = activeSession?.connectionId;
        const ownedElsewhere = !!owner && (
          ownerConnectionId && activeConnectionId
            ? ownerConnectionId !== activeConnectionId
            : owner.sessionId !== activeSessionId
        );
        const isRunning = !!tunnel;
        const isError = tunnel && typeof tunnel.state === "object" && "error" in tunnel.state;
        const isWaiting = tunnel?.state === "waiting";
        const isActive = tunnel?.state === "active";
        return (
          <PortRow
            key={rule.id}
            label={rule.name}
            portInfo={ownedElsewhere
              ? t("terminal.ports.inUseBy", { server: ownerSession?.connectionName ?? owner?.sessionId })
              : formatRuleLabel(rule)}
            isActive={!ownedElsewhere && isActive && !isError}
            isWaiting={!ownedElsewhere && isWaiting}
            isError={!ownedElsewhere && !!isError}
            isInUse={ownedElsewhere}
            isBusy={busy.has(rule.id)}
            isDeleting={busy.has(`del-${rule.id}`)}
            badge={null}
            bytesTransferred={tunnel?.bytes_transferred}
            localPort={tunnel?.local_port}
            httpUrl={isRunning && !isError && tunnel
              ? getLocalTunnelHttpUrl(rule.tunnel_type ?? "local", rule.remote_port, tunnel.local_port)
              : null}
            onToggle={() => owner
              ? handleRuleDisable(owner.sessionId, owner.tunnel.id, rule.id)
              : handleRuleEnable(rule)}
            toggleDisabled={ownedElsewhere}
            onDelete={() => handleRuleDelete(rule, owner)}
            isRenaming={renamingRuleId === rule.id}
            defaultName={rule.name}
            onRenameCommit={(name) => commitRename(rule.id, name)}
            onRenameCancel={() => setRenamingRuleId(null)}
          />
        );
      })}

      {/* Active auto/adhoc tunnels + suppressed auto ports */}
      {(visibleUnclaimed.length > 0 || suppressedRows.length > 0) && (
        <>
          {visibleUnclaimed.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-(--t-text-dim)">
              {t("terminal.ports.sectionActive")}
            </div>
          )}

          {visibleUnclaimed.map((tunnel) => {
            const isAuto = tunnel.origin.type === "auto";
            const key = `unclaimed-${tunnel.id}`;
            const isError = typeof tunnel.state === "object" && "error" in tunnel.state;
            const isWaiting = tunnel.state === "waiting";
            const label = tunnel.tunnel_type === "dynamic"
              ? `SOCKS5 :${tunnel.local_port}`
              : `Port ${tunnel.remote_port}`;
            return (
              <PortRow
                key={tunnel.id}
                label={label}
                portInfo={isWaiting ? t("portForwarding.activeTunnels.waitingForTraffic") : formatActiveTunnelLabel(tunnel)}
                isActive={tunnel.state === "active"}
                isWaiting={isWaiting}
                isError={isError}
                isBusy={busy.has(key)}
                isDeleting={busy.has(`del-${key}`)}
                isSaving={busy.has(`save-${tunnel.id}`)}
                badge={isAuto ? "auto" : "adhoc"}
                bytesTransferred={tunnel.bytes_transferred}
                localPort={tunnel.local_port}
                httpUrl={getLocalTunnelHttpUrl(tunnel.tunnel_type ?? "local", tunnel.remote_port, tunnel.local_port)}
                onToggle={() => handleTunnelStop(tunnel.id, key)}
                onDelete={() => handleTunnelDelete(tunnel.id, tunnel.remote_port, key)}
                onSaveAsRule={tunnel.tunnel_type === "dynamic" ? undefined : () => handleSaveAsRule(tunnel)}
              />
            );
          })}

          {suppressedRows.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-(--t-text-dim)">
              {t("terminal.ports.sectionSuppressed")}
            </div>
          )}

          {suppressedRows.map((port) => {
            const key = `port-${port}`;
            return (
              <PortRow
                key={`suppressed-${port}`}
                label={`Port ${port}`}
                portInfo={`${port} → 127.0.0.1:${port}`}
                isActive={false}
                isBusy={busy.has(key)}
                isDeleting={false}
                badge="auto"
                onToggle={() => handleAutoResume(port)}
                onDelete={() => handleSuppressedDelete(port)}
              />
            );
          })}
        </>
      )}
      </div>
      <QuickForwardRow inputRef={quickForwardInputRef} onSubmit={handleQuickForward} />
    </div>
  );
}
