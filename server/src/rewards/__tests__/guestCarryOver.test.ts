import { describe, it, expect, beforeEach } from "vitest";
import {
  GUEST_UPGRADE_BONUS_COINS,
  MEMBER_WELCOME_COINS,
  carryOverPayment,
} from "@shared/carryover.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { GuestCarryOverService } from "../GuestCarryOverService.js";
import { InMemoryGuestCarryOverStore } from "../GuestCarryOverStore.js";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { RewardGateway, VESTING_MS } from "../RewardGateway.js";
import { RiskService } from "../RiskService.js";
import { TrustService } from "../TrustService.js";

const START = 1_800_000_000_000;
/** A guest who holds only the welcome grant. */
const GUEST = "guest_aaa";
/** A guest who played well and holds 3,800 coins: the product owner's own example. */
const EARNER = "guest_earner";
const MEMBER = "member-1";

describe("carryOverPayment — where the account should land", () => {
  it("tops a 3,800-coin guest up to 5,800: balance + the sign-up bonus", () => {
    expect(MEMBER_WELCOME_COINS + carryOverPayment(3_800)).toBe(3_800 + GUEST_UPGRADE_BONUS_COINS);
    expect(carryOverPayment(3_800)).toBe(800);
  });

  it("pays nothing extra when the member welcome already covers balance + bonus", () => {
    expect(carryOverPayment(0)).toBe(0);
    expect(carryOverPayment(2_000)).toBe(0);
    expect(carryOverPayment(3_000)).toBe(0);
  });

  it("is the whole difference for a guest who did very well", () => {
    expect(carryOverPayment(8_000)).toBe(5_000);
  });

  it("never lands an account below the plain member welcome", () => {
    for (const balance of [0, 500, 2_000, 2_999, 3_000, 3_001, 9_000]) {
      expect(MEMBER_WELCOME_COINS + carryOverPayment(balance)).toBe(
        Math.max(MEMBER_WELCOME_COINS, balance + GUEST_UPGRADE_BONUS_COINS),
      );
    }
  });
});

describe("guest carry-over", () => {
  let repo: InMemoryEconomyRepository;
  let economy: EconomyService;
  let gateway: RewardGateway;
  let confirmed: Set<string>;
  let service: GuestCarryOverService;
  const clock = { now: START };
  const risk = new RiskService();

  const balanceOf = async (id: string): Promise<number> => Number((await economy.getWallet(id)).balance);

  /** A guest wallet holding exactly `balance` coins, as if earned or lost down to that. */
  const seedGuest = (id: string, balance: number): void => {
    repo.testFixture.seedWallet({
      identityId: id,
      identityKind: "guest",
      balance: String(balance),
      lifetimeGranted: String(balance),
      starterGranted: true,
    });
  };

  const release = async (): Promise<void> => {
    clock.now += VESTING_MS + 1_000;
    await gateway.releaseDue();
  };

  beforeEach(async () => {
    clock.now = START;
    confirmed = new Set([MEMBER, "member-2"]);
    repo = new InMemoryEconomyRepository();
    economy = new EconomyService(repo);
    const trust = new TrustService();
    gateway = new RewardGateway({ economy, repository: new InMemoryRewardRepository(), risk, trust, now: () => clock.now });
    const store = new InMemoryGuestCarryOverStore({ economy, isEmailConfirmed: (id) => confirmed.has(id), now: () => clock.now });
    service = new GuestCarryOverService({ store, gateway, now: () => clock.now });
    await economy.ensureIdentityRegistered(GUEST, "guest");
    await economy.ensureIdentityRegistered(MEMBER, "member");
    seedGuest(EARNER, 3_800);
  });

  it("lands a 3,800-coin guest's account on 5,800 once the hold has passed", async () => {
    const before = await balanceOf(MEMBER);
    expect(before).toBe(MEMBER_WELCOME_COINS);

    const res = await service.carryOver(MEMBER, EARNER);
    expect(res).toMatchObject({ ok: true, amount: 800, replay: false, vestingUntil: START + VESTING_MS });
    expect(await balanceOf(EARNER)).toBe(0);
    // Held, not paid: the member's wallet has not moved yet.
    expect(await balanceOf(MEMBER)).toBe(before);

    await release();

    expect(await balanceOf(MEMBER)).toBe(5_800);
    expect(await service.status(MEMBER)).toMatchObject({ carriedAmount: 800, carriedPaid: true });
  });

  it("empties a welcome-grant-only guest and pays nothing extra: the member keeps the plain welcome", async () => {
    const before = await balanceOf(MEMBER);

    const res = await service.carryOver(MEMBER, GUEST);

    expect(res).toMatchObject({ ok: true, amount: 0, replay: false, vestingUntil: null });
    expect(await balanceOf(GUEST)).toBe(0);
    expect(await balanceOf(MEMBER)).toBe(before);
    expect((await gateway.listForPlayer(MEMBER)).filter((r) => r.rewardType === "GUEST_CARRYOVER")).toHaveLength(0);
    expect(await service.status(MEMBER)).toMatchObject({ carriedAmount: 0, carriedPaid: true });
  });

  it("never pays the old separate bonus: it is part of the one payment", async () => {
    await service.carryOver(MEMBER, EARNER);

    expect(await service.claimBonus(MEMBER)).toMatchObject({ ok: false, code: "NOTHING_TO_CLAIM" });
    expect(await service.status(MEMBER)).toMatchObject({ bonusPending: false, bonusUnlocked: false, bonusPaid: false });
    expect((await gateway.listForPlayer(MEMBER)).filter((r) => r.rewardType === "GUEST_UPGRADE_BONUS")).toHaveLength(0);
  });

  it("treats the same pair again as a replay without moving anything twice", async () => {
    const first = await service.carryOver(MEMBER, EARNER);
    const second = await service.carryOver(MEMBER, EARNER);
    await release();

    expect(first).toMatchObject({ ok: true, replay: false });
    expect(second).toMatchObject({ ok: true, replay: true });
    const rewards = await gateway.listForPlayer(MEMBER);
    expect(rewards.filter((r) => r.rewardType === "GUEST_CARRYOVER")).toHaveLength(1);
    expect(await balanceOf(MEMBER)).toBe(5_800);
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

  it("reports nothing carried for an account that brought no guest", async () => {
    expect(await service.status(MEMBER)).toMatchObject({ carriedAmount: null, bonusPending: false });
  });
});
