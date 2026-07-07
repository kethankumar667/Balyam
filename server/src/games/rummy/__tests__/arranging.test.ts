import { describe, it, expect, beforeEach } from "vitest";
import type { Card, Player, Rank, Suit } from "@shared/types.js";
import { RummyEngine } from "../RummyEngine.js";

/**
 * Regression for the post-show "arranging" window: a valid declare must NOT
 * end the round instantly. It opens a 15 s window in which the declarer is a
 * spectator, nobody can draw, and every other player rearranges their hand.
 * The round is only scored when finalizeArrangingRound() runs (fired by the
 * room manager's timer), on each player's ACTUAL arrangement.
 */

function card(suit: Suit, rank: Rank, copy = 0): Card {
  return { id: `${suit}${rank}_${copy}`, suit, rank };
}

// A valid 13-card declaration (WILD = "7"): two pure sequences (life rule met),
// a run and a set — plus a 14th card to discard on the show.
const MELDS: string[][] = [
  ["H4_0", "H5_0", "H6_0"],
  ["S9_0", "ST_0", "SJ_0", "SQ_0"],
  ["DK_0", "HK_0", "SK_0"],
  ["CA_0", "DA_0", "SA_0"],
];
const WINNER_HAND: Card[] = [
  card("H", "4"), card("H", "5"), card("H", "6"),
  card("S", "9"), card("S", "T"), card("S", "J"), card("S", "Q"),
  card("D", "K"), card("H", "K"), card("S", "K"),
  card("C", "A"), card("D", "A"), card("S", "A"),
  card("D", "2"), // discard on declare
];

// Internal shape we poke for a deterministic setup (private `s`).
type Internals = {
  s: {
    hands: Map<string, Card[]>;
    wildJoker: Card;
    turnAction: string;
    firstDrawTaken: boolean;
    turnIndex: number;
    playerOrder: string[];
  };
};

const players: Player[] = [
  { id: "A", name: "Alice", isHost: true, isReady: true, isConnected: true },
  { id: "B", name: "Bob", isHost: false, isReady: true, isConnected: true },
];

function makeReadyToDeclare(): { engine: RummyEngine; loserId: string } {
  const engine = new RummyEngine();
  engine.init(players);
  const internal = engine as unknown as Internals;
  const declarer = internal.s.playerOrder[internal.s.turnIndex];
  const loserId = internal.s.playerOrder.find((id) => id !== declarer)!;
  internal.s.wildJoker = card("C", "7");
  internal.s.hands.set(declarer, WINNER_HAND.map((c) => ({ ...c })));
  internal.s.turnAction = "discardOrDeclare";
  internal.s.firstDrawTaken = true;
  return { engine, loserId };
}

describe("RummyEngine — post-show arranging window", () => {
  let engine: RummyEngine;
  let loserId: string;
  let declarer: string;

  beforeEach(() => {
    const setup = makeReadyToDeclare();
    engine = setup.engine;
    loserId = setup.loserId;
    declarer = engine.getPublicState().turnPlayerId;
    const res = engine.applyMove({
      playerId: declarer,
      type: "declare",
      data: { discardCardId: "D2_0", melds: MELDS },
    });
    expect(res.ok).toBe(true);
  });

  it("a valid declare enters 'arranging', not 'finished'", () => {
    const pub = engine.getPublicState();
    expect(pub.phase).toBe("arranging");
    expect(pub.winnerId).toBe(declarer);
    expect(typeof pub.arrangeDeadline).toBe("number");
    expect(engine.isOver()).toBe(false);
    // Scores/hands are withheld until the round is actually scored.
    expect(pub.scores).toBeUndefined();
    expect(pub.finalMelds).toBeUndefined();
  });

  it("blocks draws/discards during the window (no deck access)", () => {
    const draw = engine.applyMove({ playerId: loserId, type: "draw", data: { from: "closed" } });
    expect(draw.ok).toBe(false);
    const declare = engine.applyMove({ playerId: loserId, type: "declare", data: { discardCardId: "x", melds: [] } });
    expect(declare.ok).toBe(false);
    expect(engine.getPublicState().phase).toBe("arranging");
  });

  it("finalizeArrangingRound scores the loser on their ACTUAL arrangement", () => {
    // Loser groups nothing → full deadwood counts. Then finalize.
    engine.setArrangement(loserId, []);
    engine.finalizeArrangingRound();
    const pub = engine.getPublicState();
    expect(pub.phase).toBe("finished");
    expect(pub.winnerId).toBe(declarer);
    expect(pub.scores?.[declarer]).toBe(0);
    expect((pub.scores?.[loserId] ?? 0)).toBeGreaterThan(0);
  });

  it("finalizeArrangingRound is idempotent once finished", () => {
    engine.finalizeArrangingRound();
    const first = engine.getPublicState().scores?.[loserId];
    engine.finalizeArrangingRound(); // no-op
    expect(engine.getPublicState().scores?.[loserId]).toBe(first);
    expect(engine.getPublicState().phase).toBe("finished");
  });
});
