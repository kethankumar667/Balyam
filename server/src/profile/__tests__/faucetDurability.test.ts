import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  profileService,
  PRACTICE_XP_DAILY_CAP,
  MIN_HUMAN_MATCHES_FOR_COINS,
} from "../ProfileService.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import { setProgressionRepository, progressionRepository } from "../../persistence/index.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { EconomyService } from "../../economy/EconomyService.js";

const ME = "durable_grinder";

/** A finished match ending "now", so ledger timestamps and the day boundary agree. */
function match(n: number, opponents: Array<{ playerId: string; isBot?: boolean }>) {
  const finishedAt = Date.now();
  return {
    roomCode: `DUR${n}`,
    game: "rps" as const,
    startedAt: finishedAt - 60_000 - n,
    finishedAt,
    durationMs: 60_000,
    winnerId: ME,
    participants: [
      { playerId: ME, name: "Grinder", isWinner: true, isMember: true },
      ...opponents.map((o) => ({ ...o, name: "Opp", isWinner: false })),
    ],
  };
}

const botTable = (n: number) => match(n, [{ playerId: "bot_a", isBot: true }]);
const humanTable = (n: number) => match(n, [{ playerId: `pal_${n}`, isMember: true } as { playerId: string; isBot?: boolean }]);

/** What a fresh process would do: forget memory, then rebuild from the durable ledger. */
async function restart(): Promise<void> {
  await progressionSync.drain();
  const ledger = await progressionRepository().listXp(ME, 200);
  profileService.reset();
  profileService.restoreFromLedger(ME, ledger);
}

describe("coin-faucet controls survive a restart and refuse dishonest payouts", () => {
  beforeEach(() => {
    setProgressionRepository(new InMemoryProgressionRepository());
    profileService.reset();
    profileService.setEconomyService(undefined);
  });

  afterEach(() => {
    profileService.setEconomyService(undefined);
    setProgressionRepository(null);
  });

  it("writes bot-table XP and human-table XP as different ledger kinds", async () => {
    profileService.recordMatchFinished(botTable(1));
    profileService.recordMatchFinished(humanTable(2));
    await progressionSync.drain();

    const kinds = (await progressionRepository().listXp(ME, 50)).map((e) => e.sourceKind).sort();
    expect(kinds).toEqual(["match", "practice_match"]);
  });

  it("does not hand back the daily practice allowance when the server restarts", async () => {
    for (let i = 0; i < 10; i++) profileService.recordMatchFinished(botTable(i));
    expect(profileService.getProfile(ME)!.experiencePoints).toBe(PRACTICE_XP_DAILY_CAP);

    await restart();
    // The profile total is restored elsewhere at boot; only the allowance is under test.
    profileService.getOrCreateProfile(ME, "Grinder");
    profileService.recordMatchFinished(botTable(99));

    expect(profileService.getProfile(ME)!.experiencePoints).toBe(0);
  });

  it("refuses coins to a member who has only ever played bot tables", async () => {
    profileService.setEconomyService(new EconomyService(new InMemoryEconomyRepository()));
    for (let i = 0; i < 10; i++) profileService.recordMatchFinished(botTable(i));
    profileService.awardXP(ME, 550);

    const result = await profileService.claimMilestoneReward(ME, 5, "member");

    expect(result.success).toBe(false);
    expect(result.error).toContain(`${MIN_HUMAN_MATCHES_FOR_COINS} matches against real people`);
  });

  it("pays a member after enough real-people matches, even when the count survives only in the ledger", async () => {
    profileService.setEconomyService(new EconomyService(new InMemoryEconomyRepository()));
    for (let i = 0; i < MIN_HUMAN_MATCHES_FOR_COINS; i++) profileService.recordMatchFinished(humanTable(i));
    await progressionSync.drain();

    // New process: nothing in memory, no restoreFromLedger call — the claim must read the ledger itself.
    profileService.reset();
    profileService.getOrCreateProfile(ME, "Grinder");
    profileService.awardXP(ME, 550);

    const result = await profileService.claimMilestoneReward(ME, 5, "member");

    expect(result.success).toBe(true);
  });

  it("does not report a coin reward as claimed when there is no economy to pay from", async () => {
    profileService.restoreFromLedger(
      ME,
      Array.from({ length: MIN_HUMAN_MATCHES_FOR_COINS }, () => ({ sourceKind: "match", amount: 50, createdAt: Date.now() })),
    );
    profileService.getOrCreateProfile(ME, "Grinder");
    profileService.awardXP(ME, 550);

    const refused = await profileService.claimMilestoneReward(ME, 5, "member");
    expect(refused.success).toBe(false);
    expect(refused.error).toMatch(/unavailable/i);

    // The refusal must not burn the claim: once an economy exists, it pays.
    profileService.setEconomyService(new EconomyService(new InMemoryEconomyRepository()));
    const paid = await profileService.claimMilestoneReward(ME, 5, "member");
    expect(paid.success).toBe(true);
  });
});
