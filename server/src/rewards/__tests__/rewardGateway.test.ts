import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  RELEASE_CLAIM_LEASE_MS,
  RESTRICTED_VESTING_MS,
  RewardGateway,
  VESTING_MS,
  type GrantRequest,
  type RewardEconomy,
} from "../RewardGateway.js";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { RiskService } from "../RiskService.js";
import { TrustService } from "../TrustService.js";
import { REASON } from "../types.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

const PLAYER = "reward_player";
const T0 = 1_800_000_000_000;

interface Rig {
  gateway: RewardGateway;
  repository: InMemoryRewardRepository;
  risk: RiskService;
  trust: TrustService;
  economy: EconomyService;
  clock: { now: number };
  balance: () => Promise<bigint>;
}

/** A gateway over a REAL in-memory wallet, so "the coins arrived" is measured, not assumed. */
function makeRig(economyOverride?: (real: EconomyService) => RewardEconomy): Rig {
  const repository = new InMemoryRewardRepository();
  const risk = new RiskService();
  const trust = new TrustService();
  const economy = new EconomyService(new InMemoryEconomyRepository());
  const clock = { now: T0 };
  const gateway = new RewardGateway({
    economy: economyOverride ? economyOverride(economy) : economy,
    repository,
    risk,
    trust,
    now: () => clock.now,
  });
  return {
    gateway,
    repository,
    risk,
    trust,
    economy,
    clock,
    balance: async () => {
      // The wallet needs an identity before it can be read; the gateway registers it on grant.
      await economy.ensureIdentityRegistered(PLAYER, "member");
      return BigInt((await economy.getWallet(PLAYER)).balance);
    },
  };
}

const milestone = (over: Partial<GrantRequest> = {}): GrantRequest => ({
  playerId: PLAYER,
  identityKind: "member",
  rewardType: "LEVEL_MILESTONE",
  reasonCode: REASON.MILESTONE_LEVEL,
  amount: 500,
  sourceId: "level:5",
  description: "Level 5 milestone reward",
  ...over,
});

const streak = (over: Partial<GrantRequest> = {}): GrantRequest =>
  milestone({ rewardType: "DAILY_STREAK", reasonCode: REASON.STREAK_DAY, amount: 50, sourceId: "2026-09-29", description: "Daily streak", ...over });

const tierProviders = (tier: 1 | 2) => ({
  accountAgeDays: () => (tier === 2 ? 5 : 0),
  opponentStats: () => (tier === 2 ? { realPeopleMatches: 6, distinctOpponents: 4 } : { realPeopleMatches: 0, distinctOpponents: 0 }),
  activeMandalis: async () => 0,
});

describe("risk audit retention", () => {
  it("drops audit events older than the retention period, once a day, and keeps standing", async () => {
    const rig = makeRig();
    const gateway = new RewardGateway({
      economy: rig.economy,
      repository: rig.repository,
      risk: rig.risk,
      trust: rig.trust,
      now: () => rig.clock.now,
      riskEventRetentionMs: 10 * 86_400_000,
    });
    await rig.repository.appendRiskEvent({ playerId: PLAYER, kind: "STATE_CHANGE", reasonCode: "x", detail: { note: "old" }, createdAt: T0 - 30 * 86_400_000 } as never);
    await rig.repository.appendRiskEvent({ playerId: PLAYER, kind: "STATE_CHANGE", reasonCode: "x", detail: { note: "recent" }, createdAt: T0 - 86_400_000 } as never);

    await gateway.sweep();

    const kept = await rig.repository.listRiskEventsForPlayer(PLAYER);
    expect(kept.map((e) => (e.detail as { note?: string }).note)).toEqual(["recent"]);
  });

  it("keeps everything when retention is switched off", async () => {
    const rig = makeRig();
    const gateway = new RewardGateway({
      economy: rig.economy,
      repository: rig.repository,
      risk: rig.risk,
      trust: rig.trust,
      now: () => rig.clock.now,
      riskEventRetentionMs: 0,
    });
    await rig.repository.appendRiskEvent({ playerId: PLAYER, kind: "STATE_CHANGE", reasonCode: "x", detail: {}, createdAt: T0 - 900 * 86_400_000 } as never);

    await gateway.sweep();

    expect(await rig.repository.listRiskEventsForPlayer(PLAYER)).toHaveLength(1);
  });
});

