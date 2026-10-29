import { describe, expect, it } from "vitest";
import type { ReferralBonusView, ReferralFriend, ReferralOverview } from "@shared/referrals";
import { friendTrack, journeyStages, packNodes } from "../crew/crewProgress";

const campaign: ReferralOverview["campaign"] = {
  inviterBonus: 2000, inviteeBonus: 2000, windowDays: 30, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7, target: 3,
};
const totals = (patch: Partial<ReferralOverview["totals"]> = {}): ReferralOverview["totals"] => ({
  joined: 0, qualified: 0, waiting: 0, expired: 0, bonusCredited: 0, bonusPending: 0, ...patch,
});
const NOW = Date.UTC(2026, 9, 29, 12);
const DAY = 86_400_000;
const bonus = (patch: Partial<ReferralBonusView> = {}): ReferralBonusView => ({
  state: "NONE", amount: 2000, vestingUntil: null, creditedAt: null, blockedReason: null, ...patch,
});
const friend = (patch: Partial<ReferralFriend> = {}): ReferralFriend => ({
  ordinal: 1, displayName: "Asha", avatarId: null, joinedAt: NOW - DAY, expiresAt: NOW + 29 * DAY, qualifiedAt: null,
  status: "JOINED", via: "code", yourBonus: bonus(), theirBonus: bonus(), ...patch,
});
const states = (stages: ReturnType<typeof journeyStages>) => stages.map((stage) => stage.state);

describe("journeyStages", () => {
  it("waits on the first friend when nobody has joined yet", () => {
    expect(states(journeyStages(totals(), campaign))).toEqual(["done", "current", "upcoming", "upcoming", "upcoming"]);
  });

  it("explains '3 joined, nothing paid': the member is at 'Play Together'", () => {
    expect(states(journeyStages(totals({ joined: 3 }), campaign))).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
  });

  it("moves to 'Verify Match' once a friend has played and nothing has been paid", () => {
    expect(states(journeyStages(totals({ joined: 3, qualified: 1, bonusPending: 2000 }), campaign))).toEqual(["done", "done", "done", "current", "upcoming"]);
  });

  it("completes every stage once a bonus has been paid", () => {
    expect(states(journeyStages(totals({ joined: 1, qualified: 1, bonusCredited: 2000 }), campaign))).toEqual(["done", "done", "done", "done", "done"]);
  });

  it("names what each side earns, or says 'for you both' when the two differ", () => {
    expect(journeyStages(totals(), campaign)[4]!.hint).toBe("2,000 coins each");
    expect(journeyStages(totals(), { ...campaign, inviteeBonus: 1000 })[4]!.hint).toBe("Coins for you both");
  });
});

describe("friendTrack", () => {
  it("shows a joined friend who has not played as 'Joined', with the days left", () => {
    const track = friendTrack(friend(), campaign, NOW);
    expect(track.badge).toEqual({ label: "Joined", tone: "info" });
    expect(track.steps.map((step) => step.state)).toEqual(["done", "current", "upcoming"]);
    expect(track.note).toMatch(/29 days left/);
  });

  it("says 'day', not 'days', for the last day", () => {
    expect(friendTrack(friend({ expiresAt: NOW + DAY }), campaign, NOW).note).toMatch(/1 day left$/);
  });

  it("shows a played match that is still in its hold as 'Verifying', with the reward step in progress", () => {
    const track = friendTrack(friend({ status: "QUALIFIED", yourBonus: bonus({ state: "VESTING", vestingUntil: NOW + DAY }) }), campaign, NOW);
    expect(track.badge).toEqual({ label: "Verifying", tone: "pending" });
    expect(track.steps.map((step) => step.state)).toEqual(["done", "done", "current"]);
  });

  it("shows a paid bonus as 'Rewarded' with every step done", () => {
    const track = friendTrack(friend({ status: "QUALIFIED", yourBonus: bonus({ state: "CREDITED", creditedAt: NOW }) }), campaign, NOW);
    expect(track.badge).toEqual({ label: "Rewarded", tone: "success" });
    expect(track.steps.every((step) => step.state === "done")).toBe(true);
  });

  it("shows a friend whose window has closed as a muted 'Window ended', not a failure", () => {
    const track = friendTrack(friend({ status: "EXPIRED" }), campaign, NOW);
    expect(track.badge).toEqual({ label: "Window ended", tone: "muted" });
    expect(track.steps.map((step) => step.state)).toEqual(["done", "ended", "ended"]);
    expect(track.note).toMatch(/within 30 days/);
  });

  it("treats a joined friend whose time has passed (before the server marks it) as ended too", () => {
    expect(friendTrack(friend({ expiresAt: NOW - 1 }), campaign, NOW).badge.label).toBe("Window ended");
  });

  it("shows a held bonus as 'On hold' and a withdrawn one as 'Withdrawn', without saying why", () => {
    expect(friendTrack(friend({ status: "QUALIFIED", yourBonus: bonus({ state: "BLOCKED", blockedReason: "REVIEW" }) }), campaign, NOW).badge).toEqual({ label: "On hold", tone: "warn" });
    expect(friendTrack(friend({ status: "QUALIFIED", yourBonus: bonus({ state: "VOIDED" }) }), campaign, NOW).badge).toEqual({ label: "Withdrawn", tone: "muted" });
  });
});

describe("packNodes", () => {
  it("counts filled nodes and what remains", () => {
    expect(packNodes({ granted: false, qualifiedFriends: 1, target: 3 })).toEqual({ filled: 1, total: 3, remaining: 2 });
  });

  it("never fills more than the target", () => {
    expect(packNodes({ granted: true, qualifiedFriends: 7, target: 3 })).toEqual({ filled: 3, total: 3, remaining: 0 });
  });
});
