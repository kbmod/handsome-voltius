import { describe, expect, test } from "vitest";
import type { PathType } from "@/services/sftp";
import type { FileEntry } from "./SFTPTypes";
import { planDirectoryMerge } from "./directoryMerge";

const file = (path: string, isDir = false): FileEntry => {
  const parts = path.split("/");
  return {
    name: parts[parts.length - 1],
    path,
    size: isDir ? 0 : 1,
    isDir,
    isSymlink: false,
  };
};

describe("planDirectoryMerge", () => {
  test("skips only a colliding file while retaining new siblings", async () => {
    const source = new Map<string, FileEntry[]>([
      ["/source/report", [
        file("/source/report/unchanged.txt"),
        file("/source/report/new.txt"),
      ]],
    ]);
    const destination = new Map<string, PathType>([
      ["/dest/report/unchanged.txt", "file"],
    ]);

    const plan = await planDirectoryMerge(
      file("/source/report", true),
      "/dest/report",
      {
        listSource: async (path) => source.get(path) ?? [],
        destinationType: async (path) => destination.get(path) ?? null,
      },
    );

    expect(plan.conflicts.map(({ entry }) => entry.name)).toEqual(["unchanged.txt"]);
    expect(plan.ready.map(({ entry }) => entry.name)).toEqual(["new.txt"]);
    expect(plan.ready[0].destinationPath).toBe("/dest/report/new.txt");
  });

  test("merges nested directories and retains empty new directories", async () => {
    const source = new Map<string, FileEntry[]>([
      ["/source/report", [
        file("/source/report/nested", true),
        file("/source/report/empty", true),
      ]],
      ["/source/report/nested", [file("/source/report/nested/new.txt")]],
      ["/source/report/empty", []],
    ]);
    const destination = new Map<string, PathType>([
      ["/dest/report/nested", "directory"],
    ]);

    const plan = await planDirectoryMerge(
      file("/source/report", true),
      "/dest/report",
      {
        listSource: async (path) => source.get(path) ?? [],
        destinationType: async (path) => destination.get(path) ?? null,
      },
    );

    expect(plan.directoriesToCreate).toEqual(["/dest/report/empty"]);
    expect(plan.ready.map(({ destinationPath }) => destinationPath))
      .toEqual(["/dest/report/nested/new.txt"]);
    expect(plan.conflicts).toEqual([]);
  });

  test("marks file-directory type mismatches for deletion before overwrite", async () => {
    const source = new Map<string, FileEntry[]>([
      ["/source/report", [file("/source/report/item.txt")]],
    ]);

    const plan = await planDirectoryMerge(
      file("/source/report", true),
      "/dest/report",
      {
        listSource: async (path) => source.get(path) ?? [],
        destinationType: async () => "directory",
      },
    );

    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0].deleteDestination).toBe(true);
  });
});
