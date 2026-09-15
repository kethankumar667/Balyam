import { describe, it, expect, vi, afterEach } from "vitest";
import { mintSeatToken, verifySeatToken, assertSeatTokenConfigured } from "../seatToken.js";
import { logger } from "../logger.js";

const CODE = "AB12CD";
const ALICE = "p_1700000000000_aaaaaa";
const BOB = "p_1700000000000_bbbbbb";

describe("seat tokens", () => {
  it("accepts the token it issued", () => {
    expect(verifySeatToken(CODE, ALICE, mintSeatToken(CODE, ALICE))).toBe(true);
  });

  it("is stable, so a refresh reclaims the same seat", () => {
    expect(mintSeatToken(CODE, ALICE)).toBe(mintSeatToken(CODE, ALICE));
  });

  it("refuses another player's token in the same room", () => {
    // The whole point: ids are public, so this is the attack that used to work
    // — read Alice's id off the broadcast room state and claim her seat.
    expect(verifySeatToken(CODE, ALICE, mintSeatToken(CODE, BOB))).toBe(false);
  });

  it("refuses the same player's token from a different room", () => {
    // Being seated in one room must not be a key to a seat somewhere else.
    expect(verifySeatToken("ZZ99ZZ", ALICE, mintSeatToken(CODE, ALICE))).toBe(false);
  });

  it("refuses a missing, empty or malformed token", () => {
    expect(verifySeatToken(CODE, ALICE, undefined)).toBe(false);
    expect(verifySeatToken(CODE, ALICE, null)).toBe(false);
    expect(verifySeatToken(CODE, ALICE, "")).toBe(false);
    expect(verifySeatToken(CODE, ALICE, "not-a-token")).toBe(false);
    // Right shape, wrong bytes.
    const real = mintSeatToken(CODE, ALICE);
    const tampered = (real[0] === "A" ? "B" : "A") + real.slice(1);
    expect(verifySeatToken(CODE, ALICE, tampered)).toBe(false);
  });

  it("does not throw on a token of the wrong length", () => {
    // timingSafeEqual throws on mismatched lengths; a malformed token must be
    // a rejection, not a 500 that takes the join handler down with it.
    expect(() => verifySeatToken(CODE, ALICE, "x")).not.toThrow();
    expect(() => verifySeatToken(CODE, ALICE, "y".repeat(500))).not.toThrow();
  });

  it("matches room codes case-insensitively", () => {
    // joinRoom upper-cases before lookup, so a lower-case code in a shared
    // link must still reclaim the seat.
    expect(verifySeatToken("ab12cd", ALICE, mintSeatToken(CODE, ALICE))).toBe(true);
    expect(verifySeatToken(CODE, ALICE, mintSeatToken(" ab12cd ", ALICE))).toBe(true);
  });

  it("is url-safe, so it survives storage and transport intact", () => {
    for (let i = 0; i < 50; i++) {
      expect(mintSeatToken(CODE, `p_${i}_${Math.random()}`)).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("cannot be derived from the public id alone", () => {
    // Restating the threat model as a test: everything an attacker can see —
    // room code and player id — is in scope here, and it is not enough.
    const guesses = [ALICE, CODE, `${CODE}:${ALICE}`, Buffer.from(`${CODE}:${ALICE}`).toString("base64url")];
    for (const guess of guesses) {
      expect(verifySeatToken(CODE, ALICE, guess)).toBe(false);
    }
  });
});

/**
 * Security-audit regression: `seat-token-no-production-hardfail-guard`.
 * This test file (and this process) loads with no SESSION_SECRET set, so
 * `usingEphemeralSecret` is `true` for its whole lifetime (it's a module-load-
 * time constant, unlike `guestToken.ts`'s function-based equivalent) — which
 * lets both reachable states below be exercised without a module reimport.
 */
describe("assertSeatTokenConfigured — production startup guard", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it("development with an ephemeral key: allowed, with an explicit warning", () => {
    process.env.NODE_ENV = "development";
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    expect(() => assertSeatTokenConfigured()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toMatchObject({ module: "AUTH" });
  });

  it("production with an ephemeral key: fails closed (previously had no such guard at all)", () => {
    process.env.NODE_ENV = "production";
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    expect(() => assertSeatTokenConfigured()).toThrow(/Refusing to start in production/);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
