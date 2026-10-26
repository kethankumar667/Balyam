import { describe, expect, it } from "vitest";
import { startReleaseFixture, type LocalFixture } from "../../../scripts/quality-gates/releaseFixture.mjs";

describe("isolated local release services", () => {
  it("uses dynamic loopback ports and real guest authentication without inheriting cloud configuration", async () => {
    const previous = process.env.SUPABASE_URL;
    const fixtures: LocalFixture[] = [];
    try {
      process.env.SUPABASE_URL = "https://must-not-be-contacted.invalid";
      fixtures.push(await startReleaseFixture(), await startReleaseFixture());
      expect(fixtures[0].url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(fixtures[0].url).not.toBe(fixtures[1].url);
      const response = await fetch(`${fixtures[0].url}/api/auth/guest`, { method: "POST" });
      expect(response.status).toBe(201);
      const guest: { playerId: string; token: string } = await response.json();
      const identity = await fetch(`${fixtures[0].url}/api/auth/me`, {
        headers: { Authorization: `Bearer ${guest.token}` },
      });
      expect(identity.status).toBe(200);
      expect(await identity.json()).toMatchObject({ player: { playerId: guest.playerId, kind: "guest" } });
      const unauthenticated = await fetch(`${fixtures[0].url}/api/auth/me`);
      expect(unauthenticated.status).toBe(401);
      const wrongService = await fetch(`${fixtures[1].url}/api/auth/me`, {
        headers: { Authorization: `Bearer ${guest.token}` },
      });
      expect(wrongService.status).toBe(401);
    } finally {
      if (previous === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = previous;
      await Promise.all(fixtures.map((fixture) => fixture.close()));
    }
    await expect(fetch(`${fixtures[0].url}/health`)).rejects.toThrow();
  }, 45000);

  it("starts paid-mode with isolated member wallets and verifiable local JWTs", async () => {
    const fixture = await startReleaseFixture({ paid: true });
    try {
      const response = await fetch(`${fixture.url}/api/auth/me`, {
        headers: { Authorization: `Bearer ${fixture.tokens[0]}` },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ player: { kind: "member" } });
      const economy = await fetch(`${fixture.url}/fixture/economy`);
      expect(await economy.json()).toMatchObject({
        wallets: [{ balance: "10000000" }, { balance: "10000000" }],
      });
    } finally {
      await fixture.close();
    }
  }, 30000);
});