describe("RewardGateway — vesting and payment", () => {
  let rig: Rig;

  beforeEach(() => {
    rig = makeRig();
  });

  it("records a reward as PENDING with a 24-hour vesting time and does not touch the wallet yet", async () => {
    const before = await rig.balance();

    const result = await rig.gateway.grantCoins(milestone());

    expect(result).toMatchObject({ ok: true, duplicate: false });
    if (!result.ok) return;
    expect(result.record).toMatchObject({
      status: "PENDING",
      amount: 500,
      rewardType: "LEVEL_MILESTONE",
      reasonCode: REASON.MILESTONE_LEVEL,
      riskState: "NORMAL",
      ledgerEntryId: null,
      earnedAt: T0,
      vestingUntil: T0 + VESTING_MS,
    });
    expect(await rig.balance()).toBe(before);
  });

  it("pays nothing before the vesting time and exactly the reward after it", async () => {
    const before = await rig.balance();
    await rig.gateway.grantCoins(milestone());

    rig.clock.now = T0 + VESTING_MS - 1;
    expect(await rig.gateway.releaseDue()).toEqual({ released: 0, heldForReview: 0, failed: 0 });
    expect(await rig.balance()).toBe(before);

    rig.clock.now = T0 + VESTING_MS;
    expect(await rig.gateway.releaseDue()).toMatchObject({ released: 1 });
    expect(await rig.balance()).toBe(before + 500n);
  });

  it("marks the reward RELEASED and links the wallet ledger entry that paid it", async () => {
    const granted = await rig.gateway.grantCoins(milestone());
    if (!granted.ok) throw new Error("grant failed");

    rig.clock.now = T0 + VESTING_MS;
    await rig.gateway.releaseDue();

    const record = await rig.repository.getReward(granted.record.rewardId);
    expect(record).toMatchObject({ status: "RELEASED", releasedAt: T0 + VESTING_MS });
    expect(record!.ledgerEntryId).not.toBeNull();
    const ledger = await rig.economy.getLedger(PLAYER, { limit: 20 });
    expect(ledger.find((e) => e.id === record!.ledgerEntryId)).toMatchObject({ amount: "500" });
  });

  it("is idempotent: granting the same reward again returns the original and never pays twice", async () => {
    const before = await rig.balance();
    const first = await rig.gateway.grantCoins(milestone());
    const second = await rig.gateway.grantCoins(milestone());

    expect(second).toMatchObject({ ok: true, duplicate: true });
    if (first.ok && second.ok) expect(second.record.rewardId).toBe(first.record.rewardId);

    rig.clock.now = T0 + VESTING_MS;
    await rig.gateway.releaseDue();
    await rig.gateway.releaseDue();
    expect(await rig.balance()).toBe(before + 500n);
  });

  it("pays once even when two sweeps race", async () => {
    const before = await rig.balance();
    await rig.gateway.grantCoins(milestone());
    rig.clock.now = T0 + VESTING_MS;

    await Promise.all([rig.gateway.releaseDue(), rig.gateway.releaseDue(), rig.gateway.releaseDue()]);

    expect(await rig.balance()).toBe(before + 500n);
  });

  it("treats a different source as a different reward", async () => {
    const before = await rig.balance();
    await rig.gateway.grantCoins(milestone({ sourceId: "level:5" }));
    await rig.gateway.grantCoins(milestone({ sourceId: "level:6", amount: 600 }));

    rig.clock.now = T0 + VESTING_MS;
    await rig.gateway.releaseDue();

    expect(await rig.balance()).toBe(before + 1_100n);
  });

  it("refuses a reward that is not a positive whole number", async () => {
    await expect(rig.gateway.grantCoins(milestone({ amount: 0 }))).rejects.toThrow(/positive whole number/);
    await expect(rig.gateway.grantCoins(milestone({ amount: 12.5 }))).rejects.toThrow(/positive whole number/);
  });
});

