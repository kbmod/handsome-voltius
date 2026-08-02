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
const deleteGistById = vi.fn();
vi.mock("./gist-api", () => ({
  createGist: vi.fn(),
  getManifest: (...a: unknown[]) => getManifest(...a),
  getDeviceBlobs: (...a: unknown[]) => getDeviceBlobs(...a),
  patchFiles: (...a: unknown[]) => patchFiles(...a),
  deleteDeviceFile: vi.fn(),
  deleteGistById: (...a: unknown[]) => deleteGistById(...a),
  GistApiError: class GistApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = "GistApiError";
    }
  },
}));

import { GistApiError } from "./gist-api";
import {
  init,
  push,
  pull,
  verifyPassphrase,
  changePassphrase,
  deleteGist,
  linkExistingGist,
  parseGistId,
  getUnreachableGistIds,
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

describe("linking a gist by URL", () => {
  // The field offers "ID or URL", but a URL was passed to GitHub verbatim and
  // came back 404 — so only the ID half of the promise ever worked.
  const ID = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";

  test.each([
    ["bare id", ID],
    ["id with surrounding space", `  ${ID}  `],
    ["anonymous gist url", `https://gist.github.com/${ID}`],
    ["user-scoped url", `https://gist.github.com/octocat/${ID}`],
    ["url with trailing slash", `https://gist.github.com/octocat/${ID}/`],
    ["revisions url", `https://gist.github.com/octocat/${ID}/revisions`],
    ["url with file anchor", `https://gist.github.com/octocat/${ID}#file-voltius-json`],
    ["url with query string", `https://gist.github.com/octocat/${ID}?foo=bar`],
    ["api url", `https://api.github.com/gists/${ID}`],
    ["url without a scheme", `gist.github.com/octocat/${ID}`],
  ])("finds the id in a %s", (_label, input) => {
    expect(parseGistId(input)).toBe(ID);
  });

  test("a 20-character legacy id is still recognised", () => {
    const legacy = "a1b2c3d4e5f6a7b8c9d0";
    expect(parseGistId(`https://gist.github.com/octocat/${legacy}`)).toBe(legacy);
  });

  test("input with no id in it is rejected rather than sent", () => {
    expect(parseGistId("https://github.com/octocat")).toBeNull();
    expect(parseGistId("not a gist")).toBeNull();
    expect(parseGistId("   ")).toBeNull();
  });

  test("linkExistingGist registers the id parsed out of a URL", async () => {
    const api = makeApi();
    api.storage.get = vi.fn(async () => null) as never;
    init(api);

    await linkExistingGist("ghp_test", `https://gist.github.com/octocat/${ID}`);

    expect(getManifest).toHaveBeenCalledWith("ghp_test", ID);
    expect(api.storage.set).toHaveBeenCalledWith(
      "registeredGists",
      [expect.objectContaining({ id: ID })],
    );
  });

  test("unparseable input never reaches the API", async () => {
    init(makeApi());

    await expect(linkExistingGist("ghp_test", "not a gist")).rejects.toThrow(/Gist ID or URL/);
    expect(getManifest).not.toHaveBeenCalled();
  });
});

describe("a gist deleted by someone else", () => {
  // Must be the mock's class, so the engine's `instanceof` checks match.
  const ApiError = GistApiError as unknown as new (s: number, m: string) => Error;

  test("delete still removes it locally when GitHub says it is already gone", async () => {
    // The only obvious action on a dead gist was Delete, which failed on 404
    // and never unlinked — stranding the entry with no way to remove it.
    const api = makeApi();
    init(api);
    deleteGistById.mockRejectedValue(new ApiError(404, "Not Found"));

    await deleteGist("ghp_test", "gist-1");

    expect(api.storage.set).toHaveBeenCalledWith("registeredGists", []);
  });

  test("a non-404 delete failure still propagates", async () => {
    init(makeApi());
    deleteGistById.mockRejectedValue(new ApiError(500, "Server Error"));

    await expect(deleteGist("ghp_test", "gist-1")).rejects.toThrow("Server Error");
  });

  test("one dead export destination does not block a live one", async () => {
    stubInvoke({ decrypts: true });
    const api = makeApi();
    api.storage.get = vi.fn(async (k: string) => {
      if (k === "registeredGists") return [{ id: "dead", addedAt: "" }, { id: "live", addedAt: "" }];
      if (k === "exportDestinationIds") return ["dead", "live"];
      if (k === "importSourceId") return "live";
      if (k === "deviceId") return "this-device";
      return null;
    }) as never;
    init(api);
    getManifest.mockImplementation(async (_pat: string, id: string) => {
      if (id === "dead") throw new ApiError(404, "Not Found");
      return MANIFEST;
    });

    await push();

    expect(patchFiles).toHaveBeenCalledTimes(1);
    expect(getUnreachableGistIds()).toContain("dead");
  });

  test("pull moves off an import source that no longer exists", async () => {
    // Linking a replacement used to change nothing, because the import source
    // only auto-populates when unset — so sync kept failing on the dead gist.
    stubInvoke({ decrypts: true });
    const api = makeApi();
    api.storage.get = vi.fn(async (k: string) => {
      if (k === "registeredGists") return [{ id: "dead", addedAt: "" }, { id: "fresh", addedAt: "" }];
      if (k === "exportDestinationIds") return ["fresh"];
      if (k === "importSourceId") return "dead";
      if (k === "deviceId") return "this-device";
      return null;
    }) as never;
    init(api);
    getManifest.mockImplementation(async (_pat: string, id: string) => {
      if (id === "dead") throw new ApiError(404, "Not Found");
      return MANIFEST;
    });

    await pull();

    expect(api.storage.set).toHaveBeenCalledWith("importSourceId", "fresh");
    expect(getUnreachableGistIds()).toContain("dead");
  });

  test("a later successful push keeps the warning about a dead import source", async () => {
    // Push and pull touch different gists, so push must only re-judge its own
    // export destinations — otherwise it clears the dead import source pull
    // just found and the warning disappears while sync is still broken.
    stubInvoke({ decrypts: true });
    const api = makeApi();
    api.storage.get = vi.fn(async (k: string) => {
      if (k === "registeredGists") return [{ id: "gone-source", addedAt: "" }, { id: "live-dest", addedAt: "" }];
      if (k === "exportDestinationIds") return ["live-dest"];
      if (k === "importSourceId") return "gone-source";
      if (k === "deviceId") return "this-device";
      return null;
    }) as never;
    init(api);
    getManifest.mockImplementation(async (_pat: string, id: string) => {
      if (id === "gone-source") throw new ApiError(404, "Not Found");
      return MANIFEST;
    });

    await pull();
    await push();

    expect(patchFiles).toHaveBeenCalledTimes(1);
    expect(getUnreachableGistIds()).toContain("gone-source");
  });

  test("removing a dead gist clears its warning", async () => {
    // A stale entry would make re-linking the same id look dead on sight,
    // before any sync had tried it.
    stubInvoke({ decrypts: true });
    const api = makeApi();
    api.storage.get = vi.fn(async (k: string) => {
      if (k === "registeredGists") return [{ id: "removed-me", addedAt: "" }];
      if (k === "exportDestinationIds") return ["removed-me"];
      if (k === "importSourceId") return "removed-me";
      if (k === "deviceId") return "this-device";
      return null;
    }) as never;
    init(api);
    getManifest.mockRejectedValue(new ApiError(404, "Not Found"));

    await expect(push()).rejects.toThrow("Not Found");
    expect(getUnreachableGistIds()).toContain("removed-me");

    deleteGistById.mockRejectedValue(new ApiError(404, "Not Found"));
    await deleteGist("ghp_test", "removed-me");

    expect(getUnreachableGistIds()).not.toContain("removed-me");
  });

  test("a gist that comes back drops its warning", async () => {
    stubInvoke({ decrypts: true });
    const api = makeApi();
    api.storage.get = vi.fn(async (k: string) => {
      if (k === "registeredGists") return [{ id: "flaky", addedAt: "" }];
      if (k === "exportDestinationIds") return ["flaky"];
      if (k === "importSourceId") return "flaky";
      if (k === "deviceId") return "this-device";
      return null;
    }) as never;
    init(api);
    getManifest.mockRejectedValueOnce(new ApiError(404, "Not Found"));

    await expect(push()).rejects.toThrow("Not Found");
    expect(getUnreachableGistIds()).toContain("flaky");

    getManifest.mockResolvedValue(MANIFEST);
    await push();

    expect(getUnreachableGistIds()).not.toContain("flaky");
  });
});
