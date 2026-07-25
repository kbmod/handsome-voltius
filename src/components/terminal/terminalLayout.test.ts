import { terminalViewportClass } from "./terminalLayout.ts";
import { test } from "vitest";

test("terminalLayout", async () => {
function equal<T>(actual: T, expected: T) {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
}

function run() {
  equal(terminalViewportClass(false), "h-full w-full");
  equal(terminalViewportClass(true), "h-full w-full terminal-minimap-enabled");
}

run();
});
