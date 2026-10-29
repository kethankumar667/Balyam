import { beforeEach, describe, expect, it, vi } from "vitest";
import { REFERRAL_LIVE_EVENT } from "@shared/referrals.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import type { PostgrestClient } from "../../persistence/postgrest.js";
import { InMemoryRewardRepository } from "../../rewards/InMemoryRewardRepository.js";
import { RewardGateway, VESTING_MS } from "../../rewards/RewardGateway.js";
import { REASON } from "../../rewards/types.js";
import { RiskService } from "../../rewards/RiskService.js";
import { TrustService } from "../../rewards/TrustService.js";
import { ReferralBonusService } from "../ReferralBonusService.js";
import { ReferralNotifier } from "../ReferralNotifier.js";
import { ReferralService } from "../ReferralService.js";
import { mintReferralIntent } from "../referralIntent.js";

const INVITER = "member-inviter";
const FRIEND = "member-friend";
const CONTEXT = { referrerId: INVITER, inviteeName: "Meera", referrerName: "Sunita" };
const SIGNING_KEY = "referral-test-signing-key-with-32-characters";
const START = 1_800_000_000_000;

type Sent = { room: string; event: string; payload: Record<string, unknown> };

function fakeIo(sent: Sent[]) {
  return { to: (room: string) => ({ emit: (event: string, payload: unknown) => { sent.push({ room, event, payload: payload as Record<string, unknown> }); } }) };
}

function fakeDb(context: unknown = CONTEXT) {
  return { rpc: vi.fn(async (fn: string) => { if (fn !== "referral_event_context") throw new Error(`unexpected ${fn}`); return context; }) };
}

