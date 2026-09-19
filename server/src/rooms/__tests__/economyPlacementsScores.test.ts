import { describe, it, expect } from "vitest";
import { extractRankedParticipants } from "../economyPlacements.js";
import type { GameEngine } from "../../games/GameEngine.js";
import type { GameKind, Player } from "@shared/types.js";

/**
 * Tables of three or more used to be refunded in full even when the game had a
 * clear winner: only Ludo (and single-round Rummy) had a way to turn the finish
 * into an ordered ranking. Dots & Boxes and Word Building both keep an
 * authoritative `scores` map and already pick their winner as the top score, so
 * their standings can be ranked safely — with one hard rule: if ANY paid
 * placement is ambiguous (a tie the payout would have to break), the match is
 * refunded exactly as before. Never guess who is second.
 *
 * Paid places are min(seats - 1, 3): 3 seats pay 1st and 2nd, 4+ pay 1st-3rd.
 */

function seatMap(ids: string[]): Map<string, Player> {
  return new Map(
    ids.map((id) => [id, { id, name: id, isHost: false, isReady: true, isConnected: true, identityId: `member-${id}`, isGuest: false, isBot: false } as Player]),
  );
}

function engineWith(state: Record<string, unknown>): GameEngine {
  return { getPublicState: () => state } as unknown as GameEngine;
}

function rank(game: GameKind, scores: Record<string, number>, winnerId?: string | null) {
  const ids = Object.keys(scores);
  const state: Record<string, unknown> = { scores };
  if (winnerId !== undefined) state.winnerId = winnerId;
  const r = extractRankedParticipants({ game, players: seatMap(ids), engine: engineWith(state) });
  return { valid: r.isValidRanking, order: r.participants.map((p) => p.identityId.replace("member-", "")) };
}

