import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@iconify/react", () => ({ Icon: () => null }));
vi.mock("./LogoBadge", () => ({ default: () => null }));
vi.mock("@/services/account", () => ({
  createLocalAccountNoPassword: vi.fn(async () => {}),
  login: vi.fn(async () => {}),
}));
vi.mock("@/services/gistSetupHandoff", () => ({ requestGistSetup: vi.fn() }));

import AuthPage from "./AuthPage";

afterEach(() => cleanup());

test("first launch offers local setup and Gist restore only", () => {
  render(<AuthPage isLocked={false} onReady={() => {}} />);

  expect(screen.getByText("layout.auth.getStarted")).toBeTruthy();
  expect(screen.getByText("layout.auth.restoreFromGist")).toBeTruthy();

  // The Legacy Voltius Cloud sign-up/sign-in option is gone: this fork has no
  // account to create and no server to sign in to.
  expect(screen.queryByText("layout.auth.cloudAccount")).toBeNull();
  expect(screen.queryByText("layout.auth.signIn")).toBeNull();
  expect(screen.queryByText("layout.auth.createAccount")).toBeNull();
});

test("a locked vault asks only for the master password", () => {
  render(<AuthPage isLocked={true} onReady={() => {}} />);

  expect(screen.getByText("layout.auth.unlock")).toBeTruthy();
  expect(screen.queryByPlaceholderText("layout.auth.emailPlaceholder")).toBeNull();
});
