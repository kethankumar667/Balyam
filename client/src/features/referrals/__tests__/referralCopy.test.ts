import { describe, expect, it } from "vitest";
import type { ReferralBonusView, ReferralOverview } from "@shared/referrals";
import { daysLeft, describeBonus, describeFriendStatus, formatArrivalMoment, formatCoins, promiseLine } from "../referralCopy";
import { inviteMessage, inviteUrl, whatsappUrl } from "../referralShare";

const campaign: ReferralOverview["campaign"] = {
  inviterBonus: 2000, inviteeBonus: 2000, windowDays: 30, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7, target: 3,
};
const view = (patch: Partial<ReferralBonusView>): ReferralBonusView => ({
  state: "NONE", amount: 2000, vestingUntil: null, creditedAt: null, blockedReason: null, ...patch,
});
const NOW = Date.UTC(2026, 9, 28, 12);
const DAY = 86_400_000;

describe("describeBonus", () => {
  it("says a bonus is locked until the first match with another person", () => {
    expect(describeBonus(view({ state: "NONE" }), campaign)).toEqual({
      tone: "muted", label: "2,000 coins after a first match with another person",
    });
  });

  it("names the day, the time and how far off a held bonus is", () => {
    const chip = describeBonus(view({ state: "VESTING", vestingUntil: NOW + DAY }), campaign, NOW);
    expect(chip.tone).toBe("info");
    expect(chip.label).toMatch(/^2,000 coins arriving .+ at \d{1,2}:\d{2}.* \(in 24 hr\)$/);
  });

  describe("when a held bonus lands", () => {
    // Built from local dates, because "today" and "tomorrow" are the member's own calendar days.
    const evening = new Date(2026, 9, 29, 20, 10).getTime();
    const hours = (n: number) => evening + n * 3_600_000;

    it("says 'today at' with the time and a countdown when it lands the same day", () => {
      expect(formatArrivalMoment(hours(1.5), evening)).toMatch(/^today at \d{1,2}:\d{2}.* \(in 2 hr\)$/);
    });

    it("says 'tomorrow at' when it lands after midnight", () => {
      expect(formatArrivalMoment(hours(24), evening)).toMatch(/^tomorrow at \d{1,2}:\d{2}.* \(in 24 hr\)$/);
    });

    it("gives the date and the time when it lands later than tomorrow", () => {
      expect(formatArrivalMoment(hours(72), evening)).toMatch(/^[A-Za-z0-9 ,.]+ at \d{1,2}:\d{2}.* \(in 72 hr\)$/);
    });

    it("counts in minutes inside the last hour, and never says a time that has already passed", () => {
      expect(formatArrivalMoment(evening + 20 * 60_000, evening)).toMatch(/\(in 20 min\)$/);
      expect(formatArrivalMoment(evening - 1_000, evening)).toBe("now");
      expect(describeBonus(view({ state: "VESTING", vestingUntil: evening - 1_000 }), campaign, evening).label).toBe("2,000 coins arriving now");
    });
  });

  it("falls back to 'on the way' when a held bonus has no date", () => {
    expect(describeBonus(view({ state: "VESTING" }), campaign).label).toBe("2,000 coins on the way");
  });

  it("marks a paid bonus as received", () => {
    const chip = describeBonus(view({ state: "CREDITED", creditedAt: NOW }), campaign);
    expect(chip.tone).toBe("success");
    expect(chip.label).toMatch(/^2,000 coins received /);
  });

  it("explains the friend cap in the member's own numbers", () => {
    expect(describeBonus(view({ state: "BLOCKED", blockedReason: "CAP" }), campaign).label)
      .toBe("Not paid: 10 friends already rewarded in 30 days");
  });

  it("never hints at a risk review for a held bonus", () => {
    const chip = describeBonus(view({ state: "BLOCKED", blockedReason: "REVIEW" }), campaign);
    expect(chip.label).toBe("On hold");
    expect(chip.label).not.toMatch(/review|risk|watch|fraud|abuse/i);
  });

  it("reports a withdrawn bonus plainly", () => {
    expect(describeBonus(view({ state: "VOIDED" }), campaign)).toEqual({ tone: "muted", label: "Withdrawn" });
  });
});

describe("describeFriendStatus", () => {
  it("counts the days left for a friend who has not played yet", () => {
    expect(describeFriendStatus("JOINED", NOW + 3 * DAY, NOW)).toBe("Joined, waiting for a first match (3 days left)");
    expect(describeFriendStatus("JOINED", NOW + DAY, NOW)).toBe("Joined, waiting for a first match (1 day left)");
  });

  it("drops the countdown once the window is over", () => {
    expect(describeFriendStatus("JOINED", NOW - 1, NOW)).toBe("Joined, waiting for a first match");
  });

  it("describes qualified and expired friends", () => {
    expect(describeFriendStatus("QUALIFIED", NOW, NOW)).toMatch(/played a match/i);
    expect(describeFriendStatus("EXPIRED", NOW, NOW)).toMatch(/ended/i);
  });
});

describe("helpers", () => {
  it("never reports negative days", () => {
    expect(daysLeft(NOW - 5 * DAY, NOW)).toBe(0);
  });

  it("formats coins the way the wallet does", () => {
    expect(formatCoins(2000)).toBe("2,000");
    expect(formatCoins(125000)).toBe("1,25,000");
  });

  it("builds the promise from the live campaign", () => {
    expect(promiseLine(campaign)).toBe("You and your friend each get 2,000 coins when they finish a match with another person.");
    expect(promiseLine({ ...campaign, inviteeBonus: 1500 })).toMatch(/You get 2,000 coins and your friend gets 1,500/);
  });
});

describe("share links", () => {
  it("builds a link that carries only the code", () => {
    expect(inviteUrl("BHALYAM-K7M2P", "https://bhalyam.example/")).toBe("https://bhalyam.example/invite/BHALYAM-K7M2P");
  });

  it("keeps the URL out of the share-sheet text", () => {
    const text = inviteMessage("BHALYAM-K7M2P", 2000);
    expect(text).toContain("BHALYAM-K7M2P");
    expect(text).toContain("2,000 coins");
    expect(text).not.toMatch(/https?:/);
  });

  it("puts the URL back in for WhatsApp, once", () => {
    const decoded = decodeURIComponent(whatsappUrl("BHALYAM-K7M2P", 2000, "https://bhalyam.example"));
    expect(decoded.match(/https:\/\/bhalyam\.example\/invite\/BHALYAM-K7M2P/g)).toHaveLength(1);
    expect(whatsappUrl("BHALYAM-K7M2P", 2000, "https://bhalyam.example")).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});
