import { beforeEach, expect, test } from "vitest";
import { noteTerminalOutput, useTerminalActivityStore } from "./terminalActivityStore";

beforeEach(() => {
  useTerminalActivityStore.setState({ unread: {} });
});

test("tracks output independently for background sessions", () => {
  noteTerminalOutput("one");
  noteTerminalOutput("two");
  expect(useTerminalActivityStore.getState().unread).toEqual({ one: true, two: true });
});

test("clears only sessions that became visible", () => {
  noteTerminalOutput("one");
  noteTerminalOutput("two");
  useTerminalActivityStore.getState().clearUnread(["one"]);
  expect(useTerminalActivityStore.getState().unread).toEqual({ two: true });
});
