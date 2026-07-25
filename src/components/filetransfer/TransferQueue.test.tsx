// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TransferQueue } from "./TransferQueue";
import type { Transfer } from "./SFTPTypes";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

afterEach(cleanup);

const runningTransfer: Transfer = {
  id: "transfer-1",
  label: "backup.tar",
  direction: "→",
  transferred: 50,
  total: 100,
  status: "running",
};

test("collapsible transfer tray opens only through its explicit toggle", () => {
  render(
    <TransferQueue
      transfers={[runningTransfer]}
      onClear={vi.fn()}
      onCancel={vi.fn()}
      onCancelAll={vi.fn()}
      collapsible
    />,
  );

  const toggle = screen.getByRole("button", { expanded: false });
  fireEvent.mouseEnter(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("false");

  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");

  fireEvent.mouseLeave(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
});

test("queue controls do not change the tray expansion state", () => {
  const cancelAll = vi.fn();
  const clear = vi.fn();
  render(
    <TransferQueue
      transfers={[runningTransfer]}
      onClear={clear}
      onCancel={vi.fn()}
      onCancelAll={cancelAll}
      collapsible
    />,
  );

  const toggle = screen.getByRole("button", { expanded: false });
  fireEvent.click(screen.getByTitle("fileTransfer.queue.cancelAll"));
  fireEvent.click(screen.getByTitle("fileTransfer.queue.clearFinished"));

  expect(cancelAll).toHaveBeenCalledOnce();
  expect(clear).toHaveBeenCalledOnce();
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
});
