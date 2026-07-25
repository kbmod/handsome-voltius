import { beforeEach, describe, expect, test } from "vitest";
import { matchShortcut, useShortcutStore } from "./shortcutStore";

function keyEvent(
  key: string,
  modifiers: Partial<Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "shiftKey" | "altKey">> = {},
): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...modifiers,
  } as KeyboardEvent;
}

beforeEach(() => {
  useShortcutStore.getState().resetAll();
});

describe("Termius-compatible desktop defaults", () => {
  test("opens and closes tabs with Ctrl+Shift+T/W", () => {
    expect(matchShortcut("new-tab", keyEvent("T", { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(matchShortcut("close-tab", keyEvent("W", { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(matchShortcut("new-tab", keyEvent("t", { ctrlKey: true }))).toBe(false);
  });

  test("cycles tabs with Alt+Left/Right", () => {
    expect(matchShortcut("next-tab", keyEvent("ArrowRight", { altKey: true }))).toBe(true);
    expect(matchShortcut("prev-tab", keyEvent("ArrowLeft", { altKey: true }))).toBe(true);
  });

  test("matches terminal and workspace shortcuts from the reference", () => {
    expect(matchShortcut("jump-to", keyEvent("j", { ctrlKey: true }))).toBe(true);
    expect(matchShortcut("terminal-search", keyEvent("F", { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(matchShortcut("local-terminal", keyEvent("L", { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(matchShortcut("serial", keyEvent("s", { ctrlKey: true, altKey: true }))).toBe(true);
    expect(matchShortcut("port-forwarding", keyEvent("p", { ctrlKey: true }))).toBe(true);
    expect(matchShortcut("panel-themes", keyEvent(".", { ctrlKey: true }))).toBe(true);
    expect(matchShortcut("broadcast", keyEvent("b", { ctrlKey: true, altKey: true }))).toBe(true);
    expect(matchShortcut("workspace-view", keyEvent("m", { ctrlKey: true, altKey: true }))).toBe(true);
  });
});
