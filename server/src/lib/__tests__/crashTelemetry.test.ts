import { describe, expect, it, vi } from "vitest";

/**
 * crashTelemetry is import-safe in a bare test process: with no SENTRY_DSN
 * set, `captureCrash` must be a pure no-op that never imports the SDK and
 * never lets a failure escape to the caller.
 */
describe("crashTelemetry — disabled by default", () => {
  it("captureCrash is a silent no-op without SENTRY_DSN", async () => {
    const { captureCrash, flushCrashTelemetry } = await import("../crashTelemetry.js");
    expect(() => captureCrash(new Error("boom"), { handler: "test" })).not.toThrow();
    await expect(flushCrashTelemetry()).resolves.toBeUndefined();
  });

  it("swallows dynamic-import failures rather than throwing", async () => {
    // Even with a DSN set, a missing SDK must degrade to a warn, not crash
    // the process — that's the whole contract of the module.
    process.env.SENTRY_DSN = "https://fake@example.com/1";
    vi.resetModules();
    try {
      const { captureCrash } = await import("../crashTelemetry.js");
      expect(() => captureCrash(new Error("boom"))).not.toThrow();
    } finally {
      delete process.env.SENTRY_DSN;
      vi.resetModules();
    }
  });
});
