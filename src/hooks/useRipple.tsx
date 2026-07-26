import { useCallback } from "react";

export function useRipple() {
  /*
   * WebKitGTK can discard the eventual click when a mousedown handler causes
   * React to insert a child into the pressed button. The old ripple animation
   * did exactly that, making split-button chevrons and New Tab intermittently
   * require two or more clicks on Debian. Keep the shared API so callers stay
   * simple, but do not mutate the pressed control before click is delivered.
   */
  const createRipple = useCallback(() => {}, []);
  return { createRipple, rippleEls: null };
}
