import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { profileRouter } from "../ProfileController.js";
import { profileService } from "../ProfileService.js";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { attachPlayerIdentity } from "../../auth/identity.js";

/**
 * GET /api/profile/:playerId/card, over a real HTTP server.
 *
 * The rate-limit test runs last on purpose: the limiter's buckets live for the
 * life of the router, keyed by caller address, so it must not starve the tests
 * that came before it.
 */

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer((app) => {
    app.use(attachPlayerIdentity);
    app.use("/api/profile", profileRouter);
  });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  profileService.reset();
});

describe("GET /api/profile/:playerId/card", () => {
  it("answers 404, and creates nothing, for an account nobody has played under", async () => {
    const res = await server.request("/api/profile/ghost-account/card");
    expect(res.status).toBe(404);
    expect(profileService.getProfile("ghost-account")).toBeUndefined();
  });

  it("serves a stranger the public card and not the account id", async () => {
    profileService.getOrCreateProfile("account-public-1", "Faisal");
    const res = await server.request("/api/profile/account-public-1/card");

    expect(res.status).toBe(200);
    const text = JSON.stringify(res.body);
    expect(text).toContain("Faisal");
    // The path names the account, so the body must not echo it back as a field.
    expect(text).not.toContain("account-public-1");
    expect(text.toLowerCase()).not.toMatch(/wallet|balance|achievement|matchhistory/);
  });

  it("returns an all-games card, since a route has no game in context", async () => {
    profileService.getOrCreateProfile("account-public-2", "Ravi");
    const res = await server.request("/api/profile/account-public-2/card");
    const body = res.body as { card: { statsScope: string | null } };
    expect(body.card.statsScope).toBeNull();
  });

  it("limits a caller that hammers it, with a Retry-After hint", async () => {
    profileService.getOrCreateProfile("account-public-3", "Asha");
    const statuses: number[] = [];
    let retryAfter: string | null = null;
    for (let i = 0; i < 16; i++) {
      const res = await server.request("/api/profile/account-public-3/card");
      statuses.push(res.status);
      if (res.status === 429) retryAfter = res.headers.get("Retry-After");
    }
    expect(statuses).toContain(429);
    expect(statuses[0]).toBe(200);
    expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);
  });
});
