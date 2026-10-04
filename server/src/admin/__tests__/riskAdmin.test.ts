import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { createRiskAdminRouter } from "../RiskAdminController.js";
import { RewardGateway } from "../../rewards/RewardGateway.js";
import { InMemoryRewardRepository } from "../../rewards/InMemoryRewardRepository.js";
import { RiskService } from "../../rewards/RiskService.js";
import { TrustService } from "../../rewards/TrustService.js";
import { REASON } from "../../rewards/types.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

const OPS_KEY = "test-risk-admin-operational-key-0001";
const PLAYER = "flagged_player";

describe("risk admin API", () => {
  let server: TestServer;
  let repository: InMemoryRewardRepository;
  let risk: RiskService;
  let gateway: RewardGateway;
  const originalSecret = process.env.OPERATIONAL_SECRET;

  const call = (path: string, init: RequestInit = {}, authed = true) =>
    server.request(path, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(authed ? { "x-operational-key": OPS_KEY } : {}),
      },
    });
  const put = (state: unknown, extra: Record<string, unknown> = {}) =>
    call(`/api/admin/risk/${PLAYER}`, { method: "PUT", body: JSON.stringify({ state, ...extra }) });

  beforeEach(async () => {
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    repository = new InMemoryRewardRepository();
    risk = new RiskService();
    risk.attachStore(repository);
    const trust = new TrustService();
    const economy = new EconomyService(new InMemoryEconomyRepository());
    gateway = new RewardGateway({ economy, repository, risk, trust });
    server = await startTestServer(mountRouter("/api/admin/risk", createRiskAdminRouter({ gateway, repository, risk, trust })));
  });

  afterEach(async () => {
    await server.close();
    process.env.OPERATIONAL_SECRET = originalSecret;
    vi.restoreAllMocks();
  });

  it("refuses every route without operational credentials", async () => {
    expect((await call("/api/admin/risk", {}, false)).status).toBe(401);
    expect((await call(`/api/admin/risk/${PLAYER}`, {}, false)).status).toBe(401);
    expect((await call(`/api/admin/risk/${PLAYER}`, { method: "PUT", body: JSON.stringify({ state: "NORMAL" }) }, false)).status).toBe(401);
    expect((await call("/api/admin/risk/rewards/x/void", { method: "POST", body: JSON.stringify({ reason: "x" }) }, false)).status).toBe(401);
  });

  it("marks responses as uncacheable", async () => {
    expect((await call("/api/admin/risk")).headers.get("cache-control")).toBe("no-store");
  });

  describe("changing an account's state", () => {
    it("sets a state and records who did it, taken from the credential and not from the request body", async () => {
      const res = await put("RESTRICTED", { reasonCodes: ["FARM_RING"], note: "plays only with q", actor: "somebody_else" });

      expect(res.status).toBe(200);
      expect((res.body as { record: { state: string; updatedBy: string; reasonCodes: string[] } }).record).toMatchObject({
        state: "RESTRICTED",
        updatedBy: "ops-key",
        reasonCodes: ["FARM_RING"],
      });
      expect(risk.getState(PLAYER)).toBe("RESTRICTED");
      expect((await repository.listRiskEventsForPlayer(PLAYER))[0]).toMatchObject({
        kind: "STATE_CHANGED",
        detail: { from: "NORMAL", to: "RESTRICTED", actor: "ops-key", note: "plays only with q" },
      });
    });

    it("is reversible: setting the account back to NORMAL works without a note, and both moves are on record", async () => {
      await put("UNDER_REVIEW", { note: "checking" });
      const back = await put("NORMAL");

      expect(back.status).toBe(200);
      expect(risk.getState(PLAYER)).toBe("NORMAL");
      expect((await repository.listRiskEventsForPlayer(PLAYER)).map((e) => e.detail.to)).toEqual(["NORMAL", "UNDER_REVIEW"]);
    });

    it("requires a written note to restrict or review an account", async () => {
      expect((await put("RESTRICTED")).status).toBe(400);
      expect((await put("UNDER_REVIEW", { note: "   " })).status).toBe(400);
      expect(risk.getState(PLAYER)).toBe("NORMAL");
    });

    it("rejects an unknown state, malformed reason codes and an oversized note", async () => {
      expect((await put("BANNED", { note: "x" })).status).toBe(400);
      expect((await put("RESTRICTED", { note: "x", reasonCodes: [] })).status).toBe(400);
      expect((await put("RESTRICTED", { note: "x", reasonCodes: [42] })).status).toBe(400);
      expect((await put("RESTRICTED", { note: "x", reasonCodes: Array(6).fill("A") })).status).toBe(400);
      expect((await put("RESTRICTED", { note: "x".repeat(201) })).status).toBe(400);
      expect(risk.getState(PLAYER)).toBe("NORMAL");
    });

    it("rejects a malformed player id", async () => {
      const res = await call("/api/admin/risk/has%20spaces", { method: "PUT", body: JSON.stringify({ state: "NORMAL" }) });

      expect(res.status).toBe(400);
    });

    it("reports a store refusal as a conflict and changes nothing", async () => {
      vi.spyOn(repository, "upsertRiskState").mockRejectedValueOnce(new Error("no such player"));

      const res = await put("RESTRICTED", { note: "x" });

      expect(res.status).toBe(409);
      expect(risk.getState(PLAYER)).toBe("NORMAL");
    });
  });

  describe("looking at accounts", () => {
    it("lists accounts that are not NORMAL, with counts", async () => {
      await put("RESTRICTED", { note: "a" });
      await risk.setState("other", "WATCHLIST", { reasonCodes: ["x"], actor: "system" });
      await risk.setState("cleared", "WATCHLIST", { reasonCodes: ["x"], actor: "op" });
      await risk.setState("cleared", "NORMAL", { reasonCodes: ["x"], actor: "op" });

      const res = await call("/api/admin/risk");

      const body = res.body as { accounts: Array<{ playerId: string }>; counts: Record<string, number> };
      expect(body.accounts.map((a) => a.playerId).sort()).toEqual(["flagged_player", "other"]);
      expect(body.counts).toEqual({ WATCHLIST: 1, RESTRICTED: 1, UNDER_REVIEW: 0 });
    });

    it("shows one account's state, event history, rewards and trust together", async () => {
      await put("WATCHLIST", { note: "pace" });
      const granted = await gateway.grantCoins({
        playerId: PLAYER, identityKind: "member", rewardType: "LEVEL_MILESTONE", reasonCode: REASON.MILESTONE_LEVEL,
        amount: 500, sourceId: "level:5", description: "Level 5",
      });
      expect(granted.ok).toBe(true);

      const res = await call(`/api/admin/risk/${PLAYER}`);

      const body = res.body as { state: string; events: unknown[]; rewards: Array<{ status: string }>; trust: { tier: number } };
      expect(body.state).toBe("WATCHLIST");
      expect(body.events).toHaveLength(1);
      expect(body.rewards[0]!.status).toBe("PENDING");
      expect(body.trust.tier).toBe(1);
    });
  });

  describe("erasing an account's risk data", () => {
    const erase = (body: Record<string, unknown>, authed = true) =>
      call(`/api/admin/risk/${PLAYER}/data`, { method: "DELETE", body: JSON.stringify(body) }, authed);

    it("is refused without operational credentials", async () => {
      expect((await erase({ note: "DPDP request 12" }, false)).status).toBe(401);
    });

    it("needs a note saying which request it answers", async () => {
      expect((await erase({})).status).toBe(400);
      expect((await erase({ note: "   " })).status).toBe(400);
    });

    it("removes the standing and every audit event, in memory and in the store", async () => {
      await risk.setState(PLAYER, "WATCHLIST", { reasonCodes: ["x"], actor: "op", note: "n" });
      await risk.setState(PLAYER, "NORMAL", { reasonCodes: ["x"], actor: "op" });
      expect((await repository.listRiskEventsForPlayer(PLAYER)).length).toBeGreaterThan(0);

      const res = await erase({ note: "DPDP request 12" });

      expect(res.status).toBe(200);
      expect(await repository.listRiskEventsForPlayer(PLAYER)).toEqual([]);
      expect(await repository.listRiskStates()).toEqual([]);
      expect(risk.getState(PLAYER)).toBe("NORMAL");
    });

    it("refuses to lift a restriction by erasure unless the operator says so outright", async () => {
      await risk.setState(PLAYER, "RESTRICTED", { reasonCodes: ["x"], actor: "op", note: "farming" });

      const refused = await erase({ note: "DPDP request 12" });

      expect(refused.status).toBe(409);
      expect(risk.getState(PLAYER)).toBe("RESTRICTED");
      expect((await erase({ note: "DPDP request 12", confirmStandingLoss: true })).status).toBe(200);
      expect(risk.getState(PLAYER)).toBe("NORMAL");
    });

    it("leaves the player's rewards alone, so a milestone cannot be claimed twice", async () => {
      await gateway.grantCoins({
        playerId: PLAYER, identityKind: "member", rewardType: "LEVEL_MILESTONE", reasonCode: REASON.MILESTONE_LEVEL,
        amount: 100, sourceId: "level:5", description: "x",
      });

      await erase({ note: "DPDP request 12" });

      expect(await repository.listRewardsForPlayer(PLAYER)).toHaveLength(1);
    });

    it("says so, and changes nothing it cannot confirm, when the store fails", async () => {
      vi.spyOn(repository, "eraseRiskData").mockRejectedValueOnce(new Error("db down"));

      const res = await erase({ note: "DPDP request 12" });

      expect(res.status).toBe(503);
    });
  });

  describe("withdrawing a reward", () => {
    async function pendingReward(): Promise<string> {
      const granted = await gateway.grantCoins({
        playerId: PLAYER, identityKind: "member", rewardType: "LEVEL_MILESTONE", reasonCode: REASON.MILESTONE_LEVEL,
        amount: 500, sourceId: "level:5", description: "Level 5",
      });
      if (!granted.ok) throw new Error("grant failed");
      return granted.record.rewardId;
    }
    const voidIt = (id: string, body: unknown) =>
      call(`/api/admin/risk/rewards/${id}/void`, { method: "POST", body: JSON.stringify(body) });

    it("voids a pending reward and audits it with the operator", async () => {
      const id = await pendingReward();

      const res = await voidIt(id, { reason: "farm ring" });

      expect(res.status).toBe(200);
      expect((await repository.getReward(id))!.status).toBe("VOIDED");
      expect((await repository.listRiskEventsForPlayer(PLAYER))[0]).toMatchObject({
        kind: "REWARD_VOIDED",
        detail: { actor: "ops-key", note: "farm ring" },
      });
    });

    it("requires a reason", async () => {
      const id = await pendingReward();

      expect((await voidIt(id, {})).status).toBe(400);
      expect((await voidIt(id, { reason: "  " })).status).toBe(400);
      expect((await repository.getReward(id))!.status).toBe("PENDING");
    });

    it("says 404 for an unknown reward and 409 for one already paid", async () => {
      expect((await voidIt("rwd_nope", { reason: "x" })).status).toBe(404);

      const id = await pendingReward();
      await repository.claimForRelease(id, Date.now() + 2 * 86_400_000, 0);
      await repository.completeRelease(id, 1, Date.now());
      const late = await voidIt(id, { reason: "too late" });

      expect(late.status).toBe(409);
      expect((late.body as { error: string }).error).toMatch(/can no longer be withdrawn/);
    });
  });
});
