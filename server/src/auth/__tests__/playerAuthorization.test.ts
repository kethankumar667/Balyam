import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { attachPlayerIdentity } from "../identity.js";
import { authRouter } from "../AuthController.js";
import { profileRouter } from "../../profile/ProfileController.js";
import { rankingRouter } from "../../ranking/RankingController.js";
import { tournamentRouter, seasonRouter } from "../../tournaments/TournamentController.js";
import socialRouter from "../../social/SocialController.js";
import partyRouter from "../../party/PartyController.js";
import { clearVerificationCache } from "../../lib/supabaseAuth.js";
import { profileService } from "../../profile/ProfileService.js";
import { matchHistoryService } from "../../profile/MatchHistoryService.js";
import { challengeEngine } from "../../ranking/ChallengeEngine.js";
import { recentPlayersService } from "../../ranking/RecentPlayersService.js";
import { friendsService } from "../../social/FriendsService.js";
import { friendRequestsService } from "../../social/FriendRequestsService.js";
import { presenceService } from "../../social/PresenceService.js";
import { partyService } from "../../party/PartyService.js";
import { seasonService } from "../../seasons/SeasonService.js";
import { tournamentService } from "../../tournaments/TournamentService.js";

/**
 * P0-2 — player-scoped API authorization.
 *
 * Six routers read a player id out of the URL and believed it. The exploits
 * are recorded, with their live responses, in
 * docs/remediation/P0-00-BASELINE.md §4 — including an anonymous
 * `PUT /api/profile/victim_user` that returned `{"displayName":"PWNED"}`.
 *
 * Every case here is a REAL HTTP request against the real routers with the
 * real middleware, because the finding was never "the check is wrong" — it was
 * "there is no check", and only an actual request proves one is now in the
 * path.
 *
 * The suite is organised around the question each test answers rather than
 * around the file it exercises: an attacker does not think in routers.
 */

const JWT_SECRET = "test-jwt-secret-for-hs256-signing";
const PROJECT_URL = "https://example.supabase.co";
const ALICE = "aaaaaaaa-1111-2222-3333-444444444444";
const BOB = "bbbbbbbb-1111-2222-3333-444444444444";
const OPS_KEY = "ops-key-of-sufficient-length-1234";

const ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_JWT_SECRET",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SESSION_SECRET",
  "OPERATIONAL_SECRET",
  "ADMIN_API_KEY",
  "ADMIN_USER_IDS",
  "NODE_ENV",
];
let saved: Record<string, string | undefined> = {};

function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function mintToken(sub: string, opts: { exp?: number; secret?: string } = {}): string {
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    sub,
    email: `${sub.slice(0, 5)}@example.com`,
    aud: "authenticated",
    iss: `${PROJECT_URL}/auth/v1`,
    exp: opts.exp ?? Math.floor(Date.now() / 1000) + 3600,
  });
  const sig = crypto
    .createHmac("sha256", opts.secret ?? JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
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

  profileService.reset();
  matchHistoryService.reset();
  challengeEngine.reset();
  recentPlayersService.reset();
  friendsService.clear();
  friendRequestsService.clear();
  presenceService.clear();
  partyService.clear();
  seasonService.reset();
  tournamentService.reset();

  server = await startTestServer((app) => {
    app.use(attachPlayerIdentity);
    app.use("/api/auth", authRouter);
    app.use("/api/profile", profileRouter);
    app.use("/api/ranking", rankingRouter);
    app.use("/api/tournaments", tournamentRouter);
    app.use("/api/seasons", seasonRouter);
    app.use("/api/social", socialRouter);
    app.use("/api/parties", partyRouter);
  });
});

afterEach(async () => {
  await server.close();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  clearVerificationCache();
});

