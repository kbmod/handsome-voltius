import i18n from "@/i18n";
import { useThemeStore } from "@/stores/themeStore";
import type { AppTheme } from "@/themes/types";
import { BUILT_IN_THEMES, DEFAULT_THEME_ID } from "@/themes/presets";
import type { UserDataHandler } from "../handler";

interface ThemesData {
  activeThemeId: string;
  terminalThemeId?: string | null;
  customThemes: AppTheme[];
}

export const themesHandler: UserDataHandler = {
  key: "themes",
  label: "Themes",
  icon: "lucide:palette",

  export(): ThemesData {
    const { activeThemeId, terminalThemeId, customThemes } = useThemeStore.getState();
    return { activeThemeId, terminalThemeId, customThemes };
  },

  async import(data: unknown): Promise<void> {
    const { activeThemeId, terminalThemeId, customThemes } = data as ThemesData;
    const store = useThemeStore.getState();
    for (const theme of (customThemes ?? [])) {
      if (!BUILT_IN_THEMES.some((builtIn) => builtIn.id === theme.id)) {
        store.saveCustomTheme({ ...theme, builtIn: false });
      }
    }
    if (activeThemeId) store.setTheme(activeThemeId);
    store.setTerminalTheme(terminalThemeId ?? DEFAULT_THEME_ID);
  },

  merge(_local, remote, localTs, remoteTs) {
    if (!_local) return { value: remote, updated: true };
    if (!remote) return { value: _local, updated: false };
    if (remoteTs > localTs) return { value: remote, updated: true };
    return { value: _local, updated: false };
  },

  getTimestamp(): string {
    return useThemeStore.getState().updatedAt;
  },

  describe(): string {
    const { customThemes } = useThemeStore.getState();
    return i18n.t("importExport.userData.describe.themes", { count: customThemes.length });
  },
};
