import { create } from "zustand";

/**
 * Prompts raised by sync that need a decision from the user.
 *
 * A pull can rewrite application settings, keyboard shortcuts, and UI
 * preferences — changes the user never asked for on this device and would not
 * otherwise see happen. The sync engine parks the request here and awaits the
 * answer; the modal mounted in the shell resolves it.
 */
export interface PendingSettingsPull {
  /** Bundle section keys that would change, e.g. ["shortcuts", "appSettings"]. */
  keys: string[];
  resolve: (apply: boolean) => void;
}

interface SyncPromptStore {
  pendingSettingsPull: PendingSettingsPull | null;
  /** Ask the user whether to apply incoming settings. Resolves to their answer. */
  requestSettingsPull: (keys: string[]) => Promise<boolean>;
  resolveSettingsPull: (apply: boolean) => void;
}

export const useSyncPromptStore = create<SyncPromptStore>((set, get) => ({
  pendingSettingsPull: null,

  requestSettingsPull: (keys) =>
    new Promise<boolean>((resolve) => {
      // A second pull arriving while a prompt is open would strand the first
      // request's promise, hanging that sync forever. Decline it and let the
      // newer set of keys be the one asked about.
      const existing = get().pendingSettingsPull;
      if (existing) existing.resolve(false);
      set({ pendingSettingsPull: { keys, resolve } });
    }),

  resolveSettingsPull: (apply) => {
    const pending = get().pendingSettingsPull;
    if (!pending) return;
    set({ pendingSettingsPull: null });
    pending.resolve(apply);
  },
}));
