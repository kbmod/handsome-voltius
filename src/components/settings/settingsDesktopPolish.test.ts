import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

test("desktop settings use the compact scoped layout without affecting mobile", () => {
  const modal = read("src/components/settings/SettingsModal.tsx");
  const styles = read("src/styles/globals.css");

  expect(modal).toContain("settings-desktop");
  expect(modal).toContain("settings-nav-item");
  expect(modal).toContain("settings-content");
  expect(styles).toContain(".settings-desktop");
  expect(styles).toContain(".settings-content > div");
  expect(styles).toContain("MobileSettings does not use this scope");
});

test("settings navigation and shared controls expose keyboard state", () => {
  const modal = read("src/components/settings/SettingsModal.tsx");
  const select = read("src/components/shared/FormSelect.tsx");
  const shared = read("src/components/settings/sections/shared.tsx");

  expect(modal).toContain('aria-current={active ? "page" : undefined}');
  expect(modal).toContain('aria-label={t("settings.chrome.close")}');
  expect(select).toContain('aria-haspopup="listbox"');
  expect(select).toContain("aria-expanded={open}");
  expect(shared).toContain('aria-label={t("settings.shared.resetToDefault")}');
  expect(shared).toContain("focus:opacity-100");
});
