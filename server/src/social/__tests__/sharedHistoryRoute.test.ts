import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { attachPlayerIdentity } from "../../auth/identity.js";
import socialRouter from "../SocialController.js";
import { blockRegistry } from "../BlockRegistry.js";
import { friendsService } from "../FriendsService.js";
import { friendshipHistoryService } from "../FriendshipHistoryService.js";
import { orderedPair } from "../friendshipMath.js";
import type { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import type { SharedHistory } from "@shared/social/Friend.js";
import { TEST_JWT_SECRET, freshSocialState, mintToken, uniquePlayerId } from "./socialTestKit.js";

const T0 = Date.UTC(2026, 2, 10, 10, 0, 0);

interface HistoryBody {
  success: boolean;
  history?: SharedHistory;
  error?: string;
}

describe("WP5 — GET /api/social/shared-history/:p1/:p2", () => {
  let server: TestServer;
  let repo: InMemoryProgressionRepository;
  const originalSecret = process.env.SUPABASE_JWT_SECRET;

  const get = (p1: string, p2: string, who?: string) =>
    server.request(`/api/social/shared-history/${p1}/${p2}`, { token: who ? mintToken(who) : undefined });

  const befriend = (x: string, y: string): void => {
    friendsService.addFriend(x, y, y);
    friendsService.addFriend(y, x, x);
  };

  const playTogether = async (x: string, y: string, matchId: string, over: { playedAt?: number; winners?: string[] } = {}) => {
    await friendshipHistoryService.recordMatch({
      matchId,
      playedAt: over.playedAt ?? T0,
      participants: [{ identityId: x }, { identityId: y }],
      winnerIdentityIds: over.winners ?? [],
    });
  };

  beforeEach(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    repo = freshSocialState();
    server = await startTestServer((app) => {
      app.use(attachPlayerIdentity);
      app.use("/api/social", socialRouter);
    });
  });

  afterEach(async () => {
    await server.close();
    if (originalSecret === undefined) delete process.env.SUPABASE_JWT_SECRET;
    else process.env.SUPABASE_JWT_SECRET = originalSecret;
  });

  describe("who may read a pair", () => {
    it("refuses an anonymous caller (401)", async () => {
      const [a, b] = [uniquePlayerId(), uniquePlayerId()];

      expect((await get(a, b)).status).toBe(401);
    });

    it("refuses a third party who is in neither seat (403)", async () => {
      const [a, b, stranger] = [uniquePlayerId(), uniquePlayerId(), uniquePlayerId()];
      befriend(a, b);
      await playTogether(a, b, "m1");

      const res = await get(a, b, stranger);

      expect(res.status).toBe(403);
      expect(JSON.stringify(res.body)).not.toContain("matchesPlayedTogether");
    });

    it("refuses one of the two players when they are NOT friends, and leaks nothing (403)", async () => {
      const [a, b] = [uniquePlayerId(), uniquePlayerId()];
      await playTogether(a, b, "m1");

      const res = await get(a, b, a);

      expect(res.status).toBe(403);
      expect((res.body as HistoryBody).history).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/matchesPlayedTogether|milestones/);
    });

    it("refuses a friend pair once they are blocked, even if a stale friendship edge is left (403)", async () => {
      const [a, b] = [uniquePlayerId(), uniquePlayerId()];
      befriend(a, b);
      await playTogether(a, b, "m1");
      blockRegistry.add(a, b);

      expect((await get(a, b, a)).status).toBe(403);
      expect((await get(a, b, b)).status).toBe(403);
    });

    it("refuses a player asking about themselves (403)", async () => {
      const a = uniquePlayerId();

      expect((await get(a, a, a)).status).toBe(403);
    });

    it("keeps the history but stops showing it after an unfriend, and shows it again on re-friending", async () => {
      const [a, b] = [uniquePlayerId(), uniquePlayerId()];
      befriend(a, b);
      await playTogether(a, b, "m1");

      friendsService.removeFriend(a, b);
      expect((await get(a, b, a)).status).toBe(403);

      befriend(a, b);
      const back = await get(a, b, a);
      expect(back.status).toBe(200);
      expect((back.body as HistoryBody).history?.matchesPlayedTogether).toBe(1);
    });
  });

  describe("what friends see", () => {
    it("shows each of them the same shared history", async () => {
      const [a, b] = [uniquePlayerId(), uniquePlayerId()];
      befriend(a, b);
      await playTogether(a, b, "m1", { winners: [a, b] });
      await playTogether(a, b, "m2", { playedAt: T0 + 3_600_000 });

      for (const who of [a, b]) {
        const res = await get(a, b, who);
        expect(res.status, who).toBe(200);
        const history = (res.body as HistoryBody).history;
        expect(history?.matchesPlayedTogether).toBe(2);
        expect(history?.winsTogether).toBe(1);
        expect(history?.firstPlayedAt).toBe(T0);
      }
    });

    it("keeps the existing fields, in the order of the URL", async () => {
      const [a, b] = [uniquePlayerId(), uniquePlayerId()];
      befriend(a, b);

      const history = ((await get(a, b, a)).body as HistoryBody).history;

      expect(history).toMatchObject({
        playerId: a,
        friendPlayerId: b,
        matchesPlayedTogether: 0,
        winsTogether: 0,
        tournamentsTogether: 0,
        lastPlayedAt: 0,
      });
    });

    it("reads as zeros, with no milestones, for friends who have never played", async () => {
      const [a, b] = [uniquePlayerId(), uniquePlayerId()];
      befriend(a, b);

      const history = ((await get(a, b, b)).body as HistoryBody).history;

      expect(history).toMatchObject({ matchesPlayedTogether: 0, currentStreakDays: 0, bestStreakDays: 0, milestones: [] });
    });

    it("includes the milestones reached, oldest first", async () => {
      const [a, b] = [uniquePlayerId(), uniquePlayerId()];
      befriend(a, b);
      await friendshipHistoryService.recordFriendsSince(a, b, T0 - 86_400_000);
      await playTogether(a, b, "m1", { winners: [a, b] });

      const history = ((await get(a, b, a)).body as HistoryBody).history;

      expect(history?.milestones?.map((m) => m.kind)).toEqual(["FRIENDS_SINCE", "FIRST_MATCH", "FIRST_WIN"]);
    });

    it("exposes only the documented fields", async () => {
      const [a, b] = [uniquePlayerId(), uniquePlayerId()];
      befriend(a, b);
      await playTogether(a, b, "m1");

      const history = ((await get(a, b, a)).body as HistoryBody).history as unknown as Record<string, unknown>;

      const allowed = new Set([
        "playerId",
        "friendPlayerId",
        "matchesPlayedTogether",
        "winsTogether",
        "tournamentsTogether",
        "lastPlayedAt",
        "firstPlayedAt",
        "currentStreakDays",
        "bestStreakDays",
        "milestones",
      ]);
      expect(Object.keys(history).filter((k) => !allowed.has(k))).toEqual([]);
    });

    it("writes nothing when read", async () => {
      const [a, b] = [uniquePlayerId(), uniquePlayerId()];
      befriend(a, b);

      await get(a, b, a);

      const { low, high } = orderedPair(a, b);
      expect(await repo.getFriendshipPair(low, high)).toBeNull();
    });
  });
});
