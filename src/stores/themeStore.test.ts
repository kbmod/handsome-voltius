import { beforeEach, expect, test } from "vitest";
import { useThemeStore } from "./themeStore";
import { DEFAULT_THEME_ID, GRUVBOX_DARK_THEME } from "@/themes/presets";

const CUSTOM_THEME = {
  ...GRUVBOX_DARK_THEME,
  id: "custom-terminal",
  name: "Custom Terminal",
  builtIn: false,
  terminal: {
    ...GRUVBOX_DARK_THEME.terminal,
    background: "#000011",
    foreground: "#eeeeff",
  },
};

beforeEach(() => {
  useThemeStore.setState({
    activeThemeId: DEFAULT_THEME_ID,
    terminalThemeId: DEFAULT_THEME_ID,
    customThemes: [CUSTOM_THEME],
    mode: "manual",
    lightThemeId: DEFAULT_THEME_ID,
    darkThemeId: DEFAULT_THEME_ID,
    resolvedPhase: "dark",
  });
});

test("the application interface always resolves to built-in Gruvbox Dark", () => {
  useThemeStore.setState({
    activeThemeId: CUSTOM_THEME.id,
    mode: "system",
    resolvedPhase: "light",
  });

  expect(useThemeStore.getState().getEffectiveThemeId()).toBe(DEFAULT_THEME_ID);
  expect(useThemeStore.getState().getActiveTheme()).toBe(GRUVBOX_DARK_THEME);
});

test("legacy setTheme calls cannot recolor the fixed interface", () => {
  useThemeStore.getState().setTheme(CUSTOM_THEME.id);

  expect(useThemeStore.getState().activeThemeId).toBe(DEFAULT_THEME_ID);
  expect(useThemeStore.getState().getActiveTheme()).toBe(GRUVBOX_DARK_THEME);
});

test("a custom terminal theme is selected independently", () => {
  useThemeStore.getState().setTerminalTheme(CUSTOM_THEME.id);

  expect(useThemeStore.getState().getActiveTheme()).toBe(GRUVBOX_DARK_THEME);
  expect(useThemeStore.getState().getTerminalTheme()).toEqual(CUSTOM_THEME);
});

test("missing and null terminal selections safely fall back to Gruvbox Dark", () => {
  useThemeStore.setState({ terminalThemeId: "removed-theme" });
  expect(useThemeStore.getState().getTerminalTheme()).toBe(GRUVBOX_DARK_THEME);

  useThemeStore.setState({ terminalThemeId: null });
  expect(useThemeStore.getState().getTerminalTheme()).toBe(GRUVBOX_DARK_THEME);
});

test("deleting the selected custom theme returns the terminal to Gruvbox Dark", () => {
  useThemeStore.setState({ terminalThemeId: CUSTOM_THEME.id });
  useThemeStore.getState().deleteCustomTheme(CUSTOM_THEME.id);

  expect(useThemeStore.getState().terminalThemeId).toBe(DEFAULT_THEME_ID);
  expect(useThemeStore.getState().getTerminalTheme()).toBe(GRUVBOX_DARK_THEME);
});
