import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { profileService } from "../ProfileService.js";
import { riskService } from "../../rewards/RiskService.js";
import { installRewards, uninstallRewards } from "../../rewards/__tests__/rewardRig.js";
import { PACE_MAX_MATCHES, MIN_MATCH_DURATION_MS } from "../../rewards/SessionRules.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import { setProgressionRepository, progressionRepository } from "../../persistence/index.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";

const ME = "pace_player";
const DAY = 86_400_000;

/** A full table of two signed-in members, so only the session rules decide the XP. */
function memberTable(n: number, finishedAt: number, durationMs: number, iWin = true) {
  return {
    roomCode: `PACE${n}`,
    game: "rps" as const,
    startedAt: finishedAt - durationMs,
    finishedAt,
    durationMs,
    winnerId: iWin ? ME : `pal_${n}`,
    participants: [
      { playerId: ME, name: "Pace", isWinner: iWin, isMember: true },
      { playerId: `pal_${n}`, name: "Pal", isWinner: !iWin, isMember: true },
    ],
  };
}

const xp = () => profileService.getProfile(ME)?.experiencePoints ?? 0;

describe("XP obeys the match-duration and pace rules", () => {
  beforeEach(() => {
    setProgressionRepository(new InMemoryProgressionRepository());
    profileService.reset();
    riskService.reset();
  });

  afterEach(() => {
    uninstallRewards();
    setProgressionRepository(null);
  });

  it("pays no XP for a match shorter than the game's floor, but still records the match", () => {
    profileService.recordMatchFinished(memberTable(1, 20 * DAY, MIN_MATCH_DURATION_MS.rps - 1));

    expect(xp()).toBe(0);
    expect(profileService.getStats(ME).totalMatches).toBe(1);
  });

  it("pays full XP for a match exactly at the floor", () => {
    profileService.recordMatchFinished(memberTable(1, 20 * DAY, MIN_MATCH_DURATION_MS.rps));

    expect(xp()).toBe(50);
  });

  it("stops paying XP once a player finishes matches faster than people play them", () => {
    for (let i = 0; i < 30; i++) {
      // Each match is long enough; they simply arrive every 20 seconds.
      profileService.recordMatchFinished(memberTable(i, 20 * DAY + i * 20_000, 60_000));
    }

    expect(xp()).toBe(PACE_MAX_MATCHES * 50);
  });

  it("does not count a too-short match toward having played real people", async () => {
    for (let i = 0; i < 5; i++) profileService.recordMatchFinished(memberTable(i, 20 * DAY + i * 60_000, 1_000));
    profileService.awardXP(ME, 550);

    // Nothing real was played, so the human-match count is still zero and coins are refused.
    installRewards();
    const result = await profileService.claimMilestoneReward(ME, 5, "member");
    expect(result).toMatchObject({ success: false, error: expect.stringContaining("real people") });
  });

  it("writes the reason code into the XP ledger row so the answer to 'why zero?' is on record", async () => {
    profileService.recordMatchFinished(memberTable(1, 20 * DAY, 60_000));
    await progressionSync.drain();

    const reasons = (await progressionRepository().listXp(ME, 20)).map((e) => e.reason).join(" | ");
    expect(reasons).toContain("[FULL_TABLE]");
  });

  it("puts a player on WATCHLIST after repeated abnormal sessions, and only that far", () => {
    for (let i = 0; i < 3; i++) profileService.recordMatchFinished(memberTable(i, 20 * DAY + i * 60_000, 1_000, false));

    expect(riskService.getState(ME)).toBe("WATCHLIST");

    for (let i = 3; i < 40; i++) profileService.recordMatchFinished(memberTable(i, 20 * DAY + i * 60_000, 1_000, false));
    expect(riskService.getState(ME)).toBe("WATCHLIST");
  });

  it("does not let a player clear their own watch by deleting their profile", () => {
    for (let i = 0; i < 3; i++) profileService.recordMatchFinished(memberTable(i, 20 * DAY + i * 60_000, 1_000, false));
    expect(riskService.getState(ME)).toBe("WATCHLIST");

    profileService.deleteProfile(ME);

    expect(riskService.getState(ME)).toBe("WATCHLIST");
  });

  it("keeps a watch out of the XP ledger text the player can read", async () => {
    for (let i = 0; i < 3; i++) profileService.recordMatchFinished(memberTable(i, 20 * DAY + i * 60_000, 1_000, false));
    profileService.recordMatchFinished(memberTable(9, 21 * DAY, 60_000));
    await progressionSync.drain();

    const reasons = (await progressionRepository().listXp(ME, 20)).map((e) => e.reason).join(" | ");
    expect(reasons).not.toContain("RISK_PRACTICE_ONLY");
    expect(reasons).toContain("[PRACTICE_TABLE]");
  });

  it("does not put the winner of quickly-ended matches on WATCHLIST: the other side quitting is not their doing", () => {
    for (let i = 0; i < 10; i++) profileService.recordMatchFinished(memberTable(i, 20 * DAY + i * 60_000, 1_000, true));

    expect(riskService.getState(ME)).toBe("NORMAL");
  });

  it("pays a watched account practice XP only, even at a fresh table of real people", () => {
    for (let i = 0; i < 3; i++) profileService.recordMatchFinished(memberTable(i, 20 * DAY + i * 60_000, 1_000, false));
    expect(riskService.getState(ME)).toBe("WATCHLIST");

    for (let i = 10; i < 40; i++) {
      profileService.recordMatchFinished(memberTable(i, 21 * DAY + i * 120_000, 60_000));
    }

    // Thirty full-length wins would be 1500 XP; a watched account is capped as practice.
    expect(xp()).toBe(200);
  });

  it("does not spend a table's daily full-XP slots on matches too short to have been played", () => {
    const sameTable = (n: number, at: number, durationMs: number) => ({
      ...memberTable(n, at, durationMs),
      participants: [
        { playerId: ME, name: "Pace", isWinner: true, isMember: true },
        { playerId: "steady_pal", name: "Pal", isWinner: false, isMember: true },
      ],
    });
    for (let i = 0; i < 6; i++) profileService.recordMatchFinished(sameTable(i, 21 * DAY + i * 120_000, 1_000));
    for (let i = 6; i < 11; i++) profileService.recordMatchFinished(sameTable(i, 21 * DAY + i * 120_000, 60_000));

    // Six throwaway rounds did not use up the table's five slots: all five real ones pay in full.
    expect(xp()).toBe(5 * 50);
  });

  it("lets a normal account earn full XP against the same tables", () => {
    for (let i = 10; i < 20; i++) {
      profileService.recordMatchFinished(memberTable(i, 21 * DAY + i * 120_000, 60_000));
    }

    expect(xp()).toBe(10 * 50);
  });
});
