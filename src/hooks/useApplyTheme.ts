import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";
import type { AppTheme } from "@/themes/types";
import { withFlagEmojiFallback } from "@/utils/emojiFont";
import { appearanceFromColor } from "@/utils/appearance";
import { GRUVBOX_DARK_THEME, TERMIUS_DARK_UI } from "@/themes/presets";

export function applyThemeToDom(theme: AppTheme, terminalTheme: AppTheme = theme) {
  const root = document.documentElement;
  // The application chrome is deliberately fixed in this fork. Custom themes
  // are terminal color schemes and must never recolor tabs, panes, or badges.
  const shellTheme = GRUVBOX_DARK_THEME;
  const ui = TERMIUS_DARK_UI;
  root.style.setProperty("--t-bg-terminal", ui.bgTerminal);
  root.style.setProperty("--t-bg-status-bar", ui.bgStatusBar);
  root.style.setProperty("--t-bg-base", ui.bgBase);
  root.style.setProperty("--t-bg-toolbar", ui.bgToolbar);
  root.style.setProperty("--t-bg-card", ui.bgCard);
  root.style.setProperty("--t-bg-card-hover", ui.bgCardHover);
  root.style.setProperty("--t-bg-card-avatar", ui.bgCardAvatar);
  root.style.setProperty("--t-bg-input", ui.bgInput);
  root.style.setProperty("--t-bg-input-hover", ui.bgInputHover);
  root.style.setProperty("--t-bg-elevated", ui.bgElevated);
  root.style.setProperty("--t-bg-modal", ui.bgModal);
  root.style.setProperty("--t-border", ui.border);
  root.style.setProperty("--t-border-hover", ui.borderHover);
  root.style.setProperty("--t-text-dim", ui.textDim);
  root.style.setProperty("--t-text-muted", ui.textMuted);
  root.style.setProperty("--t-text-secondary", ui.textSecondary);
  root.style.setProperty("--t-text-primary", ui.textPrimary);
  root.style.setProperty("--t-text-bright", ui.textBright);
  root.style.setProperty("--t-accent", ui.accent);
  root.style.setProperty("--t-accent-hover", ui.accentHover);
  root.style.setProperty("--t-tab-bg", ui.tabBg);
  root.style.setProperty("--t-tab-active-bg", ui.tabActiveBg);
  root.style.setProperty("--t-tab-active-text", ui.tabActiveText);
  root.style.setProperty("--t-tab-active-border", ui.tabActiveBorder);
  root.style.setProperty("--t-vault-tab-bg", ui.vaultTabBg);
  root.style.setProperty("--t-vault-tab-active-bg", ui.vaultTabActiveBg);
  root.style.setProperty("--t-status-connected", ui.statusConnected);
  root.style.setProperty("--t-status-error", ui.statusError);
  root.style.setProperty("--t-status-connecting", ui.statusConnecting);
  root.style.setProperty("--t-status-warning", ui.statusWarning);
  root.style.setProperty("--t-text-notice", ui.textNotice);
  root.style.setProperty("--t-font-family", withFlagEmojiFallback(shellTheme.uiFontFamily));
  root.style.setProperty("--t-font-size", `${shellTheme.uiFontSize}px`);
  root.style.setProperty("--t-terminal-foreground", terminalTheme.terminal.foreground);
  root.style.setProperty("--t-terminal-background", terminalTheme.terminal.background);
  root.style.setProperty("--t-terminal-active-border", shellTheme.terminal.foreground);
  root.style.setProperty("--t-terminal-active-text", shellTheme.terminal.foreground);
  root.style.setProperty(
    "--t-terminal-tab-active-bg",
    `color-mix(in srgb, ${shellTheme.terminal.foreground} 20%, ${ui.tabBg})`,
  );
  root.style.setProperty(
    "--t-terminal-activity",
    `color-mix(in srgb, ${shellTheme.terminal.brightGreen} 78%, ${shellTheme.terminal.foreground})`,
  );
  root.style.setProperty("--t-terminal-green", terminalTheme.terminal.green);
  root.style.setProperty("--t-terminal-cyan", terminalTheme.terminal.cyan);
  root.style.setProperty("--t-terminal-yellow", terminalTheme.terminal.yellow);
  root.style.setProperty("--t-terminal-font-family", withFlagEmojiFallback(terminalTheme.terminalFontFamily));
  root.style.setProperty("--t-terminal-font-size", `${terminalTheme.terminalFontSize}px`);
  // Derive light/dark from the base bg so globals.css can override the
  // dark-baked shadow/ring/highlight tokens under :root[data-appearance="light"].
  root.setAttribute("data-appearance", appearanceFromColor(ui.bgBase));
  // Existing terminals listen for this event and update xterm in place.
  window.dispatchEvent(new CustomEvent("theme-preview", { detail: terminalTheme }));
}

export function useApplyTheme() {
  const getActiveTheme = useThemeStore((s) => s.getActiveTheme);
  const getTerminalTheme = useThemeStore((s) => s.getTerminalTheme);
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const terminalThemeId = useThemeStore((s) => s.terminalThemeId);
  const customThemes = useThemeStore((s) => s.customThemes);
  const mode = useThemeStore((s) => s.mode);
  const lightThemeId = useThemeStore((s) => s.lightThemeId);
  const darkThemeId = useThemeStore((s) => s.darkThemeId);
  const resolvedPhase = useThemeStore((s) => s.resolvedPhase);

  useEffect(() => {
    applyThemeToDom(getActiveTheme(), getTerminalTheme());
  }, [activeThemeId, terminalThemeId, customThemes, mode, lightThemeId, darkThemeId, resolvedPhase, getActiveTheme, getTerminalTheme]);
}
