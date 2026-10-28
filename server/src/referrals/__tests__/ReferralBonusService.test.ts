import { beforeEach, describe, expect, it } from "vitest";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import type { PostgrestClient } from "../../persistence/postgrest.js";
import { InMemoryRewardRepository } from "../../rewards/InMemoryRewardRepository.js";
import { RewardGateway, VESTING_MS } from "../../rewards/RewardGateway.js";
import { RiskService } from "../../rewards/RiskService.js";
import { TrustService } from "../../rewards/TrustService.js";
import { ReferralBonusService } from "../ReferralBonusService.js";

const START = 1_800_000_000_000;
const INVITER = "member-inviter";
const FRIEND = "member-friend";
const OTHER_FRIEND = "member-other";

type Call = { fn: string; args: Record<string, unknown> };

/**
 * A scripted stand-in for the database side of the bonus. It models only what the service relies on:
 * which friends are owed, what a reservation answers, and that completing closes the attribution.
 */
class FakeReferralDb {
  readonly calls: Call[] = [];
  owed: Array<{ inviteeId: string; referrerId: string }> = [];
  blockedWith: Record<string, string> = {};
  failCompleteOnce = false;
  amounts = { inviterBonus: 2_000, inviteeBonus: 2_000 };

  async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    this.calls.push({ fn, args });
    switch (fn) {
      case "referral_qualify_open":
        return { qualified: this.owed.length, referrers: this.owed.length } as T;
      case "referral_bonus_due":
        return this.owed.map(o => ({ ...o, ...this.amounts })) as T;
      case "referral_bonus_reserve": {
        const invitee = String(args.p_invitee_id);
        const row = this.owed.find(o => o.inviteeId === invitee);
        const reason = this.blockedWith[invitee];
        if (reason) return { state: "BLOCKED", reason } as T;
        if (!row) return { state: "ISSUED" } as T;
        return { state: "RESERVED", referrerId: row.referrerId, ...this.amounts } as T;
      }
      case "referral_bonus_complete":
        if (this.failCompleteOnce) {
          this.failCompleteOnce = false;
          throw new Error("database unavailable");
        }
        this.owed = this.owed.filter(o => o.inviteeId !== String(args.p_invitee_id));
        return undefined as T;
      default:
        throw new Error(`unexpected rpc ${fn}`);
    }
  }

  count(fn: string): number {
    return this.calls.filter(c => c.fn === fn).length;
  }
}

