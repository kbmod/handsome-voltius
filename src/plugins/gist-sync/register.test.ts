import { describe, test, expect, vi, beforeEach } from "vitest";
import { register } from "./index";
import type { PluginAPI } from "@/plugins/api";

// Minimal PluginAPI stub. getPat()/getRegisteredGists() resolve to null, so
// isConfigured() is false and the poll IIFE early-returns — leaving the
// onBeforeQuit lifecycle wiring as the behaviour under test.

function makeApi(active: boolean) {
  const offBeforeQuit = vi.fn();
  const onBeforeQuit = vi.fn(() => offBeforeQuit);

  const api = {
    isActive: () => active,
    vault: { get: vi.fn(async () => null), set: vi.fn(), delete: vi.fn() },
    storage: { get: vi.fn(async () => null), set: vi.fn(async () => {}), delete: vi.fn(async () => {}) },
    ui: { registerSettingsPage: vi.fn(() => () => {}) },
    lifecycle: { onBeforeQuit, waitForLoginSync: vi.fn(() => Promise.resolve()) },
    notifications: { toast: vi.fn(), banner: vi.fn(), progress: vi.fn() },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as PluginAPI;

  return { api, onBeforeQuit, offBeforeQuit };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("gist-sync register cleanup", () => {
  beforeEach(() => vi.clearAllMocks());

  test("cleanup unsubscribes the quit-time push handler", async () => {
    const { api, onBeforeQuit, offBeforeQuit } = makeApi(true);
    const cleanup = register(api);
    await flush();

    expect(onBeforeQuit).toHaveBeenCalledTimes(1);
    expect(offBeforeQuit).not.toHaveBeenCalled();

    if (typeof cleanup === "function") cleanup();
    expect(offBeforeQuit).toHaveBeenCalledTimes(1);
  });

  test("wires the quit handler regardless of the plugin's active flag", async () => {
    // Sync is the application's own behaviour now: core schedules a Gist sync
    // on every local mutation whether or not this plugin is flagged active.
    // Gating the quit-time flush on that flag left a configured install
    // pushing on change but never flushing on exit.
    const { api, onBeforeQuit, offBeforeQuit } = makeApi(false);
    const cleanup = register(api);
    await flush();

    expect(onBeforeQuit).toHaveBeenCalledTimes(1);
    if (typeof cleanup === "function") cleanup();
    expect(offBeforeQuit).toHaveBeenCalledTimes(1);
  });
});
