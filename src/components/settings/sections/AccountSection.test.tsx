import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@iconify/react", () => ({ Icon: () => null }));
vi.mock("@/services/account", () => ({
  getAccountMode: vi.fn(async () => "local"),
  setMasterPassword: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
  lockVaultSession: vi.fn(async () => {}),
}));
vi.mock("@/services/vault", () => ({ resetVault: vi.fn(async () => {}) }));

import AccountSection from "./AccountSection";

afterEach(() => cleanup());

test("shows vault security actions without plan or billing state", async () => {
  render(<AccountSection />);

  expect(await screen.findByText("settings.account.sessionSecurity.title")).toBeTruthy();
  expect(screen.getByText("settings.account.wipeData.label")).toBeTruthy();

  // Nothing here may advertise a paid plan: this fork has no subscription and
  // no checkout to send the user to.
  expect(screen.queryByText("settings.account.plan.title")).toBeNull();
  expect(screen.queryByText("settings.account.plan.upgrade")).toBeNull();
  expect(screen.queryByText("settings.account.plan.manageBilling")).toBeNull();
  expect(screen.queryByText("settings.account.plan.viewAllPlans")).toBeNull();
  expect(screen.queryByText("settings.account.email")).toBeNull();
});
