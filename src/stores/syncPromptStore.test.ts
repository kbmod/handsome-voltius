import { beforeEach, describe, expect, test } from "vitest";
import { useSyncPromptStore } from "./syncPromptStore";

beforeEach(() => {
  useSyncPromptStore.setState({ pendingSettingsPull: null });
});

describe("settings pull prompt", () => {
  test("resolves with the user's answer", async () => {
    const answer = useSyncPromptStore.getState().requestSettingsPull(["shortcuts"]);

    expect(useSyncPromptStore.getState().pendingSettingsPull?.keys).toEqual(["shortcuts"]);
    useSyncPromptStore.getState().resolveSettingsPull(true);

    await expect(answer).resolves.toBe(true);
    expect(useSyncPromptStore.getState().pendingSettingsPull).toBeNull();
  });

  test("declining resolves false", async () => {
    const answer = useSyncPromptStore.getState().requestSettingsPull(["appSettings"]);
    useSyncPromptStore.getState().resolveSettingsPull(false);
    await expect(answer).resolves.toBe(false);
  });

  test("a second request declines the first rather than stranding it", async () => {
    // Both promises are awaited by a sync cycle; leaving one unresolved would
    // hang that sync forever.
    const first = useSyncPromptStore.getState().requestSettingsPull(["shortcuts"]);
    const second = useSyncPromptStore.getState().requestSettingsPull(["appSettings"]);

    await expect(first).resolves.toBe(false);
    expect(useSyncPromptStore.getState().pendingSettingsPull?.keys).toEqual(["appSettings"]);

    useSyncPromptStore.getState().resolveSettingsPull(true);
    await expect(second).resolves.toBe(true);
  });

  test("resolving with nothing pending is a no-op", () => {
    expect(() => useSyncPromptStore.getState().resolveSettingsPull(true)).not.toThrow();
  });
});
