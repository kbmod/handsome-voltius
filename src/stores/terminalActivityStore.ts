import { create } from "zustand";

interface TerminalActivityState {
  unread: Record<string, true>;
  markUnread(sessionId: string): void;
  clearUnread(sessionIds: string[]): void;
}

export const useTerminalActivityStore = create<TerminalActivityState>((set) => ({
  unread: {},
  markUnread: (sessionId) =>
    set((state) =>
      state.unread[sessionId]
        ? state
        : { unread: { ...state.unread, [sessionId]: true } },
    ),
  clearUnread: (sessionIds) =>
    set((state) => {
      if (!sessionIds.some((sessionId) => state.unread[sessionId])) return state;
      const unread = { ...state.unread };
      sessionIds.forEach((sessionId) => delete unread[sessionId]);
      return { unread };
    }),
}));

/** Record native PTY output. The title bar clears this immediately for
 * terminals that are currently visible, leaving only background output. */
export function noteTerminalOutput(sessionId: string): void {
  useTerminalActivityStore.getState().markUnread(sessionId);
}
