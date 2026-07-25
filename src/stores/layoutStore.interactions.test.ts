import { beforeEach, expect, test } from "vitest";
import { getPaneSessionIds, useLayoutStore } from "./layoutStore";

let id = 0;

beforeEach(() => {
  id = 0;
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { randomUUID: () => `interaction-${++id}` },
  });
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
});

test("horizontal split creates a top and bottom workspace with the duplicate active", () => {
  useLayoutStore.getState().createSplitTab("original", "duplicate", "bottom");

  const state = useLayoutStore.getState();
  expect(state.splitTabActive).toBe(true);
  expect(state.root?.type).toBe("split");
  if (state.root?.type !== "split") throw new Error("expected split root");
  expect(state.root.direction).toBe("v");
  expect(getPaneSessionIds(state.root)).toEqual(["original", "duplicate"]);
  expect(state.activePaneId).toBe(state.root.second.type === "leaf" ? state.root.second.id : null);
});

test("maximize and broadcast state stay scoped to the active workspace tab", () => {
  useLayoutStore.getState().createSplitTab("one", "two", "right");
  const first = useLayoutStore.getState();
  const tabId = first.activeSplitTabId!;
  const paneId = first.activePaneId!;

  useLayoutStore.getState().setMaximized(paneId);
  useLayoutStore.getState().toggleBroadcast();

  const state = useLayoutStore.getState();
  expect(state.maximizedPaneId).toBe(paneId);
  expect(state.broadcastActive).toBe(true);
  const tab = state.splitTabs.find((candidate) => candidate.id === tabId);
  expect(tab?.maximizedPaneId).toBe(paneId);
  expect(tab?.broadcastActive).toBe(true);

  useLayoutStore.getState().setMaximized(null);
  useLayoutStore.getState().toggleBroadcast();
  expect(useLayoutStore.getState().maximizedPaneId).toBeNull();
  expect(useLayoutStore.getState().broadcastActive).toBe(false);
});

test("titlebar reorder places session and workspace tabs deterministically", () => {
  useLayoutStore.setState({
    titlebarOrder: ["session:a", "split:w", "session:b"],
  });

  useLayoutStore.getState().reorderTitlebarItem("session:b", "session:a", "before");
  expect(useLayoutStore.getState().titlebarOrder).toEqual([
    "session:b",
    "session:a",
    "split:w",
  ]);

  useLayoutStore.getState().reorderTitlebarItem("session:a", null, "after");
  expect(useLayoutStore.getState().titlebarOrder).toEqual([
    "session:b",
    "split:w",
    "session:a",
  ]);
});
