import { beforeEach, describe, expect, test, vi } from "vitest";
import type { PluginAPI } from "@/plugins/api";

/**
 * A wrong sync passphrase used to be accepted silently: `pull()` short-circuits
 * when no remote device has changed, so nothing ever attempted a decrypt, and
 * the subsequent push reported success while overwriting this device's blob
 * with ciphertext no other device could read.
 */

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

const getManifest = vi.fn();
const getDeviceBlobs = vi.fn();
const patchFiles = vi.fn();
vi.mock("./gist-api", () => ({
  createGist: vi.fn(),
  getManifest: (...a: unknown[]) => getManifest(...a),
  getDeviceBlobs: (...a: unknown[]) => getDeviceBlobs(...a),
  patchFiles: (...a: unknown[]) => patchFiles(...a),
  deleteDeviceFile: vi.fn(),
  deleteGistById: vi.fn(),
  GistApiError: class GistApiError extends Error {},
}));

import {
  init,
  push,
  pull,
  verifyPassphrase,
  changePassphrase,
  GistPassphraseError,
  GistCurrentPassphraseError,
} from "./sync-engine";

const MANIFEST = {
  schema: 1,
  salt: "00112233445566778899aabbccddeeff",
  devices: [{ id: "other-device", label: "Laptop", pushedAt: "2026-08-01T00:00:00.000Z" }],
};

/** Derived key is stubbed; only decryptability of existing blobs matters here. */
function stubInvoke({ decrypts }: { decrypts: boolean }) {
  invoke.mockImplementation((cmd: string) => {
    if (cmd === "derive_gist_key") return Promise.resolve("ab".repeat(32));
    if (cmd === "backup_decrypt") {
      return decrypts
        ? Promise.resolve({ files: {}, secrets: {} })
        : Promise.reject(new Error("Decryption failed — wrong key or corrupted blob"));
    }
    return Promise.resolve(undefined);
  });
}

function makeApi(): PluginAPI {
  return {
    isActive: () => true,
    vault: { get: vi.fn(async (k: string) => (k === "pat" ? "ghp_test" : "secret")), set: vi.fn(), delete: vi.fn() },
    storage: {
      get: vi.fn(async (k: string) => {
        if (k === "registeredGists") return [{ id: "gist-1", addedAt: "" }];
        if (k === "exportDestinationIds") return ["gist-1"];
        if (k === "importSourceId") return "gist-1";
        if (k === "deviceId") return "this-device";
        if (k === "deviceLabel") return "Desktop";
        return null;
      }),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
    },
    ui: { registerSettingsPage: vi.fn(() => () => {}) },
    lifecycle: { onBeforeQuit: vi.fn(() => () => {}), waitForLoginSync: vi.fn(async () => {}) },
    notifications: { toast: vi.fn(), banner: vi.fn(), progress: vi.fn() },
    sync: { exportState: vi.fn(async () => "ZmFrZS1ibG9i"), importStates: vi.fn(async () => {}) },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as PluginAPI;
}

beforeEach(() => {
  vi.clearAllMocks();
  getManifest.mockResolvedValue(MANIFEST);
  getDeviceBlobs.mockResolvedValue([{ deviceId: "other-device", blob: "ZXhpc3RpbmctY2lwaGVydGV4dA==" }]);
  init(makeApi());
});

describe("push passphrase guard", () => {
  test("refuses to upload when the passphrase cannot read the Gist", async () => {
    stubInvoke({ decrypts: false });

    await expect(push()).rejects.toBeInstanceOf(GistPassphraseError);
    expect(patchFiles).not.toHaveBeenCalled();
  });

  test("uploads when the passphrase decrypts existing data", async () => {
    stubInvoke({ decrypts: true });

    await push();
    expect(patchFiles).toHaveBeenCalledTimes(1);
  });

  test("uploads to a Gist that holds no blobs yet", async () => {
    stubInvoke({ decrypts: false });
    getDeviceBlobs.mockResolvedValue([]);

    await push();
    expect(patchFiles).toHaveBeenCalledTimes(1);
  });

  test("reencrypt adopts an unreadable Gist deliberately", async () => {
    stubInvoke({ decrypts: false });

    await push({ reencrypt: true });
    expect(patchFiles).toHaveBeenCalledTimes(1);
  });
});

describe("verifyPassphrase", () => {
  test("reports a mismatch without writing anything", async () => {
    stubInvoke({ decrypts: false });

    await expect(verifyPassphrase("gist-1")).resolves.toBe("mismatch");
    expect(patchFiles).not.toHaveBeenCalled();
  });

  test("reports ok when existing data decrypts", async () => {
    stubInvoke({ decrypts: true });
    await expect(verifyPassphrase("gist-1")).resolves.toBe("ok");
  });

  test("reports empty when there is nothing to verify against", async () => {
    stubInvoke({ decrypts: false });
    getDeviceBlobs.mockResolvedValue([]);
    await expect(verifyPassphrase("gist-1")).resolves.toBe("empty");
  });
});

describe("changePassphrase", () => {
  const RIGHT_KEY = "aa".repeat(32);
  const WRONG_KEY = "bb".repeat(32);

  /** Only the key derived from `secret` decrypts; keys are real hex so the
   *  engine's hex→bytes conversion behaves as in production. */
  function stubKeyed(secret: string) {
    invoke.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
      if (cmd === "derive_gist_key") {
        return Promise.resolve(args!.passphrase === secret ? RIGHT_KEY : WRONG_KEY);
      }
      if (cmd === "backup_decrypt") {
        const key = args!.encKey as number[];
        return key[0] === 0xaa
          ? Promise.resolve({ files: {}, secrets: {} })
          : Promise.reject(new Error("Decryption failed"));
      }
      return Promise.resolve(undefined);
    });
  }

  test("rejects a wrong current passphrase without writing or re-keying", async () => {
    // Holding the PAT must not be enough to re-encrypt a Gist and lock its
    // owner out; knowledge of the current passphrase is the second factor.
    stubKeyed("right-one");
    const api = makeApi();
    init(api);

    await expect(changePassphrase("wrong-one", "new-one")).rejects.toBeInstanceOf(
      GistCurrentPassphraseError,
    );
    expect(patchFiles).not.toHaveBeenCalled();
    expect(api.vault.set).not.toHaveBeenCalledWith("passphrase", "new-one");
  });

  test("stores the new passphrase and re-encrypts when the current one checks out", async () => {
    stubKeyed("right-one");
    const api = makeApi();
    init(api);

    await changePassphrase("right-one", "new-one");

    expect(api.vault.set).toHaveBeenCalledWith("passphrase", "new-one");
    expect(patchFiles).toHaveBeenCalledTimes(1);
  });

  test("restores the previous passphrase if re-encryption fails", async () => {
    stubKeyed("right-one");
    const api = makeApi();
    init(api);
    patchFiles.mockRejectedValueOnce(new Error("network down"));

    await expect(changePassphrase("right-one", "new-one")).rejects.toThrow("network down");
    // makeApi()'s vault returns "secret" for the stored passphrase.
    expect(api.vault.set).toHaveBeenLastCalledWith("passphrase", "secret");
  });
});

