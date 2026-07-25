import { beforeEach, expect, test, vi } from "vitest";
import { useLayoutStore } from "./layoutStore";

beforeEach(() => {
  vi.stubGlobal("crypto", { randomUUID: () => "test-id" });
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

test("split workspace tab names can be changed and survive layout hydration", () => {
  useLayoutStore.getState().openSplitTab("session-1");
  const tabId = useLayoutStore.getState().activeSplitTabId;
  expect(tabId).toBeTruthy();

  useLayoutStore.getState().renameSplitTab(tabId!, "  Production workspace  ");
  const renamed = useLayoutStore.getState().splitTabs[0];
  expect(renamed.name).toBe("Production workspace");

  useLayoutStore.getState().hydrate({
    splitTabs: [renamed],
    activeSplitTabId: renamed.id,
    splitTabActive: true,
    titlebarOrder: [`split:${renamed.id}`],
  });
  expect(useLayoutStore.getState().splitTabs[0].name).toBe("Production workspace");
});

test("blank split workspace names do not erase the current name", () => {
  useLayoutStore.getState().openSplitTab("session-1");
  const tabId = useLayoutStore.getState().activeSplitTabId!;
  useLayoutStore.getState().renameSplitTab(tabId, "Operations");
  useLayoutStore.getState().renameSplitTab(tabId, "   ");
  expect(useLayoutStore.getState().splitTabs[0].name).toBe("Operations");
});
