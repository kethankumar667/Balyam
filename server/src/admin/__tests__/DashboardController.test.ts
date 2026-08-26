import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { createDashboardRouter } from "../DashboardController.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository, matchIdFor, type ProgressionRepository } from "../../persistence/index.js";

const OPS_KEY = "test-dashboard-operational-key-0001";

describe("GET /api/admin/dashboard/summary", () => {
  let server: TestServer;
  let repo: InMemoryProgressionRepository;
  const originalSecret = process.env.OPERATIONAL_SECRET;

  beforeEach(async () => {
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    repo = new InMemoryProgressionRepository();
    setProgressionRepository(repo);
    server = await startTestServer(mountRouter("/api/admin/dashboard", createDashboardRouter()));
  });

  afterEach(async () => {
    await server.close();
    setProgressionRepository(null);
    process.env.OPERATIONAL_SECRET = originalSecret;
  });

  it("regression: an anonymous request is refused before touching the repository", async () => {
    const res = await server.request("/api/admin/dashboard/summary");
    expect(res.status).toBe(401);
  });

  it("returns real zeros and empty arrays for a genuinely empty database — not fabricated placeholders", async () => {
    const res = await server.request("/api/admin/dashboard/summary", { headers: { "x-operational-key": OPS_KEY } });
    expect(res.status).toBe(200);
    const body = res.body as {
      kpis: { totalRegisteredUsers: number; activeUsersLast24h: number; matchesCompletedToday: number };
      matchTrend: Array<{ date: string; count: number }>;
      recentMatches: unknown[];
    };
    expect(body.kpis.totalRegisteredUsers).toBe(0);
    expect(body.kpis.activeUsersLast24h).toBe(0);
    expect(body.kpis.matchesCompletedToday).toBe(0);
    expect(body.matchTrend).toHaveLength(7);
    expect(body.matchTrend.every((b) => b.count === 0)).toBe(true);
    expect(body.recentMatches).toEqual([]);
  });

  it("reflects real writes: an active guest and a finished match both show up", async () => {
    const guestId = "guest_dashboardtest0000000000000001";
    await repo.upsertIdentity({ playerId: guestId, kind: "guest", authUserId: null, lastSeenAt: Date.now() });

    const roomCode = "DASH01";
    const startedAt = Date.now() - 60_000;
    const finishedAt = Date.now();
    await repo.recordMatch({
      id: matchIdFor(roomCode, startedAt),
      roomCode,
      game: "ludo",
      startedAt,
      finishedAt,
      durationMs: 60_000,
      winnerId: guestId,
      participants: [{ playerId: guestId, displayName: "Dash Tester", isWinner: true, isBot: false }],
    });

    const res = await server.request("/api/admin/dashboard/summary", { headers: { "x-operational-key": OPS_KEY } });
    expect(res.status).toBe(200);
    const body = res.body as {
      kpis: { activeUsersLast24h: number; matchesCompletedToday: number };
      recentMatches: Array<{ roomCode: string }>;
    };
    expect(body.kpis.activeUsersLast24h).toBe(1);
    expect(body.kpis.matchesCompletedToday).toBe(1);
    expect(body.recentMatches[0]?.roomCode).toBe(roomCode);
  });

  it("regression: a repository failure is a 503 with no fabricated data, never a 200 with zeros", async () => {
    // Only the methods the handler actually calls need to exist here — the
    // others are never reached once Promise.all rejects. A full spread of
    // `repo` would silently omit its prototype methods (they're not own
    // enumerable properties), which is precisely the kind of "looks right,
    // isn't" mistake worth avoiding rather than working around.
    const failing = {
      countRegisteredMembers: async () => {
        throw new Error("simulated Supabase outage");
      },
      countActiveIdentitiesSince: async () => 0,
      countMatchesFinishedSince: async () => 0,
      matchTrend: async () => [],
      listRecentMatches: async () => [],
    } as unknown as ProgressionRepository;
    setProgressionRepository(failing);

    const res = await server.request("/api/admin/dashboard/summary", { headers: { "x-operational-key": OPS_KEY } });
    expect(res.status).toBe(503);
    const body = res.body as { error: string; kpis?: unknown };
    expect(body.error).toBeTruthy();
    // The failure response must not also carry a `kpis` block — a caller
    // checking status codes carelessly must not find something that looks
    // like real data sitting next to the error.
    expect(body.kpis).toBeUndefined();
  });

  it("includes the live progression status alongside the metrics", async () => {
    const res = await server.request("/api/admin/dashboard/summary", { headers: { "x-operational-key": OPS_KEY } });
    const body = res.body as { progression: { kind: string; durable: boolean; reachable: boolean } };
    expect(typeof body.progression.kind).toBe("string");
    expect(typeof body.progression.durable).toBe("boolean");
    expect(typeof body.progression.reachable).toBe("boolean");
  });
});
