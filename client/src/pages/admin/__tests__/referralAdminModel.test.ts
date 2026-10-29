import { describe, it, expect } from "vitest";
import type { ReferralAdminCampaign, ReferralAdminEvent, ReferralAdminFunnel } from "@shared/referrals";
import {
  checkCampaignForm,
  describeAdminEvent,
  formFromCampaign,
  funnelStages,
  percent,
  whoDidIt,
} from "../referrals/referralAdminModel";

const campaign: ReferralAdminCampaign = {
  enabled: true,
  bonusStartsAt: 0,
  inviterBonus: 2000,
  inviteeBonus: 2000,
  rollingCap: 10,
  capWindowDays: 30,
  codeWindowDays: 7,
};

describe("checkCampaignForm", () => {
  it("reports nothing to send, without an error, when no field changed", () => {
    expect(checkCampaignForm(formFromCampaign(campaign), campaign)).toEqual({ ok: false, message: null });
  });

  it("sends only the fields that changed", () => {
    const form = { ...formFromCampaign(campaign), inviterBonus: "3000" };
    expect(checkCampaignForm(form, campaign)).toEqual({ ok: true, changes: { inviterBonus: 3000 } });
  });

  it("names the setting and its range when a value is too large", () => {
    const form = { ...formFromCampaign(campaign), inviteeBonus: "20000" };
    const result = checkCampaignForm(form, campaign);
    expect(result).toEqual({ ok: false, message: "Invitee bonus (coins) must be a whole number from 0 to 10000." });
  });

  it.each(["", "  ", "1.5", "abc", "-1"])("refuses %j", (text) => {
    const form = { ...formFromCampaign(campaign), rollingCap: text };
    const result = checkCampaignForm(form, campaign);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toMatch(/Friends rewarded per window/);
  });

  it("allows a zero bonus (stopping the coins) but not a zero-day window", () => {
    const stop = { ...formFromCampaign(campaign), inviterBonus: "0", inviteeBonus: "0" };
    expect(checkCampaignForm(stop, campaign)).toEqual({ ok: true, changes: { inviterBonus: 0, inviteeBonus: 0 } });
    const zeroWindow = { ...formFromCampaign(campaign), capWindowDays: "0" };
    expect(checkCampaignForm(zeroWindow, campaign).ok).toBe(false);
  });
});

describe("funnelStages", () => {
  const funnel: ReferralAdminFunnel = {
    invitesCreated: 200, joined: 50, viaCode: 40, viaLink: 10, qualified: 25, waiting: 20, expired: 5,
    bonusReserved: 25, bonusIssued: 20, bonusBlockedCap: 0,
  };

  it("lists the stages in order with the share of the stage before", () => {
    expect(funnelStages(funnel).map((s) => [s.key, s.count, s.percentOfPrevious])).toEqual([
      ["invites", 200, null],
      ["joined", 50, 25],
      ["played", 25, 50],
      ["paid", 20, 80],
    ]);
  });

  it("gives no percentage when the stage before is empty", () => {
    expect(percent(0, 0)).toBeNull();
    expect(funnelStages({ ...funnel, joined: 0, qualified: 0, bonusIssued: 0 })[2]!.percentOfPrevious).toBeNull();
  });
});

describe("describeAdminEvent / whoDidIt", () => {
  const base = { id: 1, actor: "ops-key", note: "why", at: 1 };

  it("shows each changed setting as before -> after", () => {
    const event: ReferralAdminEvent = {
      ...base,
      action: "CAMPAIGN_UPDATED",
      detail: { before: { inviterBonus: 2000, rollingCap: 10 }, after: { inviterBonus: 3000, rollingCap: 10 } },
    };
    expect(describeAdminEvent(event)).toBe("Inviter bonus (coins): 2000 → 3000");
  });

  it("describes a withdrawn bonus with its amount", () => {
    const event: ReferralAdminEvent = { ...base, action: "REWARD_VOIDED", detail: { amount: 2000 } };
    expect(describeAdminEvent(event)).toBe("Withdrew 2,000 coins");
  });

  it("names who acted", () => {
    expect(whoDidIt("ops-key")).toBe("Operations key");
    expect(whoDidIt("admin:abc")).toBe("Admin abc");
  });
});
