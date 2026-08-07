// Marks the window in which this device is applying user-data settings that
// arrived from another device, so a pull is not mistaken for a local edit.
//
// Store setters stamp their domain's `updated_at` and schedule a sync on every
// write. That is right for a user edit and wrong for an applied pull: it makes
// the receiving device the most recent author of settings it never wrote, so
// the next merge resolves in its favour and it pushes them back, outranking the
// device they came from. A device that restored from a Gist would overwrite the
// settings of the device that created it.
//
// Depth-counted rather than boolean so nested or concurrent applies cannot
// clear the flag while an outer one is still running.

let _depth = 0;

/** True while an incoming bundle is being applied to local stores. */
export function isApplyingRemoteUserData(): boolean {
  return _depth > 0;
}

/** Run `fn` with the applying-remote flag held, clearing it even on throw. */
export async function withRemoteUserDataApply<T>(fn: () => Promise<T>): Promise<T> {
  _depth++;
  try {
    return await fn();
  } finally {
    _depth--;
  }
}

/** Test seam — force the flag clear between cases. */
export function resetRemoteUserDataApply(): void {
  _depth = 0;
}
