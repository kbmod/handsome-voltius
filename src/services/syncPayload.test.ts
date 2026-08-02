import { beforeEach, describe, expect, test, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

const buildUserDataBundle = vi.fn();
const mergeUserDataBundle = vi.fn();
const applyUserDataBundle = vi.fn();
vi.mock("@/services/user-data/registry", () => ({
  buildUserDataBundle: (...a: unknown[]) => buildUserDataBundle(...a),
  mergeUserDataBundle: (...a: unknown[]) => mergeUserDataBundle(...a),
  applyUserDataBundle: (...a: unknown[]) => applyUserDataBundle(...a),
}));

import { applyRemoteSettings, refreshLocalSettingsSnapshot } from "./syncPayload";

const remoteBundle = {
  type: "voltius-user-data",
  version: 2,
  exported_at: "2026-08-01T00:00:00.000Z",
  sections: { shortcuts: { updated_at: "2026-08-01T00:00:00.000Z", data: {} } },
};

beforeEach(() => {
  invoke.mockReset();
  buildUserDataBundle.mockReset();
  mergeUserDataBundle.mockReset();
  applyUserDataBundle.mockReset();
});

describe("applyRemoteSettings", () => {
  test("merges the remote bundle and applies only the changed keys", async () => {
    invoke.mockImplementation((cmd: string) =>
      cmd === "settings_load" ? Promise.resolve(null) : Promise.resolve(undefined),
    );
    const merged = { ...remoteBundle };
    mergeUserDataBundle.mockReturnValue({ merged, updatedKeys: ["shortcuts"] });

    await expect(
      applyRemoteSettings({ "settings.json": JSON.stringify(remoteBundle) }),
    ).resolves.toBe(true);

    expect(invoke).toHaveBeenCalledWith("settings_save", { state: JSON.stringify(merged) });
    expect(applyUserDataBundle).toHaveBeenCalledWith(merged, ["shortcuts"]);
  });

  test("writes nothing when the merge changed no keys", async () => {
    invoke.mockResolvedValue(null);
    mergeUserDataBundle.mockReturnValue({ merged: remoteBundle, updatedKeys: [] });

    await expect(
      applyRemoteSettings({ "settings.json": JSON.stringify(remoteBundle) }),
    ).resolves.toBe(false);

    expect(invoke).not.toHaveBeenCalledWith("settings_save", expect.anything());
    expect(applyUserDataBundle).not.toHaveBeenCalled();
  });

  test("ignores a blob with no settings bundle", async () => {
    await expect(applyRemoteSettings({})).resolves.toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  test("ignores a settings file that is not a user-data bundle", async () => {
    await expect(
      applyRemoteSettings({ "settings.json": JSON.stringify({ type: "something-else" }) }),
    ).resolves.toBe(false);
    expect(applyUserDataBundle).not.toHaveBeenCalled();
  });

  test("a malformed settings file does not throw", async () => {
    await expect(applyRemoteSettings({ "settings.json": "{not json" })).resolves.toBe(false);
  });
});

describe("refreshLocalSettingsSnapshot", () => {
  test("persists the current bundle so an export uploads fresh settings", async () => {
    buildUserDataBundle.mockReturnValue(remoteBundle);
    invoke.mockResolvedValue(undefined);

    await refreshLocalSettingsSnapshot();

    expect(invoke).toHaveBeenCalledWith("settings_save", {
      state: JSON.stringify(remoteBundle),
    });
  });

  test("a failed snapshot never aborts the caller", async () => {
    buildUserDataBundle.mockImplementation(() => {
      throw new Error("store unavailable");
    });
    await expect(refreshLocalSettingsSnapshot()).resolves.toBeUndefined();
  });
});