describe("ReferralBonusService", () => {
  let db: FakeReferralDb;
  let economy: EconomyService;
  let gateway: RewardGateway;
  let risk: RiskService;
  let service: ReferralBonusService;
  const clock = { now: START };

  const balanceOf = async (id: string): Promise<number> => Number((await economy.getWallet(id)).balance);
  const referralRows = async (id: string) =>
    (await gateway.listForPlayer(id)).filter(r => r.rewardType === "REFERRAL");
  const settle = async (): Promise<void> => {
    clock.now += VESTING_MS + 1_000;
    await gateway.releaseDue();
  };

  beforeEach(async () => {
    clock.now = START;
    db = new FakeReferralDb();
    economy = new EconomyService(new InMemoryEconomyRepository());
    risk = new RiskService();
    gateway = new RewardGateway({
      economy, repository: new InMemoryRewardRepository(), risk, trust: new TrustService(), now: () => clock.now,
    });
    service = new ReferralBonusService(db as unknown as PostgrestClient, gateway);
    for (const id of [INVITER, FRIEND, OTHER_FRIEND]) await economy.ensureIdentityRegistered(id, "member");
  });

  it("pays both sides once, after the hold, and closes the attribution", async () => {
    db.owed = [{ inviteeId: FRIEND, referrerId: INVITER }];
    const inviterBefore = await balanceOf(INVITER);
    const friendBefore = await balanceOf(FRIEND);

    const totals = await service.sweep();

    expect(totals).toMatchObject({ qualified: 1, paid: 1, blocked: 0, deferred: 0 });
    expect(db.count("referral_bonus_complete")).toBe(1);
    // Held for a day, like every other gameplay reward.
    expect(await balanceOf(INVITER)).toBe(inviterBefore);
    await settle();
    expect(await balanceOf(INVITER)).toBe(inviterBefore + 2_000);
    expect(await balanceOf(FRIEND)).toBe(friendBefore + 2_000);
  });

  it("writes one ledger row per side, keyed so a retry cannot pay twice", async () => {
    db.owed = [{ inviteeId: FRIEND, referrerId: INVITER }];
    await service.sweep();

    const inviterRows = await referralRows(INVITER);
    const friendRows = await referralRows(FRIEND);
    expect(inviterRows.map(r => r.sourceId)).toEqual([`referral:${FRIEND}:inviter`]);
    expect(friendRows.map(r => r.sourceId)).toEqual([`referral:${FRIEND}:invitee`]);
    expect(inviterRows[0]).toMatchObject({ reasonCode: "REFERRAL_INVITER", amount: 2_000 });
    expect(friendRows[0]).toMatchObject({ reasonCode: "REFERRAL_INVITEE", amount: 2_000 });
  });

  it("finishes after a crash before completion without paying anyone twice", async () => {
    db.owed = [{ inviteeId: FRIEND, referrerId: INVITER }];
    db.failCompleteOnce = true;
    const inviterBefore = await balanceOf(INVITER);

    expect(await service.sweep()).toMatchObject({ paid: 0 });
    expect(db.owed).toHaveLength(1);

    expect(await service.sweep()).toMatchObject({ paid: 1 });
    expect(db.owed).toHaveLength(0);
    await settle();
    expect(await balanceOf(INVITER)).toBe(inviterBefore + 2_000);
    expect(await referralRows(INVITER)).toHaveLength(1);
  });

  it("grants nothing for a friend the cap blocked", async () => {
    db.owed = [{ inviteeId: FRIEND, referrerId: INVITER }];
    db.blockedWith[FRIEND] = "CAP";

    expect(await service.sweep()).toMatchObject({ paid: 0, blocked: 1 });
    expect(await referralRows(INVITER)).toHaveLength(0);
    expect(await referralRows(FRIEND)).toHaveLength(0);
    expect(db.count("referral_bonus_complete")).toBe(0);
  });

  it("leaves the bonus reserved while an account is under review, then completes it once cleared", async () => {
    db.owed = [{ inviteeId: FRIEND, referrerId: INVITER }];
    await risk.setState(FRIEND, "UNDER_REVIEW", { reasonCodes: ["x"], actor: "op" });

    expect(await service.sweep()).toMatchObject({ paid: 0, deferred: 1 });
    expect(db.count("referral_bonus_complete")).toBe(0);

    await risk.setState(FRIEND, "NORMAL", { reasonCodes: [], actor: "op" });
    expect(await service.sweep()).toMatchObject({ paid: 1 });
    await settle();
    expect(await referralRows(INVITER)).toHaveLength(1);
    expect(await referralRows(FRIEND)).toHaveLength(1);
  });

  it("pays each friend separately for one inviter", async () => {
    db.owed = [
      { inviteeId: FRIEND, referrerId: INVITER },
      { inviteeId: OTHER_FRIEND, referrerId: INVITER },
    ];
    const before = await balanceOf(INVITER);

    expect(await service.sweep()).toMatchObject({ paid: 2 });
    await settle();
    expect(await balanceOf(INVITER)).toBe(before + 4_000);
  });

  it("skips a side the campaign has set to zero but still closes the attribution", async () => {
    db.owed = [{ inviteeId: FRIEND, referrerId: INVITER }];
    db.amounts = { inviterBonus: 2_000, inviteeBonus: 0 };

    expect(await service.sweep()).toMatchObject({ paid: 1 });
    expect(await referralRows(FRIEND)).toHaveLength(0);
  });

  it("shares one pass between simultaneous sweeps", async () => {
    db.owed = [{ inviteeId: FRIEND, referrerId: INVITER }];

    const [a, b] = await Promise.all([service.sweep(), service.sweep()]);

    expect(a).toBe(b);
    expect(db.count("referral_qualify_open")).toBe(1);
  });

  it("survives a database failure without throwing", async () => {
    const broken = { rpc: async () => { throw new Error("down"); } } as unknown as PostgrestClient;
    const quiet = new ReferralBonusService(broken, gateway);

    expect(await quiet.sweep()).toEqual({ qualified: 0, paid: 0, blocked: 0, deferred: 0 });
  });
});
