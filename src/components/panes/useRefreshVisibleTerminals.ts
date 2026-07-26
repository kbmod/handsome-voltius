import { useEffect } from "react";
import { refreshTerminalViewport } from "@/hooks/useTerminal";

/**
 * Refresh every xterm after its split workspace becomes visible.
 *
 * Two animation frames are intentional: the first lets React's visibility
 * class update reach WebKit layout, and the second repaints xterm against the
 * now-visible pane dimensions.
 */
export function useRefreshVisibleTerminals(visible: boolean, sessionIds: string[]): void {
  const sessionKey = sessionIds.join("\0");

  useEffect(() => {
    if (!visible || sessionIds.length === 0) return;

    let repaintFrame = 0;
    const layoutFrame = requestAnimationFrame(() => {
      repaintFrame = requestAnimationFrame(() => {
        sessionIds.forEach(refreshTerminalViewport);
      });
    });

    return () => {
      cancelAnimationFrame(layoutFrame);
      if (repaintFrame) cancelAnimationFrame(repaintFrame);
    };
    // sessionKey gives this effect stable value semantics when callers derive
    // a fresh session-id array during each store render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sessionKey]);
}
