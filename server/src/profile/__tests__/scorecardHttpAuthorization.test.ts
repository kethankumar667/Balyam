import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { attachPlayerIdentity } from "../../auth/identity.js";
import { scorecardRouter } from "../ScorecardController.js";
import { clearVerificationCache } from "../../lib/supabaseAuth.js";
import { scorecardService } from "../ScorecardService.js";

/**
 * The scorecard endpoints were previously only tested by calling
 * ScorecardService/ProfileService directly, in-process — never through a
 * real HTTP request. That proves the SERVICE logic is correct; it cannot
 * prove requireSelfParam() is actually mounted ahead of the record handler,
 * that Express doesn't route around it, or that score-bound validation
 * fires before a value ever reaches the service. Mirrors the real HTTP
 * harness pattern from auth/__tests__/playerAuthorization.test.ts.
 */

const JWT_SECRET = "test-jwt-secret-for-hs256-signing";
const PROJECT_URL = "https://example.supabase.co";
const ALICE = "aaaaaaaa-1111-2222-3333-444444444444";
const BOB = "bbbbbbbb-1111-2222-3333-444444444444";

const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_JWT_SECRET", "SESSION_SECRET"];
let saved: Record<string, string | undefined> = {};

function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function mintToken(sub: string, opts: { exp?: number } = {}): string {
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    sub,
    email: `${sub.slice(0, 5)}@example.com`,
    aud: "authenticated",
    iss: `${PROJECT_URL}/auth/v1`,
    exp: opts.exp ?? Math.floor(Date.now() / 1000) + 3600,
  });
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

let server: TestServer;

beforeEach(async () => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
  process.env.SUPABASE_URL = PROJECT_URL;
  process.env.SESSION_SECRET = "deterministic-session-secret-for-tests";
  clearVerificationCache();

  scorecardService.deleteScorecards(ALICE);
  scorecardService.deleteScorecards(BOB);

  server = await startTestServer((app) => {
    app.use(attachPlayerIdentity);
    app.use("/api/profile", scorecardRouter);
  });
});

afterEach(async () => {
  await server.close();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  clearVerificationCache();
  scorecardService.deleteScorecards(ALICE);
  scorecardService.deleteScorecards(BOB);
});

function recordPayload(overrides: Record<string, unknown> = {}) {
  return {
    game: "2048",
    modeId: "battle",
    score: 1234,
    matchId: "solo_2048_battle_1",
    ...overrides,
  };
}

describe("scorecard record endpoint — auth boundary", () => {
  it("refuses an anonymous score submission", async () => {
    const res = await server.request(`/api/profile/${ALICE}/scorecards/record`, {
      method: "POST",
      body: JSON.stringify(recordPayload()),
    });
    expect(res.status).toBe(401);
  });

  it("refuses player A recording a score onto player B's scorecard", async () => {
    const res = await server.request(`/api/profile/${BOB}/scorecards/record`, {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify(recordPayload()),
    });
    expect(res.status).toBe(403);

    const bobArchive = scorecardService.getScorecards(BOB);
    expect(bobArchive.games["2048"]).toBeUndefined();
  });

  it("lets a player record their own score", async () => {
    const res = await server.request(`/api/profile/${ALICE}/scorecards/record`, {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify(recordPayload()),
    });
    expect(res.status).toBe(200);

    const archive = scorecardService.getScorecards(ALICE);
    expect(archive.games["2048"]?.modes.battle?.bestScore).toBe(1234);
  });
});

describe("scorecard record endpoint — score validation", () => {
  it("rejects an absurdly large score", async () => {
    const res = await server.request(`/api/profile/${ALICE}/scorecards/record`, {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify(recordPayload({ score: 999_999_999_999 })),
    });
    expect(res.status).toBe(400);

    const archive = scorecardService.getScorecards(ALICE);
    expect(archive.games["2048"]).toBeUndefined();
  });

  it("rejects a negative score", async () => {
    const res = await server.request(`/api/profile/${ALICE}/scorecards/record`, {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify(recordPayload({ score: -50 })),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a non-numeric score", async () => {
    const res = await server.request(`/api/profile/${ALICE}/scorecards/record`, {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify(recordPayload({ score: "9999; DROP TABLE" })),
    });
    expect(res.status).toBe(400);
  });
});

describe("scorecard read endpoint — deliberately public", () => {
  it("lets an anonymous caller read any player's scorecards", async () => {
    // Guarding this would be a product change wearing a fix's clothes —
    // scorecards back the public leaderboard by design (see ScorecardController.ts).
    const res = await server.request(`/api/profile/${ALICE}/scorecards`);
    expect(res.status).toBe(200);
  });
});
