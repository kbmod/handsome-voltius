// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SnippetsToolbar } from "./SnippetsToolbar";

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

vi.mock("@/hooks/useRipple", () => ({
  useRipple: () => ({ createRipple: vi.fn(), rippleEls: null }),
}));

vi.mock("@/components/shared/ToolbarViewControls", () => ({
  FilterInput: () => <div data-testid="snippet-filter" />,
  SORT_MODE_ICONS: { "name-asc": "sort" },
}));

vi.mock("@/components/shared/Pills", () => ({
  Pills: () => <div data-testid="snippet-layout" />,
}));

vi.mock("@/components/shared/ToolbarDropdown", () => ({
  ToolbarDropdown: () => <div data-testid="snippet-sort" />,
}));

vi.mock("@/components/shared/DropdownMenuItem", () => ({
  DropdownMenuItem: ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick}>{label}</button>
  ),
}));

afterEach(cleanup);

function renderToolbar(onNewFolder = vi.fn()) {
  render(
    <SnippetsToolbar
      search=""
      onSearchChange={vi.fn()}
      sortMode="name-asc"
      onSortModeChange={vi.fn()}
      layoutMode="list"
      onLayoutModeChange={vi.fn()}
      onNewSnippet={vi.fn()}
      onNewFolder={onNewFolder}
    />,
  );
}

test("places snippet creation before the right-aligned view controls", () => {
  renderToolbar();

  const createButton = screen.getByText("snippets.toolbar.newSnippet").closest("button");
  const filter = screen.getByTestId("snippet-filter");

  expect(createButton).not.toBeNull();
  expect(createButton!.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING)
    .toBeTruthy();
  expect(filter.parentElement?.className).toContain("ml-auto");
});

test("opens and activates the portaled folder action with one click", () => {
  const onNewFolder = vi.fn();
  renderToolbar(onNewFolder);

  fireEvent.click(screen.getByLabelText("snippets.toolbar.newSnippetOptions"));

  const folderAction = screen.getByText("snippets.toolbar.newFolder");
  expect(folderAction.closest(".surface-float")?.parentElement).toBe(document.body);

  fireEvent.mouseDown(folderAction);
  fireEvent.click(folderAction);
  expect(onNewFolder).toHaveBeenCalledOnce();
});
