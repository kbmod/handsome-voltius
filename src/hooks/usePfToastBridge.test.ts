import { describe, expect, it } from "vitest";
import { classifyPortForwardingError, getPortForwardingAuditTransitions } from "./usePfToastBridge";
import type { ActiveTunnel } from "@/types";

function tunnel(state: ActiveTunnel["state"]): ActiveTunnel {
  return {
    id: "tunnel-1",
    tunnel_type: "dynamic",
    local_port: 1080,
    remote_port: 0,
    remote_host: "",
    bind_host: "127.0.0.1",
    origin: { type: "rule", rule_id: "rule-1", rule_name: "Private SOCKS" },
    state,
    bytes_transferred: 0,
  };
}

describe("classifyPortForwardingError", () => {
  it("recognizes an SSH server policy denial", () => {
    expect(classifyPortForwardingError("Failed to open channel (AdministrativelyProhibited)")).toBe("denied");
  });

  it("recognizes a destination connection failure", () => {
    expect(classifyPortForwardingError("SSH channel open failed: ConnectFailed")).toBe("destination");
  });

  it("keeps unknown failures generic", () => {
    expect(classifyPortForwardingError("unexpected transport failure")).toBe("generic");
  });
});

describe("getPortForwardingAuditTransitions", () => {
  it("records listener start, first accepted traffic, failure, and stop", () => {
    expect(getPortForwardingAuditTransitions([], [tunnel("waiting")]).map((item) => item.action))
      .toEqual(["port_forward.started"]);
    expect(getPortForwardingAuditTransitions([tunnel("waiting")], [tunnel("active")]).map((item) => item.action))
      .toEqual(["port_forward.active"]);
    expect(getPortForwardingAuditTransitions([tunnel("active")], [tunnel({ error: "denied" })]))
      .toMatchObject([{ action: "port_forward.failed", error: "denied" }]);
    expect(getPortForwardingAuditTransitions([tunnel("active")], []).map((item) => item.action))
      .toEqual(["port_forward.stopped"]);
  });

  it("does not repeat unchanged state or an unchanged error", () => {
    expect(getPortForwardingAuditTransitions([tunnel("active")], [tunnel("active")])).toEqual([]);
    expect(getPortForwardingAuditTransitions(
      [tunnel({ error: "denied" })],
      [tunnel({ error: "denied" })],
    )).toEqual([]);
  });
});
