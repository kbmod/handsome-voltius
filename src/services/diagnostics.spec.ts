import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

const setLoggerVerbose = vi.fn();
vi.mock("@/lib/logger", () => ({ setLoggerVerbose: (...a: unknown[]) => setLoggerVerbose(...a) }));

import { setVerboseLogging, createBugReport, revealAppLog } from "./diagnostics";

beforeEach(() => {
  invoke.mockReset();
  setLoggerVerbose.mockReset();
});

describe("diagnostics service", () => {
  it("setVerboseLogging passes the enabled flag", async () => {
    invoke.mockResolvedValue(undefined);
    await setVerboseLogging(true);
    expect(invoke).toHaveBeenCalledWith("set_verbose_logging", { enabled: true });
  });

  it("setVerboseLogging syncs the frontend logger flag", async () => {
    invoke.mockResolvedValue(undefined);
    await setVerboseLogging(true);
    expect(setLoggerVerbose).toHaveBeenCalledWith(true);
  });

  it("setVerboseLogging(false) passes the disabled flag and syncs the logger", async () => {
    invoke.mockResolvedValue(undefined);
    await setVerboseLogging(false);
    expect(invoke).toHaveBeenCalledWith("set_verbose_logging", { enabled: false });
    expect(setLoggerVerbose).toHaveBeenCalledWith(false);
  });

  it("createBugReport returns the path", async () => {
    invoke.mockResolvedValue("/logs/voltius-report-2026-07-04.zip");
    await expect(createBugReport()).resolves.toContain("voltius-report");
  });

  it("revealAppLog opens and returns the active log path", async () => {
    invoke.mockResolvedValue("/logs/voltius.log");
    await expect(revealAppLog()).resolves.toBe("/logs/voltius.log");
    expect(invoke).toHaveBeenCalledWith("reveal_app_log");
  });
});
