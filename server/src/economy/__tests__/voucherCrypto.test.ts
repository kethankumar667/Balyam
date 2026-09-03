import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  hashVoucherCode,
  generateRawVoucherCode,
  voucherHmacDurability,
  assertVoucherHmacConfigured,
} from "../voucherCrypto.js";
import { logger } from "../../lib/logger.js";

/**
 * Production fail-closed behavior for VOUCHER_HMAC_SECRET.
 *
 * Mirrors `security/__tests__/operationalAuth.test.ts`'s "production startup
 * guard" describe block exactly — same env-save/restore discipline, same
 * assertion shape (`toThrow(/Refusing to start in production/)`), because
 * `assertVoucherHmacConfigured()` deliberately follows
 * `assertOperationalAuthConfigured()`'s pattern.
 */

const ENV_KEYS = ["NODE_ENV", "VOUCHER_HMAC_SECRET"];
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

describe("voucherHmacDurability", () => {
  it("reports durable when VOUCHER_HMAC_SECRET is set", () => {
    process.env.VOUCHER_HMAC_SECRET = "a-stable-test-secret";
    expect(voucherHmacDurability()).toEqual({ durable: true, reason: "VOUCHER_HMAC_SECRET is set" });
  });

  it("reports not durable when VOUCHER_HMAC_SECRET is unset", () => {
    const result = voucherHmacDurability();
    expect(result.durable).toBe(false);
    expect(result.reason).toMatch(/VOUCHER_HMAC_SECRET is not set/);
  });

  it("treats a whitespace-only value as missing", () => {
    process.env.VOUCHER_HMAC_SECRET = "   ";
    expect(voucherHmacDurability().durable).toBe(false);
  });
});

describe("assertVoucherHmacConfigured — production startup guard", () => {
  it("development without secret: allowed, with an explicit ephemeral warning", () => {
    process.env.NODE_ENV = "development";
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    expect(() => assertVoucherHmacConfigured()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toMatchObject({ module: "ECONOMY" });
  });

  it("production without secret: fails closed", () => {
    process.env.NODE_ENV = "production";
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    expect(() => assertVoucherHmacConfigured()).toThrow(/Refusing to start in production/);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("production with a non-empty secret: passes", () => {
    process.env.NODE_ENV = "production";
    process.env.VOUCHER_HMAC_SECRET = "a-stable-production-secret";
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    expect(() => assertVoucherHmacConfigured()).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("whitespace-only secret in production is treated as missing and fails closed", () => {
    process.env.NODE_ENV = "production";
    process.env.VOUCHER_HMAC_SECRET = "   ";
    vi.spyOn(logger, "error").mockImplementation(() => {});
    expect(() => assertVoucherHmacConfigured()).toThrow(/Refusing to start in production/);
  });

  it("never logs the secret value, present or absent", () => {
    process.env.NODE_ENV = "production";
    process.env.VOUCHER_HMAC_SECRET = "super-secret-value-must-not-leak";
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    assertVoucherHmacConfigured();
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain("super-secret-value-must-not-leak");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("super-secret-value-must-not-leak");

    delete process.env.VOUCHER_HMAC_SECRET;
    process.env.NODE_ENV = "development";
    assertVoucherHmacConfigured();
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain("super-secret-value-must-not-leak");

    process.env.NODE_ENV = "production";
    expect(() => assertVoucherHmacConfigured()).toThrow();
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("super-secret-value-must-not-leak");
  });
});

describe("voucher hashing behavior is unchanged", () => {
  it("still produces a 64-lowercase-hex HMAC-SHA256 for a generated raw code", () => {
    process.env.VOUCHER_HMAC_SECRET = "a-stable-test-secret";
    const raw = generateRawVoucherCode();
    const hash = hashVoucherCode(raw);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("the same raw code hashes identically twice under the same key", () => {
    process.env.VOUCHER_HMAC_SECRET = "a-stable-test-secret";
    const raw = generateRawVoucherCode();
    expect(hashVoucherCode(raw)).toBe(hashVoucherCode(raw));
  });
});