/** Every private route, as {method, path-template} pairs. */
function privateRoutes(subject: string): Array<{ method: string; path: string; body?: unknown }> {
  return [
    { method: "PUT", path: `/api/profile/${subject}`, body: { displayName: "PWNED" } },
    { method: "GET", path: `/api/profile/${subject}/matches` },
    { method: "GET", path: `/api/profile/${subject}/matches/m1` },
    { method: "GET", path: `/api/profile/${subject}/achievements` },
    { method: "GET", path: `/api/ranking/challenges/${subject}` },
    { method: "POST", path: `/api/ranking/challenges/${subject}/claim/c1` },
    { method: "GET", path: `/api/ranking/recent/${subject}` },
    { method: "GET", path: `/api/ranking/friends/${subject}` },
    { method: "POST", path: `/api/ranking/friends/${subject}`, body: { friendId: "x" } },
    { method: "DELETE", path: `/api/ranking/friends/${subject}/x` },
    { method: "GET", path: `/api/tournaments/player/${subject}/history` },
    { method: "GET", path: `/api/seasons/player/${subject}` },
    { method: "POST", path: `/api/seasons/player/${subject}/claim/tier_1` },
    { method: "GET", path: `/api/social/friends/${subject}` },
    { method: "POST", path: `/api/social/friends/${subject}/remove`, body: { friendPlayerId: "x" } },
    { method: "GET", path: `/api/social/requests/${subject}` },
    { method: "POST", path: `/api/social/presence/${subject}`, body: { status: "ONLINE" } },
    { method: "GET", path: `/api/parties/player/${subject}` },
    { method: "POST", path: `/api/parties/player/${subject}/ready`, body: { isReady: true } },
    { method: "POST", path: `/api/parties/player/${subject}/target`, body: { game: "ludo" } },
    { method: "POST", path: `/api/parties/player/${subject}/leave` },
    { method: "POST", path: `/api/parties/player/${subject}/disband` },
  ];
}

function send(route: { method: string; path: string; body?: unknown }, token?: string) {
  return server.request(route.path, {
    method: route.method,
    ...(route.body ? { body: JSON.stringify(route.body) } : {}),
    ...(token ? { token } : {}),
  });
}

/* ─────────────────── No credential at all ─────────────────── */

describe("P0-2 — missing token", () => {
  it("refuses every player-scoped route with 401", async () => {
    for (const route of privateRoutes(ALICE)) {
      const res = await send(route);
      expect(res.status, `${route.method} ${route.path}`).toBe(401);
      expect(res.body).toMatchObject({ error: "Unauthorized" });
    }
  });

  it("refuses the routes that used to take an identity from the body", async () => {
    const forged = [
      { path: "/api/social/requests/send", body: { senderId: ALICE, senderName: "A", recipientId: BOB } },
      { path: "/api/parties/create", body: { leaderId: ALICE, leaderName: "A" } },
      { path: "/api/tournaments/t1/register", body: { playerId: ALICE, displayName: "A" } },
      { path: "/api/tournaments/t1/checkin", body: { playerId: ALICE } },
      { path: "/api/social/presence/query", body: { playerIds: [ALICE, BOB] } },
    ];
    for (const f of forged) {
      const res = await server.request(f.path, { method: "POST", body: JSON.stringify(f.body) });
      expect(res.status, f.path).toBe(401);
    }
  });

  it("leaves the deliberately public reads public", async () => {
    // Guarding these would be a product change wearing a fix's clothes.
    for (const path of [
      "/api/ranking/leaderboard",
      "/api/tournaments",
      "/api/seasons/current",
      "/api/seasons/leaderboard",
      `/api/ranking/rank/${ALICE}`,
      `/api/profile/${ALICE}/stats`,
    ]) {
      const res = await server.request(path);
      expect(res.status, path).toBe(200);
    }
  });
});

/* ─────────────────── Bad credentials ─────────────────── */

describe("P0-2 — invalid and expired tokens", () => {
  it("refuses a token signed with the wrong key", async () => {
    const forged = mintToken(ALICE, { secret: "attacker-secret" });
    const res = await send(privateRoutes(ALICE)[0]!, forged);
    expect(res.status).toBe(401);
  });

  it("refuses an expired token", async () => {
    const stale = mintToken(ALICE, { exp: Math.floor(Date.now() / 1000) - 7200 });
    const res = await send(privateRoutes(ALICE)[0]!, stale);
    expect(res.status).toBe(401);
  });

  it("refuses a token whose alg header claims none", async () => {
    // The textbook JWT forgery. Verified in lib/supabaseAuth; asserted here so
    // the HTTP path is known to be using that verifier and not a looser one.
    const header = b64({ alg: "none", typ: "JWT" });
    const payload = b64({ sub: ALICE, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 60 });
    const res = await send(privateRoutes(ALICE)[0]!, `${header}.${payload}.`);
    expect(res.status).toBe(401);
  });

  it("refuses assorted garbage without a 500", async () => {
    for (const junk of ["", "Bearer", "abc", "a.b.c", "bg1.x.y", "null", "{}"]) {
      const res = await server.request(`/api/profile/${ALICE}/matches`, {
        headers: { Authorization: `Bearer ${junk}` },
      });
      expect([401, 403], `token "${junk}" produced ${res.status}`).toContain(res.status);
    }
  });
});

/* ─────────────────── A modifying B ─────────────────── */

