import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { createRewardsRouter, standingFor } from "../RewardsController.js";
import { RewardGateway } from "../RewardGateway.js";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { RiskService } from "../RiskService.js";
import { TrustService } from "../TrustService.js";
import { TransferPolicy } from "../TransferPolicy.js";
import { REASON } from "../types.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

const ME = "player_me";
const OTHER = "player_other";

/** Stands in for `attachPlayerIdentity`: who is calling is decided by a test header, never by the URL. */
function actAs(req: Request, _res: Response, next: NextFunction): void {
  const who = req.headers["x-test-player"];
  if (typeof who === "string") (req as unknown as { player: { playerId: string; kind: string } }).player = { playerId: who, kind: "member" };
  next();
}

describe("rewards API (a player's own rewards and standing)", () => {
  let server: TestServer;
  let repository: InMemoryRewardRepository;
  let risk: RiskService;
  let trust: TrustService;
  let gateway: RewardGateway;
  let economy: EconomyService;
  const clock = { now: Date.now() };

  const get = (path: string, as: string | null = ME) =>
    server.request(path, { headers: as ? { "x-test-player": as } : {} });

  beforeEach(async () => {
    repository = new InMemoryRewardRepository();
    risk = new RiskService();
    trust = new TrustService();
    economy = new EconomyService(new InMemoryEconomyRepository());
    gateway = new RewardGateway({ economy, repository, risk, trust, now: () => clock.now });
    const policy = new TransferPolicy({ ledger: economy, risk, trust });
    server = await startTestServer((app) => {
      app.use(actAs);
      mountRouter("/api/rewards", createRewardsRouter({ gateway, trust, risk, transferPolicy: policy }))(app);
    });
  });

  afterEach(async () => {
    await server.close();
    vi.restoreAllMocks();
  });

  const grant = (sourceId: string, amount = 500) =>
    gateway.grantCoins({
      playerId: ME,
      identityKind: "member",
      rewardType: "LEVEL_MILESTONE",
      reasonCode: REASON.MILESTONE_LEVEL,
      amount,
      sourceId,
      description: `Reward ${sourceId}`,
    });

  it("refuses an anonymous caller", async () => {
    expect((await get(`/api/rewards/${ME}`, null)).status).toBe(401);
    expect((await get(`/api/rewards/${ME}/trust`, null)).status).toBe(401);
  });

  it("refuses to show one player another's rewards or trust", async () => {
    expect((await get(`/api/rewards/${OTHER}`, ME)).status).toBe(403);
    expect((await get(`/api/rewards/${OTHER}/trust`, ME)).status).toBe(403);
  });

  it("lists a player's pending rewards with when they arrive, pending first", async () => {
    await grant("level:5");
    const paid = await grant("level:6", 600);
    if (!paid.ok) throw new Error("grant failed");
    clock.now += 25 * 3_600_000;
    await repository.claimForRelease(paid.record.rewardId, clock.now, clock.now - 1);
    await repository.completeRelease(paid.record.rewardId, 1, clock.now);
    await grant("level:7", 700);

    const res = await get(`/api/rewards/${ME}`);

    expect(res.status).toBe(200);
    const rewards = (res.body as { rewards: Array<{ status: string; amount: number; vestingUntil: number }> }).rewards;
    expect(rewards).toHaveLength(3);
    expect(rewards.slice(0, 2).every((r) => r.status === "PENDING")).toBe(true);
    expect(rewards[2]!.status).toBe("RELEASED");
    expect(rewards[0]!.vestingUntil).toBeGreaterThan(clock.now);
  });

  it("does not leak internals: no risk state, no ledger entry, no operator notes", async () => {
    await grant("level:5");

    const res = await get(`/api/rewards/${ME}`);

    const reward = (res.body as { rewards: Array<Record<string, unknown>> }).rewards[0]!;
    expect(Object.keys(reward).sort()).toEqual(
      ["amount", "description", "earnedAt", "reasonCode", "rewardId", "rewardType", "sourceId", "status", "vestingUntil"],
    );
  });

  it("does not tell a WATCHLIST account it is being watched", async () => {
    await risk.setState(ME, "WATCHLIST", { reasonCodes: ["x"], actor: "op" });

    const res = await get(`/api/rewards/${ME}`);

    expect((res.body as { standing: unknown }).standing).toBeNull();
    expect(JSON.stringify(res.body)).not.toMatch(/watch/i);
  });

  it.each(["RESTRICTED", "UNDER_REVIEW"] as const)("is honest with a %s account: says what is held and how to appeal", async (state) => {
    await risk.setState(ME, state, { reasonCodes: ["x"], actor: "op" });

    const res = await get(`/api/rewards/${ME}`);

    const standing = (res.body as { standing: { state: string; message: string } }).standing;
    expect(standing.state).toBe(state);
    expect(standing.message).toMatch(/contact support/i);
  });

  it("answers 503, not an unhandled rejection, when trust cannot be assessed", async () => {
    vi.spyOn(trust, "assess").mockRejectedValueOnce(new Error("mandali store down"));

    const res = await get(`/api/rewards/${ME}/trust`);

    expect(res.status).toBe(503);
  });

  it("names the source of each reward so the app can tie it to its milestone", async () => {
    await grant("level:5");

    const body = (await get(`/api/rewards/${ME}`)).body as { rewards: Array<{ sourceId: string }> };

    expect(body.rewards[0]?.sourceId).toBe("level:5");
  });

  it("shows the trust tier with every criterion behind it, and the transfer allowance", async () => {
    await economy.ensureIdentityRegistered(ME, "member");
    const res = await get(`/api/rewards/${ME}/trust`);

    expect(res.status).toBe(200);
    const body = res.body as {
      trust: { tier: number; reasons: Array<{ label: string; met: boolean; detail: string }> };
      transfer: { dailyCap: number; sentToday: number | null };
    };
    expect(body.trust.tier).toBe(1);
    expect(body.trust.reasons.length).toBeGreaterThan(0);
    expect(body.trust.reasons.every((r) => typeof r.label === "string" && typeof r.met === "boolean")).toBe(true);
    expect(body.transfer).toEqual({ dailyCap: 500, sentToday: 0 });
  });

  it("shows no sent-today figure, rather than failing, for a player with no wallet yet", async () => {
    const res = await get(`/api/rewards/${ME}/trust`);

    expect(res.status).toBe(200);
    expect((res.body as { transfer: { sentToday: unknown } }).transfer.sentToday).toBeNull();
  });

  it("reports a store failure as unavailable, never as an empty list", async () => {
    vi.spyOn(repository, "listRewardsForPlayer").mockRejectedValueOnce(new Error("db down"));

    const res = await get(`/api/rewards/${ME}`);

    expect(res.status).toBe(503);
  });
});

describe("what a player is told about their standing", () => {
  it("shows only the states that change what they can do", () => {
    expect(standingFor("NORMAL")).toBeNull();
    expect(standingFor("WATCHLIST")).toBeNull();
    expect(standingFor("RESTRICTED")?.state).toBe("RESTRICTED");
    expect(standingFor("UNDER_REVIEW")?.state).toBe("UNDER_REVIEW");
  });
});
