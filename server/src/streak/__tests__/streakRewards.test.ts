import { describe, it, expect, beforeEach, vi } from "vitest";
import { StreakService } from "../StreakService.js";
import { RewardGateway, VESTING_MS } from "../../rewards/RewardGateway.js";
import { InMemoryRewardRepository } from "../../rewards/InMemoryRewardRepository.js";
import { RiskService } from "../../rewards/RiskService.js";
import { TrustService } from "../../rewards/TrustService.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

const PLAYER = "streak_player";
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 8, 29, 9, 0, 0);

interface Rig {
  streak: StreakService;
  economy: EconomyService;
  gateway: RewardGateway;
  rewards: InMemoryRewardRepository;
  risk: RiskService;
  trust: TrustService;
  clock: { now: number };
  balance: () => Promise<bigint>;
}

function makeRig(withGateway = true): Rig {
  const economy = new EconomyService(new InMemoryEconomyRepository());
  const rewards = new InMemoryRewardRepository();
  const risk = new RiskService();
  const trust = new TrustService();
  const clock = { now: T0 };
  const gateway = new RewardGateway({ economy, repository: rewards, risk, trust, now: () => clock.now });
  const streak = new StreakService({
    economyService: economy,
    rewardGateway: withGateway ? gateway : null,
    postgrestConfig: null,
    now: () => clock.now,
  });
  return {
    streak,
    economy,
    gateway,
    rewards,
    risk,
    trust,
    clock,
    balance: async () => {
      await economy.ensureIdentityRegistered(PLAYER, "member");
      return BigInt((await economy.getWallet(PLAYER)).balance);
    },
  };
}

const trustedProviders = {
  accountAgeDays: () => 5,
  opponentStats: () => ({ realPeopleMatches: 6, distinctOpponents: 4 }),
  activeMandalis: async () => 0,
};

describe("daily streak coins go through the reward gateway", () => {
  let rig: Rig;

  beforeEach(() => {
    rig = makeRig();
  });

  it("makes a new (tier-1) account wait a day for its coins, and says so", async () => {
    const before = await rig.balance();

    const claim = await rig.streak.claimStreak(PLAYER, "member");

    expect(claim.success).toBe(true);
    expect(claim.coinsAwarded).toBeGreaterThan(0);
    expect(claim.pendingUntil).toBe(T0 + VESTING_MS);
    expect(claim.message).toContain("24 hours");
    expect(claim.walletBalance).toBe(before.toString());
    expect(await rig.balance()).toBe(before);
  });

  it("pays the coins into the wallet once the day has passed", async () => {
    const before = await rig.balance();
    const claim = await rig.streak.claimStreak(PLAYER, "member");

    rig.clock.now = T0 + VESTING_MS;
    await rig.gateway.releaseDue();

    expect(await rig.balance()).toBe(before + BigInt(claim.coinsAwarded));
  });

  it("does not promise coins for a day whose reward an operator has withdrawn", async () => {
    // The case is a retry after the streak record failed to save: the grant is a
    // duplicate of a reward that was withdrawn in the meantime.
    const withdrawn = {
      grantCoins: async () => ({ ok: true as const, duplicate: true, record: { status: "VOIDED", vestingUntil: T0 } }),
    };
    const streak = new StreakService({
      economyService: rig.economy,
      rewardGateway: withdrawn as unknown as RewardGateway,
      postgrestConfig: null,
      now: () => rig.clock.now,
    });

    const claim = await streak.claimStreak(PLAYER, "member");

    expect(claim.success).toBe(false);
    expect(claim.message).toContain("withdrawn");
  });

  it("pays a trusted member at once, with no waiting notice", async () => {
    rig.trust.setProviders(trustedProviders);
    const before = await rig.balance();

    const claim = await rig.streak.claimStreak(PLAYER, "member");

    expect(claim.success).toBe(true);
    expect(claim.pendingUntil).toBeUndefined();
    expect(claim.message).not.toContain("24 hours");
    expect(await rig.balance()).toBe(before + BigInt(claim.coinsAwarded));
  });

  it("records the reward with its reason and source day", async () => {
    await rig.streak.claimStreak(PLAYER, "member");

    const [record] = await rig.rewards.listRewardsForPlayer(PLAYER);

    expect(record).toMatchObject({
      rewardType: "DAILY_STREAK",
      reasonCode: "STREAK_DAY",
      sourceId: "2026-09-29",
      status: "PENDING",
    });
  });

  it("does not pay a second time for the same day", async () => {
    const before = await rig.balance();
    await rig.streak.claimStreak(PLAYER, "member");
    const again = await rig.streak.claimStreak(PLAYER, "member");

    expect(again.success).toBe(false);
    rig.clock.now = T0 + VESTING_MS;
    await rig.gateway.releaseDue();
    expect(await rig.balance()).toBe(before + BigInt((await rig.rewards.listRewardsForPlayer(PLAYER))[0]!.amount));
  });

  it("gives the next day's reward to the next day, not the same one twice", async () => {
    await rig.streak.claimStreak(PLAYER, "member");
    rig.clock.now = T0 + DAY;

    const next = await rig.streak.claimStreak(PLAYER, "member");

    expect(next.success).toBe(true);
    expect(next.newStreak).toBe(2);
    expect(await rig.rewards.listRewardsForPlayer(PLAYER)).toHaveLength(2);
  });
});

describe("a refused reward does not burn the player's day", () => {
  it("refuses with a reason when there is no gateway, and the streak does not advance", async () => {
    const rig = makeRig(false);

    const claim = await rig.streak.claimStreak(PLAYER, "member");

    expect(claim).toMatchObject({ success: false, coinsAwarded: 0 });
    expect(claim.message).toMatch(/unavailable/i);
    expect((await rig.streak.getStreak(PLAYER)).currentStreak).toBe(0);
  });

  it("pauses the reward while the account is under review, and lets the same day be claimed once cleared", async () => {
    const rig = makeRig();
    await rig.risk.setState(PLAYER, "UNDER_REVIEW", { reasonCodes: ["x"], actor: "op" });

    const paused = await rig.streak.claimStreak(PLAYER, "member");
    expect(paused).toMatchObject({ success: false });
    expect(paused.message).toMatch(/reviewed/i);
    expect((await rig.streak.getStreak(PLAYER)).currentStreak).toBe(0);

    await rig.risk.setState(PLAYER, "NORMAL", { reasonCodes: ["x"], actor: "op" });
    expect((await rig.streak.claimStreak(PLAYER, "member")).success).toBe(true);
  });

  it("reports a store failure as a failure and lets the player retry the same day", async () => {
    const rig = makeRig();
    vi.spyOn(rig.rewards, "insertReward").mockRejectedValueOnce(new Error("db down"));

    const failed = await rig.streak.claimStreak(PLAYER, "member");
    expect(failed.success).toBe(false);
    expect((await rig.streak.getStreak(PLAYER)).currentStreak).toBe(0);

    expect((await rig.streak.claimStreak(PLAYER, "member")).success).toBe(true);
  });
});
