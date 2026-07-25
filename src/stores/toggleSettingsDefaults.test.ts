import { expect, test } from "vitest";
import { TOGGLE_DEFS } from "./toggleSettingsStore";

test("persistent SSH multiplexers are opt-in", () => {
  expect(TOGGLE_DEFS["persistent-sessions"].default).toBe(false);
});
