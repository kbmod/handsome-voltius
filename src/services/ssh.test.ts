import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(async () => false),
  listen: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: mocks.listen }));

import { onSshClosed } from "./ssh";

describe("onSshClosed", () => {
  beforeEach(() => {
    mocks.invoke.mockClear();
    mocks.listen.mockReset();
  });

  it("releases the native SSH session and its forwarding listeners before routing the close", async () => {
    let nativeListener: ((event: { payload: { exitStatus: number | null } }) => void) | undefined;
    mocks.listen.mockImplementation(async (_name, listener) => {
      nativeListener = listener;
      return () => {};
    });
    const callback = vi.fn();

    await onSshClosed("session-1", callback);
    nativeListener?.({ payload: { exitStatus: null } });
    await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalled());

    expect(mocks.invoke).toHaveBeenCalledWith("ssh_disconnect", {
      sessionId: "session-1",
      postCommand: null,
      killPersistent: null,
      attached: null,
    });
    expect(callback).toHaveBeenCalledWith({ exitStatus: null });
  });
});
