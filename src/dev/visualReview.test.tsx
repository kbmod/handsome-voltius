import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VisualReviewPage from "./VisualReviewPage";
import { shouldShowVisualReview, visualFixtures } from "./visualFixtures";

afterEach(() => cleanup());

describe("visual-review development gate", () => {
  test.each([
    ["?visual-review=1", true, true],
    ["?other=1&visual-review=1", true, true],
    ["?visual-review=0", true, false],
    ["", true, false],
    ["?visual-review=1", false, false],
  ])("search %s with isDev=%s returns %s", (search, isDev, expected) => {
    expect(shouldShowVisualReview(search, isDev)).toBe(expected);
  });

  test("stays disabled in production even when the query is set", () => {
    expect(shouldShowVisualReview("?visual-review=1", false)).toBe(false);
  });
});

test("exposes accessible controls and keyboard activation changes visible fixtures", async () => {
  const user = userEvent.setup();
  render(<VisualReviewPage />);

  const review = screen.getByTestId("visual-review-page");
  expect(within(review).getByRole("navigation", { name: "Visual review controls" })).toBeTruthy();
  expect(screen.getByRole("group", { name: "Surface" })).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Theme presentation" })).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Fixture state" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Desktop shell overview" })).toBeTruthy();

  const terminalButton = within(screen.getByRole("group", { name: "Surface" })).getByRole("button", { name: "Terminal" });
  terminalButton.focus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("heading", { name: "Terminal chrome" })).toBeTruthy();

  await user.selectOptions(screen.getByRole("combobox", { name: "Fixture state" }), "search-open");
  expect(screen.getByText("Search open", { selector: "[data-state-label]" })).toBeTruthy();
  expect(screen.getByRole("searchbox", { name: "Search terminal output" })).toBeTruthy();

  await user.selectOptions(screen.getByRole("combobox", { name: "Theme presentation" }), "light");
  expect(review.getAttribute("data-theme-presentation")).toBe("light");
  expect(screen.getByText("Handsome Light", { selector: "[data-theme-label]" })).toBeTruthy();
});

test("renders deterministic desktop and SFTP fixture content", async () => {
  const user = userEvent.setup();
  render(<VisualReviewPage />);

  expect(visualFixtures.desktop.sessions.map((session) => session.label)).toEqual([
    "production-api",
    "staging-worker",
    "local-notes",
  ]);
  expect(screen.getByText("Personal Vault")).toBeTruthy();
  expect(screen.getByRole("tab", { name: "production-api" })).toBeTruthy();
  expect(screen.getByText("Port Forwarding")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "SFTP" }));
  expect(screen.getByRole("heading", { name: "SFTP workspace" })).toBeTruthy();
  expect(screen.getByText(".env.example")).toBeTruthy();
  expect(screen.getByText("quarterly-financial-report-final-reviewed.pdf")).toBeTruthy();
  expect(screen.getByText("2 selected")).toBeTruthy();
  expect(screen.getByText("Conflict: file already exists")).toBeTruthy();
  expect(screen.getByText("Active transfers")).toBeTruthy();
  expect(screen.getByText("Completed transfers")).toBeTruthy();
  expect(screen.getByRole("tab", { name: "README.md" })).toBeTruthy();
});

test("provides every required state and the shared control inventory", async () => {
  const user = userEvent.setup();
  render(<VisualReviewPage />);

  await user.click(screen.getByRole("button", { name: "SFTP" }));
  const sftpStates = Array.from(screen.getByRole("combobox", { name: "Fixture state" }).querySelectorAll("option"))
    .map((option) => option.textContent);
  expect(sftpStates).toEqual(["Workspace", "Empty pane", "Loading pane", "Error pane", "Drop target"]);

  await user.click(screen.getByRole("button", { name: "Controls" }));
  expect(screen.getByRole("heading", { name: "Shared controls" })).toBeTruthy();
  for (const name of ["Primary", "Secondary", "Ghost", "Danger", "Disabled"]) {
    expect(screen.getByRole("button", { name })).toBeTruthy();
  }
  expect(screen.getByRole("textbox", { name: "Host name" })).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Protocol" })).toBeTruthy();
  expect(screen.getByRole("switch", { name: "Keep connection alive" })).toBeTruthy();
  expect(screen.getByRole("menu", { name: "Session actions" })).toBeTruthy();
  expect(screen.getByRole("dialog", { name: "Delete session?" })).toBeTruthy();
  expect(screen.getByRole("tooltip").textContent).toContain("Copy fingerprint");
  expect(screen.getByText("No saved snippets")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Connection saved");
});
