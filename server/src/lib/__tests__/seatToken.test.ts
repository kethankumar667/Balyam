import { describe, it, expect } from "vitest";
import { mintSeatToken, verifySeatToken } from "../seatToken.js";

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