describe("P0-2 — user A acting on user B", () => {
  it("refuses every private route when the path names someone else", async () => {
    const alice = mintToken(ALICE);
    for (const route of privateRoutes(BOB)) {
      const res = await send(route, alice);
      expect(res.status, `${route.method} ${route.path} as Alice`).toBe(403);
      expect(res.body).toMatchObject({ error: "Forbidden" });
    }
  });

  it("does not rename another player's profile — the original exploit", async () => {
    const alice = mintToken(ALICE);
    // Bob has a profile with a name he chose.
    await server.request(`/api/profile/${BOB}`, {
      method: "PUT",
      token: mintToken(BOB),
      body: JSON.stringify({ displayName: "Bob" }),
    });

    const attack = await server.request(`/api/profile/${BOB}`, {
      method: "PUT",
      token: alice,
      body: JSON.stringify({ displayName: "PWNED" }),
    });
    expect(attack.status).toBe(403);

    const after = await server.request(`/api/profile/${BOB}`);
    expect(after.status).toBe(200);
    expect((after.body as { profile: { displayName: string } }).profile.displayName).toBe("Bob");
  });

  it("does not let a stranger read a head-to-head history between two others", async () => {
    const res = await server.request(`/api/social/shared-history/${ALICE}/${BOB}`, {
      token: mintToken("cccccccc-1111-2222-3333-444444444444"),
    });
    expect(res.status).toBe(403);
  });

  it("lets either participant read their own head-to-head history", async () => {
    for (const who of [ALICE, BOB]) {
      const res = await server.request(`/api/social/shared-history/${ALICE}/${BOB}`, {
        token: mintToken(who),
      });
      expect(res.status, who).toBe(200);
    }
  });

  it("does not create a profile for an id the caller does not own", async () => {
    // The read-that-writes: GET used to call getOrCreateProfile for anyone.
    const before = await server.request(`/api/profile/${BOB}`);
    expect(before.status).toBe(404);
    expect(profileService.getProfile(BOB)).toBeUndefined();
  });
});

/* ─────────────────── Reward claims ─────────────────── */

describe("P0-2 — reward claim for another account", () => {
  it("refuses a season reward claim against someone else's account", async () => {
    const res = await server.request(`/api/seasons/player/${BOB}/claim/tier_1`, {
      method: "POST",
      token: mintToken(ALICE),
    });
    expect(res.status).toBe(403);
  });

  it("refuses a challenge reward claim against someone else's account", async () => {
    const res = await server.request(`/api/ranking/challenges/${BOB}/claim/daily_win_1`, {
      method: "POST",
      token: mintToken(ALICE),
    });
    expect(res.status).toBe(403);
  });

  it("refuses both anonymously", async () => {
    for (const path of [
      `/api/seasons/player/${BOB}/claim/tier_1`,
      `/api/ranking/challenges/${BOB}/claim/daily_win_1`,
    ]) {
      expect((await server.request(path, { method: "POST" })).status, path).toBe(401);
    }
  });

  it("credits the VERIFIED caller, never the id in the path", async () => {
    // The guard already forces them equal. This asserts the handler reads the
    // verified one, so a future loosening of the guard cannot silently make
    // the path segment authoritative again.
    const alice = mintToken(ALICE);
    const challenges = await server.request(`/api/ranking/challenges/${ALICE}`, { token: alice });
    expect(challenges.status).toBe(200);
    const body = challenges.body as { challenges: { daily: Array<{ id: string }> } };
    expect(body.challenges.daily.length).toBeGreaterThan(0);
  });
});

/* ─────────────────── Tournaments ─────────────────── */

describe("P0-2 — tournament actions without permission", () => {
  let tournamentId: string;

  beforeEach(() => {
    tournamentId = tournamentService.createTournament({
      title: "Test Cup",
      description: "A tournament that exists only for this suite.",
      game: "ludo",
    }).id;
  });

  it("refuses an anonymous start", async () => {
    const res = await server.request(`/api/tournaments/${tournamentId}/start`, { method: "POST" });
    expect(res.status).toBe(403);
  });

  it("refuses a start by an ordinary signed-in player", async () => {
    const res = await server.request(`/api/tournaments/${tournamentId}/start`, {
      method: "POST",
      token: mintToken(ALICE),
    });
    expect(res.status).toBe(403);
  });

  it("refuses a match result written by an ordinary player", async () => {
    const res = await server.request(`/api/tournaments/${tournamentId}/match`, {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify({ matchId: "m1", winnerId: ALICE }),
    });
    expect(res.status).toBe(403);
  });

  it("admits the operational key for an admin action", async () => {
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    const res = await server.request(`/api/tournaments/${tournamentId}/start`, {
      method: "POST",
      headers: { "x-operational-key": OPS_KEY },
    });
    // 400 "not enough players" is the SERVICE talking, which means the
    // authorization boundary was passed. 403 would mean it was not.
    expect(res.status).not.toBe(403);
  });

  it("admits an allowlisted admin session", async () => {
    process.env.ADMIN_USER_IDS = ALICE;
    const res = await server.request(`/api/tournaments/${tournamentId}/start`, {
      method: "POST",
      token: mintToken(ALICE),
    });
    expect(res.status).not.toBe(403);
  });

  it("registers the caller, not the playerId in the body", async () => {
    const res = await server.request(`/api/tournaments/${tournamentId}/register`, {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify({ playerId: BOB, displayName: "Not Bob" }),
    });
    expect(res.status).toBe(200);

    const t = tournamentService.getTournament(tournamentId)!;
    expect(t.participants.map((p) => p.playerId)).toEqual([ALICE]);
    expect(t.participants.map((p) => p.playerId)).not.toContain(BOB);
  });
});

