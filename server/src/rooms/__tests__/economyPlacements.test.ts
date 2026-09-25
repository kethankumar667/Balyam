import { describe, it, expect } from "vitest";
import type { Player } from "@shared/types.js";
import type { GameEngine } from "../../games/GameEngine.js";
import { extractRankedParticipants } from "../economyPlacements.js";

function player(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    isHost: false,
    isReady: true,
    isConnected: true,
    identityId: `identity-${id}`,
    ...overrides,
  };
}

function playerMap(...players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.id, p]));
}

/** economyPlacements.ts only ever calls `getPublicState()` on the engine. */
function fakeEngine(publicState: unknown): GameEngine {
  return { getPublicState: () => publicState } as unknown as GameEngine;
}

describe("extractRankedParticipants", () => {
  it("returns invalid with no engine", () => {
    const result = extractRankedParticipants({ game: "rummy", players: playerMap(player("a")), engine: null });
    expect(result.isValidRanking).toBe(false);
  });

  it("solo (1 seat) is trivially valid at placement 1", () => {
    const players = playerMap(player("a"));
    const result = extractRankedParticipants({ game: "rummy", players, engine: fakeEngine({}) });
    expect(result.isValidRanking).toBe(true);
    expect(result.participants).toEqual([{ identityId: "identity-a", identityKind: "member", placement: 1 }]);
  });

  describe("2 seats — winnerId/getWinner duck-type (pre-existing, unaffected by this change)", () => {
    it("names the winner 1st via getPublicState().winnerId", () => {
      const players = playerMap(player("a"), player("b"));
      const engine = fakeEngine({ winnerId: "b" });
      const result = extractRankedParticipants({ game: "rps", players, engine });
      expect(result.isValidRanking).toBe(true);
      expect(result.participants.map((p) => p.identityId)).toEqual(["identity-b", "identity-a"]);
    });
  });

  /**
   * Rummy is winner-takes-all with no platform cut (shared/rummy-economy.ts): the ONLY
   * placement that moves coins is 1st. So the ranking must name the winner and nothing
   * else may make it invalid — a tie among the losers used to force a refund, which
   * would now hand a losing player a free way out.
   */
  describe("Rummy — winner-first ranking, every mode and seat count", () => {
    it("puts the seat that made the show first; the rest follow lowest score first", () => {
      const players = playerMap(player("a"), player("b"), player("c"));
      const engine = fakeEngine({
        matchMode: "single",
        winnerId: "b",
        scores: { a: 10, b: 0, c: 25 },
      });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(true);
      expect(result.participants).toEqual([
        { identityId: "identity-b", identityKind: "member", placement: 1 },
        { identityId: "identity-a", identityKind: "member", placement: 2 },
        { identityId: "identity-c", identityKind: "member", placement: 3 },
      ]);
    });

    it("stays valid when losers tie — only 1st is paid, so who is 2nd cannot matter", () => {
      const players = playerMap(player("a"), player("b"), player("c"), player("d"));
      const engine = fakeEngine({
        matchMode: "single",
        winnerId: "a",
        scores: { a: 0, b: 40, c: 40, d: 40 },
      });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(true);
      expect(result.participants[0]).toEqual({ identityId: "identity-a", identityKind: "member", placement: 1 });
      expect(result.participants).toHaveLength(4);
    });

    it("breaks a tie among the losers the same way every time (seat order)", () => {
      const players = playerMap(player("a"), player("b"), player("c"), player("d"));
      const engine = fakeEngine({ matchMode: "single", winnerId: "c", scores: { a: 40, b: 40, c: 0, d: 40 } });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.participants.map((p) => p.identityId)).toEqual([
        "identity-c",
        "identity-a",
        "identity-b",
        "identity-d",
      ]);
    });

    it("pays a 2-seat single hand to the seat that made the show", () => {
      const players = playerMap(player("a"), player("b"));
      const engine = fakeEngine({ matchMode: "single", winnerId: "b", scores: { a: 42, b: 0 } });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(true);
      expect(result.participants[0]!.identityId).toBe("identity-b");
    });

    it("pool 101/201: the match winner is first — not the last round's winner, and at any seat count", () => {
      for (const matchMode of ["pool101", "pool201"] as const) {
        const players = playerMap(player("a"), player("b"), player("c"));
        const engine = fakeEngine({
          matchMode,
          matchOver: true,
          matchWinnerId: "c",
          winnerId: "a", // the LAST ROUND's winner is a different seat — it must not be paid
          cumulativeScores: { a: 60, b: 130, c: 90 },
        });
        const result = extractRankedParticipants({ game: "rummy", players, engine });
        expect(result.isValidRanking).toBe(true);
        expect(result.participants.map((p) => p.identityId)).toEqual(["identity-c", "identity-a", "identity-b"]);
      }
    });

    it("pool: no payout until the match is actually over", () => {
      const players = playerMap(player("a"), player("b"), player("c"));
      const engine = fakeEngine({ matchMode: "pool101", matchOver: false, matchWinnerId: null, winnerId: "a" });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(false);
    });

    it("single: no payout while the hand is still being scored (scores not published yet)", () => {
      const players = playerMap(player("a"), player("b"), player("c"));
      const engine = fakeEngine({ matchMode: "single", winnerId: "a" });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(false);
    });

    it("wrong show at a 2-seat table: the declarer loses, the other seat is paid", () => {
      const players = playerMap(player("a"), player("b"));
      const engine = fakeEngine({
        matchMode: "single",
        winnerId: null, // finalizeWithInvalidDeclare sets no round winner
        invalidDeclareBy: "a",
        scores: { a: 80, b: 0 },
      });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(true);
      expect(result.participants.map((p) => p.identityId)).toEqual(["identity-b", "identity-a"]);
    });

    it("wrong show at 3+ seats has no single winner, so it refunds rather than guessing", () => {
      const players = playerMap(player("a"), player("b"), player("c"));
      const engine = fakeEngine({
        matchMode: "single",
        winnerId: null,
        invalidDeclareBy: "a",
        scores: { a: 80, b: 0, c: 0 },
      });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(false);
      expect(result.reason).toContain("no deterministic ranking");
    });

    it("rejects a winner that is not one of the committed seats", () => {
      const players = playerMap(player("a"), player("b"), player("c"));
      const engine = fakeEngine({ matchMode: "single", winnerId: "ghost", scores: { a: 0, b: 20, c: 40 } });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(false);
    });

    it("still rejects when a seat has no economy-resolvable identity", () => {
      const players = playerMap(player("a"), player("b", { identityId: null }), player("c"));
      const engine = fakeEngine({ matchMode: "single", winnerId: "a", scores: { a: 0, b: 20, c: 40 } });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(false);
      expect(result.reason).toContain("economy-resolvable identity");
    });

    it("correctly classifies bot and guest seats in a mixed-identity ranking", () => {
      const players = playerMap(
        player("a", { isBot: true }),
        player("b", { isGuest: true }),
        player("c"),
      );
      const engine = fakeEngine({ matchMode: "single", winnerId: "b", scores: { a: 40, b: 0, c: 20 } });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(true);
      expect(result.participants).toEqual([
        { identityId: "identity-b", identityKind: "guest", placement: 1 },
        { identityId: "identity-c", identityKind: "member", placement: 2 },
        { identityId: "a", identityKind: "bot", placement: 3 },
      ]);
    });
  });

  describe("Everything else at 3+ seats — still correctly refunds, unaffected by this change", () => {
    it("UNO at 3 seats has no deterministic ranking source and stays invalid", () => {
      const players = playerMap(player("a"), player("b"), player("c"));
      const engine = fakeEngine({ winnerId: "a" });
      const result = extractRankedParticipants({ game: "uno", players, engine });
      expect(result.isValidRanking).toBe(false);
    });
  });
});
