import { describe, expect, it } from "vitest";
import { classifyPortForwardingError } from "./usePfToastBridge";

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
