import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "./uiStore";

describe("uiStore terminal right panel scope", () => {
  beforeEach(() => {
    useUIStore.setState({
      activeNav: "terminal",
      rightPanelOpen: true,
    });
  });

  it("closes the terminal right panel when navigating to an app section", () => {
    useUIStore.getState().setActiveNav("keychain");

    expect(useUIStore.getState().activeNav).toBe("keychain");
    expect(useUIStore.getState().rightPanelOpen).toBe(false);
  });

  it("preserves right-panel state while staying in terminal navigation", () => {
    useUIStore.getState().setActiveNav("terminal");

    expect(useUIStore.getState().rightPanelOpen).toBe(true);
  });
});
