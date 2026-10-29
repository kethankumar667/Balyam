import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { InMemoryRewardRepository } from "../../rewards/InMemoryRewardRepository.js";
import { RewardGateway, VESTING_MS } from "../../rewards/RewardGateway.js";
import { REASON } from "../../rewards/types.js";
import { RiskService } from "../../rewards/RiskService.js";
import { TrustService } from "../../rewards/TrustService.js";
import { createReferralAdminRouter } from "../ReferralAdminController.js";
import { checkCampaignPatch, checkNote, ReferralAdminService } from "../ReferralAdminService.js";

const OPS_KEY = "test-referral-admin-operational-key-0001";
const INVITER = "member-inviter";
const FRIEND = "member-friend";
const START = 1_800_000_000_000;

const CAMPAIGN = { enabled: true, inviterBonus: 2000, inviteeBonus: 2000, rollingCap: 10, capWindowDays: 30, codeWindowDays: 7, bonusStartsAt: START };

describe("referral admin API", () => {
  let server: TestServer;
  let gateway: RewardGateway;
  let repository: InMemoryRewardRepository;
  let rpc: Mock<[string], Promise<unknown>>;
  /** A referral bonus in its hold, and a non-referral reward in its hold. */
  let ids: { referralId: string; milestoneId: string };
  const clock = { now: START };
  const originalSecret = process.env.OPERATIONAL_SECRET;

  const call = (path: string, init: RequestInit = {}, authed = true) =>
    server.request(path, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(authed ? { "x-operational-key": OPS_KEY } : {}),
      },
    });
  const put = (body: unknown) => call("/api/admin/referrals/campaign", { method: "PUT", body: JSON.stringify(body) });
  const voidBonus = (id: string, body: unknown) => call(`/api/admin/referrals/rewards/${id}/void`, { method: "POST", body: JSON.stringify(body) });

  beforeEach(async () => {
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    clock.now = START;
    rpc = vi.fn(async (fn: string): Promise<unknown> => {
      if (fn === "referral_admin_overview") return { campaign: CAMPAIGN, funnel: {}, liability: {}, topReferrers: [], serverNow: START };
      if (fn === "referral_admin_pending_rewards") return [];
      if (fn === "referral_admin_events_list") return [];
      if (fn === "referral_admin_set_campaign") return { ...CAMPAIGN, inviterBonus: 2500 };
      return undefined;
    });

    const economy = new EconomyService(new InMemoryEconomyRepository());
    repository = new InMemoryRewardRepository();
    gateway = new RewardGateway({ economy, repository, risk: new RiskService(), trust: new TrustService(), now: () => clock.now });
    for (const id of [INVITER, FRIEND]) await economy.ensureIdentityRegistered(id, "member");
    const referral = await gateway.grantCoins({
      playerId: INVITER, identityKind: "member", rewardType: "REFERRAL", reasonCode: REASON.REFERRAL_INVITER,
      amount: 2000, sourceId: `referral:${FRIEND}:inviter`, description: "A friend you invited finished their first match",
    });
    const milestone = await gateway.grantCoins({
      playerId: INVITER, identityKind: "member", rewardType: "LEVEL_MILESTONE", reasonCode: REASON.MILESTONE_LEVEL,
      amount: 500, sourceId: "level:5", description: "Level 5",
    });
    if (!referral.ok || !milestone.ok) throw new Error("seed grants failed");
    ids = { referralId: referral.record.rewardId, milestoneId: milestone.record.rewardId };

    const service = new ReferralAdminService({ rpc } as never, gateway, repository);
    server = await startTestServer(mountRouter("/api/admin/referrals", createReferralAdminRouter(service)));
  });

  afterEach(async () => {
    await server.close();
    process.env.OPERATIONAL_SECRET = originalSecret;
    vi.restoreAllMocks();
  });

  it("refuses every route without operational credentials", async () => {
    expect((await call("/api/admin/referrals/overview", {}, false)).status).toBe(401);
    expect((await call("/api/admin/referrals/pending", {}, false)).status).toBe(401);
    expect((await call("/api/admin/referrals/events", {}, false)).status).toBe(401);
    expect((await call("/api/admin/referrals/campaign", { method: "PUT", body: JSON.stringify({}) }, false)).status).toBe(401);
    expect((await call("/api/admin/referrals/rewards/x/void", { method: "POST", body: JSON.stringify({ reason: "x" }) }, false)).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("marks responses as uncacheable", async () => {
    expect((await call("/api/admin/referrals/overview")).headers.get("cache-control")).toBe("no-store");
  });

  it("says so, with 503, when referrals are not connected", async () => {
    const unconnected = await startTestServer(mountRouter("/api/admin/referrals", createReferralAdminRouter(null)));
    try {
      const res = await unconnected.request("/api/admin/referrals/overview", { headers: { "x-operational-key": OPS_KEY } });
      expect(res.status).toBe(503);
    } finally { await unconnected.close(); }
  });

  describe("reading", () => {
    it("returns the overview, the pending bonuses and the record from the database", async () => {
      expect((await call("/api/admin/referrals/overview")).body).toMatchObject({ campaign: { inviterBonus: 2000 } });
      expect((await call("/api/admin/referrals/pending")).body).toEqual({ rewards: [] });
      expect((await call("/api/admin/referrals/events")).body).toEqual({ events: [] });
    });

    it("passes a sane limit through, and ignores a bad one", async () => {
      await call("/api/admin/referrals/pending?limit=5");
      expect(rpc).toHaveBeenCalledWith("referral_admin_pending_rewards", { p_limit: 5 });
      await call("/api/admin/referrals/pending?limit=banana");
      expect(rpc).toHaveBeenLastCalledWith("referral_admin_pending_rewards", { p_limit: 50 });
      await call("/api/admin/referrals/events?limit=-3");
      expect(rpc).toHaveBeenLastCalledWith("referral_admin_events_list", { p_limit: 30 });
    });

    it("answers a database failure with a generic 503 that leaks nothing", async () => {
      rpc.mockRejectedValueOnce(new Error("PostgREST 500 on rpc: password=hunter2"));
      const res = await call("/api/admin/referrals/overview");
      expect(res.status).toBe(503);
      expect(JSON.stringify(res.body)).not.toMatch(/hunter2|PostgREST/);
    });
  });

  describe("changing the campaign", () => {
    it("applies a valid change, attributed to the credential and not to the request body", async () => {
      const res = await put({ note: "Weekend boost", changes: { inviterBonus: 2500 }, actor: "somebody_else" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ campaign: { ...CAMPAIGN, inviterBonus: 2500 } });
      expect(rpc).toHaveBeenCalledWith("referral_admin_set_campaign", { p_actor: "ops-key", p_note: "Weekend boost", p_patch: { inviterBonus: 2500 } });
    });

    it("needs a written note, and sends nothing to the database without one", async () => {
      for (const note of [undefined, "", "   ", 7]) {
        expect((await put({ note, changes: { inviterBonus: 2500 } })).status).toBe(400);
      }
      expect((await put({ note: "x".repeat(201), changes: { inviterBonus: 2500 } })).status).toBe(400);
      expect(rpc).not.toHaveBeenCalledWith("referral_admin_set_campaign", expect.anything());
    });

    it("refuses an empty change, an unknown setting, a typo that pays too much, a fraction and a non-number", async () => {
      for (const changes of [{}, null, [], { enabled: false }, { inviterBonus: 20000 }, { rollingCap: -1 }, { inviterBonus: 1.5 }, { inviterBonus: "2000" }]) {
        const res = await put({ note: "ok", changes });
        expect(res.status, JSON.stringify(changes)).toBe(400);
      }
      expect(rpc).not.toHaveBeenCalledWith("referral_admin_set_campaign", expect.anything());
    });

    it("turns the database's own refusal into a clear 400, and never echoes its detail", async () => {
      rpc.mockRejectedValueOnce(new Error('PostgREST 400 on rpc/x: {"message":"INVALID_CAMPAIGN_VALUE:inviterBonus","hint":"secret"}'));
      const res = await put({ note: "ok", changes: { inviterBonus: 100 } });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "One of those values is outside the allowed range." });
    });

    it("treats an unknown database failure as an outage", async () => {
      rpc.mockRejectedValueOnce(new Error("PostgREST 503 on rpc: down"));
      expect((await put({ note: "ok", changes: { inviterBonus: 100 } })).status).toBe(503);
    });
  });

  describe("withdrawing a bonus", () => {
    it("withdraws a pending referral bonus for good, and records who did it and why", async () => {
      const res = await voidBonus(ids.referralId, { reason: "Duplicate accounts" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, logged: true });
      expect((await repository.getReward(ids.referralId))?.status).toBe("VOIDED");
      expect(rpc).toHaveBeenCalledWith("referral_admin_log", expect.objectContaining({
        p_actor: "ops-key", p_action: "REWARD_VOIDED", p_note: "Duplicate accounts",
        p_detail: expect.objectContaining({ rewardId: ids.referralId, playerId: INVITER, amount: 2000 }),
      }));
    });

    it("refuses a reward that is not a referral bonus, and leaves it alone", async () => {
      const res = await voidBonus(ids.milestoneId, { reason: "x" });
      expect(res.status).toBe(400);
      expect((await repository.getReward(ids.milestoneId))?.status).toBe("PENDING");
    });

    it("needs a reason, a valid id, and an existing bonus", async () => {
      expect((await voidBonus(ids.referralId, {})).status).toBe(400);
      expect((await voidBonus(ids.referralId, { reason: "  " })).status).toBe(400);
      expect((await voidBonus("bad id with spaces", { reason: "x" })).status).toBe(400);
      expect((await voidBonus("rwd_missing", { reason: "x" })).status).toBe(404);
      expect((await repository.getReward(ids.referralId))?.status).toBe("PENDING");
    });

    it("cannot withdraw a bonus that has already been paid", async () => {
      clock.now += VESTING_MS + 1_000;
      await gateway.releaseDue();
      const res = await voidBonus(ids.referralId, { reason: "too late" });
      expect(res.status).toBe(409);
      expect((await repository.getReward(ids.referralId))?.status).toBe("RELEASED");
    });

    it("still reports success, honestly, when only the console's own record failed", async () => {
      rpc.mockImplementation(async (fn: string) => { if (fn === "referral_admin_log") throw new Error("log down"); return undefined; });
      const res = await voidBonus(ids.referralId, { reason: "Duplicate accounts" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, logged: false });
      expect((await repository.getReward(ids.referralId))?.status).toBe("VOIDED");
    });
  });
});

describe("checking a requested change", () => {
  it("accepts any of the five settings within their limits, and only those", () => {
    expect(checkCampaignPatch({ inviterBonus: 0, inviteeBonus: 10000, rollingCap: 100, capWindowDays: 365, codeWindowDays: 60 }))
      .toEqual({ ok: true, patch: { inviterBonus: 0, inviteeBonus: 10000, rollingCap: 100, capWindowDays: 365, codeWindowDays: 60 } });
  });

  it("names the setting and the allowed range when a value is out of bounds", () => {
    expect(checkCampaignPatch({ rollingCap: 101 })).toEqual({ ok: false, message: "Friends rewarded per window must be a whole number from 0 to 100." });
  });

  it("checks a note: required, trimmed, and at most 200 characters", () => {
    expect(checkNote("  Launch week  ")).toEqual({ ok: true, note: "Launch week" });
    expect(checkNote("")).toMatchObject({ ok: false });
    expect(checkNote(undefined)).toMatchObject({ ok: false });
    expect(checkNote("x".repeat(201))).toMatchObject({ ok: false });
  });
});
