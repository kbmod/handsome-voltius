import type { AppTheme } from "./types";

export const DEFAULT_THEME_ID = "gruvbox-dark";
// Kept as a compatibility alias for persisted settings and older sync payloads.
export const DEFAULT_LIGHT_THEME_ID = DEFAULT_THEME_ID;

/**
 * This fork intentionally ships one theme. Its UI palette is the fixed desktop
 * shell; selecting a custom theme changes only terminal rendering.
 */
export const GRUVBOX_DARK_THEME: AppTheme = {
  id: DEFAULT_THEME_ID,
  name: "Gruvbox Dark",
  builtIn: true,
  uiFontFamily: "'Inter Variable', system-ui, sans-serif",
  uiFontSize: 14,
  terminalFontFamily: "'Source Code Pro', monospace",
  terminalFontSize: 14,
  ui: {
    bgTerminal: "#282828",
    bgStatusBar: "#1d2021",
    bgBase: "#1d2021",
    bgToolbar: "#282828",
    bgCard: "#3c3836",
    bgCardHover: "#504945",
    bgCardAvatar: "#665c54",
    bgInput: "#1d2021",
    bgInputHover: "#504945",
    bgElevated: "#3c3836",
    bgModal: "#32302f",
    border: "#3c3836",
    borderHover: "#504945",
    textDim: "#7c6f64",
    textMuted: "#928374",
    textSecondary: "#a89984",
    textPrimary: "#ebdbb2",
    textBright: "#fbf1c7",
    accent: "#fe8019",
    accentHover: "#d65d0e",
    tabBg: "#282828",
    tabActiveBg: "#3c3836",
    tabActiveText: "#b8bb26",
    tabActiveBorder: "#98971a",
    vaultTabBg: "#282828",
    vaultTabActiveBg: "#3c3836",
    statusConnected: "#b8bb26",
    statusError: "#fb4934",
    statusConnecting: "#fabd2f",
    statusWarning: "#fabd2f",
    textNotice: "#83a598",
  },
  terminal: {
    background: "#282828",
    foreground: "#ebdbb2",
    cursor: "#ebdbb2",
    selectionBackground: "#504945",
    black: "#282828",
    red: "#cc241d",
    green: "#98971a",
    yellow: "#d79921",
    blue: "#458588",
    magenta: "#b16286",
    cyan: "#689d6a",
    white: "#a89984",
    brightBlack: "#928374",
    brightRed: "#fb4934",
    brightGreen: "#b8bb26",
    brightYellow: "#fabd2f",
    brightBlue: "#83a598",
    brightMagenta: "#d3869b",
    brightCyan: "#8ec07c",
    brightWhite: "#ebdbb2",
  },
};

export const BUILT_IN_THEMES: AppTheme[] = [GRUVBOX_DARK_THEME];
