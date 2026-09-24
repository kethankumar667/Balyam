import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { attachPlayerIdentity } from "../../auth/identity.js";
import socialRouter from "../SocialController.js";
import blockRouter from "../BlockController.js";
import partyRouter from "../../party/PartyController.js";
import { rankingRouter } from "../../ranking/RankingController.js";
import { blockRegistry } from "../BlockRegistry.js";
import { friendsService } from "../FriendsService.js";
import { friendRequestsService } from "../FriendRequestsService.js";
import { partyService } from "../../party/PartyService.js";
import { profileService } from "../../profile/ProfileService.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import type { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { UNABLE_TO_INVITE, UNABLE_TO_SEND_REQUEST } from "../refusals.js";
import { REPORT_REASONS } from "@shared/social/Report.js";
import {
  TEST_JWT_SECRET,
  freshSocialState,
  mintToken,
  seedIdentity,
  uniquePlayerId,
} from "./socialTestKit.js";

interface Body {
  success?: boolean;
  error?: string;
  blocked?: Array<{ playerId: string; displayName: string }>;
  alreadyBlocked?: boolean;
  removed?: boolean;
}

describe("WP1 — block & report routes", () => {
  let server: TestServer;
  let repo: InMemoryProgressionRepository;
  const originalSecret = process.env.SUPABASE_JWT_SECRET;

  const send = (method: string, path: string, who?: string, body?: unknown) =>
    server.request(path, {
      method,
      token: who ? mintToken(who) : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  /** A player the server already knows, ready to be blocked or reported. */
  const knownPlayer = async (): Promise<string> => {
    const id = uniquePlayerId();
    await seedIdentity(repo, id);
    return id;
  };

  beforeEach(async () => {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    repo = freshSocialState();
    server = await startTestServer((app) => {
      app.use(attachPlayerIdentity);
      app.use("/api/social", socialRouter);
      app.use("/api/social", blockRouter);
      app.use("/api/ranking", rankingRouter);
      app.use("/api/parties", partyRouter);
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await server.close();
    if (originalSecret === undefined) delete process.env.SUPABASE_JWT_SECRET;
    else process.env.SUPABASE_JWT_SECRET = originalSecret;
  });

  describe("access control", () => {
    it("rejects every route for an anonymous caller (401)", async () => {
      const someone = uniquePlayerId();
      expect((await send("POST", "/api/social/blocks", undefined, { targetId: someone })).status).toBe(401);
      expect((await send("DELETE", `/api/social/blocks/${someone}`)).status).toBe(401);
      expect((await send("GET", `/api/social/blocks/${someone}`)).status).toBe(401);
      expect(
        (await send("POST", "/api/social/reports", undefined, { targetId: someone, reason: "SPAM" })).status,
      ).toBe(401);
    });

    it("never shows one player's block list to another (403)", async () => {
      const me = uniquePlayerId();
      const target = await knownPlayer();
      const stranger = uniquePlayerId();
      await send("POST", "/api/social/blocks", me, { targetId: target });

      const res = await send("GET", `/api/social/blocks/${me}`, stranger);

      expect(res.status).toBe(403);
      expect(JSON.stringify(res.body)).not.toContain(target);
    });

    it("never shows the blocked player that they were blocked", async () => {
      const blocker = uniquePlayerId();
      const blocked = await knownPlayer();
      await send("POST", "/api/social/blocks", blocker, { targetId: blocked });

      const theirOwnList = await send("GET", `/api/social/blocks/${blocked}`, blocked);
      const peekAtBlocker = await send("GET", `/api/social/blocks/${blocker}`, blocked);

      expect((theirOwnList.body as Body).blocked).toEqual([]);
      expect(peekAtBlocker.status).toBe(403);
    });
  });

  describe("POST /blocks", () => {
    it("blocks, lists the player with the server's copy of their name, and is idempotent", async () => {
      const me = uniquePlayerId();
      const target = await knownPlayer();
      profileService.getOrCreateProfile(target, "Target Name");

      const first = await send("POST", "/api/social/blocks", me, { targetId: target });
      const second = await send("POST", "/api/social/blocks", me, { targetId: target });
      const list = await send("GET", `/api/social/blocks/${me}`, me);

      expect(first.status).toBe(200);
      expect((first.body as Body).alreadyBlocked).toBe(false);
      expect((second.body as Body).alreadyBlocked).toBe(true);
      expect((list.body as Body).blocked).toHaveLength(1);
      expect((list.body as Body).blocked?.[0]).toMatchObject({ playerId: target, displayName: "Target Name" });
    });

    it("ignores an actor id in the body — the caller is always the blocker", async () => {
      const me = uniquePlayerId();
      const victim = uniquePlayerId();
      const target = await knownPlayer();

      const res = await send("POST", "/api/social/blocks", me, { blockerId: victim, targetId: target });

      expect(res.status).toBe(200);
      expect(blockRegistry.hasBlocked(me, target)).toBe(true);
      expect(blockRegistry.hasBlocked(victim, target)).toBe(false);
    });

    it.each([
      ["no body", {}],
      ["a number", { targetId: 12345 }],
      ["an empty string", { targetId: "" }],
      ["a 200-character id", { targetId: "x".repeat(200) }],
      ["a path-like id", { targetId: "../../evil" }],
      ["an id with a space", { targetId: "player one" }],
    ])("rejects %s (400) and records nothing", async (_label, body) => {
      const me = uniquePlayerId();

      const res = await send("POST", "/api/social/blocks", me, body);

      expect(res.status).toBe(400);
      expect(blockRegistry.countFor(me)).toBe(0);
    });

    it("answers 'yourself' and 'nobody by that id' with the same generic refusal", async () => {
      const me = uniquePlayerId();
      await seedIdentity(repo, me);

      const self = await send("POST", "/api/social/blocks", me, { targetId: me });
      const unknown = await send("POST", "/api/social/blocks", me, { targetId: uniquePlayerId() });

      expect(self.status).toBe(400);
      expect(unknown.status).toBe(400);
      expect(unknown.body).toEqual(self.body);
      expect(blockRegistry.countFor(me)).toBe(0);
    });

    it("does not create identity rows for ids it does not know", async () => {
      const me = uniquePlayerId();
      const stranger = uniquePlayerId();

      await send("POST", "/api/social/blocks", me, { targetId: stranger });
      await progressionSync.drain();

      expect(await repo.getIdentity(stranger)).toBeNull();
    });

    it("also ends a friendship and hides pending requests", async () => {
      const me = uniquePlayerId();
      const target = await knownPlayer();
      friendsService.addFriend(me, target, "T");
      friendsService.addFriend(target, me, "Me");

      await send("POST", "/api/social/blocks", me, { targetId: target });
      const friends = await send("GET", `/api/social/friends/${me}`, me);

      expect((friends.body as { friends: unknown[] }).friends).toEqual([]);
    });

    it("stops at 30 blocks an hour, shares the bucket with unblocking, and recovers", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const me = uniquePlayerId();
      const targets: string[] = [];
      for (let i = 0; i < 31; i++) targets.push(await knownPlayer());

      for (let i = 0; i < 30; i++) {
        expect((await send("POST", "/api/social/blocks", me, { targetId: targets[i] })).status).toBe(200);
      }
      const over = await send("POST", "/api/social/blocks", me, { targetId: targets[30] });
      const unblockOver = await send("DELETE", `/api/social/blocks/${targets[0]}`, me);

      expect(over.status).toBe(429);
      expect(over.headers.get("Retry-After")).toBeTruthy();
      expect(unblockOver.status).toBe(429);

      vi.setSystemTime(Date.now() + 61 * 60 * 1000);
      expect((await send("POST", "/api/social/blocks", me, { targetId: targets[30] })).status).toBe(200);
    });
  });

  describe("DELETE /blocks/:targetId", () => {
    it("unblocks, is idempotent, and lets the other player send a request again", async () => {
      const me = uniquePlayerId();
      const target = await knownPlayer();
      await send("POST", "/api/social/blocks", me, { targetId: target });

      const first = await send("DELETE", `/api/social/blocks/${target}`, me);
      const second = await send("DELETE", `/api/social/blocks/${target}`, me);
      const requestAgain = await send("POST", "/api/social/requests/send", target, { recipientId: me });

      expect((first.body as Body).removed).toBe(true);
      expect((second.body as Body).removed).toBe(false);
      expect(requestAgain.status).toBe(200);
      expect(friendsService.isFriend(me, target)).toBe(false);
    });

    it("only lifts the caller's own block", async () => {
      const me = uniquePlayerId();
      const other = await knownPlayer();
      blockRegistry.add(other, me);

      const res = await send("DELETE", `/api/social/blocks/${other}`, me);

      expect((res.body as Body).removed).toBe(false);
      expect(blockRegistry.isBlockedEitherWay(me, other)).toBe(true);
    });

    it("rejects a malformed id (400)", async () => {
      const res = await send("DELETE", "/api/social/blocks/..%2F..%2Fevil", uniquePlayerId());
      expect(res.status).toBe(400);
    });
  });

  describe("a blocked pair is refused on every route that creates a request", () => {
    it("refuses BOTH request routes with the same status and message, in both directions", async () => {
      const blocker = uniquePlayerId();
      const blocked = await knownPlayer();
      await send("POST", "/api/social/blocks", blocker, { targetId: blocked });

      const viaSocial = await send("POST", "/api/social/requests/send", blocked, { recipientId: blocker });
      const viaRanking = await send("POST", `/api/ranking/friends/${blocked}`, blocked, { friendId: blocker });
      const blockerSends = await send("POST", "/api/social/requests/send", blocker, { recipientId: blocked });

      for (const res of [viaSocial, viaRanking, blockerSends]) {
        expect(res.status).toBe(400);
        expect((res.body as Body).error).toBe(UNABLE_TO_SEND_REQUEST);
      }
    });

    it("looks exactly like the decline cooldown, so a block cannot be told apart from it", async () => {
      const blocker = uniquePlayerId();
      const blocked = await knownPlayer();
      const declines = uniquePlayerId();
      const declined = await knownPlayer();
      const req = friendRequestsService.sendRequest(declines, "D", declined);
      friendRequestsService.declineRequest(req.id);
      await send("POST", "/api/social/blocks", blocker, { targetId: blocked });

      const cooldown = await send("POST", "/api/social/requests/send", declines, { recipientId: declined });
      const blockRefusal = await send("POST", "/api/social/requests/send", blocked, { recipientId: blocker });

      expect(blockRefusal.status).toBe(cooldown.status);
      expect(blockRefusal.body).toEqual(cooldown.body);
    });

    it("refuses a party invitation to or from a blocked player (400)", async () => {
      const blocker = uniquePlayerId();
      const blocked = await knownPlayer();
      await send("POST", "/api/social/blocks", blocker, { targetId: blocked });
      const party = partyService.createParty(blocked, "Blocked");

      const res = await send("POST", `/api/parties/${party.id}/invite`, blocked, { inviteeId: blocker });

      expect(res.status).toBe(400);
      expect((res.body as Body).error).toBe(UNABLE_TO_INVITE);
    });
  });

  describe("POST /reports", () => {
    it("stores a report for the caller and echoes nothing back", async () => {
      const me = uniquePlayerId();
      const target = await knownPlayer();

      const res = await send("POST", "/api/social/reports", me, { targetId: target, reason: "HARASSMENT" });
      await progressionSync.drain();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      const stored = await repo.listReportsBy(me);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({ reporterId: me, reportedId: target, reason: "HARASSMENT" });
      expect(stored[0].id).toMatch(/^rep_/);
    });

    it("accepts every reason in the closed list", async () => {
      const target = await knownPlayer();
      for (const reason of REPORT_REASONS) {
        const me = uniquePlayerId();
        const res = await send("POST", "/api/social/reports", me, { targetId: target, reason });
        expect(res.status).toBe(200);
      }
    });

    it.each([
      ["lower case", "harassment"],
      ["padded", " HARASSMENT"],
      ["unknown", "NOPE"],
      ["a number", 5],
      ["null", null],
      ["an object", { $ne: "" }],
    ])("rejects a reason that is %s (400), stores nothing, and does not echo it", async (_label, reason) => {
      const me = uniquePlayerId();
      const target = await knownPlayer();

      const res = await send("POST", "/api/social/reports", me, { targetId: target, reason });
      await progressionSync.drain();

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).not.toContain("NOPE");
      expect(await repo.listReportsBy(me)).toHaveLength(0);
    });

    it("ignores a reporter id in the body", async () => {
      const me = uniquePlayerId();
      const victim = uniquePlayerId();
      const target = await knownPlayer();

      await send("POST", "/api/social/reports", me, { reporterId: victim, targetId: target, reason: "SPAM" });
      await progressionSync.drain();

      expect(await repo.listReportsBy(victim)).toHaveLength(0);
      expect(await repo.listReportsBy(me)).toHaveLength(1);
    });

    it("answers 'yourself' and 'nobody by that id' with the same generic refusal", async () => {
      const me = uniquePlayerId();
      await seedIdentity(repo, me);

      const self = await send("POST", "/api/social/reports", me, { targetId: me, reason: "SPAM" });
      const unknown = await send("POST", "/api/social/reports", me, { targetId: uniquePlayerId(), reason: "SPAM" });

      expect(self.status).toBe(400);
      expect(unknown.status).toBe(400);
      expect(unknown.body).toEqual(self.body);
    });

    it("still works when the reported player has blocked the reporter", async () => {
      const me = uniquePlayerId();
      const target = await knownPlayer();
      blockRegistry.add(target, me);

      const res = await send("POST", "/api/social/reports", me, { targetId: target, reason: "HARASSMENT" });

      expect(res.status).toBe(200);
    });

    it("stops at 5 reports an hour (429)", async () => {
      const me = uniquePlayerId();
      const target = await knownPlayer();
      for (let i = 0; i < 5; i++) {
        expect((await send("POST", "/api/social/reports", me, { targetId: target, reason: "SPAM" })).status).toBe(200);
      }

      const sixth = await send("POST", "/api/social/reports", me, { targetId: target, reason: "SPAM" });

      expect(sixth.status).toBe(429);
      expect(sixth.headers.get("Retry-After")).toBeTruthy();
    });

    it("stops at roughly 20 a day even when the hourly bucket keeps refilling", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const me = uniquePlayerId();
      const target = await knownPlayer();
      const start = Date.now();
      let firstRefused = -1;

      for (let i = 0; i < 40 && firstRefused < 0; i++) {
        // 730 s apart refills the hourly bucket faster than it drains.
        vi.setSystemTime(start + i * 730_000);
        const res = await send("POST", "/api/social/reports", me, { targetId: target, reason: "SPAM" });
        if (res.status === 429) firstRefused = i;
      }

      expect(firstRefused).toBeGreaterThanOrEqual(20);
      expect(firstRefused).toBeLessThan(30);
    });
  });
});