describe.each(["dotsboxes", "wordbuilding"] as const)("score-based ranking — %s", (game) => {
  it("ranks a 3-seat table by score, highest first", () => {
    expect(rank(game, { a: 5, b: 9, c: 2 })).toEqual({ valid: true, order: ["b", "a", "c"] });
  });

  it("ranks a 4-seat table for all three paid places", () => {
    expect(rank(game, { a: 3, b: 9, c: 7, d: 5 })).toEqual({ valid: true, order: ["b", "c", "d", "a"] });
  });

  it("gives placements 1, 2, 3 in that order", () => {
    const ids = { a: 1, b: 30, c: 20, d: 10 };
    const r = extractRankedParticipants({ game, players: seatMap(Object.keys(ids)), engine: engineWith({ scores: ids }) });
    expect(r.participants.map((p) => [p.identityId, p.placement])).toEqual([
      ["member-b", 1],
      ["member-c", 2],
      ["member-d", 3],
      ["member-a", 4],
    ]);
  });

  describe("refunds instead of guessing whenever a PAID placement is ambiguous", () => {
    it("tie for first", () => {
      expect(rank(game, { a: 9, b: 9, c: 1 }).valid).toBe(false);
    });
    it("tie for second at a 3-seat table (2nd is paid)", () => {
      expect(rank(game, { a: 9, b: 5, c: 5 }).valid).toBe(false);
    });
    it("tie between the last PAID place and the first unpaid one at a 4-seat table", () => {
      expect(rank(game, { a: 9, b: 7, c: 5, d: 5 }).valid).toBe(false);
    });
    it("everyone tied", () => {
      expect(rank(game, { a: 4, b: 4, c: 4 }).valid).toBe(false);
    });
  });

  it("accepts a tie that only affects UNPAID places (5 seats pay three)", () => {
    const r = rank(game, { a: 9, b: 8, c: 7, d: 3, e: 3 });
    expect(r.valid).toBe(true);
    expect(r.order.slice(0, 3)).toEqual(["a", "b", "c"]);
    expect(r.order).toHaveLength(5);
  });

  it("refunds when a seat has no usable score", () => {
    expect(rank(game, { a: 5, b: 3, c: NaN }).valid).toBe(false);
    expect(rank(game, { a: 5, b: 3, c: Infinity }).valid).toBe(false);
    const missing = extractRankedParticipants({ game, players: seatMap(["a", "b", "c"]), engine: engineWith({ scores: { a: 5, b: 3 } }) });
    expect(missing.isValidRanking).toBe(false);
  });

  it("refunds when the state has no scores at all", () => {
    const r = extractRankedParticipants({ game, players: seatMap(["a", "b", "c"]), engine: engineWith({}) });
    expect(r.isValidRanking).toBe(false);
  });

  it("refunds if the engine's own winner disagrees with the score leader — the two must tell one story", () => {
    expect(rank(game, { a: 5, b: 9, c: 2 }, "a").valid).toBe(false);
    expect(rank(game, { a: 5, b: 9, c: 2 }, "b").valid).toBe(true);
  });

  // A player who quit keeps the score they had when they left, but the engine only crowns among those who
  // stayed. Without this rule a leaver at 5 boxes would be paid 2nd ahead of a player who played to the end on 4.
  describe("a player who LEFT mid-match", () => {
    const withLeaver = (scores: Record<string, number>, departed: string[], winnerId?: string) => {
      const state: Record<string, unknown> = { scores };
      if (winnerId !== undefined) state.winnerId = winnerId;
      return extractRankedParticipants({
        game,
        players: seatMap(Object.keys(scores)),
        engine: engineWith(state),
        departedIds: new Set(departed),
      });
    };

    it("refunds when the leaver would be paid 2nd place at a 3-seat table", () => {
      expect(withLeaver({ a: 6, l: 5, b: 4 }, ["l"], "a").isValidRanking).toBe(false);
    });
    it("refunds when the leaver would take the last PAID place at a 4-seat table", () => {
      expect(withLeaver({ a: 9, b: 7, l: 5, c: 1 }, ["l"], "a").isValidRanking).toBe(false);
    });
    it("still pays when the leaver finishes in an UNPAID place", () => {
      const r = withLeaver({ a: 9, b: 7, c: 5, l: 1 }, ["l"], "a");
      expect(r.isValidRanking).toBe(true);
      expect(r.participants.map((p) => p.identityId)).toEqual(["member-a", "member-b", "member-c", "member-l"]);
    });
    it("behaves exactly as before when nobody left", () => {
      expect(withLeaver({ a: 6, b: 5, c: 4 }, [], "a").isValidRanking).toBe(true);
    });
  });

  it("leaves 2-seat behaviour to the winner id, exactly as before", () => {
    const two = extractRankedParticipants({ game, players: seatMap(["a", "b"]), engine: engineWith({ scores: { a: 3, b: 9 }, winnerId: "a" }) });
    expect(two.participants.map((p) => p.identityId)).toEqual(["member-a", "member-b"]); // the declared winner, not the score leader
    const tie = extractRankedParticipants({ game, players: seatMap(["a", "b"]), engine: engineWith({ scores: { a: 5, b: 5 }, winnerId: null }) });
    expect(tie.isValidRanking).toBe(false);
  });

  it("does not rank a seat that cannot be paid (no resolvable identity) — same refusal as every other game", () => {
    const players = seatMap(["a", "b", "c"]);
    players.set("c", { ...players.get("c")!, identityId: undefined } as Player);
    const r = extractRankedParticipants({ game, players, engine: engineWith({ scores: { a: 5, b: 3, c: 1 } }) });
    expect(r.isValidRanking).toBe(false);
  });
});

describe("games without an authoritative score ranking are unchanged", () => {
  it.each(["uno", "snl", "bingo", "stargame", "tambola", "namesplaceanimal", "blockblast"] as const)(
    "%s at 3 seats still refunds, even if its state happens to carry scores",
    (game) => {
      expect(rank(game, { a: 5, b: 9, c: 2 }, "b").valid).toBe(false);
    },
  );
});
