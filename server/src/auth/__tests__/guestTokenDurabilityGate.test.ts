import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  guestTokenDurability,
  assertGuestTokenDurabilityConfigured,
  signingKeyWeakness,
  MIN_SIGNING_SECRET_LENGTH,
} from "../guestToken.js";
import { logger } from "../../lib/logger.js";

/**
 * Production fail-closed behavior for SESSION_SECRET.
 *
 * Same env-save/restore discipline and assertion shape
 * (`toThrow(/Refusing to start in production/)`) as the other production
 * startup guards; `assertGuestTokenDurabilityConfigured()` follows
 * `assertOperationalAuthConfigured()`'s pattern (see guestToken.ts's own header).
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

  it("production with a long random secret: passes", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "a-stable-production-secret-of-sufficient-length-0123456789";
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    expect(() => assertGuestTokenDurabilityConfigured()).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("production with a short secret: fails closed, because a guessable key mints tokens for any guest", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "short-but-set";
    vi.spyOn(logger, "error").mockImplementation(() => {});

    expect(() => assertGuestTokenDurabilityConfigured()).toThrow(/Refusing to start in production.*shorter than 32/);
  });

  it("production with the sample value copied from .env.example: fails closed even though it is long enough", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "replace-with-a-stable-random-session-secret";
    vi.spyOn(logger, "error").mockImplementation(() => {});

    expect(process.env.SESSION_SECRET.length).toBeGreaterThanOrEqual(MIN_SIGNING_SECRET_LENGTH);
    expect(signingKeyWeakness()).toMatch(/placeholder copied from an example file/);
    expect(() => assertGuestTokenDurabilityConfigured()).toThrow(/Refusing to start in production/);
  });

  it("the minimum is exact: 31 characters is refused, 32 is accepted", () => {
    process.env.NODE_ENV = "production";
    vi.spyOn(logger, "error").mockImplementation(() => {});

    process.env.SESSION_SECRET = "x".repeat(MIN_SIGNING_SECRET_LENGTH - 1);
    expect(signingKeyWeakness()).toMatch(/shorter than 32/);
    expect(() => assertGuestTokenDurabilityConfigured()).toThrow(/Refusing to start in production/);

    process.env.SESSION_SECRET = "x".repeat(MIN_SIGNING_SECRET_LENGTH);
    expect(signingKeyWeakness()).toBeNull();
    expect(() => assertGuestTokenDurabilityConfigured()).not.toThrow();
  });

  it("development with a short secret: allowed, with one warning that names the fix", () => {
    process.env.NODE_ENV = "development";
    process.env.SESSION_SECRET = "dev-secret";
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    expect(() => assertGuestTokenDurabilityConfigured()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warnSpy.mock.calls)).toContain("openssl rand");
  });

  it("never echoes a weak secret back in the log or the error", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "weakvalue-must-not-leak";
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    let thrown = "";
    try {
      assertGuestTokenDurabilityConfigured();
    } catch (err) {
      thrown = String(err);
    }

    expect(thrown).toMatch(/Refusing to start in production/);
    expect(thrown).not.toContain("weakvalue-must-not-leak");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("weakvalue-must-not-leak");
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
