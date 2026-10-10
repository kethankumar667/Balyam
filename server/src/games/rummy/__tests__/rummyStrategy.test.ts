import { describe, it, expect, vi, afterEach } from "vitest";
import type { Card, Player, Rank, Suit } from "@shared/types.js";
import { RummyEngine } from "../RummyEngine.js";
import { buildDoubleDeck } from "../deck.js";
import { findValidDeclaration, pickBestDiscard, shouldDrawFromOpen } from "../botArrange.js";
import { validateDeclare } from "../declare.js";
import { bestArrangementForScoring } from "../score.js";
import { chooseDiscard, chooseDraw, findDeclaration, handCost } from "../rummyStrategy.js";

afterEach(() => {
  vi.restoreAllMocks();
});

/** A small seeded generator, so a tournament gives the same result every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The wild rank every hand-built test uses; none of these hands contain a 2. */
const WILD: Rank = "2";

let counter = 0;
const card = (suit: Suit, rank: Rank): Card => ({ id: `${suit}${rank}_t${++counter}`, suit, rank });
const joker = (): Card => ({ id: `PJ_t${++counter}`, suit: "S", rank: "A", isPrintedJoker: true });
const cards = (spec: string): Card[] => spec.split(" ").map((s) => card(s[0] as Suit, s[1] as Rank));

describe("Rummy declaration search", () => {
  // H5-H8 would be the greedy run, but H8 belongs to the set 8-8-8, and S8 would be the greedy run S8-SJ.
  const hand = cards("H5 H6 H7 H8 S8 D8 S9 ST SJ C3 C4 C5 C6 DK");

  it("finds a winning hand the old greedy finder misses", () => {
    expect(findValidDeclaration(hand, WILD)).toBeNull();

    const found = findDeclaration(hand, WILD);

    expect(found).not.toBeNull();
    expect(found!.discardCardId).toBe(hand[13].id);
    expect(validateDeclare(found!.melds, WILD).ok).toBe(true);
  });

  it("returns null for a hand that cannot win, and for a hand of the wrong size", () => {
    const loose = cards("H5 S8 D3 CK H9 S4 D7 C4 HK SQ DJ C9 H3 S6");

    expect(findDeclaration(loose, WILD)).toBeNull();
    expect(findDeclaration(hand.slice(0, 13), WILD)).toBeNull();
  });

  it("never returns an invalid show, and never misses one the old finder found (random hands)", () => {
    const random = mulberry32(99);
    for (let trial = 0; trial < 400; trial++) {
      const deck = buildDoubleDeck().sort(() => random() - 0.5);
      const hand14 = deck.slice(0, 14);
      const wild = (["3", "4", "5", "6", "7", "8", "9"] as Rank[])[trial % 7];

      const result = findDeclaration(hand14, wild);
      const legacy = findValidDeclaration(hand14, wild);

      if (legacy) expect(result, `trial ${trial}: old finder won but new did not`).not.toBeNull();
      if (result) {
        expect(validateDeclare(result.melds, wild).ok).toBe(true);
        expect(result.melds.flat().some((c) => c.id === result.discardCardId)).toBe(false);
        expect(result.melds.flat().length + 1).toBe(14);
      }
    }
  });

  it("is quick enough to run on every bot turn", () => {
    const random = mulberry32(5);
    const started = Date.now();
    for (let trial = 0; trial < 60; trial++) {
      const deck = buildDoubleDeck().sort(() => random() - 0.5);
      findDeclaration(deck.slice(0, 14), "5");
    }

    const perHand = (Date.now() - started) / 60;
    console.info(`[rummy time] declaration search ${perHand.toFixed(1)} ms per random hand`);
    expect(perHand).toBeLessThan(150);
  });
});

