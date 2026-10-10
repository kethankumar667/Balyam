import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { mintGuestToken } from "../../auth/guestToken.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { createCarryOverRouter } from "../GuestCarryOverController.js";
import { GuestCarryOverService } from "../GuestCarryOverService.js";
import { InMemoryGuestCarryOverStore } from "../GuestCarryOverStore.js";
import { InMemoryRewardRepository } from "../InMemoryRewardRepository.js";
import { RewardGateway } from "../RewardGateway.js";
import { RiskService } from "../RiskService.js";
import { TrustService } from "../TrustService.js";

/** Stands in for `attachPlayerIdentity`: who is calling is a test header, never the body or URL. */
function actAs(req: Request, _res: Response, next: NextFunction): void {
  const who = req.headers["x-test-player"];
  const kind = req.headers["x-test-kind"] === "guest" ? "guest" : "member";
  if (typeof who === "string") (req as unknown as { player: { playerId: string; kind: string; email: string | null } }).player = { playerId: who, kind, email: null };
  next();
}

/** Sign-in checking must be ON: with it off, `requireMember` treats every caller as a member. */
const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_JWT_SECRET"];

describe("carry-over API", () => {
  const savedEnv: Record<string, string | undefined> = {};
  let server: TestServer;
  let economy: EconomyService;
  const guest = mintGuestToken();

  const call = (path: string, method: "GET" | "POST", as: string | null, kind: "member" | "guest" = "member", body?: unknown) =>
    server.request(`/api/carryover${path}`, {
      method,
      headers: as ? { "x-test-player": as, "x-test-kind": kind } : {},
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  beforeEach(async () => {
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_JWT_SECRET = "carryover-test-secret";
    economy = new EconomyService(new InMemoryEconomyRepository());
    const trust = new TrustService();
    const gateway = new RewardGateway({ economy, repository: new InMemoryRewardRepository(), risk: new RiskService(), trust });
    const service = new GuestCarryOverService({ store: new InMemoryGuestCarryOverStore({ economy }), gateway, trust });
    await economy.ensureIdentityRegistered(guest.playerId, "guest");
    await economy.ensureIdentityRegistered("api_member", "member");
    server = await startTestServer((app) => {
      app.use(actAs);
      mountRouter("/api/carryover", createCarryOverRouter(service))(app);
    });
  });

  afterEach(async () => {
    await server.close();
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it("turns away a caller with no identity", async () => {
    expect((await call("", "GET", null)).status).toBe(401);
    expect((await call("/claim", "POST", null)).status).toBe(401);
    expect((await call("/bonus", "POST", null)).status).toBe(401);
  });

  it("turns away a guest: only an account can bring coins over", async () => {
    expect((await call("/claim", "POST", guest.playerId, "guest", { guestToken: guest.token })).status).toBe(403);
  });

  it("brings the guest's coins over when the guest's own token is sent", async () => {
    const res = await call("/claim", "POST", "api_member", "member", { guestToken: guest.token });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, replay: false });
    expect(Number((await economy.getWallet(guest.playerId)).balance)).toBe(0);
  });

  it("will not move a wallet on the strength of a guest id alone", async () => {
    const res = await call("/claim", "POST", "api_member", "member", { guestId: guest.playerId, guestToken: "bg1.forged.token" });

    expect(res.body).toMatchObject({ ok: false, code: "NO_GUEST" });
    expect(Number((await economy.getWallet(guest.playerId)).balance)).toBeGreaterThan(0);
  });

  it("answers a missing body with NO_GUEST, not an error", async () => {
    const res = await call("/claim", "POST", "api_member");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: false, code: "NO_GUEST" });
  });

  it("reports nothing carried over for an account that brought no guest", async () => {
    const res = await call("", "GET", "api_member");

    expect(res.body).toMatchObject({ carriedAmount: null, bonusPending: false, bonusPaid: false });
  });

  it("shows the carried amount and a locked bonus after a claim", async () => {
    await call("/claim", "POST", "api_member", "member", { guestToken: guest.token });

    const res = await call("", "GET", "api_member");

    expect(res.body).toMatchObject({ bonusPending: true, bonusUnlocked: false, bonusPaid: false });
    expect((res.body as { carriedAmount: number }).carriedAmount).toBeGreaterThan(0);
  });

  it("keeps the bonus locked until a real match has been played", async () => {
    await call("/claim", "POST", "api_member", "member", { guestToken: guest.token });

    const res = await call("/bonus", "POST", "api_member");

    expect(res.body).toMatchObject({ ok: false, code: "NEEDS_MATCH" });
  });
});
