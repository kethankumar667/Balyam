import { describe, it, expect, beforeEach, vi } from "vitest";
import { FriendshipHistoryService, friendshipHistoryService } from "../FriendshipHistoryService.js";
import { friendRequestsService } from "../FriendRequestsService.js";
import { orderedPair } from "../friendshipMath.js";
import type { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { freshSocialState } from "./socialTestKit.js";

const A = "acct-aaa";
const B = "acct-bbb";
const C = "acct-ccc";

const T0 = Date.UTC(2026, 2, 10, 10, 0, 0);
const DAY = 86_400_000;

const human = (identityId: string) => ({ identityId });

function matchOf(id: string, players: string[], over: Record<string, unknown> = {}) {
  return {
    matchId: id,
    playedAt: T0,
    participants: players.map(human),
    winnerIdentityIds: [] as string[],
    ...over,
  };
}

describe("WP5 — FriendshipHistoryService", () => {
  let repo: InMemoryProgressionRepository;
  let service: FriendshipHistoryService;

  const pairOf = async (x: string, y: string) => {
    const { low, high } = orderedPair(x, y);
    return repo.getFriendshipPair(low, high);
  };
  const milestonesOf = async (x: string, y: string) => {
    const { low, high } = orderedPair(x, y);
    return (await repo.listFriendshipMilestones(low, high)).map((m) => m.kind);
  };

  beforeEach(() => {
    repo = freshSocialState();
    service = new FriendshipHistoryService();
  });

  describe("who is counted", () => {
    it("counts a match for every pair of humans at the table", async () => {
      const outcome = await service.recordMatch(matchOf("m1", [A, B, C]));

      expect(outcome).toEqual({ counted: true, pairs: 3 });
      for (const [x, y] of [[A, B], [A, C], [B, C]]) {
        expect((await pairOf(x, y))?.matchesTogether).toBe(1);
      }
    });

    it("records pairs for players who are not friends, so history exists if they become friends", async () => {
      await service.recordMatch(matchOf("m1", [A, B]));

      expect((await pairOf(A, B))?.matchesTogether).toBe(1);
    });

    it("ignores bots, Pass & Play seats and anyone without a verified identity", async () => {
      const outcome = await service.recordMatch({
        matchId: "m1",
        playedAt: T0,
        participants: [
          human(A),
          human(B),
          { identityId: "acct-bot", isBot: true },
          { identityId: A, isLocal: true },
          { identityId: null },
          {},
        ],
        winnerIdentityIds: [],
      });

      expect(outcome.pairs).toBe(1);
      expect(await pairOf(A, "acct-bot")).toBeNull();
    });

    it("counts nothing when fewer than two eligible players sat at the table", async () => {
      const soloWithBot = await service.recordMatch({
        matchId: "m_solo",
        playedAt: T0,
        participants: [human(A), { identityId: "acct-bot", isBot: true }],
        winnerIdentityIds: [],
      });
      const passAndPlay = await service.recordMatch({
        matchId: "m_pnp",
        playedAt: T0,
        participants: [human(A), { identityId: A, isLocal: true }],
        winnerIdentityIds: [],
      });

      expect(soloWithBot.counted).toBe(false);
      expect(passAndPlay.counted).toBe(false);
      expect(await pairOf(A, "acct-bot")).toBeNull();
    });

    it("does not pair a player with themselves when they appear twice", async () => {
      const outcome = await service.recordMatch(matchOf("m1", [A, A, B]));

      expect(outcome.pairs).toBe(1);
    });

    it("makes the players known to the store before pointing rows at them", async () => {
      await service.recordMatch(matchOf("m1", [A, B]));

      expect(await repo.getIdentity(A)).not.toBeNull();
      expect(await repo.getIdentity(B)).not.toBeNull();
    });
  });

  describe("a match counts once", () => {
    it("ignores the same match reported again", async () => {
      await service.recordMatch(matchOf("m1", [A, B]));
      const again = await service.recordMatch(matchOf("m1", [A, B]));

      expect(again.counted).toBe(false);
      expect((await pairOf(A, B))?.matchesTogether).toBe(1);
    });

    it("still ignores it after a restart, because the store remembers, not the process", async () => {
      await service.recordMatch(matchOf("m1", [A, B]));
      const afterRestart = new FriendshipHistoryService();

      const again = await afterRestart.recordMatch(matchOf("m1", [A, B]));

      expect(again.counted).toBe(false);
      expect((await pairOf(A, B))?.matchesTogether).toBe(1);
    });

    it("counts it once when it is reported twice at the same instant", async () => {
      const [first, second] = await Promise.all([
        service.recordMatch(matchOf("m1", [A, B])),
        service.recordMatch(matchOf("m1", [A, B])),
      ]);

      expect([first.counted, second.counted].filter(Boolean)).toHaveLength(1);
      expect((await pairOf(A, B))?.matchesTogether).toBe(1);
    });

    it("loses no update when two different matches finish together for the same pair", async () => {
      await Promise.all([
        service.recordMatch(matchOf("m1", [A, B])),
        service.recordMatch(matchOf("m2", [A, B])),
        service.recordMatch(matchOf("m3", [B, A])),
      ]);

      expect((await pairOf(A, B))?.matchesTogether).toBe(3);
    });

    it("treats (a, b) and (b, a) as the same pair", async () => {
      await service.recordMatch(matchOf("m1", [A, B]));
      await service.recordMatch(matchOf("m2", [B, A]));

      expect((await pairOf(A, B))?.matchesTogether).toBe(2);
    });
  });

  describe("wins, tournaments and milestones", () => {
    it("counts a win together only when BOTH were on the winning side", async () => {
      await service.recordMatch(matchOf("m1", [A, B], { winnerIdentityIds: [A, B] }));
      await service.recordMatch(matchOf("m2", [A, B], { winnerIdentityIds: [A] }));

      const pair = await pairOf(A, B);
      expect(pair?.winsTogether).toBe(1);
      expect(await milestonesOf(A, B)).toContain("FIRST_WIN");
    });

    it("never counts a win from a match that reported a single winner", async () => {
      await service.recordMatch(matchOf("m1", [A, B], { winnerIdentityIds: [A] }));

      expect((await pairOf(A, B))?.winsTogether).toBe(0);
      expect(await milestonesOf(A, B)).not.toContain("FIRST_WIN");
    });

    it("marks the first tournament together", async () => {
      await service.recordMatch(matchOf("m1", [A, B], { isTournament: true }));

      expect((await pairOf(A, B))?.tournamentsTogether).toBe(1);
      expect(await milestonesOf(A, B)).toContain("FIRST_TOURNAMENT");
    });

    it("marks the first match, with the match that reached it", async () => {
      await service.recordMatch(matchOf("m_first", [A, B]));

      const { low, high } = orderedPair(A, B);
      const [first] = await repo.listFriendshipMilestones(low, high);
      expect(first).toMatchObject({ kind: "FIRST_MATCH", matchId: "m_first", reachedAt: T0 });
    });

    it("marks the tenth match exactly once", async () => {
      for (let i = 1; i <= 12; i += 1) {
        await service.recordMatch(matchOf(`m${i}`, [A, B], { playedAt: T0 + i * 1000 }));
      }

      const kinds = await milestonesOf(A, B);
      expect(kinds.filter((k) => k === "MATCHES_10")).toHaveLength(1);
      expect(kinds).not.toContain("MATCHES_50");
    });
  });

  describe("daily streaks (IST)", () => {
    it("grows over consecutive days and lapses when a day is missed", async () => {
      await service.recordMatch(matchOf("d1", [A, B], { playedAt: T0 }));
      await service.recordMatch(matchOf("d2", [A, B], { playedAt: T0 + DAY }));
      await service.recordMatch(matchOf("d3", [A, B], { playedAt: T0 + 2 * DAY }));

      const live = await service.getHistory(A, B, T0 + 2 * DAY + 3_600_000);
      expect(live.currentStreakDays).toBe(3);

      const lapsed = await service.getHistory(A, B, T0 + 5 * DAY);
      expect(lapsed.currentStreakDays).toBe(0);
      expect(lapsed.bestStreakDays).toBe(3);
    });
  });

  describe("failure", () => {
    it("never rejects when the store fails, and keeps working afterwards", async () => {
      const claim = vi.spyOn(repo, "claimFriendshipMatch").mockRejectedValueOnce(new Error("database down"));

      const failed = await service.recordMatch(matchOf("m1", [A, B]));
      const next = await service.recordMatch(matchOf("m2", [A, B]));

      expect(failed).toEqual({ counted: false, pairs: 0 });
      expect(next.counted).toBe(true);
      expect(claim).toHaveBeenCalledTimes(2);
    });

    it("never rejects when recording friends-since fails", async () => {
      vi.spyOn(repo, "addFriendshipMilestones").mockRejectedValueOnce(new Error("database down"));

      await expect(service.recordFriendsSince(A, B)).resolves.toBeUndefined();
    });
  });

  describe("friends since", () => {
    it("is recorded when a friend request is accepted", async () => {
      const request = friendRequestsService.sendRequest(A, "A", B);

      friendRequestsService.acceptRequest(request.id, "B");
      await friendshipHistoryService.drain();

      expect(await milestonesOf(A, B)).toContain("FRIENDS_SINCE");
    });

    it("is kept once — becoming friends again does not move it", async () => {
      await service.recordFriendsSince(A, B, T0);
      await service.recordFriendsSince(B, A, T0 + 10 * DAY);

      const { low, high } = orderedPair(A, B);
      const since = (await repo.listFriendshipMilestones(low, high)).find((m) => m.kind === "FRIENDS_SINCE");
      expect(since?.reachedAt).toBe(T0);
    });
  });

  describe("getHistory", () => {
    it("reads as zeros for a pair that has never played, with no milestones", async () => {
      const history = await service.getHistory(A, B, T0);

      expect(history).toMatchObject({
        playerId: A,
        friendPlayerId: B,
        matchesPlayedTogether: 0,
        winsTogether: 0,
        tournamentsTogether: 0,
        lastPlayedAt: 0,
        currentStreakDays: 0,
        bestStreakDays: 0,
        milestones: [],
      });
      expect(history.firstPlayedAt).toBeUndefined();
    });

    it("is the same numbers from either side, with the viewer first", async () => {
      await service.recordMatch(matchOf("m1", [A, B], { winnerIdentityIds: [A, B] }));

      const fromA = await service.getHistory(A, B, T0);
      const fromB = await service.getHistory(B, A, T0);

      expect(fromA.playerId).toBe(A);
      expect(fromB.playerId).toBe(B);
      expect(fromA.matchesPlayedTogether).toBe(fromB.matchesPlayedTogether);
      expect(fromA.winsTogether).toBe(1);
      expect(fromA.firstPlayedAt).toBe(T0);
      expect(fromA.lastPlayedAt).toBe(T0);
    });

    it("lists milestones oldest first, and never returns a kind this build does not know", async () => {
      await service.recordMatch(matchOf("m1", [A, B], { winnerIdentityIds: [A, B] }));
      const { low, high } = orderedPair(A, B);
      await repo.addFriendshipMilestones([
        { playerLow: low, playerHigh: high, kind: "SOMETHING_FROM_THE_FUTURE", reachedAt: T0 + 1, matchId: null },
      ]);
      await service.recordFriendsSince(A, B, T0 - DAY);

      const { milestones } = await service.getHistory(A, B, T0);

      expect(milestones?.map((m) => m.kind)).toEqual(["FRIENDS_SINCE", "FIRST_MATCH", "FIRST_WIN"]);
    });

    it("leaves the match id off FRIENDS_SINCE", async () => {
      await service.recordFriendsSince(A, B, T0);

      const { milestones } = await service.getHistory(A, B, T0);

      expect(milestones?.[0]).toEqual({ kind: "FRIENDS_SINCE", reachedAt: T0 });
    });
  });

  describe("drain", () => {
    it("waits for queued work", async () => {
      void service.recordMatch(matchOf("m1", [A, B]));
      void service.recordMatch(matchOf("m2", [A, B]));

      await service.drain();

      expect((await pairOf(A, B))?.matchesTogether).toBe(2);
    });
  });
});
