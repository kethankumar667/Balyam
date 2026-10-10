import { describe, it, expect, beforeEach } from "vitest";
import { GUEST_UPGRADE_BONUS_COINS } from "@shared/carryover.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { GuestCarryOverService } from "../GuestCarryOverService.js";
import { InMemoryGuestCarryOverStore } from "../GuestCarryOverStore.js";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { RewardGateway, VESTING_MS } from "../RewardGateway.js";
import { RiskService } from "../RiskService.js";
import { TrustService } from "../TrustService.js";

const START = 1_800_000_000_000;
const GUEST = "guest_aaa";
const MEMBER = "member-1";

describe("guest carry-over", () => {
  let economy: EconomyService;
  let gateway: RewardGateway;
  let trust: TrustService;
  let confirmed: Set<string>;
  let service: GuestCarryOverService;
  const clock = { now: START };
  const risk = new RiskService();
  let realMatches = 0;

  const balanceOf = async (id: string): Promise<number> => Number((await economy.getWallet(id)).balance);

  beforeEach(async () => {
    clock.now = START;
    realMatches = 0;
    confirmed = new Set([MEMBER, "member-2"]);
    economy = new EconomyService(new InMemoryEconomyRepository());
    trust = new TrustService();
    trust.setProviders({
      accountAgeDays: () => 0,
      opponentStats: () => ({ realPeopleMatches: realMatches, distinctOpponents: realMatches }),
      activeMandalis: async () => 0,
    });
    gateway = new RewardGateway({ economy, repository: new InMemoryRewardRepository(), risk, trust, now: () => clock.now });
    const store = new InMemoryGuestCarryOverStore({ economy, isEmailConfirmed: (id) => confirmed.has(id), now: () => clock.now });
    service = new GuestCarryOverService({ store, gateway, trust, now: () => clock.now });
    await economy.ensureIdentityRegistered(GUEST, "guest");
    await economy.ensureIdentityRegistered(MEMBER, "member");
  });

  it("takes the whole guest wallet and holds it for the member", async () => {
    const before = await balanceOf(GUEST);
    const memberBefore = await balanceOf(MEMBER);

    const res = await service.carryOver(MEMBER, GUEST);

    expect(res).toMatchObject({ ok: true, amount: before, replay: false, vestingUntil: START + VESTING_MS });
    expect(await balanceOf(GUEST)).toBe(0);
    // Held, not paid: the member's wallet has not moved yet.
    expect(await balanceOf(MEMBER)).toBe(memberBefore);
  });

  it("pays the member once the hold has passed", async () => {
    const before = await balanceOf(GUEST);
    const memberBefore = await balanceOf(MEMBER);
    await service.carryOver(MEMBER, GUEST);

    clock.now += VESTING_MS + 1_000;
    await gateway.releaseDue();

    expect(await balanceOf(MEMBER)).toBe(memberBefore + before);
    expect((await service.status(MEMBER)).carriedPaid).toBe(true);
  });

  it("treats the same pair again as a replay without moving anything twice", async () => {
    const first = await service.carryOver(MEMBER, GUEST);
    const second = await service.carryOver(MEMBER, GUEST);

    expect(first).toMatchObject({ ok: true, replay: false });
    expect(second).toMatchObject({ ok: true, replay: true });
    const rewards = await gateway.listForPlayer(MEMBER);
    expect(rewards.filter((r) => r.rewardType === "GUEST_CARRYOVER")).toHaveLength(1);
  });

  it("refuses a second account for the same guest", async () => {
    await service.carryOver(MEMBER, GUEST);

    const res = await service.carryOver("member-2", GUEST);

    expect(res).toMatchObject({ ok: false, code: "GUEST_ALREADY_CLAIMED" });
  });

  it("refuses a second guest for the same account and leaves that guest's coins alone", async () => {
    await economy.ensureIdentityRegistered("guest_bbb", "guest");
    await service.carryOver(MEMBER, GUEST);

    const res = await service.carryOver(MEMBER, "guest_bbb");

    expect(res).toMatchObject({ ok: false, code: "MEMBER_ALREADY_CLAIMED" });
    expect(await balanceOf("guest_bbb")).toBeGreaterThan(0);
  });

  it("lets only one of two simultaneous claims into the same account through", async () => {
    await economy.ensureIdentityRegistered("guest_bbb", "guest");

    const results = await Promise.all([service.carryOver(MEMBER, GUEST), service.carryOver(MEMBER, "guest_bbb")]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);
  });

  it("refuses an account whose email is not confirmed, and moves nothing", async () => {
    confirmed.delete(MEMBER);
    const before = await balanceOf(GUEST);

    const res = await service.carryOver(MEMBER, GUEST);

    expect(res).toMatchObject({ ok: false, code: "EMAIL_NOT_CONFIRMED" });
    expect(await balanceOf(GUEST)).toBe(before);
  });

  it("says there is no guest when no verified guest id came with the request", async () => {
    expect(await service.carryOver(MEMBER, null)).toMatchObject({ ok: false, code: "NO_GUEST" });
  });

  describe("upgrade bonus", () => {
    it("is not on offer to someone who brought no guest", async () => {
      expect(await service.claimBonus(MEMBER)).toMatchObject({ ok: false, code: "NOTHING_TO_CLAIM" });
      expect(await service.status(MEMBER)).toMatchObject({ carriedAmount: null, bonusPending: false });
    });

    it("stays locked until the member has finished a match with real people", async () => {
      await service.carryOver(MEMBER, GUEST);

      expect(await service.claimBonus(MEMBER)).toMatchObject({ ok: false, code: "NEEDS_MATCH" });
      expect(await service.status(MEMBER)).toMatchObject({ bonusPending: true, bonusUnlocked: false, bonusPaid: false });
    });

    it("is held, then paid once, after a real match", async () => {
      await service.carryOver(MEMBER, GUEST);
      realMatches = 1;

      const first = await service.claimBonus(MEMBER);
      const second = await service.claimBonus(MEMBER);
      clock.now += VESTING_MS + 1_000;
      await gateway.releaseDue();

      expect(first).toMatchObject({ ok: true, amount: GUEST_UPGRADE_BONUS_COINS });
      expect(second).toMatchObject({ ok: true });
      const bonuses = (await gateway.listForPlayer(MEMBER)).filter((r) => r.rewardType === "GUEST_UPGRADE_BONUS");
      expect(bonuses).toHaveLength(1);
      expect(await service.status(MEMBER)).toMatchObject({ bonusPaid: true, bonusPending: false });
    });
  });
});
