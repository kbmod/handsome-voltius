import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Personal sync runs through encrypted GitHub Gist sync. These tests pin the
 * app-wide entry points to that engine so a future change cannot quietly
 * reintroduce a second (or paid) sync path behind the same names.
 */

const gistState = {
  status: "idle" as const,
  lastSync: null as Date | null,
  error: null as string | null,
  blobSizeBytes: null as number | null,
  configured: false,
};
const gistSyncNow = vi.fn();
const gistPush = vi.fn();
const isConfigured = vi.fn();

vi.mock("@/plugins/gist-sync/sync-engine", () => ({
  getGistSyncState: () => gistState,
  onGistSyncStateChange: () => () => {},
  isConfigured: (...a: unknown[]) => isConfigured(...a),
  syncNow: (...a: unknown[]) => gistSyncNow(...a),
  push: (...a: unknown[]) => gistPush(...a),
}));

import { getSyncState, syncNow, push, scheduleSync, SYNC_DEBOUNCE_MS } from "./sync";

beforeEach(() => {
  gistSyncNow.mockReset().mockResolvedValue(undefined);
  gistPush.mockReset().mockResolvedValue(undefined);
  isConfigured.mockReset().mockResolvedValue(true);
  Object.assign(gistState, {
    status: "idle",
    lastSync: null,
    error: null,
    blobSizeBytes: null,
    configured: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("app sync state", () => {
  test("reports the Gist engine's status, timestamp, error, and size", () => {
    const lastSync = new Date("2026-08-01T12:00:00.000Z");
    Object.assign(gistState, {
      status: "error",
      lastSync,
      error: "GitHub PAT is invalid or expired",
      blobSizeBytes: 4096,
      configured: true,
    });

    expect(getSyncState()).toMatchObject({
      status: "error",
      lastSync,
      error: "GitHub PAT is invalid or expired",
      blobSizeBytes: 4096,
      configured: true,
    });
  });
});

describe("syncNow", () => {
  test("delegates to the Gist engine without progress by default", async () => {
    await syncNow();
    expect(gistSyncNow).toHaveBeenCalledWith({ showProgress: false });
  });

  test("forwards a user-initiated request as a progress-reporting sync", async () => {
    await syncNow({ showProgress: true });
    expect(gistSyncNow).toHaveBeenCalledWith({ showProgress: true });
  });
});

describe("push", () => {
  test("flushes local state through the Gist engine", async () => {
    await push();
    expect(gistPush).toHaveBeenCalledTimes(1);
  });

  test("is a no-op when Gist sync is not configured", async () => {
    isConfigured.mockResolvedValue(false);
    await push();
    expect(gistPush).not.toHaveBeenCalled();
  });
});

describe("scheduleSync", () => {
  test("debounces bursts of mutations into a single sync", async () => {
    vi.useFakeTimers();
    scheduleSync();
    scheduleSync();
    scheduleSync();
    expect(gistSyncNow).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS);
    expect(gistSyncNow).toHaveBeenCalledTimes(1);
  });

  test("does no work when Gist sync is not configured", async () => {
    isConfigured.mockResolvedValue(false);
    vi.useFakeTimers();

    scheduleSync();
    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS);

    expect(gistSyncNow).not.toHaveBeenCalled();
  });
});

describe("sync debounce window", () => {
  test("waits long enough for an accidental change to be undone first", async () => {
    // A short window pushed a mistaken edit before the user could undo it, and
    // the next session pulled it back down. Quitting still flushes immediately
    // via the engine's before-quit hook, so waiting costs no data.
    expect(SYNC_DEBOUNCE_MS).toBeGreaterThanOrEqual(30_000);
  });

  test("no sync happens before the window elapses", async () => {
    vi.useFakeTimers();
    scheduleSync();

    await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS - 1000);
    expect(gistSyncNow).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(gistSyncNow).toHaveBeenCalledTimes(1);
  });
});
