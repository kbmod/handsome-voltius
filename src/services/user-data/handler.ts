// One implementation per settings domain. Register in registry.ts.
// Adding a new domain = new handler file + one entry in USER_DATA_HANDLERS.

export interface UserDataHandler {
  readonly key: string;
  readonly label: string;
  readonly icon: string;

  // Read current state from stores.
  export(): unknown;

  // Write exported state to stores.
  import(data: unknown): Promise<void>;

  // LWW merge: returns the winning value and whether local was overwritten by remote.
  merge(
    local: unknown,
    remote: unknown,
    localTs: string,
    remoteTs: string,
  ): { value: unknown; updated: boolean };

  // ISO timestamp of the most recent local change to this domain.
  getTimestamp(): string;

  // Record `ts` as this domain's last-change time. Used when applying a pull to
  // keep the originating device's timestamp instead of claiming authorship of
  // settings this device merely received.
  setTimestamp(ts: string): void;

  // Short human-readable summary of current state, e.g. "3 custom themes".
  describe(): string;
}
