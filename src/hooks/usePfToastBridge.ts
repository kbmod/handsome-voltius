import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import i18n from "@/i18n";
import { log } from "@/lib/logger";
import { useNotificationStore } from "@/stores/notificationStore";
import { useUIStore } from "@/stores/uiStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { usePortForwardingStore } from "@/stores/portForwardingStore";
import { getToggle } from "@/stores/toggleSettingsStore";
import { auditContextForVaultId } from "@/services/auditContextResolver";
import { reportAuditClientEvent, type ClientAuditAction } from "@/services/auditReporter";
import type { ActiveTunnel } from "@/types";

interface PfPortDetectedPayload {
  session_id: string;
  port: number;
  tunnel_local_port: number;
}

interface PfStatePayload {
  session_id: string;
  tunnels: ActiveTunnel[];
  suppressed_ports: number[];
}

const BATCH_DELAY_MS = 800;

export function classifyPortForwardingError(error: string): "denied" | "destination" | "generic" {
  const normalized = error.toLowerCase();
  if (normalized.includes("administrativelyprohibited") || normalized.includes("administratively prohibited")) {
    return "denied";
  }
  if (normalized.includes("connectfailed") || normalized.includes("connection refused")) {
    return "destination";
  }
  return "generic";
}

export interface PortForwardingAuditTransition {
  action: Extract<ClientAuditAction,
    "port_forward.started" | "port_forward.active" | "port_forward.stopped" | "port_forward.failed">;
  tunnel: ActiveTunnel;
  error?: string;
}

function tunnelError(tunnel: ActiveTunnel | undefined): string | undefined {
  return tunnel && typeof tunnel.state === "object" && "error" in tunnel.state
    ? tunnel.state.error
    : undefined;
}

export function getPortForwardingAuditTransitions(
  previous: ActiveTunnel[],
  current: ActiveTunnel[],
): PortForwardingAuditTransition[] {
  const transitions: PortForwardingAuditTransition[] = [];
  const previousById = new Map(previous.map((tunnel) => [tunnel.id, tunnel]));
  const currentById = new Map(current.map((tunnel) => [tunnel.id, tunnel]));

  for (const tunnel of current) {
    const prior = previousById.get(tunnel.id);
    if (!prior) transitions.push({ action: "port_forward.started", tunnel });

    const priorError = tunnelError(prior);
    const currentError = tunnelError(tunnel);
    if (currentError && currentError !== priorError) {
      transitions.push({ action: "port_forward.failed", tunnel, error: currentError });
    } else if (prior?.state === "waiting" && tunnel.state === "active") {
      transitions.push({ action: "port_forward.active", tunnel });
    }
  }

  for (const tunnel of previous) {
    if (!currentById.has(tunnel.id)) {
      transitions.push({ action: "port_forward.stopped", tunnel });
    }
  }

  return transitions;
}

function reportPortForwardingTransition(
  sessionId: string,
  transition: PortForwardingAuditTransition,
): void {
  const { tunnel, action, error } = transition;
  const session = useSessionStore.getState().sessions.find((item) => item.id === sessionId);
  const connectionState = useConnectionStore.getState();
  const connections = [
    ...connectionState.connections,
    ...Object.values(connectionState.teamConnections).flat(),
  ];
  const connection = session?.connectionId
    ? connections.find((item) => item.id === session.connectionId)
    : undefined;
  const forwardingState = usePortForwardingStore.getState();
  const rules = [
    ...forwardingState.rules,
    ...Object.values(forwardingState.teamRules).flat(),
  ];
  const ruleId = tunnel.origin.type === "rule" ? tunnel.origin.rule_id : undefined;
  const rule = ruleId ? rules.find((item) => item.id === ruleId) : undefined;
  const vaultId = rule?.vault_id ?? connection?.vault_id ?? "personal";
  const targetId = tunnel.origin.type === "rule" ? tunnel.origin.rule_id : tunnel.id;
  const targetName = tunnel.origin.type === "rule"
    ? tunnel.origin.rule_name
    : tunnel.tunnel_type === "dynamic"
      ? `SOCKS5 ${tunnel.bind_host ?? "127.0.0.1"}:${tunnel.local_port}`
      : `${tunnel.remote_host}:${tunnel.remote_port}`;

  reportAuditClientEvent(auditContextForVaultId(vaultId), action, {
    vault_id: vaultId,
    target_type: "port_forward",
    target_id: targetId,
    target_name: targetName,
    metadata: {
      tunnel_id: tunnel.id,
      tunnel_type: tunnel.tunnel_type,
      session_id: sessionId,
      connection_id: session?.connectionId,
      local_port: tunnel.local_port,
      remote_host: tunnel.remote_host,
      remote_port: tunnel.remote_port,
      state: error ? "error" : tunnel.state,
      ...(error ? { error } : {}),
    },
  });
}

