import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/themeStore";
import { usePluginStore } from "@/stores/pluginStore";
import { BUILT_IN_THEMES, DEFAULT_THEME_ID } from "@/themes/presets";
import { useUIStore } from "@/stores/uiStore";
import { FormSelect } from "@/components/shared/FormSelect";
import type { AppTheme } from "@/themes/types";
import ScaleSection from "./ScaleSection";
import { useLocaleStore, SUPPORTED_LOCALES } from "@/stores/localeStore";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportTheme(theme: AppTheme) {
  downloadJson(
    `${theme.name.toLowerCase().replace(/\s+/g, "-")}.voltius-theme.json`,
    { type: "voltius-theme", version: 1, theme },
  );
}

export default function AppearanceSection() {
  const {
    terminalThemeId,
    customThemes,
    setTerminalTheme,
    deleteCustomTheme,
  } = useThemeStore();
  const { openThemeCreator, openThemeImportExport } = useUIStore();
  const pluginThemeMap = usePluginStore((s) => s.pluginThemes);
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const pluginThemes: AppTheme[] = [...pluginThemeMap.values()].map((theme) => ({
    ...theme,
    builtIn: true,
  }));
  const customTerminalThemes = customThemes.filter(
    (theme) => !BUILT_IN_THEMES.some((builtIn) => builtIn.id === theme.id),
  );
  const allThemes = [...BUILT_IN_THEMES, ...customTerminalThemes, ...pluginThemes];
  const selectedId = terminalThemeId ?? DEFAULT_THEME_ID;

  const handleDelete = (id: string) => {
    deleteCustomTheme(id);
    if (selectedId === id) setTerminalTheme(DEFAULT_THEME_ID);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-(--t-text-dim)">
          {t("settings.appearance.interface")}
        </h3>
        <ScaleSection />
        <div className="group mt-4 rounded-xl bg-(--t-bg-card) border border-(--t-border) p-4 flex items-center justify-between gap-4">
          <div className="text-sm font-medium text-(--t-text-primary)">
            {t("settings.appearance.language.title")}
          </div>
          <FormSelect
            className="w-44 shrink-0"
            value={locale}
            options={SUPPORTED_LOCALES}
            onChange={(value) => setLocale(value as typeof locale)}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-(--t-text-dim)">
          This Linux-focused fork uses a fixed Gruvbox Dark interface. Terminal
          themes below change terminal colors and fonts only.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-(--t-text-dim)">
            {t("settings.appearance.terminalTheme.title")}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => openThemeImportExport("import")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors text-(--t-text-muted) hover:text-(--t-text-primary) bg-(--t-bg-card) hover:bg-(--t-bg-elevated)"
              title={t("settings.appearance.importTitle")}
            >
              <Icon icon="lucide:download" width={12} />
              {t("settings.appearance.import")}
            </button>
            {customTerminalThemes.length > 0 && (
              <button
                onClick={() => openThemeImportExport("export")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors text-(--t-text-muted) hover:text-(--t-text-primary) bg-(--t-bg-card) hover:bg-(--t-bg-elevated)"
                title={t("settings.appearance.exportAllTitle")}
              >
                <Icon icon="lucide:upload" width={12} />
                {t("settings.appearance.exportAll")}
              </button>
            )}
            <button
              onClick={() => openThemeCreator()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors text-(--t-text-primary) bg-(--t-bg-elevated) hover:bg-(--t-bg-input-hover)"
            >
              <Icon icon="lucide:plus" width={12} />
              {t("settings.appearance.newCustomTheme")}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-(--t-bg-card) border border-(--t-border) p-4 flex items-center justify-between gap-4 mb-4">
          <p className="text-xs text-(--t-text-dim)">
            Changes apply immediately to every active terminal without changing
            tabs, pane borders, notification dots, or the rest of the interface.
          </p>
          <FormSelect
            className="w-52 shrink-0"
            value={selectedId}
            options={allThemes.map((theme) => ({ value: theme.id, label: theme.name }))}
            onChange={setTerminalTheme}
          />
        </div>

        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {allThemes.map((theme) => {
            const isActive = theme.id === selectedId;
            const swatches = [
              theme.terminal.background,
              theme.terminal.foreground,
              theme.terminal.green,
              theme.terminal.yellow,
            ];
            return (
              <button
                key={theme.id}
                onClick={() => setTerminalTheme(theme.id)}
                className="group relative flex flex-col gap-2.5 p-3 rounded-xl text-left transition-all"
                style={{
                  background: isActive ? "var(--t-bg-elevated)" : "var(--t-bg-card)",
                  border: `1.5px solid ${isActive ? "var(--t-terminal-active-border)" : "var(--t-border)"}`,
                }}
              >
                {isActive && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center bg-(--t-bg-input-hover)">
                    <Icon icon="lucide:check" width={9} className="text-(--t-terminal-active-text)" />
                  </span>
                )}
                <div className="flex gap-1.5">
                  {swatches.map((color, index) => (
                    <span
                      key={index}
                      className="w-5 h-5 rounded-md shrink-0"
                      style={{ background: color, border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium leading-tight text-(--t-text-primary)">
                  {theme.name}
                </span>
                {!theme.builtIn && (
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        exportTheme(theme);
                      }}
                      className="p-1 rounded-sm opacity-0 group-hover:opacity-60 hover:opacity-100! transition-opacity text-(--t-text-muted)"
                      title={t("settings.appearance.exportTheme")}
                    >
                      <Icon icon="lucide:share" width={11} />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openThemeCreator(theme.id);
                      }}
                      className="p-1 rounded-sm opacity-0 group-hover:opacity-60 hover:opacity-100! transition-opacity text-(--t-text-muted)"
                      title={t("settings.appearance.editTheme")}
                    >
                      <Icon icon="lucide:pencil" width={11} />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(theme.id);
                      }}
                      className="p-1 rounded-sm opacity-0 group-hover:opacity-60 hover:opacity-100! transition-opacity text-(--t-status-error)"
                      title={t("settings.appearance.deleteTheme")}
                    >
                      <Icon icon="lucide:trash-2" width={11} />
                    </button>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
