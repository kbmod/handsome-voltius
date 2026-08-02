import type { PluginAPI, PluginManifest, PluginRegisterFn } from "@/plugins/api";
import { createSettingsPage } from "./SettingsPage";
import {
  init,
  isConfigured,
  syncNow,
  startPoll,
  stopPoll,
  push,
} from "./sync-engine";

// ─── Manifest ─────────────────────────────────────────────────────────────────

export const manifest: PluginManifest = {
  id: "plugin-gist-sync",
  name: "GitHub Gist Sync",
  version: "1.0.0",
  description:
    "Sync your data across devices via encrypted GitHub Gist — no Handsome Voltius account required.",
  permissions: [
    "vault:read",
    "vault:write",
    "storage",
    "http",
    "ui",
    "sync:read",
    "sync:write",
    "notifications",
    "settings-page",
  ],
  // Gist sync is the application's only personal sync path, not an optional
  // extra: the app itself calls into this engine on every local mutation. It
  // stays a plugin for packaging reasons only, so it must be enabled by
  // default — otherwise a configured install syncs while its own UI reports
  // the sync method as disabled.
  defaultEnabled: true,
};

// ─── Register ─────────────────────────────────────────────────────────────────

export const register: PluginRegisterFn = (api: PluginAPI) => {
  init(api);

  // Settings page always registered regardless of active state
  api.ui.registerSettingsPage({
    id: "gist-sync-settings",
    label: "GitHub Gist Sync",
    icon: "mdi:github",
    component: createSettingsPage(api),
  });

  // Being configured is the only gate. The app drives this engine directly on
  // local mutations regardless of the plugin's active flag, so gating the poll
  // loop and the quit-time flush on that flag would leave a configured install
  // pushing on change but never pulling.
  (async () => {
    if (!(await isConfigured())) return;
    await syncNow();
    const interval = (await api.storage.get<number>("pollIntervalSeconds")) ?? 60;
    startPoll(interval);
  })();

  const offBeforeQuit = api.lifecycle.onBeforeQuit(async () => {
    if (await isConfigured()) await push().catch(() => {});
  });

  return () => {
    stopPoll();
    // Drop the quit-time push handler too, otherwise an unloaded plugin would
    // still sync on app exit.
    offBeforeQuit();
  };
};
