import type { PathType } from "@/services/sftp";
import type { FileEntry } from "./SFTPTypes";
import { joinPath } from "./moveTargetCore";

export type PlannedTransfer = {
  entry: FileEntry;
  destinationPath: string;
  /** A file/directory type mismatch must be removed before transfer. */
  deleteDestination: boolean;
};

export type DirectoryMergePlan = {
  directoriesToCreate: string[];
  ready: PlannedTransfer[];
  conflicts: PlannedTransfer[];
};

type DirectoryMergeOps = {
  listSource: (path: string) => Promise<FileEntry[]>;
  destinationType: (path: string) => Promise<PathType>;
};

/**
 * Plan a selective merge when sourceRoot and destinationRoot are known to be
 * directories. Existing destination directories are containers, not conflict
 * units. Only colliding leaf entries (or file/directory type mismatches) are
 * presented as conflicts.
 */
export async function planDirectoryMerge(
  sourceRoot: FileEntry,
  destinationRoot: string,
  ops: DirectoryMergeOps,
): Promise<DirectoryMergePlan> {
  const plan: DirectoryMergePlan = {
    directoriesToCreate: [],
    ready: [],
    conflicts: [],
  };

  const walk = async (
    sourceDirectory: FileEntry,
    destinationDirectory: string,
    destinationParentExists: boolean,
  ): Promise<void> => {
    const children = await ops.listSource(sourceDirectory.path);

    for (const child of children) {
      const destinationPath = joinPath(destinationDirectory, child.name);
      const destinationType = destinationParentExists
        ? await ops.destinationType(destinationPath)
        : null;
      const isTraversableDirectory = child.isDir && !child.isSymlink;

      if (isTraversableDirectory && destinationType === "directory") {
        await walk(child, destinationPath, true);
        continue;
      }

      if (isTraversableDirectory && destinationType === null) {
        plan.directoriesToCreate.push(destinationPath);
        await walk(child, destinationPath, false);
        continue;
      }

      const transfer: PlannedTransfer = {
        entry: child,
        destinationPath,
        deleteDestination:
          (isTraversableDirectory && destinationType === "file")
          || (!isTraversableDirectory && destinationType === "directory"),
      };

      if (destinationType === null) plan.ready.push(transfer);
      else plan.conflicts.push(transfer);
    }
  };

  await walk(sourceRoot, destinationRoot, true);
  return plan;
}
