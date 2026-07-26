// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { KnownHostsToolbar } from "./KnownHostsToolbar";

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
  ToolbarViewControls: () => <div data-testid="known-hosts-view-controls" />,
}));

afterEach(cleanup);

test("keeps selection actions left and view controls right aligned", () => {
  render(
    <KnownHostsToolbar
      search=""
      onSearchChange={vi.fn()}
      layoutMode="grid"
      onLayoutModeChange={vi.fn()}
      sortMode="name-asc"
      onSortModeChange={vi.fn()}
      selectedCount={2}
      onDeleteSelected={vi.fn()}
    />,
  );

  const deleteButton = screen.getByTitle("knownHosts.toolbar.deleteSelected");
  const viewControls = screen.getByTestId("known-hosts-view-controls");

  expect(deleteButton.compareDocumentPosition(viewControls) & Node.DOCUMENT_POSITION_FOLLOWING)
    .toBeTruthy();
  expect(viewControls.parentElement?.className).toContain("ml-auto");
});