describe("Rummy discard and draw", () => {
  it("never throws a joker", () => {
    const hand = [...cards("H4 H5 H6 S7 S8 S9 DK CQ H9 D3 C8 S3"), joker(), card("H", "3")];

    const id = chooseDiscard(hand, WILD);

    expect(hand.find((c) => c.id === id)?.isPrintedJoker).toBeFalsy();
  });

  it("keeps finished sequences together and throws loose weight", () => {
    const run = cards("H4 H5 H6");
    const second = cards("S7 S8 S9");
    const hand = [...run, ...second, ...cards("DK CQ C3 D8 HT")];

    const id = chooseDiscard(hand, WILD);

    expect([...run, ...second].some((c) => c.id === id)).toBe(false);
  });

  it("values a hand with a pure sequence above one without, other things equal", () => {
    const withPure = cards("H4 H5 H6 S9 DK C3 D8");
    const withoutPure = cards("H4 S5 H6 S9 DK C3 D8");

    expect(handCost(withPure, WILD)).toBeLessThan(handCost(withoutPure, WILD));
  });

  it("takes an open card that builds the hand and refuses one that does nothing", () => {
    const hand = cards("H4 H5 S9 S8 DK C3 D6 CQ HT D7 C8 SJ H3");

    expect(chooseDraw(hand, card("H", "6"), WILD)).toBe("open");
    // A diamond ace sits next to nothing and pairs with nothing here.
    expect(chooseDraw(hand, card("D", "A"), WILD)).toBe("closed");
  });

  it("always takes the wild-rank card, never a printed joker, and has nothing to take from an empty pile", () => {
    const hand = cards("H4 H5 S9 S8 DK C3 D6 CQ HT D7 C8 SA H3");

    expect(chooseDraw(hand, card("D", WILD), WILD)).toBe("open");
    expect(chooseDraw(hand, joker(), WILD)).toBe("closed");
    expect(chooseDraw(hand, null, WILD)).toBe("closed");
  });
});

const seat = (id: string): Player => ({ id, name: id, isHost: false, isReady: true, isConnected: true, isBot: true }) as unknown as Player;

interface RummyInternals {
  s: {
    phase: string;
    hands: Map<string, Card[]>;
    wildJoker: { rank: Rank };
    openPile: Card[];
    turnAction: "draw" | "discardOrDeclare";
    playerOrder: string[];
    turnIndex: number;
    winnerId: string | null;
    scores: Record<string, number>;
    firstDrawTaken: boolean;
  };
}

/** The bot as it was: the partner-count discard, the any-adjacent-card draw and the greedy declaration. Kept here as the opponent to beat. */
function legacyMove(engine: RummyEngine, id: string): void {
  const s = (engine as unknown as RummyInternals).s;
  const hand = s.hands.get(id)!;
  const wild = s.wildJoker.rank;
  if (s.turnAction === "draw") {
    const top = s.openPile.length > 0 ? s.openPile[s.openPile.length - 1] : null;
    const from = !s.firstDrawTaken && top?.isPrintedJoker ? "open" : shouldDrawFromOpen(hand, top, wild) ? "open" : "closed";
    engine.applyMove({ playerId: id, type: "draw", data: { from } });
    return;
  }
  const declaration = findValidDeclaration(hand, wild);
  if (declaration) {
    engine.applyMove({ playerId: id, type: "declare", data: { discardCardId: declaration.discardCardId, melds: declaration.melds.map((g) => g.map((c) => c.id)) } });
    return;
  }
  engine.applyMove({ playerId: id, type: "discard", data: { cardId: pickBestDiscard(hand, wild) } });
}

/** Plays one deal; returns who won it, judged on the declaration or, if nobody declared, on the cheaper hand. */
function playDeal(seed: number, newFirst: boolean): "new" | "old" | "tie" {
  vi.spyOn(Math, "random").mockImplementation(mulberry32(seed));
  const engine = new RummyEngine();
  engine.init((newFirst ? ["new", "old"] : ["old", "new"]).map(seat));
  const s = (engine as unknown as RummyInternals).s;

  for (let ply = 0; ply < 400 && s.phase === "playing"; ply++) {
    const actor = s.playerOrder[s.turnIndex];
    if (actor === "new") engine.applyAutoMove(actor);
    else legacyMove(engine, actor);
  }
  vi.restoreAllMocks();

  if (s.phase === "arranging") engine.finalizeArrangingRound();
  if (s.winnerId) return s.winnerId === "new" ? "new" : "old";

  const cost = (id: string): number => bestArrangementForScoring(s.hands.get(id)!, s.wildJoker.rank).points;
  const a = cost("new");
  const b = cost("old");
  return a < b ? "new" : b < a ? "old" : "tie";
}

describe("Rummy bot tournament: the new brain against the old one", () => {
  it("wins clearly more deals than it loses, in either seat", () => {
    const deals = 80;
    let wins = 0;
    let losses = 0;
    for (let i = 0; i < deals; i++) {
      const outcome = playDeal(31_000 + Math.floor(i / 2), i % 2 === 0);
      if (outcome === "new") wins += 1;
      else if (outcome === "old") losses += 1;
    }

    console.info(`[rummy tournament] new bot won ${wins}, old bot won ${losses}, tied ${deals - wins - losses} of ${deals} deals`);
    expect(wins).toBeGreaterThan(losses);
  }, 240_000);
});
