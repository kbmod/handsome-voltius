import { describe, expect, it } from "vitest";
import { TERMINAL_RENDERING_DEFAULTS } from "./terminalRendering";

describe("terminal rendering defaults", () => {
  it("matches the approved block cursor and Source Code Pro metrics", () => {
    expect(TERMINAL_RENDERING_DEFAULTS).toMatchObject({
      cursorBlink: true,
      cursorStyle: "block",
      cursorInactiveStyle: "outline",
      drawBoldTextInBrightColors: false,
      fontWeight: "400",
      fontWeightBold: "600",
      letterSpacing: 0,
      lineHeight: 1,
    });
  });
});