describe("pull tolerance", () => {
  const CHANGED = {
    ...MANIFEST,
    devices: [
      { id: "stale-device", label: "Old", pushedAt: "2026-08-01T00:00:00.000Z" },
      { id: "good-device", label: "New", pushedAt: "2026-08-01T00:00:00.000Z" },
    ],
  };

  test("skips blobs it cannot read and merges the rest", async () => {
    // One device left on an older passphrase must not stall syncing for
    // everyone: importStates decrypts every blob it is handed, so an unreadable
    // entry would abort the whole merge.
    getManifest.mockResolvedValue(CHANGED);
    getDeviceBlobs.mockResolvedValue([
      { deviceId: "stale-device", blob: "c3RhbGU=" },
      { deviceId: "good-device", blob: "Z29vZA==" },
    ]);
    invoke.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
      if (cmd === "derive_gist_key") return Promise.resolve("ab".repeat(32));
      if (cmd === "backup_decrypt") {
        const blob = args!.blob as number[];
        const text = String.fromCharCode(...blob);
        return text === "good"
          ? Promise.resolve({ files: {}, secrets: {} })
          : Promise.reject(new Error("Decryption failed"));
      }
      return Promise.resolve(undefined);
    });

    const api = makeApi();
    init(api);

    await expect(pull()).resolves.toBe(true);
    expect(api.sync.importStates).toHaveBeenCalledWith(expect.any(String), ["Z29vZA=="]);
  });

  test("raises a passphrase error only when nothing decrypts", async () => {
    getManifest.mockResolvedValue(CHANGED);
    getDeviceBlobs.mockResolvedValue([
      { deviceId: "stale-device", blob: "c3RhbGU=" },
      { deviceId: "good-device", blob: "Z29vZA==" },
    ]);
    stubInvoke({ decrypts: false });
    init(makeApi());

    await expect(pull()).rejects.toBeInstanceOf(GistPassphraseError);
  });
});
