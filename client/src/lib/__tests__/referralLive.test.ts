import { describe, expect, it } from "vitest";
import type { ReferralLiveEvent } from "@shared/referrals";
import { describeReferralLiveEvent, parseReferralLiveEvent } from "../referralLive";

const AT = 1_800_000_000_000;
const event = (patch: Partial<ReferralLiveEvent>): ReferralLiveEvent => ({ kind: "friend_joined", friendName: "Meera", at: AT, ...patch });

describe("parseReferralLiveEvent", () => {
  it("accepts exactly what the server sends", () => {
    expect(parseReferralLiveEvent({ kind: "bonus_landed", friendName: "Meera", coins: 2000, at: AT }))
      .toEqual({ kind: "bonus_landed", friendName: "Meera", coins: 2000, at: AT });
  });

  it("accepts a notice with no coins", () => {
    expect(parseReferralLiveEvent({ kind: "friend_joined", friendName: "Meera", at: AT })).toEqual(event({}));
  });

  it("drops anything that is not an object or has an unknown kind", () => {
    for (const bad of [null, undefined, "friend_joined", 7, [], { kind: "friend_joined" }, { kind: "free_coins", friendName: "Meera" }]) {
      expect(parseReferralLiveEvent(bad)).toBeNull();
    }
  });

  it("drops a missing, empty or over-long name", () => {
    expect(parseReferralLiveEvent({ kind: "friend_joined", at: AT })).toBeNull();
    expect(parseReferralLiveEvent({ kind: "friend_joined", friendName: "   ", at: AT })).toBeNull();
    expect(parseReferralLiveEvent({ kind: "friend_joined", friendName: "x".repeat(41), at: AT })).toBeNull();
  });

  it("strips markup and control characters from a name, since it is shown on screen", () => {
    expect(parseReferralLiveEvent({ kind: "friend_joined", friendName: "<b>Meera</b>\u0000", at: AT })?.friendName).toBe("bMeera/b");
  });

  it("drops coins that are not a sane whole number", () => {
    for (const coins of [-1, 1.5, Number.NaN, Infinity, 10_000_000, "2000"]) {
      expect(parseReferralLiveEvent({ kind: "bonus_landed", friendName: "Meera", coins, at: AT }), String(coins)).toBeNull();
    }
  });

  it("falls back to the current time when the server's is missing", () => {
    const before = Date.now();
    const parsed = parseReferralLiveEvent({ kind: "friend_joined", friendName: "Meera" });
    expect(parsed?.at).toBeGreaterThanOrEqual(before);
  });
});

describe("describeReferralLiveEvent", () => {
  it("says a friend joined, and points at the Referrals page", () => {
    expect(describeReferralLiveEvent(event({ kind: "friend_joined" }))).toEqual({
      message: "Meera joined with your code.", type: "info", linksToPage: true,
    });
  });

  it("says a friend played, with the coins on the way and without assuming a gender", () => {
    const notice = describeReferralLiveEvent(event({ kind: "friend_played", coins: 2000 }));
    expect(notice.message).toBe("Meera played their first match. 2,000 coins are on the way to you.");
    expect(notice.message).not.toMatch(/\b(his|her|she|he)\b/i);
    expect(notice).toMatchObject({ type: "success", linksToPage: true });
  });

  it("tells the invitee their own bonus is on its way, naming who invited them", () => {
    expect(describeReferralLiveEvent(event({ kind: "bonus_on_the_way", friendName: "Sunita", coins: 2000 })).message)
      .toBe("You played your first match. 2,000 coins from Sunita's invitation are on the way.");
  });

  it("says the coins landed, in the wallet", () => {
    const notice = describeReferralLiveEvent(event({ kind: "bonus_landed", coins: 2000 }));
    expect(notice.message).toBe("2,000 coins landed in your wallet, thanks to Meera.");
    expect(notice.linksToPage).toBe(false);
  });

  it("has a sensible sentence when no amount is given", () => {
    expect(describeReferralLiveEvent(event({ kind: "friend_played" })).message).toBe("Meera played their first match.");
    expect(describeReferralLiveEvent(event({ kind: "bonus_landed" })).message).toContain("landed in your wallet");
  });
});
