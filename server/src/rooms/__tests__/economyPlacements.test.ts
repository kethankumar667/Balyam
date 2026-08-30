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

  describe("Rummy, 3+ seats, matchMode: single — new ranking support", () => {
    it("ranks all seats by score ascending, lower is better", () => {
      const players = playerMap(player("a"), player("b"), player("c"));
      const engine = fakeEngine({
        matchMode: "single",
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

    it("rejects as invalid when the round result is a tie at a paid position (invalid-declare scenario: opponents all score 0)", () => {
      const players = playerMap(player("a"), player("b"), player("c"), player("d"));
      const engine = fakeEngine({
        matchMode: "single",
        // Declarer "a" eats the penalty; every opponent books a clean zero —
        // exactly RummyEngine.ts's finalizeWithInvalidDeclare behavior.
        scores: { a: 80, b: 0, c: 0, d: 0 },
      });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(false);
      expect(result.reason).toContain("no deterministic ranking");
    });

    it("rejects as invalid on a tie between 3rd and 4th place (ambiguous which seat actually gets the paid 3rd position)", () => {
      const players = playerMap(player("a"), player("b"), player("c"), player("d"));
      const engine = fakeEngine({
        matchMode: "single",
        scores: { a: 0, b: 20, c: 40, d: 40 },
      });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(false);
    });

    it("accepts a tie among UNPAID positions (5th/6th) — it cannot affect any prize", () => {
      const players = playerMap(player("a"), player("b"), player("c"), player("d"), player("e"), player("f"));
      const engine = fakeEngine({
        matchMode: "single",
        scores: { a: 0, b: 20, c: 40, d: 60, e: 80, f: 80 },
      });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(true);
      expect(result.participants[0]!.identityId).toBe("identity-a");
      expect(result.participants).toHaveLength(6);
    });

    it("rejects pool101 — a pool match's real ranking is elimination order, not this round's own scores", () => {
      const players = playerMap(player("a"), player("b"), player("c"));
      const engine = fakeEngine({
        matchMode: "pool101",
        scores: { a: 0, b: 20, c: 40 },
      });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(false);
    });

    it("rejects when a seat is missing from scores entirely", () => {
      const players = playerMap(player("a"), player("b"), player("c"));
      const engine = fakeEngine({
        matchMode: "single",
        scores: { a: 0, b: 20 },
      });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(false);
    });

    it("rejects when the round has not finished (scores undefined, mirroring RummyEngine's own getPublicState)", () => {
      const players = playerMap(player("a"), player("b"), player("c"));
      const engine = fakeEngine({ matchMode: "single" });
      const result = extractRankedParticipants({ game: "rummy", players, engine });
      expect(result.isValidRanking).toBe(false);
    });

    it("still rejects when a seat has no economy-resolvable identity, even with a clean unambiguous ranking", () => {
      const players = playerMap(player("a"), player("b", { identityId: null }), player("c"));
      const engine = fakeEngine({
        matchMode: "single",
        scores: { a: 0, b: 20, c: 40 },
      });
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
      const engine = fakeEngine({
        matchMode: "single",
        scores: { a: 40, b: 0, c: 20 },
      });
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
