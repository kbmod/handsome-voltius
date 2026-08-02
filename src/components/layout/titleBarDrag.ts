/**
 * Which title-bar presses start a window drag.
 *
 * `startDragging()` hands the pointer to the compositor, so anything that
 * wrongly drags also swallows the click that would have followed.
 *
 * `[data-no-drag]` marks whole control clusters rather than individual
 * controls: the window buttons sit in a container with `gap-0.5` and `px-2`, so
 * matching only `button` left those few pixels draggable and a press landing
 * slightly off a button started a drag instead of clicking — which is why
 * close, minimise, and maximise responded only intermittently.
 */
export const DRAG_EXCLUSION_SELECTOR = '[data-no-drag], button, a, input, [role="button"]';

export function shouldStartWindowDrag(target: Element, button: number): boolean {
  // Only a plain left press drags. Any other button (context menu, middle
  // click) must keep its own behaviour.
  if (button !== 0) return false;
  return !target.closest(DRAG_EXCLUSION_SELECTOR);
}
