import { describe, expect, it } from "vitest";
import { getRuleTunnelOwners } from "./PortsPanel";
import type { PfSessionState } from "@/services/portForwardingTunnels";
import type { ActiveTunnel } from "@/types";

function ruleTunnel(id: string, ruleId: string, state: ActiveTunnel["state"]): ActiveTunnel {
  return {
    id,
    tunnel_type: "dynamic",
    local_port: 1080,
    remote_port: 0,
    remote_host: "",
    origin: { type: "rule", rule_id: ruleId, rule_name: "Private SOCKS" },
    state,
    bytes_transferred: 0,
  };
}

describe("getRuleTunnelOwners", () => {
  it("resolves a saved rule to the one SSH session that owns it", () => {
    const states = new Map<string, PfSessionState>([
      ["session-a", {
        tunnels: [ruleTunnel("tunnel-a", "rule-1", "active")],
        suppressed_ports: [],
      }],
      ["session-b", { tunnels: [], suppressed_ports: [] }],
    ]);

    expect(getRuleTunnelOwners(states).get("rule-1")).toMatchObject({
      sessionId: "session-a",
      tunnel: { id: "tunnel-a", state: "active" },
    });
  });

  it("keeps the first owner if stale duplicate state is received", () => {
    const states = new Map<string, PfSessionState>([
      ["session-a", {
        tunnels: [ruleTunnel("tunnel-a", "rule-1", { error: "denied" })],
        suppressed_ports: [],
      }],
      ["session-b", {
        tunnels: [ruleTunnel("tunnel-b", "rule-1", "waiting")],
        suppressed_ports: [],
      }],
    ]);

    expect(getRuleTunnelOwners(states).get("rule-1")?.sessionId).toBe("session-a");
  });
});