describe("RewardGateway — vesting policy by trust and risk", () => {
  it("pays a trusted member's daily streak reward at once", async () => {
    const rig = makeRig();
    rig.trust.setProviders(tierProviders(2));
    const before = await rig.balance();

    const result = await rig.gateway.grantCoins(streak());

    expect(result.ok && result.record.status).toBe("RELEASED");
    expect(await rig.balance()).toBe(before + 50n);
  });

  it("makes a tier-1 account wait 24 hours for the same streak reward", async () => {
    const rig = makeRig();
    rig.trust.setProviders(tierProviders(1));
    const before = await rig.balance();

    const result = await rig.gateway.grantCoins(streak());

    expect(result.ok && result.record.status).toBe("PENDING");
    expect(result.ok && result.record.vestingUntil).toBe(T0 + VESTING_MS);
    expect(await rig.balance()).toBe(before);
  });

  it("never pays a level milestone at once, however trusted the account", async () => {
    const rig = makeRig();
    rig.trust.setProviders(tierProviders(2));

    const result = await rig.gateway.grantCoins(milestone());

    expect(result.ok && result.record.status).toBe("PENDING");
  });

  it("makes a WATCHLIST account wait even for a streak reward, whatever its tier", async () => {
    const rig = makeRig();
    rig.trust.setProviders(tierProviders(2));
    await rig.risk.setState(PLAYER, "WATCHLIST", { reasonCodes: ["x"], actor: "op" });

    const result = await rig.gateway.grantCoins(streak());

    expect(result.ok && result.record.status).toBe("PENDING");
    expect(result.ok && result.record.riskState).toBe("WATCHLIST");
  });

  it("holds a RESTRICTED account's rewards for 72 hours", async () => {
    const rig = makeRig();
    await rig.risk.setState(PLAYER, "RESTRICTED", { reasonCodes: ["x"], actor: "op" });

    const result = await rig.gateway.grantCoins(milestone());

    expect(result.ok && result.record.vestingUntil).toBe(T0 + RESTRICTED_VESTING_MS);
  });
});

describe("RewardGateway — an account under review", () => {
  it("refuses new rewards, with a reason the player can read", async () => {
    const rig = makeRig();
    await rig.risk.setState(PLAYER, "UNDER_REVIEW", { reasonCodes: ["x"], actor: "op" });

    const result = await rig.gateway.grantCoins(milestone());

    expect(result).toMatchObject({ ok: false, code: REASON.RISK_UNDER_REVIEW });
    if (!result.ok) expect(result.message).toMatch(/reviewed/i);
    expect(await rig.repository.listRewardsForPlayer(PLAYER)).toHaveLength(0);
  });

  it("holds a pending reward while under review, and pays it once cleared — nothing is lost", async () => {
    const rig = makeRig();
    const before = await rig.balance();
    await rig.gateway.grantCoins(milestone());
    await rig.risk.setState(PLAYER, "UNDER_REVIEW", { reasonCodes: ["x"], actor: "op" });

    rig.clock.now = T0 + VESTING_MS;
    expect(await rig.gateway.releaseDue()).toEqual({ released: 0, heldForReview: 1, failed: 0 });
    expect(await rig.balance()).toBe(before);

    await rig.risk.setState(PLAYER, "NORMAL", { reasonCodes: ["x"], actor: "op" });
    expect(await rig.gateway.releaseDue()).toMatchObject({ released: 1 });
    expect(await rig.balance()).toBe(before + 500n);
  });
});

