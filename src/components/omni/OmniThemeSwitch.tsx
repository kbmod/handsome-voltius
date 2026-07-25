import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useThemeStore } from "@/stores/themeStore";
import { usePluginStore } from "@/stores/pluginStore";
import { BUILT_IN_THEMES, DEFAULT_THEME_ID } from "@/themes/presets";
import { applyThemeToDom } from "@/hooks/useApplyTheme";
import type { AppTheme } from "@/themes/types";

export default function OmniThemeSwitch({
  query,
  onBack,
  onClose,
}: {
  query: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const {
    customThemes,
    terminalThemeId,
    setTerminalTheme,
    getActiveTheme,
    getTerminalTheme,
  } = useThemeStore();
  const pluginThemeMap = usePluginStore((state) => state.pluginThemes);
  const allThemes: AppTheme[] = useMemo(() => {
    const custom = customThemes.filter(
      (theme) => !BUILT_IN_THEMES.some((builtIn) => builtIn.id === theme.id),
    );
    return [...BUILT_IN_THEMES, ...custom, ...pluginThemeMap.values()];
  }, [customThemes, pluginThemeMap]);
  const themes = useMemo(
    () => allThemes.filter((theme) => !query || theme.name.toLowerCase().includes(query.toLowerCase())),
    [allThemes, query],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const committed = useRef(false);
  const original = useRef<AppTheme>(getTerminalTheme());
  const activeId = terminalThemeId ?? DEFAULT_THEME_ID;

  useEffect(() => setSelectedIndex(0), [query]);

  useEffect(() => {
    const preview = themes[selectedIndex];
    if (preview) applyThemeToDom(getActiveTheme(), preview);
  }, [getActiveTheme, selectedIndex, themes]);

  useEffect(
    () => () => {
      if (!committed.current) applyThemeToDom(getActiveTheme(), original.current);
    },
    [getActiveTheme],
  );

  const commit = useCallback((theme: AppTheme) => {
    committed.current = true;
    setTerminalTheme(theme.id);
    onClose();
  }, [onClose, setTerminalTheme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => Math.min(index + 1, Math.max(themes.length - 1, 0)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter") {
        const theme = themes[selectedIndex];
        if (theme) {
          event.preventDefault();
          commit(theme);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commit, selectedIndex, themes]);

  return (
    <div className="overflow-y-auto py-2" style={{ maxHeight: 420 }}>
      <button
        onClick={onBack}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-(--t-text-muted) hover:text-(--t-text-primary)"
      >
        <Icon icon="lucide:arrow-left" width={14} />
        {t("omni.theme.backSwitch")}
      </button>

      <p className="px-4 py-2 text-xs text-(--t-text-dim)">
        Terminal color schemes apply live. The Gruvbox desktop interface remains fixed.
      </p>

      {themes.map((theme, index) => {
        const isSelected = selectedIndex === index;
        const isActive = theme.id === activeId;
        return (
          <button
            key={theme.id}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => commit(theme)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
            style={{ background: isSelected ? "var(--t-border-hover)" : "transparent" }}
          >
            <div className="flex gap-1 shrink-0">
              {[
                theme.terminal.background,
                theme.terminal.foreground,
                theme.terminal.green,
                theme.terminal.yellow,
              ].map((color) => (
                <span
                  key={color}
                  className="w-4 h-4 rounded-sm"
                  style={{ background: color, border: "1px solid rgba(255,255,255,0.08)" }}
                />
              ))}
            </div>
            <span className="flex-1 min-w-0 text-sm font-medium truncate text-(--t-text-primary)">
              {theme.name}
            </span>
            {isActive && <Icon icon="lucide:check" width={14} className="text-(--t-terminal-active-text)" />}
          </button>
        );
      })}
    </div>
  );
}
