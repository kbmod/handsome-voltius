import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

test("desktop bundle uses the Handsome Voltius identity without upstream updater coupling", () => {
  const config = JSON.parse(read("src-tauri/tauri.conf.json")) as {
    productName: string;
    app: { windows: Array<{ title: string }> };
    bundle: { createUpdaterArtifacts: boolean };
    plugins?: { updater?: unknown };
  };

  expect(config.productName).toBe("Handsome Voltius");
  expect(config.app.windows[0]?.title).toBe("Handsome Voltius");
  expect(config.bundle.createUpdaterArtifacts).toBe(false);
  expect(config.plugins?.updater).toBeUndefined();
});

test("visible project links belong to this fork", () => {
  const about = read("src/components/settings/sections/AboutSection.tsx");
  const whatsNew = read("src/components/changelog/WhatsNewModal.tsx");
  const visibleLinks = `${about}\n${whatsNew}`;

  expect(visibleLinks).toContain("github.com/kbmod/handsome-voltius");
  expect(visibleLinks).toContain("buymeacoffee.com/kbmod");
  expect(visibleLinks).toContain("x.com/stillbooting");
  expect(visibleLinks).not.toMatch(/VoltiusApp|voltius\.app|ko-fi|kipavy|contact@/i);
});

test("new Gists use the fork name while old Gists remain discoverable", () => {
  const gistApi = read("src/plugins/gist-sync/gist-api.ts");

  expect(gistApi).toContain("Handsome Voltius Sync — do not edit manually");
  expect(gistApi).toContain("Voltius Sync — do not edit manually");
});
