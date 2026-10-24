import { describe, expect, it } from "vitest";
import { mintReferralIntent, readReferralIntent } from "../referralIntent.js";
import { REFERRAL_WINDOW_MS } from "@shared/referrals.js";

const code = "00000000-0000-4000-8000-000000000001";
const key = "test-only-referral-signing-key-32-characters";

describe("signed referral acceptance", () => {
  it("binds the actual server acceptance time and expiry", () => {
    const token = mintReferralIntent(code, key, 1000);
    expect(readReferralIntent(token, key, 1001)).toEqual({ code, acceptedAt: 1000, expiresAt: 1000 + REFERRAL_WINDOW_MS });
  });
  it("rejects tampering, wrong keys, expired, future and malformed tokens", () => {
    const token = mintReferralIntent(code, key, 1000);
    expect(readReferralIntent(`${token}x`, key, 1001)).toBeNull();
    expect(readReferralIntent(token, `${key}other`, 1001)).toBeNull();
    expect(readReferralIntent(token, key, 1000 + REFERRAL_WINDOW_MS)).toBeNull();
    expect(readReferralIntent(token, key, 999)).toBeNull();
    for (const bad of ["", ".", "a.b", "x".repeat(2000)]) expect(readReferralIntent(bad, key, 1001)).toBeNull();
  });
  it("treats non-ASCII and non-base64 signatures as refusals, never exceptions", () => {
    const [body, signature] = mintReferralIntent(code, key, 1000).split(".");
    expect(readReferralIntent(`${body}.${"\u00e9".repeat(signature.length)}`, key, 1001)).toBeNull();
    expect(readReferralIntent(`${body}.${"!".repeat(signature.length)}`, key, 1001)).toBeNull();
  });
});
