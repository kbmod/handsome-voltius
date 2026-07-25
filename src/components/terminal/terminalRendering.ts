import type { ITerminalOptions } from "@xterm/xterm";

/**
 * Shared renderer defaults for solo and multiplayer terminals.
 *
 * Source Code Pro at 14 px comes from the active theme. These values match the
 * remaining Termius terminal characteristics without coupling renderer
 * behavior to a color palette.
 */
export const TERMINAL_RENDERING_DEFAULTS = {
  cursorBlink: true,
  cursorStyle: "block",
  cursorInactiveStyle: "outline",
  drawBoldTextInBrightColors: false,
  fontWeight: "400",
  fontWeightBold: "600",
  letterSpacing: 0,
  lineHeight: 1,
} as const satisfies Pick<
  ITerminalOptions,
  | "cursorBlink"
  | "cursorStyle"
  | "cursorInactiveStyle"
  | "drawBoldTextInBrightColors"
  | "fontWeight"
  | "fontWeightBold"
  | "letterSpacing"
  | "lineHeight"
>;

/**
 * Ensure xterm measures with the requested webfont instead of retaining
 * fallback-monospace metrics from its first render.
 */
export async function waitForTerminalFont(fontFamily: string, fontSize: number): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await document.fonts.load(`${fontSize}px ${fontFamily}`, "Ag0|█");
}
