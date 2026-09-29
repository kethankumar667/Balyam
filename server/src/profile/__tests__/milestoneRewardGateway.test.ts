import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { profileService, MIN_HUMAN_MATCHES_FOR_COINS } from "../ProfileService.js";
import { RewardGateway, VESTING_MS } from "../../rewards/RewardGateway.js";
import { InMemoryRewardRepository } from "../../rewards/InMemoryRewardRepository.js";
import { riskService } from "../../rewards/RiskService.js";
import { TrustService } from "../../rewards/TrustService.js";
import { REASON } from "../../rewards/types.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

/**
 * Level-milestone coins, end to end through the reward gateway: a claim records a
 * reward that vests for 24 hours, and only its release reaches the wallet. Every
 * balance below is read from a real in-memory wallet.
 */

interface Rig {
  economy: EconomyService;
  rewards: InMemoryRewardRepository;
  gateway: RewardGateway;
  clock: { now: number };
  /** Let the vesting period pass and run the sweep. */
  release: () => Promise<void>;
  balance: (id: string) => Promise<bigint>;
}

function installFreshRewards(): Rig {
  const economy = new EconomyService(new InMemoryEconomyRepository());
  const rewards = new InMemoryRewardRepository();
  const clock = { now: Date.now() };
  const gateway = new RewardGateway({ economy, repository: rewards, risk: riskService, trust: new TrustService(), now: () => clock.now });
  profileService.setEconomyService(economy);
  profileService.setRewardGateway(gateway);
  return {
    economy,
    rewards,
    gateway,
    clock,
    release: async () => {
      clock.now += VESTING_MS + 1_000;
      await gateway.releaseDue();
    },
    balance: async (id) => {
      await economy.ensureIdentityRegistered(id, "member");
      return BigInt((await economy.getWallet(id)).balance);
    },
  };
}

/** A member who has played enough real-people matches to be paid coins (no XP side effects). */
function claimAsProven(id: string, level: number, kind: "member" | "guest" = "member") {
  profileService.restoreFromLedger(
    id,
    Array.from({ length: MIN_HUMAN_MATCHES_FOR_COINS }, () => ({ sourceKind: "match", amount: 50, createdAt: Date.now() })),
  );
  return profileService.claimMilestoneReward(id, level, kind);
}

function playerAtLevel6(id: string): void {
  profileService.getOrCreateProfile(id, id);
  profileService.awardXP(id, 550);
}

