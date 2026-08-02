import { describe, expect, test } from "vitest";

/**
 * The title bar starts a window drag on mousedown. Getting the exclusion wrong
 * costs clicks: `startDragging()` hands the pointer to the compositor, so the
 * press never becomes a click on whatever was under it.
 *
 * The window buttons sit in a cluster with `gap-0.5` and `px-2`, so testing
 * only for `button` left those few pixels draggable — pressing slightly off a
 * button silently started a drag, which is why close/minimise/maximise seemed
 * to work only sometimes.
 */
import { shouldStartWindowDrag } from "./titleBarDrag";

const shouldDrag = (target: Element, button = 0) => shouldStartWindowDrag(target, button);

function build(): HTMLElement {
  const bar = document.createElement("div");
  bar.innerHTML = `
    <span id="empty">Handsome Voltius</span>
    <div id="controls" data-no-drag>
      <button id="minimise"><svg><path id="glyph"></path></svg></button>
      <button id="close"></button>
    </div>
  `;
  document.body.append(bar);
  return bar;
}

describe("title bar drag region", () => {
  const bar = build();
  const q = (id: string) => bar.querySelector(`#${id}`)!;

  test("empty title bar space drags the window", () => {
    expect(shouldDrag(q("empty"))).toBe(true);
  });

  test("a window button never drags", () => {
    expect(shouldDrag(q("close"))).toBe(false);
  });

  test("the gap between window buttons never drags", () => {
    // The regression: this container is padding and gaps, not a button.
    expect(shouldDrag(q("controls"))).toBe(false);
  });

  test("an svg glyph inside a button never drags", () => {
    // Iconify renders the icon as nested SVG, so the press target is usually a
    // <path>, not the button itself.
    expect(shouldDrag(q("glyph"))).toBe(false);
  });

  test("a non-left press never drags", () => {
    // Right-click opens a context menu; starting a drag would eat it.
    expect(shouldDrag(q("empty"), 2)).toBe(false);
  });
});
