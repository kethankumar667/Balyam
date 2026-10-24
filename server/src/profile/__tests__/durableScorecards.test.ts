import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryProgressionRepository, setProgressionRepository } from "../../persistence/index.js";
import { persistScorecard, readPersistedScorecards } from "../scorecardPersistence.js";
import { GAME_MODE_REGISTRY } from "@shared/profile/GameModes.js";
import type { AllGameSlug, RecordScorePayload } from "@shared/profile/Scorecard.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import { ScorecardService } from "../ScorecardService.js";

const account = "member-records";
const result = (score: number, matchId: string, game: AllGameSlug = "handcricket", modeId = "international_t20"): RecordScorePayload =>
  ({ game, modeId, score, matchId, context: "VS_BOTS" });

beforeEach(async () => {
  await progressionSync.drain();
  const repo = new InMemoryProgressionRepository();
  setProgressionRepository(repo);
  await repo.upsertIdentity({ playerId: account, kind: "member", authUserId: account, lastSeenAt: 1 });
});
afterEach(async () => {
  await progressionSync.drain();
  setProgressionRepository(null);
  vi.restoreAllMocks();
});

describe("durable account scorecards", () => {
  it("returns the same account best to independent device reads and after service recreation", async () => {
    await persistScorecard(account, result(80, "mobile-match"), 100);
    const laptop = await readPersistedScorecards(account);
    expect(laptop.games.handcricket?.modes.international_t20?.bestScore).toBe(80);
    await persistScorecard(account, result(60, "laptop-match"), 200);
    expect((await readPersistedScorecards(account)).games.handcricket?.modes.international_t20).toMatchObject({
      bestScore: 80, bestScoreAchievedAt: 100, timesPlayed: 2,
    });
    await persistScorecard(account, result(120, "new-mobile-match"), 300);
    expect((await readPersistedScorecards(account)).games.handcricket?.modes.international_t20?.bestScore).toBe(120);
    expect((await readPersistedScorecards("another-account")).games).toEqual({});
  });

  it("deduplicates a repeated result and merges simultaneous updates without losing the highest score", async () => {
    await Promise.all([persistScorecard(account, result(80, "a"), 100), persistScorecard(account, result(120, "b"), 200)]);
    await persistScorecard(account, result(999, "a"), 300);
    expect((await readPersistedScorecards(account)).games.handcricket?.modes.international_t20).toMatchObject({
      bestScore: 120, timesPlayed: 2, totalScoreAccumulated: 200,
    });
  });

  it.each(Object.entries(GAME_MODE_REGISTRY).flatMap(([game, config]) =>
    config.modes.map((mode) => ({ game: game as AllGameSlug, mode })),
  ))("persists $game / $mode.modeId independently", async ({ game, mode }) => {
    await persistScorecard(account, result(30, "first", game, mode.modeId), 100);
    await persistScorecard(account, result(50, "second", game, mode.modeId), 200);
    expect((await readPersistedScorecards(account)).games[game]?.modes[mode.modeId]?.bestScore)
      .toBe(mode.scoringDirection === "LOWER_IS_BETTER" ? 30 : 50);
  });

  it("does not acknowledge a database failure as a successful score", async () => {
    const repo = new InMemoryProgressionRepository();
    repo.commitScorecard = async () => { throw new Error("Database unavailable"); };
    setProgressionRepository(repo);
    await expect(persistScorecard(account, result(80, "failed"), 100)).rejects.toThrow("Database unavailable");
  });

  it("retries failed room writes on a later account read without double-counting", async () => {
    const repo = new InMemoryProgressionRepository();
    vi.spyOn(repo, "commitScorecard").mockRejectedValueOnce(new Error("Temporary outage"));
    setProgressionRepository(repo);
    const failures = progressionSync.status().failed;
    progressionSync.scorecardRecorded(account, result(140, "retry-room"), 100);
    await progressionSync.drain();
    expect(progressionSync.status().failed).toBe(failures + 1);
    await progressionSync.retryPendingScorecards(account);
    await progressionSync.retryPendingScorecards(account);
    expect((await readPersistedScorecards(account)).games.handcricket?.modes.international_t20)
      .toMatchObject({ bestScore: 140, timesPlayed: 1, bestScoreAchievedAt: 100 });
  });

  it("keeps old Rummy penalties separate when the first winning-points record is committed", async () => {
    const service = new ScorecardService(false);
    const receipt = service.recordScore(account, result(20, "old", "rummy", "single"), 50);
    const legacy = service.getScorecards(account);
    legacy.games.rummy!.modes.single!.scoringDirection = "LOWER_IS_BETTER";
    const repo = new InMemoryProgressionRepository();
    await repo.commitScorecard(account, 0, "legacy", legacy, receipt);
    setProgressionRepository(repo);
    await persistScorecard(account, result(75, "winning", "rummy", "single"), 100);
    const modes = (await readPersistedScorecards(account)).games.rummy!.modes;
    expect(modes.legacy_penalty_single).toMatchObject({ bestScore: 20, scoringDirection: "LOWER_IS_BETTER" });
    expect(modes.single).toMatchObject({ bestScore: 75, scoringDirection: "HIGHER_IS_BETTER", timesPlayed: 1 });
  });
});