describe("level milestone coins go through the reward gateway", () => {
  let rig: Rig;

  beforeEach(() => {
    profileService.reset();
    riskService.reset();
    rig = installFreshRewards();
  });

  afterEach(() => {
    profileService.setEconomyService(undefined);
    profileService.setRewardGateway(undefined);
  });

  it("returns progression with the milestones a player has not claimed yet", () => {
    playerAtLevel6("prog_player");

    const prog = profileService.getProgression("prog_player");

    expect(prog.currentLevel).toBeGreaterThanOrEqual(6);
    expect(prog.unclaimedRewards?.map((r) => r.level)).toContain(5);
  });

  it("records the claim as a pending reward that arrives in 24 hours, and leaves the wallet alone", async () => {
    playerAtLevel6("hero");
    const before = await rig.balance("hero");

    const claim = await claimAsProven("hero", 5);

    expect(claim.success).toBe(true);
    expect(claim.reward?.coins).toBe(500);
    expect(claim.payout).toEqual({ status: "PENDING", vestingUntil: rig.clock.now + VESTING_MS });
    expect(await rig.balance("hero")).toBe(before);
  });

  it("pays exactly the reward once it has vested, and never twice", async () => {
    playerAtLevel6("hero");
    const before = await rig.balance("hero");
    await claimAsProven("hero", 5);

    await rig.release();
    expect(await rig.balance("hero")).toBe(before + 500n);

    const replay = await claimAsProven("hero", 5);
    expect(replay).toMatchObject({ success: false, error: expect.stringContaining("already claimed") });
    await rig.release();
    expect(await rig.balance("hero")).toBe(before + 500n);
  });

  it("writes the reward with its reason and the player's risk state", async () => {
    playerAtLevel6("hero");
    await claimAsProven("hero", 5);

    const [record] = await rig.rewards.listRewardsForPlayer("hero");

    expect(record).toMatchObject({
      rewardType: "LEVEL_MILESTONE",
      reasonCode: REASON.MILESTONE_LEVEL,
      sourceId: "level:5",
      amount: 500,
      riskState: "NORMAL",
      status: "PENDING",
    });
    expect(record!.description).toContain("Level 5 milestone reward");
  });

  it("refuses a milestone the player has not reached", async () => {
    profileService.getOrCreateProfile("low", "Low");
    profileService.awardXP("low", 50);

    const claim = await claimAsProven("low", 10);

    expect(claim).toMatchObject({ success: false, error: expect.stringContaining("not yet reached") });
  });

  it("pays one of three simultaneous claims and refuses the other two", async () => {
    playerAtLevel6("racer");
    const before = await rig.balance("racer");

    const results = await Promise.all([claimAsProven("racer", 5), claimAsProven("racer", 5), claimAsProven("racer", 5)]);

    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.filter((r) => !r.success).every((r) => r.error?.includes("already claimed"))).toBe(true);
    await rig.release();
    expect(await rig.balance("racer")).toBe(before + 500n);
  });

  it("remembers a claim across a restart because the ledger has it, without any hydration", async () => {
    playerAtLevel6("rebooter");
    await claimAsProven("rebooter", 5);

    // A new process: profile memory is gone, the reward ledger and wallet are not.
    profileService.reset();
    profileService.setEconomyService(rig.economy);
    profileService.setRewardGateway(rig.gateway);
    playerAtLevel6("rebooter");

    const again = await claimAsProven("rebooter", 5);
    expect(again).toMatchObject({ success: false, error: expect.stringContaining("already claimed") });
  });

  it("rebuilds which milestones are claimed from the reward ledger at boot", async () => {
    profileService.getOrCreateProfile("hydrator", "Hydrator");
    profileService.awardXP("hydrator", 1200);
    await claimAsProven("hydrator", 5);
    await claimAsProven("hydrator", 10);

    profileService.reset();
    profileService.getOrCreateProfile("hydrator", "Hydrator");
    profileService.awardXP("hydrator", 1200);

    expect(await profileService.hydrateMilestonesFromRewards(rig.rewards)).toBe(2);
    const unclaimed = profileService.getProgression("hydrator").unclaimedRewards?.map((r) => r.level) ?? [];
    expect(unclaimed).not.toContain(5);
    expect(unclaimed).not.toContain(10);
  });

  it("skips a reward whose source is not a level, and reads past the first page", async () => {
    profileService.getOrCreateProfile("pager", "Pager");
    const base = {
      playerId: "pager",
      identityKind: "member" as const,
      rewardType: "LEVEL_MILESTONE" as const,
      reasonCode: REASON.MILESTONE_LEVEL,
      amount: 100,
      description: "x",
    };
    await rig.gateway.grantCoins({ ...base, sourceId: "level:notanumber" });
    for (let level = 1; level <= 501; level++) await rig.gateway.grantCoins({ ...base, sourceId: `level:${level}` });

    profileService.reset();

    // 501 real levels across two pages; the malformed one is ignored, not counted.
    expect(await profileService.hydrateMilestonesFromRewards(rig.rewards)).toBe(501);
  });

  it("still recognises a milestone paid before the gateway existed, from its wallet ledger key", async () => {
    await rig.economy.ensureIdentityRegistered("legacy", "member");
    await rig.economy.adminAdjustWallet({
      identityId: "legacy",
      amountCoins: "500",
      adminPrincipalId: "system:level_milestone",
      reason: "Level 5 milestone reward",
      idempotencyKey: "milestone:legacy:lvl:5",
      entryType: "ADMIN_ADJUSTMENT",
    });

    expect(await profileService.hydrateMilestonesFromEconomy(rig.economy)).toBe(1);
  });

  it("lets the player retry after a store failure, because nothing was recorded", async () => {
    playerAtLevel6("retrier");
    vi.spyOn(rig.rewards, "insertReward").mockRejectedValueOnce(new Error("db down"));

    const failed = await claimAsProven("retrier", 5);
    expect(failed).toMatchObject({ success: false, error: expect.stringContaining("temporarily unavailable") });

    const retry = await claimAsProven("retrier", 5);
    expect(retry.success).toBe(true);
  });

  it("refuses honestly when there is no reward gateway, and says nothing was claimed", async () => {
    playerAtLevel6("nogateway");
    profileService.setRewardGateway(null);

    const claim = await claimAsProven("nogateway", 5);

    expect(claim).toMatchObject({ success: false, error: expect.stringContaining("temporarily unavailable") });
  });

  it("pauses claims while an account is under review, without burning the claim", async () => {
    playerAtLevel6("held");
    await riskService.setState("held", "UNDER_REVIEW", { reasonCodes: ["x"], actor: "op" });

    const paused = await claimAsProven("held", 5);
    expect(paused).toMatchObject({ success: false, error: expect.stringContaining("reviewed") });

    await riskService.setState("held", "NORMAL", { reasonCodes: ["x"], actor: "op" });
    const cleared = await claimAsProven("held", 5);
    expect(cleared.success).toBe(true);
  });

  it("does not let a withdrawn reward be claimed again", async () => {
    playerAtLevel6("withdrawn");
    await claimAsProven("withdrawn", 5);
    const [record] = await rig.rewards.listRewardsForPlayer("withdrawn");
    await rig.gateway.voidReward(record!.rewardId, "farm ring", "op");

    // A new process (nothing claimed in memory): the ledger alone says what became of it.
    profileService.reset();
    profileService.setEconomyService(rig.economy);
    profileService.setRewardGateway(rig.gateway);
    playerAtLevel6("withdrawn");
    const again = await claimAsProven("withdrawn", 5);

    expect(again).toMatchObject({ success: false, error: expect.stringContaining("withdrawn") });
  });

  it("forgets a player's claims when their profile is deleted", async () => {
    playerAtLevel6("leaver");
    await claimAsProven("leaver", 5);
    expect(profileService.deleteProfile("leaver")).toBe(true);

    rig = installFreshRewards();
    playerAtLevel6("leaver");

    expect((await claimAsProven("leaver", 5)).success).toBe(true);
  });

  it("refuses coins to a guest and to a member who has only played bots", async () => {
    playerAtLevel6("guesty");
    expect(await claimAsProven("guesty", 5, "guest")).toMatchObject({ success: false, error: expect.stringMatching(/sign in/i) });

    playerAtLevel6("botter");
    profileService.setRewardGateway(rig.gateway);
    const noHumanPlay = await profileService.claimMilestoneReward("botter", 5, "member");
    expect(noHumanPlay).toMatchObject({ success: false, error: expect.stringContaining("real people") });
  });
});
