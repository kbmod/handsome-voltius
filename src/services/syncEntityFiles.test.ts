import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { ENTITY_FILES } from "./sync";

/**
 * `state_import` only writes filenames listed in the Rust `ENTITY_FILES`, and
 * the TypeScript merge only produces filenames listed in its own copy. A file
 * missing from either list is pushed into the sync blob but silently dropped on
 * pull — which is exactly how known hosts stopped restoring.
 */
function rustEntityFiles(): string[] {
  const source = readFileSync("src-tauri/src/commands/sync.rs", "utf8");
  const block = source.match(/pub const ENTITY_FILES: &\[&str\] = &\[(.*?)\];/s);
  if (!block) throw new Error("ENTITY_FILES not found in src-tauri/src/commands/sync.rs");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

describe("sync entity files", () => {
  test("the TypeScript and Rust entity lists are identical", () => {
    expect([...ENTITY_FILES]).toEqual(rustEntityFiles());
  });

  test("known hosts are synced entities", () => {
    // Known hosts carry id/updated_at/deleted_at/clocks like every other CRDT
    // entity, so they belong in the merged set rather than being push-only.
    expect(ENTITY_FILES).toContain("known_hosts.json");
    expect(rustEntityFiles()).toContain("known_hosts.json");
  });
});
