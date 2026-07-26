// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { KeychainToolbar } from "./KeychainToolbar";

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
  ToolbarViewControls: () => <div data-testid="keychain-view-controls" />,
}));

vi.mock("@/components/shared/DropdownMenuItem", () => ({
  DropdownMenuItem: ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick}>{label}</button>
  ),
}));

afterEach(cleanup);

test("places key creation before the right-aligned view controls", () => {
  render(
    <KeychainToolbar
      search=""
      onSearchChange={vi.fn()}
      layoutMode="grid"
      onLayoutModeChange={vi.fn()}
      sortMode="name-asc"
      onSortModeChange={vi.fn()}
      onImportKey={vi.fn()}
      onGenerateKey={vi.fn()}
      onNewIdentity={vi.fn()}
      onNewFolder={vi.fn()}
    />,
  );

  const createButton = screen.getByText("keychain.toolbar.newKey").closest("button");
  const viewControls = screen.getByTestId("keychain-view-controls");

  expect(createButton).not.toBeNull();
  expect(createButton!.compareDocumentPosition(viewControls) & Node.DOCUMENT_POSITION_FOLLOWING)
    .toBeTruthy();
  expect(viewControls.parentElement?.className).toContain("ml-auto");
});

test("opens the New Key options from one chevron click", () => {
  const onGenerateKey = vi.fn();
  render(
    <KeychainToolbar
      search=""
      onSearchChange={vi.fn()}
      layoutMode="grid"
      onLayoutModeChange={vi.fn()}
      sortMode="name-asc"
      onSortModeChange={vi.fn()}
      onImportKey={vi.fn()}
      onGenerateKey={onGenerateKey}
      onNewIdentity={vi.fn()}
      onNewFolder={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByLabelText("keychain.toolbar.newKeyOptionsAriaLabel"));

  expect(screen.getByText("keychain.toolbar.generateKeyPair")).toBeTruthy();
  expect(screen.getByText("keychain.toolbar.newIdentity")).toBeTruthy();
  expect(screen.getByText("keychain.toolbar.newFolder")).toBeTruthy();
  expect(
    screen.getByText("keychain.toolbar.generateKeyPair").closest(".surface-float")?.parentElement,
  ).toBe(document.body);

  fireEvent.mouseDown(screen.getByText("keychain.toolbar.generateKeyPair"));
  fireEvent.click(screen.getByText("keychain.toolbar.generateKeyPair"));
  expect(onGenerateKey).toHaveBeenCalledOnce();
});