export function usePfToastBridge() {
  const pendingPorts = useRef<PfPortDetectedPayload[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | null>(null);
  const errorsBySessionRef = useRef<Map<string, Set<string>>>(new Map());
  const tunnelsBySessionRef = useRef<Map<string, ActiveTunnel[]>>(new Map());

  useEffect(() => {
    function flush() {
      const ports = pendingPorts.current;
      if (ports.length === 0) return;
      pendingPorts.current = [];

      const { addToast, updateToast } = useNotificationStore.getState();

      const openPanel = () => {
        const ui = useUIStore.getState();
        ui.setActiveNav("terminal");
        ui.setRightPanelSection("ports");
        ui.setRightPanelOpen(true);
      };

      const message =
        ports.length === 1
          ? `Port ${ports[0].port} → localhost:${ports[0].tunnel_local_port} forwarded`
          : `${ports.length} ports forwarded`;

      if (toastIdRef.current) {
        updateToast(toastIdRef.current, {
          message,
          duration: 5000,
          action: { label: "View Ports →", onClick: openPanel },
        });
      } else {
        const id = addToast({
          pluginId: "__pf__",
          pluginName: "Port Forwarding",
          type: "toast",
          message,
          severity: "info",
          duration: 5000,
          action: { label: "View Ports →", onClick: openPanel },
        });
        toastIdRef.current = id;
      }
    }

    const unlistenDetectedPromise = listen<PfPortDetectedPayload>("pf-port-detected", ({ payload }) => {
      if (!getToggle("forwarding-notifications")) return;
      pendingPorts.current.push(payload);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        flush();
        // Allow a new toast for the next burst
        setTimeout(() => { toastIdRef.current = null; }, 5000);
      }, BATCH_DELAY_MS);
    });

    const unlistenStatePromise = listen<PfStatePayload>("pf-state-changed", ({ payload }) => {
      const previousTunnels = tunnelsBySessionRef.current.get(payload.session_id) ?? [];
      for (const transition of getPortForwardingAuditTransitions(previousTunnels, payload.tunnels)) {
        reportPortForwardingTransition(payload.session_id, transition);
      }
      tunnelsBySessionRef.current.set(payload.session_id, payload.tunnels);

      const previousErrors = new Set(
        [...errorsBySessionRef.current.values()].flatMap((errors) => [...errors]),
      );
      const currentErrors = new Set<string>();

      for (const tunnel of payload.tunnels) {
        if (typeof tunnel.state !== "object" || !("error" in tunnel.state)) continue;
        const fullError = tunnel.state.error;
        const errorKey = `${tunnel.id}:${fullError}`;
        currentErrors.add(errorKey);
        if (previousErrors.has(errorKey)) continue;

        log.error("port forwarding tunnel failed", {
          sessionId: payload.session_id,
          tunnelId: tunnel.id,
          tunnelType: tunnel.tunnel_type,
          localPort: tunnel.local_port,
          remoteHost: tunnel.remote_host,
          remotePort: tunnel.remote_port,
          targetHost: tunnel.target_host,
          origin: tunnel.origin,
          error: fullError,
        });

        const errorKind = classifyPortForwardingError(fullError);
        useNotificationStore.getState().addToast({
          pluginId: "__pf__",
          pluginName: "Port Forwarding",
          type: "toast",
          message: i18n.t(`portForwarding.notifications.${errorKind}`),
          severity: "error",
          duration: 8000,
          action: {
            label: i18n.t("portForwarding.notifications.openDiagnostics"),
            onClick: () => useUIStore.getState().openSettings("diagnostics"),
          },
        });
      }

      errorsBySessionRef.current.set(payload.session_id, currentErrors);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      unlistenDetectedPromise.then((f) => f());
      unlistenStatePromise.then((f) => f());
    };
  }, []);
}
