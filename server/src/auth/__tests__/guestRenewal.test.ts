import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GUEST_IDLE_EXPIRY_DAYS } from "@shared/guestIdentity.js";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { authRouter } from "../AuthController.js";
import { mintGuestToken, verifyGuestToken } from "../guestToken.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("guest identity expiry (7 days of inactivity)", () => {
  it("lives exactly GUEST_IDLE_EXPIRY_DAYS from the moment it is issued", () => {
    const issuedAt = Date.now();
    const { expiresAt } = mintGuestToken(undefined, issuedAt);

    expect(GUEST_IDLE_EXPIRY_DAYS).toBe(7);
    expect(expiresAt - issuedAt).toBe(GUEST_IDLE_EXPIRY_DAYS * DAY_MS);
  });

  it("is accepted on day 6 and refused on day 8 — there is no grace window", () => {
    const issuedAt = Date.now() - 6 * DAY_MS;
    const { playerId, token } = mintGuestToken(undefined, issuedAt);
    expect(verifyGuestToken(token)).toBe(playerId);

    const old = mintGuestToken(undefined, Date.now() - 8 * DAY_MS);
    expect(verifyGuestToken(old.token)).toBeNull();
  });

  describe("POST /api/auth/guest/renew", () => {
    let server: TestServer;

    beforeAll(async () => {
      server = await startTestServer(mountRouter("/api/auth", authRouter));
    });

    afterAll(async () => {
      await server.close();
    });

    it("moves the deadline forward for the SAME guest id while the token is still valid", async () => {
      const { playerId, token, expiresAt } = mintGuestToken(undefined, Date.now() - 5 * DAY_MS);

      const res = await server.request("/api/auth/guest/renew", { method: "POST", token });
      const body = res.body as { playerId: string; token: string; expiresAt: number };

      expect(res.status).toBe(200);
      expect(body.playerId).toBe(playerId);
      expect(verifyGuestToken(body.token)).toBe(playerId);
      expect(body.expiresAt).toBeGreaterThan(expiresAt);
    });

    it("refuses an expired token — inactivity past 7 days ends the identity", async () => {
      const { token } = mintGuestToken(undefined, Date.now() - 8 * DAY_MS);

      const res = await server.request("/api/auth/guest/renew", { method: "POST", token });

      expect(res.status).toBe(401);
    });

    it("answers 401 without a credential", async () => {
      const res = await server.request("/api/auth/guest/renew", { method: "POST" });

      expect(res.status).toBe(401);
    });

    it("answers 401 for a forged token and never hands back an id", async () => {
      const res = await server.request("/api/auth/guest/renew", {
        method: "POST",
        token: "bg1.eyJwaWQiOiJndWVzdF92aWN0aW0ifQ.forged",
      });

      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).not.toContain("guest_victim");
    });
  });
});
