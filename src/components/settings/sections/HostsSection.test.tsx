import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@iconify/react", () => ({ Icon: () => null }));

import HostsSection from "./HostsSection";
import { useToggleSettingsStore } from "@/stores/toggleSettingsStore";

beforeEach(() => {
  localStorage.clear();
  useToggleSettingsStore.setState({ values: {} });
});

afterEach(() => cleanup());

test("exposes a switch that disables session and workspace restore", () => {
  render(<HostsSection />);

  const title = screen.getByText("settings.hosts.restoreWorkspace.title");
  const row = title.parentElement?.parentElement;
  const toggle = row?.querySelector('[role="switch"]');

  expect(toggle).toBeTruthy();
  expect(toggle?.getAttribute("aria-checked")).toBe("true");

  fireEvent.click(toggle!);

  expect(useToggleSettingsStore.getState().values["restore-workspace"]).toBe(false);
  expect(toggle?.getAttribute("aria-checked")).toBe("false");
});