describe("ReferralNotifier", () => {
  let sent: Sent[];
  beforeEach(() => { sent = []; });
  const make = (db = fakeDb()) => ({ db, notifier: new ReferralNotifier(fakeIo(sent), db as never, () => START) });

  it("tells the inviter, in their own room, that a friend joined, and names only the friend", async () => {
    const { notifier } = make();
    await notifier.friendJoined(FRIEND);
    expect(sent).toEqual([{ room: `user:${INVITER}`, event: REFERRAL_LIVE_EVENT, payload: { kind: "friend_joined", friendName: "Meera", at: START } }]);
  });

  it("says a join only once, however often the request repeats", async () => {
    const { notifier, db } = make();
    await notifier.friendJoined(FRIEND);
    await notifier.friendJoined(FRIEND);
    expect(sent).toHaveLength(1);
    expect(db.rpc).toHaveBeenCalledOnce();
  });

  it("tells both sides when the first match is played: the inviter about the friend, the invitee about the inviter", async () => {
    const { notifier } = make();
    await notifier.bonusScheduled(FRIEND, 2000, 1500);
    expect(sent).toEqual([
      { room: `user:${INVITER}`, event: REFERRAL_LIVE_EVENT, payload: { kind: "friend_played", friendName: "Meera", coins: 2000, at: START } },
      { room: `user:${FRIEND}`, event: REFERRAL_LIVE_EVENT, payload: { kind: "bonus_on_the_way", friendName: "Sunita", coins: 1500, at: START } },
    ]);
  });

  it("names the other person when each side's coins land", async () => {
    const { notifier } = make();
    await notifier.bonusLanded({ playerId: INVITER, sourceId: `referral:${FRIEND}:inviter`, amount: 2000 });
    await notifier.bonusLanded({ playerId: FRIEND, sourceId: `referral:${FRIEND}:invitee`, amount: 2000 });
    expect(sent.map(s => [s.room, s.payload.kind, s.payload.friendName, s.payload.coins])).toEqual([
      [`user:${INVITER}`, "bonus_landed", "Meera", 2000],
      [`user:${FRIEND}`, "bonus_landed", "Sunita", 2000],
    ]);
  });

  it("ignores a reward that is not a referral bonus", async () => {
    const { notifier, db } = make();
    await notifier.bonusLanded({ playerId: INVITER, sourceId: "streak:day-7", amount: 500 });
    expect(sent).toHaveLength(0);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("sends nothing but a name and coins: no email, birthday or ids of the other person", async () => {
    const { notifier } = make(fakeDb({ ...CONTEXT, email: "meera@example.com", dob: "2001-01-01" }));
    await notifier.bonusScheduled(FRIEND, 2000, 2000);
    for (const { payload } of sent) {
      expect(Object.keys(payload).sort()).toEqual(["at", "coins", "friendName", "kind"]);
      expect(JSON.stringify(payload)).not.toMatch(/@|2001|member-/);
    }
  });

  it("sends nothing when the invitation cannot be found", async () => {
    const { notifier } = make(fakeDb(null));
    await notifier.bonusScheduled(FRIEND, 2000, 2000);
    expect(sent).toHaveLength(0);
  });

  it("never throws when the lookup or the socket fails", async () => {
    const broken = { rpc: vi.fn().mockRejectedValue(new Error("down")) };
    await expect(new ReferralNotifier(fakeIo(sent), broken as never).friendJoined(FRIEND)).resolves.toBeUndefined();
    const explosive = { to: () => ({ emit: () => { throw new Error("socket closed"); } }) };
    await expect(new ReferralNotifier(explosive, fakeDb() as never).bonusScheduled(FRIEND, 1, 1)).resolves.toBeUndefined();
    expect(sent).toHaveLength(0);
  });

  it("is a harmless no-op when there is no socket server", async () => {
    const notifier = new ReferralNotifier(null, fakeDb() as never);
    await expect(notifier.bonusScheduled(FRIEND, 2000, 2000)).resolves.toBeUndefined();
  });
});

describe("ReferralService announces a join", () => {
  const code = "00000000-0000-4000-8000-000000000001";
  const make = (result: unknown) => {
    const db = { rpc: vi.fn().mockResolvedValue(result) } as unknown as PostgrestClient;
    const notifier = { friendJoined: vi.fn().mockResolvedValue(undefined) };
    return { service: new ReferralService(db, SIGNING_KEY, notifier), notifier };
  };

  it("when a typed code is accepted", async () => {
    const { service, notifier } = make({ ok: true });
    await service.redeemCode(FRIEND, "bhalyam-k7m2p");
    expect(notifier.friendJoined).toHaveBeenCalledWith(FRIEND);
  });

  it("when an invitation link is attributed", async () => {
    const { service, notifier } = make({ ok: true });
    await service.attribute(FRIEND, mintReferralIntent(code, SIGNING_KEY));
    expect(notifier.friendJoined).toHaveBeenCalledWith(FRIEND);
  });

  it("but not when the code is refused, malformed, or the link has expired", async () => {
    const refused = make({ ok: false, code: "ALREADY_PLAYED" });
    await refused.service.redeemCode(FRIEND, "bhalyam-k7m2p");
    await refused.service.redeemCode(FRIEND, "not a code");
    await refused.service.attribute(FRIEND, "forged");
    expect(refused.notifier.friendJoined).not.toHaveBeenCalled();
  });
});

describe("the reward gateway's release listener", () => {
  let economy: EconomyService;
  let gateway: RewardGateway;
  const clock = { now: START };

  beforeEach(async () => {
    clock.now = START;
    economy = new EconomyService(new InMemoryEconomyRepository());
    gateway = new RewardGateway({ economy, repository: new InMemoryRewardRepository(), risk: new RiskService(), trust: new TrustService(), now: () => clock.now });
    await economy.ensureIdentityRegistered(INVITER, "member");
  });

  const grant = () => gateway.grantCoins({
    playerId: INVITER, identityKind: "member", rewardType: "REFERRAL", reasonCode: REASON.REFERRAL_INVITER,
    amount: 2000, sourceId: `referral:${FRIEND}:inviter`, description: "A friend you invited finished their first match",
  });
  const release = async () => { clock.now += VESTING_MS + 1_000; await gateway.releaseDue(); };

  it("is told once, after the hold ends and the coins are in the wallet, not at grant time", async () => {
    const listener = vi.fn();
    gateway.setReleaseListener(listener);
    await grant();
    expect(listener).not.toHaveBeenCalled();
    await release();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]).toMatchObject({ playerId: INVITER, rewardType: "REFERRAL", amount: 2000, sourceId: `referral:${FRIEND}:inviter` });
    await release();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("cannot fail or undo a payment by throwing", async () => {
    gateway.setReleaseListener(() => { throw new Error("listener bug"); });
    await grant();
    const before = Number((await economy.getWallet(INVITER)).balance);
    await release();
    expect(Number((await economy.getWallet(INVITER)).balance)).toBe(before + 2000);
  });

  it("changes nothing when no listener is set", async () => {
    await grant();
    await release();
    expect((await gateway.listForPlayer(INVITER)).find(r => r.rewardType === "REFERRAL")?.status).toBe("RELEASED");
  });
});

describe("ReferralBonusService announces a bonus once, only after it is closed", () => {
  let db: { calls: string[]; owed: Array<{ inviteeId: string; referrerId: string }>; failCompleteOnce: boolean; rpc: (fn: string, args?: Record<string, unknown>) => Promise<unknown> };
  let risk: RiskService;
  let notifier: { bonusScheduled: ReturnType<typeof vi.fn> };
  let service: ReferralBonusService;

  beforeEach(async () => {
    const economy = new EconomyService(new InMemoryEconomyRepository());
    risk = new RiskService();
    const gateway = new RewardGateway({ economy, repository: new InMemoryRewardRepository(), risk, trust: new TrustService(), now: () => START });
    for (const id of [INVITER, FRIEND]) await economy.ensureIdentityRegistered(id, "member");
    db = {
      calls: [], owed: [{ inviteeId: FRIEND, referrerId: INVITER }], failCompleteOnce: false,
      async rpc(fn, args = {}) {
        this.calls.push(fn);
        switch (fn) {
          case "referral_qualify_open": return { qualified: this.owed.length, referrers: 1 };
          case "referral_bonus_due": return this.owed.map(o => ({ ...o, inviterBonus: 2000, inviteeBonus: 1500 }));
          case "referral_bonus_reserve": return { state: "RESERVED", referrerId: INVITER, inviterBonus: 2000, inviteeBonus: 1500 };
          case "referral_bonus_complete":
            if (this.failCompleteOnce) { this.failCompleteOnce = false; throw new Error("database unavailable"); }
            this.owed = this.owed.filter(o => o.inviteeId !== String(args.p_invitee_id));
            return undefined;
          default: throw new Error(`unexpected rpc ${fn}`);
        }
      },
    };
    notifier = { bonusScheduled: vi.fn().mockResolvedValue(undefined) };
    service = new ReferralBonusService(db as unknown as PostgrestClient, gateway, notifier);
  });

  it("says it once, with each side's own amount, when the bonus is closed", async () => {
    await service.sweep();
    expect(notifier.bonusScheduled).toHaveBeenCalledOnce();
    expect(notifier.bonusScheduled).toHaveBeenCalledWith(FRIEND, 2000, 1500);
    await service.sweep();
    expect(notifier.bonusScheduled).toHaveBeenCalledOnce();
  });

  it("says nothing while the bonus is held back for review", async () => {
    await risk.setState(FRIEND, "UNDER_REVIEW", { reasonCodes: ["x"], actor: "op" });
    await service.sweep();
    expect(notifier.bonusScheduled).not.toHaveBeenCalled();
  });

  it("does not say it twice when the first attempt crashed before closing", async () => {
    db.failCompleteOnce = true;
    await service.sweep();
    expect(notifier.bonusScheduled).not.toHaveBeenCalled();
    await service.sweep();
    expect(notifier.bonusScheduled).toHaveBeenCalledOnce();
  });
});
