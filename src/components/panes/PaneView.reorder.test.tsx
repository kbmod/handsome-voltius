// @vitest-environment jsdom

import { useRef } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { TerminalSession } from "@/types";

const tracker = vi.hoisted(() => ({
  reusedAcrossSessions: [] as Array<{ from: string; to: string }>,
}));

vi.mock("@/components/panes/PaneHeader", () => ({
  PaneHeader: () => null,
}));

vi.mock("@/components/panes/PaneTerminal", () => ({
  PaneTerminal: ({ session }: { session: TerminalSession }) => {
    const mountedFor = useRef(session.id);
    if (mountedFor.current !== session.id) {
      tracker.reusedAcrossSessions.push({ from: mountedFor.current, to: session.id });
    }
    return <div data-terminal-session={session.id} />;
  },
}));

vi.mock("@/components/panes/DropZones", () => ({
  DropZones: () => null,
}));

vi.mock("@/components/panes/ResizeHandle", () => ({
  ResizeHandle: () => null,
}));

import { PaneView } from "./PaneView";
import { getPaneSessionIds, useLayoutStore } from "@/stores/layoutStore";
import { useSessionStore } from "@/stores/sessionStore";

let id = 0;

function LayoutHarness() {
  const root = useLayoutStore((state) => state.root);
  return root ? <PaneView key={root.id} node={root} /> : null;
}

beforeEach(() => {
  id = 0;
  tracker.reusedAcrossSessions.length = 0;
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { randomUUID: () => `pane-reorder-${++id}` },
  });
  const sessions: TerminalSession[] = ["one", "two", "three", "four"].map((sessionId) => ({
    id: sessionId,
    connectionId: "local",
    connectionName: sessionId,
    status: "connected",
    type: "local",
  }));
  useSessionStore.setState({ sessions, activeSessionId: "one" });
  useLayoutStore.setState({
    root: null,
    activePaneId: null,
    maximizedPaneId: null,
    broadcastActive: false,
    splitTabActive: false,
    splitTabs: [],
    activeSplitTabId: null,
    titlebarOrder: [],
  });
  useLayoutStore.getState().openSessions(sessions.map((session) => session.id));
});

afterEach(cleanup);

test("nested pane moves never reuse a mounted terminal for another session", () => {
  render(<LayoutHarness />);

  const move = (sourceIndex: number, targetIndex: number, position: "left" | "right" | "top" | "bottom") => {
    const root = useLayoutStore.getState().root;
    if (!root) throw new Error("expected pane tree");
    const sessionIds = getPaneSessionIds(root);
    const sourceSessionId = sessionIds[sourceIndex];
    const targetSessionId = sessionIds[targetIndex];
    const leaves = (node: typeof root): Array<{ id: string; sessionId: string }> =>
      node.type === "leaf" ? [node] : [...leaves(node.first), ...leaves(node.second)];
    const paneLeaves = leaves(root);
    const source = paneLeaves.find((leaf) => leaf.sessionId === sourceSessionId);
    const target = paneLeaves.find((leaf) => leaf.sessionId === targetSessionId);
    if (!source || !target) throw new Error("expected source and target panes");
    act(() => useLayoutStore.getState().movePane(source.id, target.id, position));
  };

  move(1, 3, "right");
  move(0, 3, "top");
  move(2, 0, "left");

  expect(tracker.reusedAcrossSessions).toEqual([]);
  expect(document.querySelectorAll("[data-terminal-session]")).toHaveLength(4);
  expect(
    [...document.querySelectorAll<HTMLElement>("[data-terminal-session]")]
      .map((element) => element.dataset.terminalSession)
      .sort(),
  ).toEqual(["four", "one", "three", "two"]);
});
