import type { AppTheme, UITheme } from "./types";

export const DEFAULT_THEME_ID = "gruvbox-dark";
// Kept as a compatibility alias for persisted settings and older sync payloads.
export const DEFAULT_LIGHT_THEME_ID = DEFAULT_THEME_ID;

/**
 * Fixed desktop chrome for the Debian fork. Terminal schemes are deliberately
 * independent from this palette.
 */
export const TERMIUS_DARK_UI: UITheme = {
  bgTerminal: "#1a1c2b",
  bgStatusBar: "#202235",
  bgBase: "#1b1d2d",
  bgToolbar: "#202235",
  bgCard: "#282a3e",
  bgCardHover: "#303348",
  bgCardAvatar: "#30354d",
  bgInput: "#242638",
  bgInputHover: "#303348",
  bgElevated: "#303247",
  bgModal: "#242638",
  border: "#34374c",
  borderHover: "#464a64",
  textDim: "#747990",
  textMuted: "#8b90a7",
  textSecondary: "#a9aec2",
  textPrimary: "#dddfee",
  textBright: "#f3f4fb",
  accent: "#6f7fc8",
  accentHover: "#8291d8",
  tabBg: "#202235",
  tabActiveBg: "#3b3d4d",
  tabActiveText: "#e6e2d3",
  tabActiveBorder: "#777a88",
  vaultTabBg: "#202235",
  vaultTabActiveBg: "#303247",
  statusConnected: "#8fae68",
  statusError: "#d76772",
  statusConnecting: "#d6ad68",
  statusWarning: "#d6ad68",
  textNotice: "#8ba6c9",
};

/**
 * This fork intentionally ships one theme. Its UI palette is the fixed desktop
 * compatibility payload; selecting a custom theme changes only terminal
 * rendering. The actual desktop shell uses TERMIUS_DARK_UI.
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
