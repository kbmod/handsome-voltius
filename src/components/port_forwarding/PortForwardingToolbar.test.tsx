// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PortForwardingToolbar } from "./PortForwardingToolbar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

vi.mock("@/hooks/useToolbarResize", () => ({
  useToolbarResize: () => ({
    compact: false,
    rowRef: { current: null },
    leftRef: { current: null },
    rightRef: { current: null },
  }),
}));

vi.mock("@/components/shared/ToolbarViewControls", () => ({
  ToolbarViewControls: () => <div data-testid="forwarding-view-controls" />,
}));

vi.mock("@/components/shared/ToolbarDropdown", () => ({
  ToolbarDropdown: ({ label }: { label?: string }) => (
    <button>{label}</button>
  ),
}));

afterEach(cleanup);

test("places rule creation before the right-aligned view controls", () => {
  render(
    <PortForwardingToolbar
      search=""
      onSearchChange={vi.fn()}
      layoutMode="list"
      onLayoutModeChange={vi.fn()}
      sortMode="name-asc"
      onSortModeChange={vi.fn()}
      onNewRule={vi.fn()}
      onNewFolder={vi.fn()}
    />,
  );

  const createButton = screen.getByText("portForwarding.toolbar.newRule").closest("button");
  const viewControls = screen.getByTestId("forwarding-view-controls");

  expect(createButton).not.toBeNull();
  expect(createButton!.compareDocumentPosition(viewControls) & Node.DOCUMENT_POSITION_FOLLOWING)
    .toBeTruthy();
  expect(viewControls.parentElement?.className).toContain("ml-auto");
});
