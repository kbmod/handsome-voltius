import { describe, expect, test } from "vitest";
import { brandTileStyle, glossyTileStyle } from "./iconTileStyles";

describe("host brand tile styling", () => {
  test("uses a flat fill without the neutral glossy gradient or glow", () => {
    const style = brandTileStyle("#E95420");

    expect(style.background).toBe("#E95420");
    expect(String(style.background)).not.toContain("gradient");
    expect(String(style.boxShadow)).not.toContain("color-mix");
  });

  test("keeps glossy styling isolated to neutral object tiles", () => {
    expect(String(glossyTileStyle("#333333").background)).toContain("linear-gradient");
  });
});
