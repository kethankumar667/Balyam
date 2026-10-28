import express, { type RequestHandler } from "express";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostgrestClient } from "../../persistence/postgrest.js";
import { ReferralService } from "../ReferralService.js";
import { createReferralRouter } from "../ReferralController.js";

const mocks = vi.hoisted(() => ({ mode: "jwt-secret", identity: "member" }));
vi.mock("../../lib/supabaseAuth.js", () => ({ verificationMode: () => mocks.mode }));
vi.mock("../../auth/identity.js", () => ({
  requireIdentity: ((req, res, next) => {
    if (mocks.identity === "none") { res.status(401).json({ error: "Unauthorized" }); return; }
    req.player = mocks.identity === "guest" ? { kind: "guest", playerId: "guest-one" }
      : { kind: "member", playerId: "verified-caller", email: null };
    next();
  }) satisfies RequestHandler,
}));
vi.mock("../../lib/logger.js", () => ({ logger: { error: vi.fn() } }));
let server: Server | undefined;
const code = "00000000-0000-4000-8000-000000000001";
const db = new PostgrestClient({ url: "http://127.0.0.1:1", serviceKey: "test-service", timeoutMs: 1000 });
const service = new ReferralService(db, "referral-test-signing-key-with-32-characters");
async function app(connected: ReferralService | null = service) {
  const app = express();
  app.use(express.json());
  app.use("/api/referrals", createReferralRouter(connected));
  server = createServer(app).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test listener");
  return (path: string, body?: object) => fetch(`http://127.0.0.1:${address.port}/api/referrals${path}`,
    body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
}
beforeEach(() => { vi.restoreAllMocks(); mocks.mode = "jwt-secret"; mocks.identity = "member"; });
afterEach(async () => {
  if (server) { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve())); server = undefined; }
});
describe("referral HTTP boundaries", () => {
  it("refuses unavailable persistence and unverifiable local membership", async () => {
    const request = await app(null);
    expect((await request("/sync", {})).status).toBe(503);
  });
  it("does not enable referrals when auth verification is off", async () => {
    mocks.mode = "off";
    const request = await app();
    expect((await request("/sync", {})).status).toBe(503);
  });
  it("uses only the authenticated owner, ignoring caller-supplied identity and counts", async () => {
    const rpc = vi.spyOn(db, "rpc").mockResolvedValue({ qualifiedFriends: 0 });
    const request = await app();
    expect((await request("/sync", { playerId: "someone-else", qualifiedFriends: 3 })).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("referral_sync", { p_player_id: "verified-caller" });
    mocks.identity = "guest";
    expect((await request("/sync", {})).status).toBe(403);
    mocks.identity = "none";
    expect((await request("/attribute", { token: "forged" })).status).toBe(401);
    expect(rpc).toHaveBeenCalledOnce();
  });
  it("allows public explicit acceptance but forwards only verified signed timestamps to attribution", async () => {
    const rpc = vi.spyOn(db, "rpc").mockResolvedValue(true);
    const request = await app();
    mocks.identity = "none";
    expect((await request(`/invite/${code}`)).status).toBe(200);
    const response = await request("/accept", { code });
    const accepted = await response.json() as { token: string; expiresAt: number };
    expect(response.status).toBe(200);
    expect(accepted.token).toBeTypeOf("string");
    mocks.identity = "member";
    rpc.mockResolvedValue({ ok: true });
    await request("/attribute", { token: accepted.token, acceptedAt: 0, playerId: "other" });
    expect(rpc).toHaveBeenLastCalledWith("referral_attribute", expect.objectContaining({
      p_player_id: "verified-caller", p_code: code, p_expires_at: accepted.expiresAt,
      p_accepted_at: expect.any(Number),
    }));
    const forged = await request("/attribute", { token: "unsigned" });
    expect(await forged.json()).toEqual({ ok: false, code: "EXPIRED_INVITE" });
  });
  it("checks a typed code publicly, normalised, answering yes or no and nothing about whose it is", async () => {
    const rpc = vi.spyOn(db, "rpc").mockResolvedValue(true);
    const request = await app();
    mocks.identity = "none";
    const found = await request("/code/bhalyam%20k7m2p");
    expect(found.status).toBe(200);
    expect(await found.json()).toEqual({ valid: true });
    expect(rpc).toHaveBeenCalledWith("referral_code_valid", { p_code: "BHALYAM-K7M2P" });

    rpc.mockResolvedValue(false);
    expect((await request("/code/BHALYAM-K7M2P")).status).toBe(404);
    rpc.mockClear();
    expect((await request("/code/nonsense")).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("redeems and detaches for the verified member only, never for a caller-named player", async () => {
    const rpc = vi.spyOn(db, "rpc").mockResolvedValue({ ok: true });
    const request = await app();
    expect((await request("/redeem", { code: "bhalyam-k7m2p", playerId: "someone-else" })).status).toBe(200);
    expect(rpc).toHaveBeenLastCalledWith("referral_redeem_code", { p_player_id: "verified-caller", p_code: "BHALYAM-K7M2P" });

    rpc.mockClear();
    const garbage = await request("/redeem", { code: "not a code" });
    expect(await garbage.json()).toEqual({ ok: false, code: "INVALID_CODE" });
    expect(rpc).not.toHaveBeenCalled();

    expect((await request("/detach", { playerId: "someone-else" })).status).toBe(200);
    expect(rpc).toHaveBeenLastCalledWith("referral_detach", { p_player_id: "verified-caller" });

    mocks.identity = "guest";
    expect((await request("/redeem", { code: "BHALYAM-K7M2P" })).status).toBe(403);
    expect((await request("/detach", {})).status).toBe(403);
    mocks.identity = "none";
    expect((await request("/redeem", { code: "BHALYAM-K7M2P" })).status).toBe(401);
  });
  it("reads the overview for the verified member and refuses guests and the signed-out", async () => {
    const rpc = vi.spyOn(db, "rpc").mockResolvedValue({ shareCode: "BHALYAM-K7M2P", friends: [] });
    const request = await app();
    const response = await request("/overview");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ shareCode: "BHALYAM-K7M2P" });
    expect(rpc).toHaveBeenCalledWith("referral_overview", { p_player_id: "verified-caller" });

    mocks.identity = "guest";
    expect((await request("/overview")).status).toBe(403);
    mocks.identity = "none";
    expect((await request("/overview")).status).toBe(401);
  });
  it("surfaces database failure without returning success-shaped zero progress", async () => {
    vi.spyOn(db, "rpc").mockRejectedValue(new Error("Database unavailable"));
    const request = await app();
    const response = await request("/sync", {});
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: "Invitations could not be updated. Please try again." });
  });
});
