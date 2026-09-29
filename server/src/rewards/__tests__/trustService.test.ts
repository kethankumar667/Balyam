import { describe, it, expect, beforeEach } from "vitest";
import {
  DAILY_TRANSFER_CAP_BY_TIER,
  TIER_REQUIREMENTS,
  TrustService,
  assessTrust,
  type TrustMetrics,
} from "../TrustService.js";
import { matchHistoryService } from "../../profile/MatchHistoryService.js";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory.js";

const none: TrustMetrics = { accountAgeDays: 0, completedMatches: 0, distinctOpponents: 0, activeMandalis: 0 };

/** Exactly what a tier asks for, so a boundary test can move one number by one. */
function exactly(tier: 2 | 3 | 4): TrustMetrics {
  const m = { ...none };
  for (const c of TIER_REQUIREMENTS[tier]) {
    if (c.key === "age") m.accountAgeDays = c.min;
    if (c.key === "matches") m.completedMatches = c.min;
    if (c.key === "opponents") m.distinctOpponents = c.min;
    if (c.key === "mandalis") m.activeMandalis = c.min;
  }
  return m;
}

describe("trust tiers", () => {
  it("puts a brand-new member on tier 1 and lists what tier 2 needs", () => {
    const result = assessTrust(none);

    expect(result.tier).toBe(1);
    expect(result.reasons.every((r) => r.label.startsWith("Tier 2"))).toBe(true);
    expect(result.reasons.every((r) => !r.met)).toBe(true);
  });

  it.each([2, 3, 4] as const)("reaches tier %i with exactly its requirements", (tier) => {
    expect(assessTrust(exactly(tier)).tier).toBe(tier);
  });

  it("stays a tier lower when any single requirement is one short", () => {
    expect(assessTrust({ ...exactly(2), distinctOpponents: 2 }).tier).toBe(1);
    expect(assessTrust({ ...exactly(2), accountAgeDays: 2 }).tier).toBe(1);
    expect(assessTrust({ ...exactly(3), activeMandalis: 0 }).tier).toBe(2);
    expect(assessTrust({ ...exactly(4), distinctOpponents: 49 }).tier).toBe(3);
  });

  it("does not let volume make up for variety: many matches against one opponent is not trust", () => {
    const farm = assessTrust({ accountAgeDays: 200, completedMatches: 5_000, distinctOpponents: 1, activeMandalis: 0 });

    expect(farm.tier).toBe(1);
  });

  it("explains itself: what earned the tier, then what the next one still needs", () => {
    const result = assessTrust(exactly(2));

    const earned = result.reasons.filter((r) => r.label.startsWith("Tier 2"));
    const next = result.reasons.filter((r) => r.label.startsWith("Tier 3"));
    expect(earned.every((r) => r.met)).toBe(true);
    expect(next.some((r) => !r.met)).toBe(true);
    expect(next.find((r) => r.label.includes("different people"))?.detail).toBe("You have 3");
  });

  it("shows nothing further to earn at the top tier", () => {
    const result = assessTrust(exactly(4));

    expect(result.tier).toBe(4);
    expect(result.reasons.every((r) => r.label.startsWith("Tier 4") && r.met)).toBe(true);
  });

  it("caps transfers per day by tier at 500, 1000, 2500 and 5000", () => {
    expect(DAILY_TRANSFER_CAP_BY_TIER).toEqual({ 1: 500, 2: 1_000, 3: 2_500, 4: 5_000 });
  });
});

describe("TrustService", () => {
  it("reads its inputs from the injected providers", async () => {
    const trust = new TrustService();
    trust.setProviders({
      accountAgeDays: () => 31,
      opponentStats: () => ({ realPeopleMatches: 30, distinctOpponents: 12 }),
      activeMandalis: async () => 1,
    });

    expect((await trust.assess("p")).tier).toBe(3);
    expect(await trust.tierOf("p")).toBe(3);
  });

  it("answers tier 1 until it is wired to real data, never higher", async () => {
    expect(await new TrustService().tierOf("anyone")).toBe(1);
  });

  it("lowers the ceiling when community data is unreachable, and never raises it", async () => {
    const trust = new TrustService();
    trust.setProviders({
      accountAgeDays: () => 200,
      opponentStats: () => ({ realPeopleMatches: 500, distinctOpponents: 80 }),
      activeMandalis: async () => {
        throw new Error("mandali store down");
      },
    });

    expect(await trust.tierOf("p")).toBe(2);
  });
});

describe("opponent stats behind the tiers", () => {
  const ME = "trust_me";
  const DURATION = 5 * 60_000;

  function match(id: string, opponents: Array<Record<string, unknown>>, durationMs = DURATION): MatchHistoryItem {
    return {
      matchId: id,
      roomCode: id.toUpperCase(),
      game: "chess",
      startedAt: 1,
      finishedAt: 1 + durationMs,
      durationMs,
      result: "WIN",
      participants: [{ playerId: ME, name: "Me", isWinner: true }, ...opponents] as unknown as MatchHistoryItem["participants"],
      replayAvailable: false,
    };
  }

  beforeEach(() => {
    matchHistoryService.reset();
  });

  it("counts distinct signed-in opponents, once each", () => {
    matchHistoryService.recordMatch(ME, match("m1", [{ playerId: "a", name: "A", isWinner: false, isMember: true }]));
    matchHistoryService.recordMatch(ME, match("m2", [{ playerId: "a", name: "A", isWinner: false, isMember: true }]));
    matchHistoryService.recordMatch(ME, match("m3", [{ playerId: "b", name: "B", isWinner: false, isMember: true }]));

    expect(matchHistoryService.getOpponentStats(ME)).toEqual({ realPeopleMatches: 3, distinctOpponents: 2 });
  });

  it("does not count bots, local seats or throwaway guests as opponents", () => {
    matchHistoryService.recordMatch(ME, match("m1", [{ playerId: "bot", name: "Bot", isWinner: false, isBot: true }]));
    matchHistoryService.recordMatch(ME, match("m2", [{ playerId: "seat2", name: "S", isWinner: false, isLocal: true }]));
    matchHistoryService.recordMatch(ME, match("m3", [{ playerId: "g1", name: "G", isWinner: false, isMember: false }]));
    // A match restored from the database has no member flag; the guest id prefix decides.
    matchHistoryService.recordMatch(ME, match("m4", [{ playerId: "guest_abc123", name: "G", isWinner: false }]));

    expect(matchHistoryService.getOpponentStats(ME)).toEqual({ realPeopleMatches: 0, distinctOpponents: 0 });
  });

  it("counts a restored match against a normal member id (no flag, no guest prefix)", () => {
    matchHistoryService.recordMatch(ME, match("m1", [{ playerId: "member_9", name: "M", isWinner: false }]));

    expect(matchHistoryService.getOpponentStats(ME).distinctOpponents).toBe(1);
  });

  it("ignores matches too short to have been played, so instant matches build no trust", () => {
    matchHistoryService.recordMatch(
      ME,
      match("m1", [{ playerId: "a", name: "A", isWinner: false, isMember: true }], 1_000),
    );

    expect(matchHistoryService.getOpponentStats(ME)).toEqual({ realPeopleMatches: 0, distinctOpponents: 0 });
  });
});
