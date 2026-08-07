import type { UserDataHandler } from "./handler";
import type { UserDataBundle, UserDataSection } from "./formats";
import { withRemoteUserDataApply } from "./remoteApply";
import { themesHandler } from "./handlers/themes";
import { uiPreferencesHandler } from "./handlers/uiPreferences";
import { shortcutsHandler } from "./handlers/shortcuts";
import { appSettingsHandler } from "./handlers/appSettings";

// ─── Handler registry ─────────────────────────────────────────────────────────
// Order matters for UI rendering. Adding a new settings domain:
//   1. Create handlers/<name>.ts implementing UserDataHandler
//   2. Add it here

export const USER_DATA_HANDLERS: UserDataHandler[] = [
  themesHandler,
  uiPreferencesHandler,
  shortcutsHandler,
  appSettingsHandler,
];

// ─── Build ────────────────────────────────────────────────────────────────────

export function buildUserDataBundle(keys?: string[]): UserDataBundle {
  const handlers = keys
    ? USER_DATA_HANDLERS.filter((h) => keys.includes(h.key))
    : USER_DATA_HANDLERS;

  const sections: Record<string, UserDataSection> = {};
  for (const h of handlers) {
    sections[h.key] = { data: h.export(), updated_at: h.getTimestamp() };
  }

  return {
    type: "voltius-user-data",
    version: 2,
    exported_at: new Date().toISOString(),
    sections,
  };
}

// ─── Apply ────────────────────────────────────────────────────────────────────

/**
 * Write a bundle's sections into local stores.
 *
 * `adoptTimestamps` marks this as applying another device's settings rather
 * than a local change: each section keeps the originating device's
 * `updated_at`, and the sync scheduling that store setters trigger is
 * suppressed. Without it the receiving device stamps its own clock on settings
 * it merely received, wins the next last-write-wins merge against the device
 * that actually authored them, and pushes them back — so restoring a fresh
 * profile from a Gist would overwrite the settings of the profile it restored
 * from. A manual file import leaves it off: choosing to import is a local act
 * and should propagate.
 */
export async function applyUserDataBundle(
  bundle: UserDataBundle,
  keys?: string[],
  options: { adoptTimestamps?: boolean } = {},
): Promise<{ applied: string[] }> {
  const applied: string[] = [];

  const run = async () => {
    for (const h of USER_DATA_HANDLERS) {
      if (keys && !keys.includes(h.key)) continue;
      const section = bundle.sections[h.key];
      if (!section) continue;
      await h.import(section.data);
      // After import, because the setters `import` calls restamp it.
      if (options.adoptTimestamps) h.setTimestamp(section.updated_at);
      applied.push(h.key);
    }
  };

  if (options.adoptTimestamps) await withRemoteUserDataApply(run);
  else await run();

  return { applied };
}

// ─── Merge (LWW per section) ──────────────────────────────────────────────────

export function mergeUserDataBundle(
  local: UserDataBundle | null,
  remote: UserDataBundle,
): { merged: UserDataBundle; updatedKeys: string[] } {
  const updatedKeys: string[] = [];
  const sections: Record<string, UserDataSection> = { ...(local?.sections ?? {}) };

  for (const h of USER_DATA_HANDLERS) {
    const localSection = local?.sections[h.key];
    const remoteSection = remote.sections[h.key];
    if (!remoteSection) continue;

    const localTs = localSection?.updated_at ?? new Date(0).toISOString();
    const remoteTs = remoteSection.updated_at;
    const { value, updated } = h.merge(
      localSection?.data,
      remoteSection.data,
      localTs,
      remoteTs,
    );
    sections[h.key] = { data: value, updated_at: updated ? remoteTs : localTs };
    if (updated) updatedKeys.push(h.key);
  }

  return {
    merged: {
      type: "voltius-user-data",
      version: 2,
      exported_at: new Date().toISOString(),
      sections,
    },
    updatedKeys,
  };
}
