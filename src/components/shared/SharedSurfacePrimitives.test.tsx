// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ContextMenu } from "./ContextMenu";
import { DropdownMenuItem } from "./DropdownMenuItem";
import { Modal } from "./Modal";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, width }: { icon: string; width: number }) => (
    <span data-icon={icon} data-width={width} />
  ),
}));

vi.mock("@/hooks/useRipple", () => ({
  useRipple: () => ({ createRipple: vi.fn(), rippleEls: null }),
}));

afterEach(cleanup);

test("shared menu items use compact spacing and menu semantics", () => {
  render(
    <ContextMenu
      items={[{ label: "Rename", icon: "lucide:pencil", onClick: vi.fn() }]}
      pos={{ x: 10, y: 10 }}
      onClose={vi.fn()}
    />,
  );

  const item = screen.getByRole("menuitem", { name: "Rename" });
  expect(item.className).toContain("px-2.5");
  expect(item.className).toContain("py-2");
  expect(item.className).not.toContain("p-3");
  expect(item.querySelector("[data-icon='lucide:pencil']")?.getAttribute("data-width")).toBe("14");
});

test("dropdown menu items share the compact row treatment", () => {
  render(<DropdownMenuItem label="Generate Key Pair" icon="lucide:key" onClick={vi.fn()} />);

  const item = screen.getByRole("menuitem", { name: "Generate Key Pair" });
  expect(item.className).toContain("text-sm");
  expect(item.className).toContain("px-2.5");
  expect(item.querySelector("[data-icon='lucide:key']")?.getAttribute("data-width")).toBe("16");
});

test("modal exposes dialog semantics, closes with Escape, and restores focus", () => {
  const onClose = vi.fn();
  const trigger = document.createElement("button");
  document.body.appendChild(trigger);
  trigger.focus();

  const { unmount } = render(
    <Modal onClose={onClose}>
      <p>Dialog content</p>
    </Modal>,
  );

  const dialog = screen.getByRole("dialog");
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  expect(document.activeElement).toBe(dialog);

  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledOnce();

  unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
