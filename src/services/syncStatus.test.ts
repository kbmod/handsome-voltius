import { describe, expect, test } from "vitest";
import { selectEffectiveSyncStatus } from "./syncStatus";

const gist = {
  status: "error" as const,
  lastSync: null,
  error: "boom",
  configured: true,
};

describe("selectEffectiveSyncStatus", () => {
  test("surfaces the Gist engine's own state", () => {
    expect(selectEffectiveSyncStatus({ gist })).toEqual({
      configured: true,
      status: "error",
      lastSync: null,
      error: "boom",
    });
  });

  test("reports not configured only when the engine has no Gist set up", () => {
    expect(selectEffectiveSyncStatus({ gist: { ...gist, configured: false } }).configured).toBe(
      false,
    );
  });

  test("a configured install stays configured regardless of plugin enablement", () => {
    // Regression: the indicator used to AND this with the gist plugin's
    // enabled flag, so a configured, actively syncing install rendered a
    // struck-through cloud icon and "not configured".
    const lastSync = new Date("2026-08-01T12:00:00.000Z");
    const synced = { status: "success" as const, lastSync, error: null, configured: true };

    expect(selectEffectiveSyncStatus({ gist: synced })).toEqual({
      configured: true,
      status: "success",
      lastSync,
      error: null,
    });
  });
});
