import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useSessionStore } from "@/stores/sessionStore";
import { getPfState } from "@/services/portForwardingTunnels";
import type { ActiveTunnel } from "@/types";

interface PfStatePayload {
  session_id: string;
  tunnels: ActiveTunnel[];
}

/** Active tunnel count for the *current* host (the active SSH session).
 *
 * Mirrors what the status bar and Ports panel header show — the active session's
 * `active`-state tunnels — so the Ports tab badge matches them. (For the global
 * total across every session, use `useActiveTunnelCount`.) */
export function useCurrentSessionTunnelCount(): number {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const [tunnels, setTunnels] = useState<ActiveTunnel[]>([]);

  const session = sessions.find((s) => s.id === activeSessionId);
  const isSsh = session?.type === "ssh" && session.status === "connected";

  useEffect(() => {
    if (!activeSessionId || !isSsh) {
      setTunnels([]);
      return;
    }
    getPfState(activeSessionId).then((s) => setTunnels(s.tunnels)).catch(() => {});

    let cleanup: (() => void) | undefined;
    listen<PfStatePayload>("pf-state-changed", ({ payload }) => {
      if (payload.session_id === activeSessionId) setTunnels(payload.tunnels);
    }).then((u) => { cleanup = u; });

    return () => { cleanup?.(); };
  }, [activeSessionId, isSsh]);

  return tunnels.filter((t) => t.state === "active" || t.state === "waiting").length;
}