describe("RewardGateway — an operator can withdraw a reward that is not yet paid", () => {
  it("voids a pending reward so it is never paid, and audits it", async () => {
    const rig = makeRig();
    const before = await rig.balance();
    const granted = await rig.gateway.grantCoins(milestone());
    if (!granted.ok) throw new Error("grant failed");

    expect(await rig.gateway.voidReward(granted.record.rewardId, "farm ring", "op_1")).toEqual({ ok: true });

    rig.clock.now = T0 + VESTING_MS;
    await rig.gateway.releaseDue();
    expect(await rig.balance()).toBe(before);
    expect(await rig.repository.getReward(granted.record.rewardId)).toMatchObject({ status: "VOIDED", voidedReason: "farm ring" });
    expect((await rig.repository.listRiskEventsForPlayer(PLAYER))[0]).toMatchObject({
      kind: "REWARD_VOIDED",
      reasonCode: REASON.OPERATOR_VOID,
      detail: { actor: "op_1", amount: 500 },
    });
  });

  it("cannot void a reward that has already been paid", async () => {
    const rig = makeRig();
    const granted = await rig.gateway.grantCoins(milestone());
    if (!granted.ok) throw new Error("grant failed");
    rig.clock.now = T0 + VESTING_MS;
    await rig.gateway.releaseDue();

    expect(await rig.gateway.voidReward(granted.record.rewardId, "late", "op")).toEqual({
      ok: false,
      code: "NOT_PENDING",
      status: "RELEASED",
    });
  });

  it("reports an unknown reward", async () => {
    expect(await makeRig().gateway.voidReward("rwd_nope", "x", "op")).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("keeps a voided reward voided: claiming the same source again does not resurrect it", async () => {
    const rig = makeRig();
    const first = await rig.gateway.grantCoins(milestone());
    if (!first.ok) throw new Error("grant failed");
    await rig.gateway.voidReward(first.record.rewardId, "x", "op");

    const again = await rig.gateway.grantCoins(milestone());

    expect(again).toMatchObject({ ok: true, duplicate: true });
    expect(again.ok && again.record.status).toBe("VOIDED");
  });
});

describe("RewardGateway — a crash mid-payment is recovered, never double-paid", () => {
  it("leaves the reward RELEASING when the wallet credit fails, and pays it after the lease", async () => {
    let failing = true;
    const rig = makeRig((real) => ({
      ensureIdentityRegistered: (id, kind) => real.ensureIdentityRegistered(id, kind),
      getLedger: (id, opts) => real.getLedger(id, opts),
      adminAdjustWallet: async (input) => {
        if (failing) throw new Error("wallet down");
        return real.adminAdjustWallet(input);
      },
    }));
    const before = await rig.balance();
    const granted = await rig.gateway.grantCoins(milestone());
    if (!granted.ok) throw new Error("grant failed");

    rig.clock.now = T0 + VESTING_MS;
    expect(await rig.gateway.releaseDue()).toMatchObject({ released: 0, failed: 1 });
    expect((await rig.repository.getReward(granted.record.rewardId))!.status).toBe("RELEASING");

    // Still inside the lease: not redriven yet, so a slow payment is not paid twice.
    failing = false;
    rig.clock.now += RELEASE_CLAIM_LEASE_MS - 1;
    expect(await rig.gateway.releaseDue()).toMatchObject({ released: 0 });

    rig.clock.now += 2;
    expect(await rig.gateway.releaseDue()).toMatchObject({ released: 1 });
    expect(await rig.balance()).toBe(before + 500n);
  });

  it("does not credit twice when the first credit landed but the record was never completed", async () => {
    let ledgerReadFails = true;
    const rig = makeRig((real) => ({
      ensureIdentityRegistered: (id, kind) => real.ensureIdentityRegistered(id, kind),
      adminAdjustWallet: (input) => real.adminAdjustWallet(input),
      getLedger: async (id, opts) => {
        if (ledgerReadFails) throw new Error("ledger read failed after the credit");
        return real.getLedger(id, opts);
      },
    }));
    const before = await rig.balance();
    await rig.gateway.grantCoins(milestone());

    rig.clock.now = T0 + VESTING_MS;
    await rig.gateway.releaseDue();
    expect(await rig.balance()).toBe(before + 500n);

    ledgerReadFails = false;
    rig.clock.now += RELEASE_CLAIM_LEASE_MS + 1;
    await rig.gateway.releaseDue();

    expect(await rig.balance()).toBe(before + 500n);
  });
});

describe("RewardGateway — failure is honest", () => {
  it("reports that coins are unavailable when there is no economy", async () => {
    const gateway = new RewardGateway({
      economy: null,
      repository: new InMemoryRewardRepository(),
      risk: new RiskService(),
      trust: new TrustService(),
    });

    expect(await gateway.grantCoins(milestone())).toMatchObject({ ok: false, code: REASON.NO_ECONOMY });
  });

  it("reports a store failure as unavailable, never as success", async () => {
    const rig = makeRig();
    vi.spyOn(rig.repository, "insertReward").mockRejectedValueOnce(new Error("db down"));

    expect(await rig.gateway.grantCoins(milestone())).toMatchObject({ ok: false, code: REASON.REWARD_STORE_UNAVAILABLE });
  });
});

describe("RewardGateway — the sweeper", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pays due rewards on its interval and stops when told to", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const rig = makeRig();
    const before = await rig.balance();
    await rig.gateway.grantCoins(milestone());
    rig.clock.now = T0 + VESTING_MS;

    rig.gateway.startSweeper(1_000);
    await vi.advanceTimersByTimeAsync(1_100);
    await rig.gateway.drain();
    expect(await rig.balance()).toBe(before + 500n);

    rig.gateway.stopSweeper();
    await rig.gateway.grantCoins(milestone({ sourceId: "level:6" }));
    rig.clock.now += VESTING_MS;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await rig.balance()).toBe(before + 500n);
  });

  it("lets a system-set watch lapse as part of the sweep", async () => {
    const rig = makeRig();
    for (let i = 0; i < 3; i++) rig.risk.recordAbnormalSession(PLAYER, REASON.TOO_SHORT, T0 + i);
    expect(rig.risk.getState(PLAYER)).toBe("WATCHLIST");

    rig.clock.now = T0 + 8 * 24 * 3_600_000;
    await rig.gateway.sweep();

    expect(rig.risk.getState(PLAYER)).toBe("NORMAL");
  });
});
