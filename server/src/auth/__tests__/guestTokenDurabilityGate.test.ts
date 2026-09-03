import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { guestTokenDurability, assertGuestTokenDurabilityConfigured } from "../guestToken.js";
import { logger } from "../../lib/logger.js";

/**
 * Production fail-closed behavior for SESSION_SECRET.
 *
 * Mirrors `economy/__tests__/voucherCrypto.test.ts`'s "production startup
 * guard" describe block exactly — same env-save/restore discipline, same
 * assertion shape (`toThrow(/Refusing to start in production/)`), because
 * `assertGuestTokenDurabilityConfigured()` deliberately follows
 * `assertVoucherHmacConfigured()`'s pattern (see guestToken.ts's own header).
 *
 * This is the T7 regression test for the guest-wallet-consistency audit:
 * an unset SESSION_SECRET used to be a boot-time log line only, which meant
 * every production restart silently orphaned every outstanding guest wallet.
 */

const ENV_KEYS = ["NODE_ENV", "SESSION_SECRET"];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe("guestTokenDurability", () => {
  it("reports durable when SESSION_SECRET is set", () => {
    process.env.SESSION_SECRET = "a-stable-test-secret";
    expect(guestTokenDurability()).toEqual({ durable: true, reason: "SESSION_SECRET is set" });
  });

  it("reports not durable when SESSION_SECRET is unset", () => {
    const result = guestTokenDurability();
    expect(result.durable).toBe(false);
    expect(result.reason).toMatch(/SESSION_SECRET is not set/);
  });

  it("treats a whitespace-only value as missing", () => {
    process.env.SESSION_SECRET = "   ";
    expect(guestTokenDurability().durable).toBe(false);
  });
});

describe("assertGuestTokenDurabilityConfigured — production startup guard", () => {
  it("development without secret: allowed, with an explicit ephemeral warning", () => {
    process.env.NODE_ENV = "development";
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    expect(() => assertGuestTokenDurabilityConfigured()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toMatchObject({ module: "AUTH" });
  });

  it("production without secret: fails closed", () => {
    process.env.NODE_ENV = "production";
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    expect(() => assertGuestTokenDurabilityConfigured()).toThrow(/Refusing to start in production/);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("production with a non-empty secret: passes", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "a-stable-production-secret";
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    expect(() => assertGuestTokenDurabilityConfigured()).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("whitespace-only secret in production is treated as missing and fails closed", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "   ";
    vi.spyOn(logger, "error").mockImplementation(() => {});
    expect(() => assertGuestTokenDurabilityConfigured()).toThrow(/Refusing to start in production/);
  });

  it("never logs the secret value, present or absent", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "super-secret-value-must-not-leak";
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    assertGuestTokenDurabilityConfigured();
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain("super-secret-value-must-not-leak");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("super-secret-value-must-not-leak");

    delete process.env.SESSION_SECRET;
    process.env.NODE_ENV = "development";
    assertGuestTokenDurabilityConfigured();
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain("super-secret-value-must-not-leak");

    process.env.NODE_ENV = "production";
    expect(() => assertGuestTokenDurabilityConfigured()).toThrow();
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("super-secret-value-must-not-leak");
  });
});
