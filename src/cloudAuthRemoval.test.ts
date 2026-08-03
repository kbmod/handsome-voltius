import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

/**
 * Personal sync in this fork is encrypted GitHub Gist sync, and nothing is
 * behind a paid plan. The Legacy Voltius Cloud team code stays in the tree but
 * dormant, so what must not come back is the *entry points*: a sign-in the user
 * can reach, or an upsell for a plan they cannot buy.
 */

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      sourceFiles(path, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

const files = sourceFiles("src");
const read = (path: string) => readFileSync(path, "utf8");

test("no surface can open a Legacy Voltius Cloud sign-in", () => {
  const offenders = files.filter((f) => /openCloudAuth|CloudAuthModal/.test(read(f)));
  expect(offenders).toEqual([]);
});

test("account creation and sign-in services have no callers", () => {
  // They remain exported for the dormant team code, but nothing may call them:
  // a call would be a route back into an account this fork cannot support.
  const callers = files
    .filter((f) => f !== join("src", "services", "account.ts"))
    .filter((f) => /\b(createServerAccount|signInToCloud|linkToCloud)\s*\(/.test(read(f)));
  expect(callers).toEqual([]);
});

test("creating a vault is not gated on a paid tier", () => {
  const sidebar = read("src/components/layout/VaultSidebar.tsx");
  const vaultsSection = read("src/components/settings/sections/VaultsSection.tsx");

  for (const source of [sidebar, vaultsSection]) {
    expect(source).not.toMatch(/isPro\s*&&|!isPro/);
    expect(source).not.toContain("VaultLimitModal");
  }
});

test("the launch sequence never starts the team realtime stream", () => {
  expect(read("src/components/layout/SplashScreen.tsx")).not.toContain("startRealtimeSync");
});

test("removed cloud and billing translation keys are gone from every locale", () => {
  const dead = [
    '"cloudAuthModal"',
    '"trialExpiredModal"',
    '"cloudAccount"',
    '"signInSignUp"',
    '"signInToSync"',
    '"manageBilling"',
    '"viewAllPlans"',
  ];
  const localesDir = join("src", "i18n", "locales");

  for (const locale of readdirSync(localesDir)) {
    for (const file of readdirSync(join(localesDir, locale))) {
      const contents = read(join(localesDir, locale, file));
      for (const key of dead) {
        expect(`${locale}/${file}: ${contents.includes(key)}`).toBe(`${locale}/${file}: false`);
      }
    }
  }
});