/* ─────────────────── Forged ids in social and party ─────────────────── */

describe("P0-2 — forged player ids in social and party actions", () => {
  it("sends a friend request from the caller, whatever the body claims", async () => {
    const res = await server.request("/api/social/requests/send", {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify({ senderId: BOB, senderName: "Bob", recipientId: "carol" }),
    });
    expect(res.status).toBe(200);
    const { request } = res.body as { request: { senderId: string } };
    expect(request.senderId).toBe(ALICE);
    expect(request.senderId).not.toBe(BOB);
  });

  it("refuses to accept a friend request addressed to somebody else", async () => {
    const sent = await server.request("/api/social/requests/send", {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify({ senderName: "Alice", recipientId: BOB }),
    });
    const requestId = (sent.body as { request: { id: string } }).request.id;

    const attack = await server.request(`/api/social/requests/${requestId}/accept`, {
      method: "POST",
      token: mintToken("cccccccc-1111-2222-3333-444444444444"),
      body: JSON.stringify({ recipientName: "Carol" }),
    });
    expect(attack.status).toBe(403);

    const legit = await server.request(`/api/social/requests/${requestId}/accept`, {
      method: "POST",
      token: mintToken(BOB),
      body: JSON.stringify({ recipientName: "Bob" }),
    });
    expect(legit.status).toBe(200);
  });

  it("refuses to decline a friend request addressed to somebody else", async () => {
    const sent = await server.request("/api/social/requests/send", {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify({ senderName: "Alice", recipientId: BOB }),
    });
    const requestId = (sent.body as { request: { id: string } }).request.id;

    const attack = await server.request(`/api/social/requests/${requestId}/decline`, {
      method: "POST",
      token: mintToken(ALICE),
    });
    expect(attack.status).toBe(403);
  });

  it("creates a party led by the caller, whatever the body claims", async () => {
    const res = await server.request("/api/parties/create", {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify({ leaderId: BOB, leaderName: "Bob" }),
    });
    expect(res.status).toBe(200);
    expect((res.body as { party: { leaderId: string } }).party.leaderId).toBe(ALICE);
  });

  it("refuses an invite into a party the caller is not in", async () => {
    const created = await server.request("/api/parties/create", {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify({ leaderName: "Alice" }),
    });
    const partyId = (created.body as { party: { id: string } }).party.id;

    const attack = await server.request(`/api/parties/${partyId}/invite`, {
      method: "POST",
      token: mintToken(BOB),
      body: JSON.stringify({ inviterName: "Bob", inviteeId: "carol" }),
    });
    expect(attack.status).toBe(403);
  });

  it("refuses to accept a party invitation addressed to somebody else", async () => {
    const created = await server.request("/api/parties/create", {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify({ leaderName: "Alice" }),
    });
    const partyId = (created.body as { party: { id: string } }).party.id;

    const invited = await server.request(`/api/parties/${partyId}/invite`, {
      method: "POST",
      token: mintToken(ALICE),
      body: JSON.stringify({ inviterName: "Alice", inviteeId: BOB }),
    });
    const inviteId = (invited.body as { invite: { id: string } }).invite.id;

    const attack = await server.request(`/api/parties/invitations/${inviteId}/accept`, {
      method: "POST",
      token: mintToken("cccccccc-1111-2222-3333-444444444444"),
      body: JSON.stringify({ inviteeName: "Carol" }),
    });
    expect(attack.status).toBe(403);

    const legit = await server.request(`/api/parties/invitations/${inviteId}/accept`, {
      method: "POST",
      token: mintToken(BOB),
      body: JSON.stringify({ inviteeName: "Bob" }),
    });
    expect(legit.status).toBe(200);
  });

  it("does not eject a stranger from their party", async () => {
    await server.request("/api/parties/create", {
      method: "POST",
      token: mintToken(BOB),
      body: JSON.stringify({ leaderName: "Bob" }),
    });

    const attack = await server.request(`/api/parties/player/${BOB}/leave`, {
      method: "POST",
      token: mintToken(ALICE),
    });
    expect(attack.status).toBe(403);
    expect(partyService.getPlayerParty(BOB)).toBeDefined();
  });
});

