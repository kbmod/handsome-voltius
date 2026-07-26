// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";
import { GRUVBOX_DARK_THEME, TERMIUS_DARK_UI } from "@/themes/presets";
import { applyThemeToDom } from "./useApplyTheme";

afterEach(() => {
  document.documentElement.removeAttribute("style");
  vi.restoreAllMocks();
});

test("custom terminal themes cannot recolor workspace chrome", () => {
  const customTerminalTheme = {
    ...GRUVBOX_DARK_THEME,
    id: "custom-blue",
    name: "Custom Blue",
    builtIn: false,
    terminal: {
      ...GRUVBOX_DARK_THEME.terminal,
      background: "#07111f",
      foreground: "#1122ff",
      green: "#00ff00",
    },
  };

  applyThemeToDom(GRUVBOX_DARK_THEME, customTerminalTheme);

  const style = document.documentElement.style;
  expect(style.getPropertyValue("--t-bg-base")).toBe(TERMIUS_DARK_UI.bgBase);
  expect(style.getPropertyValue("--t-accent")).toBe(TERMIUS_DARK_UI.accent);
  expect(style.getPropertyValue("--t-terminal-background")).toBe("#07111f");
  expect(style.getPropertyValue("--t-terminal-foreground")).toBe("#1122ff");
  expect(style.getPropertyValue("--t-terminal-green")).toBe("#00ff00");
  expect(style.getPropertyValue("--t-terminal-active-border")).toBe("#ebdbb2");
  expect(style.getPropertyValue("--t-terminal-active-text")).toBe("#ebdbb2");
  expect(style.getPropertyValue("--t-terminal-tab-active-bg")).toBe(
    `color-mix(in srgb, #ebdbb2 20%, ${TERMIUS_DARK_UI.tabBg})`,
  );
  expect(style.getPropertyValue("--t-terminal-activity")).toBe(
    "color-mix(in srgb, #b8bb26 78%, #ebdbb2)",
  );
});

test("dispatches the terminal theme so existing xterm instances hot-apply it", () => {
  const customTerminalTheme = {
    ...GRUVBOX_DARK_THEME,
    id: "custom-live",
    name: "Custom Live",
    builtIn: false,
  };
  const listener = vi.fn();
  window.addEventListener("theme-preview", listener);

  applyThemeToDom(GRUVBOX_DARK_THEME, customTerminalTheme);

  expect(listener).toHaveBeenCalledOnce();
  expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe(customTerminalTheme);
  window.removeEventListener("theme-preview", listener);
});
