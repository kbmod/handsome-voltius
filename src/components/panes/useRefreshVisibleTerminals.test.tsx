// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const refreshTerminalViewport = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useTerminal", () => ({ refreshTerminalViewport }));

import { useRefreshVisibleTerminals } from "./useRefreshVisibleTerminals";

function Harness({ visible, sessionIds }: { visible: boolean; sessionIds: string[] }) {
  useRefreshVisibleTerminals(visible, sessionIds);
  return null;
}

let animationFrames: FrameRequestCallback[];

beforeEach(() => {
  refreshTerminalViewport.mockReset();
  animationFrames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function flushAnimationFrame() {
  const callbacks = animationFrames;
  animationFrames = [];
  callbacks.forEach((callback) => callback(0));
}

test("repaints every pane after a hidden workspace becomes visible", () => {
  const { rerender } = render(<Harness visible={false} sessionIds={["local", "ssh"]} />);

  rerender(<Harness visible sessionIds={["local", "ssh"]} />);
  expect(refreshTerminalViewport).not.toHaveBeenCalled();

  act(flushAnimationFrame);
  expect(refreshTerminalViewport).not.toHaveBeenCalled();

  act(flushAnimationFrame);
  expect(refreshTerminalViewport.mock.calls.map(([sessionId]) => sessionId)).toEqual(["local", "ssh"]);
});

test("repaints a newly selected workspace even while workspace mode stays visible", () => {
  const { rerender } = render(<Harness visible sessionIds={["one", "two"]} />);
  act(flushAnimationFrame);
  act(flushAnimationFrame);
  refreshTerminalViewport.mockClear();

  rerender(<Harness visible sessionIds={["three", "four"]} />);
  act(flushAnimationFrame);
  act(flushAnimationFrame);

  expect(refreshTerminalViewport.mock.calls.map(([sessionId]) => sessionId)).toEqual(["three", "four"]);
});