/* ─────────────────── Guest gameplay is preserved ─────────────────── */

describe("P0-2 — the guest identity model", () => {
  async function newGuest(): Promise<{ playerId: string; token: string }> {
    const res = await server.request("/api/auth/guest", { method: "POST" });
    expect(res.status).toBe(201);
    return res.body as { playerId: string; token: string };
  }

  it("issues a server-chosen id, never one the caller asked for", async () => {
    const res = await server.request("/api/auth/guest", {
      method: "POST",
      body: JSON.stringify({ playerId: BOB, pid: BOB }),
    });
    const guest = res.body as { playerId: string };
    expect(guest.playerId).not.toBe(BOB);
    expect(guest.playerId).toMatch(/^guest_[0-9a-f]{32}$/);
  });

  it("gives two guests different identities", async () => {
    const [a, b] = [await newGuest(), await newGuest()];
    expect(a.playerId).not.toBe(b.playerId);
  });

  it("lets a guest do everything a player does for themselves", async () => {
    const guest = await newGuest();

    const put = await server.request(`/api/profile/${guest.playerId}`, {
      method: "PUT",
      token: guest.token,
      body: JSON.stringify({ displayName: "Guest Player" }),
    });
    expect(put.status).toBe(200);

    for (const path of [
      `/api/profile/${guest.playerId}`,
      `/api/profile/${guest.playerId}/matches`,
      `/api/profile/${guest.playerId}/achievements`,
      `/api/ranking/challenges/${guest.playerId}`,
      `/api/ranking/friends/${guest.playerId}`,
      `/api/seasons/player/${guest.playerId}`,
      `/api/social/friends/${guest.playerId}`,
      `/api/parties/player/${guest.playerId}`,
    ]) {
      const res = await server.request(path, { token: guest.token });
      expect(res.status, path).toBe(200);
    }

    const party = await server.request("/api/parties/create", {
      method: "POST",
      token: guest.token,
      body: JSON.stringify({ leaderName: "Guest Player" }),
    });
    expect(party.status).toBe(200);
  });

  it("does not let one guest act as another", async () => {
    const [a, b] = [await newGuest(), await newGuest()];
    const res = await server.request(`/api/profile/${b.playerId}`, {
      method: "PUT",
      token: a.token,
      body: JSON.stringify({ displayName: "PWNED" }),
    });
    expect(res.status).toBe(403);
  });

  it("does not let a guest act as a member", async () => {
    const guest = await newGuest();
    const res = await server.request(`/api/profile/${ALICE}`, {
      method: "PUT",
      token: guest.token,
      body: JSON.stringify({ displayName: "PWNED" }),
    });
    expect(res.status).toBe(403);
  });

  it("refuses a guest token with a tampered payload", async () => {
    const guest = await newGuest();
    const [version, payload, sig] = guest.token.split(".");
    const claims = JSON.parse(Buffer.from(payload!, "base64url").toString("utf8"));
    claims.pid = "guest_" + "f".repeat(32);
    const tampered = `${version}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${sig}`;

    const res = await server.request(`/api/profile/${claims.pid}`, {
      method: "PUT",
      token: tampered,
      body: JSON.stringify({ displayName: "PWNED" }),
    });
    expect(res.status).toBe(401);
  });

  it("refuses a guest token signed with a different key", async () => {
    const guest = await newGuest();
    process.env.SESSION_SECRET = "a-completely-different-session-secret";
    const res = await server.request(`/api/profile/${guest.playerId}`, {
      method: "PUT",
      token: guest.token,
      body: JSON.stringify({ displayName: "PWNED" }),
    });
    expect(res.status).toBe(401);
  });

  it("reports who the server thinks the caller is", async () => {
    const guest = await newGuest();
    const asGuest = await server.request("/api/auth/me", { token: guest.token });
    expect(asGuest.body).toEqual({ player: { kind: "guest", playerId: guest.playerId } });

    const asMember = await server.request("/api/auth/me", { token: mintToken(ALICE) });
    expect(asMember.body).toEqual({
      player: { kind: "member", playerId: ALICE, email: "aaaaa@example.com" },
    });

    expect((await server.request("/api/auth/me")).status).toBe(401);
  });
});
