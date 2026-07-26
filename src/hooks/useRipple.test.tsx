// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useRipple } from "./useRipple";

afterEach(cleanup);

function RippleButton({ onClick }: { onClick: () => void }) {
  const { createRipple, rippleEls } = useRipple();
  return (
    <button type="button" onMouseDown={createRipple} onClick={onClick}>
      {rippleEls}
      Open
    </button>
  );
}

test("does not mutate the pressed button between mousedown and click", () => {
  const onClick = vi.fn();
  render(<RippleButton onClick={onClick} />);
  const button = screen.getByRole("button", { name: "Open" });

  fireEvent.mouseDown(button);
  expect(button.childElementCount).toBe(0);
  fireEvent.click(button);

  expect(onClick).toHaveBeenCalledOnce();
});
