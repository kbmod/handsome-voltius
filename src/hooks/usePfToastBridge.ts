import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import i18n from "@/i18n";
import { log } from "@/lib/logger";
import { useNotificationStore } from "@/stores/notificationStore";
import { useUIStore } from "@/stores/uiStore";
import { getToggle } from "@/stores/toggleSettingsStore";
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

export function usePfToastBridge() {
  const pendingPorts = useRef<PfPortDetectedPayload[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | null>(null);
  const errorsBySessionRef = useRef<Map<string, Set<string>>>(new Map());

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
