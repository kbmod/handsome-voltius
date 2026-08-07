import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyUserDataBundle, buildUserDataBundle, mergeUserDataBundle } from "./registry";
import { isApplyingRemoteUserData, resetRemoteUserDataApply } from "./remoteApply";
import type { UserDataBundle } from "./formats";
import { useShortcutStore } from "@/stores/shortcutStore";
import { useUIStore } from "@/stores/uiStore";

// Applying a pull must not make this device the author of settings it received.
// Otherwise a profile restored from a Gist stamps its own clock on the sending
// device's settings, wins the next last-write-wins merge against it, and pushes
// them back — overwriting the settings of the device it restored from.

const REMOTE_TS = "2026-03-01T00:00:00.000Z";

function remoteBundle(): UserDataBundle {
  return {
    type: "voltius-user-data",
    version: 2,
    exported_at: REMOTE_TS,
    sections: {
      shortcuts: {
        data: [{ id: "openSettings", key: "k", ctrl: true, shift: false, alt: false }],
        updated_at: REMOTE_TS,
      },
      uiPreferences: { data: { uiScale: 1.25 }, updated_at: REMOTE_TS },
    },
  };
}

describe("applying a pulled bundle", () => {
  beforeEach(() => {
    resetRemoteUserDataApply();
    useShortcutStore.setState({ shortcutsUpdatedAt: new Date(0).toISOString() });
    useUIStore.setState({ prefsUpdatedAt: new Date(0).toISOString(), uiScale: 1 });
  });

  it("keeps the sending device's timestamp instead of stamping now", async () => {
    await applyUserDataBundle(remoteBundle(), ["shortcuts", "uiPreferences"], {
      adoptTimestamps: true,
    });

    expect(useShortcutStore.getState().shortcutsUpdatedAt).toBe(REMOTE_TS);
    expect(useUIStore.getState().prefsUpdatedAt).toBe(REMOTE_TS);
  });

  it("still applies the values", async () => {
    await applyUserDataBundle(remoteBundle(), ["uiPreferences"], { adoptTimestamps: true });

    expect(useUIStore.getState().uiScale).toBe(1.25);
  });

  it("does not re-push what it received: a rebuilt bundle no longer wins the merge", async () => {
    const remote = remoteBundle();
    await applyUserDataBundle(remote, ["shortcuts", "uiPreferences"], { adoptTimestamps: true });

    // What this device would now push, merged back at the origin.
    const rebuilt = buildUserDataBundle(["shortcuts", "uiPreferences"]);
    const { updatedKeys } = mergeUserDataBundle(remote, rebuilt);

    expect(updatedKeys).toEqual([]);
  });

  it("flags the apply window so store setters suppress their sync scheduling", async () => {
    let flagDuringImport = false;
    const bundle = remoteBundle();
    const spy = vi.spyOn(useUIStore.getState(), "setUiScale").mockImplementation((v: number) => {
      flagDuringImport = isApplyingRemoteUserData();
      useUIStore.setState({ uiScale: v });
    });

    await applyUserDataBundle(bundle, ["uiPreferences"], { adoptTimestamps: true });

    expect(flagDuringImport).toBe(true);
    expect(isApplyingRemoteUserData()).toBe(false); // cleared afterwards
    spy.mockRestore();
  });

  it("a manual import still claims authorship, so it propagates", async () => {
    await applyUserDataBundle(remoteBundle(), ["uiPreferences"]);

    expect(useUIStore.getState().prefsUpdatedAt).not.toBe(REMOTE_TS);
    expect(isApplyingRemoteUserData()).toBe(false);
  });
});
