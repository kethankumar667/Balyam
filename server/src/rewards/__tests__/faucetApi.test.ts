import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { FAUCET_AMOUNT_COINS, FAUCET_COOLDOWN_MS } from "@shared/faucet.js";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { createFaucetRouter } from "../FaucetController.js";
import { HourlyFaucetService } from "../HourlyFaucetService.js";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { RewardGateway } from "../RewardGateway.js";
import { RiskService } from "../RiskService.js";
import { TrustService } from "../TrustService.js";

const START = 1_800_000_000_000;

/** Stands in for `attachPlayerIdentity`: who is calling is a test header, never the body or URL. */
function actAs(req: Request, _res: Response, next: NextFunction): void {
  const who = req.headers["x-test-player"];
  const kind = req.headers["x-test-kind"] === "guest" ? "guest" : "member";
  if (typeof who === "string") (req as unknown as { player: { playerId: string; kind: string } }).player = { playerId: who, kind };
  next();
}

describe("faucet API", () => {
  let server: TestServer;
  const clock = { now: START };

  const call = (method: "GET" | "POST", as: string | null, kind: "member" | "guest" = "member", body?: unknown) =>
    server.request(method === "GET" ? "/api/faucet" : "/api/faucet/claim", {
      method,
      headers: as ? { "x-test-player": as, "x-test-kind": kind } : {},
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  beforeEach(async () => {
    clock.now = START;
    const gateway = new RewardGateway({
      economy: new EconomyService(new InMemoryEconomyRepository()),
      repository: new InMemoryRewardRepository(),
      risk: new RiskService(),
      trust: new TrustService(),
      now: () => clock.now,
    });
    const service = new HourlyFaucetService({ gateway, now: () => clock.now });
    server = await startTestServer((app) => {
      app.use(actAs);
      mountRouter("/api/faucet", createFaucetRouter(service))(app);
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it("turns away a caller with no identity", async () => {
    expect((await call("GET", null)).status).toBe(401);
    expect((await call("POST", null)).status).toBe(401);
  });

  it("tells a member a claim is available", async () => {
    const res = await call("GET", "api_member");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ eligible: true, canClaim: true, amount: FAUCET_AMOUNT_COINS, cooldownMs: FAUCET_COOLDOWN_MS });
  });

  it("pays a member's claim and then shows the wait", async () => {
    const claim = await call("POST", "api_member");
    const status = await call("GET", "api_member");

    expect(claim.body).toMatchObject({ ok: true, amount: FAUCET_AMOUNT_COINS, nextClaimAt: START + FAUCET_COOLDOWN_MS });
    expect(status.body).toMatchObject({ canClaim: false, nextClaimAt: START + FAUCET_COOLDOWN_MS });
  });

  it("answers an early claim with 200 and a COOLDOWN code, not an error", async () => {
    await call("POST", "api_member");

    const res = await call("POST", "api_member");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: false, code: "COOLDOWN", nextClaimAt: START + FAUCET_COOLDOWN_MS });
  });

  it("refuses a guest with NOT_MEMBER", async () => {
    const res = await call("POST", "api_guest", "guest");

    expect(res.body).toMatchObject({ ok: false, code: "NOT_MEMBER" });
  });

  it("ignores an amount or time supplied in the request body", async () => {
    const res = await call("POST", "api_member", "member", { amount: 999999, now: 0, nextClaimAt: 0 });

    expect(res.body).toMatchObject({ ok: true, amount: FAUCET_AMOUNT_COINS, nextClaimAt: START + FAUCET_COOLDOWN_MS });
  });
});
