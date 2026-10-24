import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "@shared/types.js";
import { buildDoubleDeck } from "../../deck.js";
import { findDeclaration } from "../../rummyStrategy.js";
import { solveArrangement } from "../arrangement.js";
import { ALL_SIGS, DECK_SIZE, JOKER_SIG, probeCard, sigOf } from "../cards.js";
import { cardsNeeded } from "../distance.js";
import { connectingSigs, drawOutlook } from "../outlook.js";
import { totalUnseen, unseenCounts } from "../unseen.js";

/**
 * Card counting and the odds of improving.
 *
 * The chance of drawing a helpful card is only as good as the count of cards still in play, and the list of
 * helpful cards is only as good as its agreement with the engine's own win check, so both are pinned here.
 */

let seq = 0;
const card = (spec: string): Card => {
  const rank = spec.slice(0, -1) as Rank;
  const suit = spec.slice(-1) as Suit;
  return { id: `t${++seq}_${spec}`, rank, suit };
};
const joker = (): Card => ({ id: `pj${++seq}`, rank: "A", suit: "S", isPrintedJoker: true });
const cards = (spec: string): Card[] => spec.split(" ").map((s) => (s === "JK" ? joker() : card(s)));

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
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const SUITS: Suit[] = ["S", "H", "D", "C"];

const known = (hand: Card[], extra: Partial<{ openPile: Card[]; cutCard: Card; heldByOpponents: Card[] }> = {}) => ({
  hand,
  openPile: extra.openPile ?? [],
  cutCard: extra.cutCard ?? card("2D"),
  heldByOpponents: extra.heldByOpponents ?? [],
});

describe("unseenCounts", () => {
  it("starts from the whole double deck and removes the hand, the open pile and the cut card", () => {
    const hand = cards("4S 5S 6S 7H 8H 9H 2D 2C 2H KD KC KS 9D");
    const counts = unseenCounts(known(hand, { openPile: [card("5S")], cutCard: card("3C") }));

    expect(totalUnseen(counts)).toBe(DECK_SIZE - 13 - 1 - 1);
    expect(counts.get("S5")).toBe(0); // one in hand, one in the open pile
    expect(counts.get("S4")).toBe(1);
    expect(counts.get("C3")).toBe(1); // the cut card
    expect(counts.get(JOKER_SIG)).toBe(4);
  });

  it("takes out cards an opponent was seen to pick up, and never goes below zero", () => {
    const hand = cards("4S 4S 4S");
    const counts = unseenCounts(known(hand, { heldByOpponents: [card("4S")] }));

    expect(counts.get("S4")).toBe(0);
  });

  it("counts a joker in hand against the four printed jokers", () => {
    const counts = unseenCounts(known([joker(), joker()]));
    expect(counts.get(JOKER_SIG)).toBe(2);
  });
});

describe("drawOutlook", () => {
  it("lists the cards that finish an open-ended pair, with their unseen copies", () => {
    // Everything is built except the two spades 5-6 waiting for a 4 or 7 to be a pure run.
    const hand = cards("5S 6S 7H 8H 9H 2D 2C 2H KD KC KS 3D 3C");
    const outlook = drawOutlook(hand, "Q", unseenCounts(known(hand)));

    expect(outlook.needed).toBeGreaterThan(0);
    const sigs = outlook.outs.map((out) => out.sig);
    expect(sigs).toEqual(expect.arrayContaining(["S4", "S7"]));
    expect(outlook.chance).toBeGreaterThan(0);
    expect(outlook.chance).toBeLessThanOrEqual(1);
  });

  it("drops a card from the outs once every copy of it has been seen", () => {
    const hand = cards("5S 6S 7H 8H 9H 2D 2C 2H KD KC KS 3D 3C");
    const base = drawOutlook(hand, "Q", unseenCounts(known(hand)));
    const sevenSpades = base.outs.find((out) => out.sig === "S7");
    expect(sevenSpades?.copies).toBe(2);

    const seen = [card("7S"), card("7S")];
    const after = drawOutlook(hand, "Q", unseenCounts(known(hand, { openPile: seen })));

    expect(after.outs.some((out) => out.sig === "S7")).toBe(false);
    expect(after.chance).toBeLessThan(base.chance);
  });

  it("says every card helps when the hand is already complete", () => {
    const hand = cards("4S 5S 6S 7H 8H 9H 2D 2C 2H KD KC KS KH");
    const outlook = drawOutlook(hand, "3", unseenCounts(known(hand)));

    expect(outlook.needed).toBe(0);
    expect(outlook.chance).toBe(1);
  });

  it("reaches the cards that complete a run through jokers", () => {
    // 4S, two jokers and the 7S make a run, though the 7S is three ranks from the 4S.
    const hand = cards("4S JK JK 9H 9D 9C KD KC KS 2D 2C 2H 5C");
    expect(connectingSigs(hand, "3")).toContain("S7");
  });

  it("agrees exactly with the engine's own win check on which single cards finish a hand", () => {
    let compared = 0;
    for (let seed = 1; seed <= 200 && compared < 30; seed++) {
      const rand = mulberry32(seed);
      const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
      const run = (): Card[] => {
        const suit = pick(SUITS);
        const start = Math.floor(rand() * (RANKS.length - 3));
        return [0, 1, 2].map((k) => card(RANKS[start + k] + suit));
      };
      const set = SUITS.slice(0, 3).map((suit) => card(pick(RANKS.slice(1, 12)) + suit));
      const hand = [...run(), ...run(), ...set, ...[0, 1, 2, 3].map(() => card(pick(RANKS) + pick(SUITS)))].slice(0, 13);
      if (rand() < 0.4) hand[Math.floor(rand() * 13)] = joker();
      const wild = pick(RANKS);
      if (cardsNeeded(hand, wild) !== 1) continue;

      compared += 1;
      const full = new Map(ALL_SIGS.map((sig) => [sig, 2]));
      const outlook = drawOutlook(hand, wild, full);
      // The engine's search is a heuristic and can miss a win (seed 31: the 5 of hearts), so it can only ever
      // under-report. Every card it accepts must be an out, and any further out must be a real win by the exact solver.
      const engineWins = ALL_SIGS.filter((sig) => findDeclaration([...hand, probeCard(sig)], wild) !== null);
      const mine = outlook.outs.map((out) => out.sig);
      for (const sig of engineWins) expect(mine, `seed ${seed}: engine accepts ${sig}`).toContain(sig);
      for (const sig of mine.filter((s) => !engineWins.includes(s))) {
        const fourteen = [...hand, probeCard(sig)];
        const exact = fourteen.some((out) => solveArrangement(fourteen.filter((c) => c.id !== out.id), wild).deadwood === 0);
        expect(exact, `seed ${seed}: ${sig} is called an out but cannot win`).toBe(true);
      }
    }
    expect(compared).toBeGreaterThan(10);
  });

  it("finds the same outs as testing every possible card, so skipping unconnected cards loses nothing", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rand = mulberry32(300 + seed);
      const deck = buildDoubleDeck();
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const hand = deck.slice(0, 13);
      const wild = RANKS[Math.floor(rand() * RANKS.length)];
      const full = new Map(ALL_SIGS.map((sig) => [sig, 2]));
      const needed = cardsNeeded(hand, wild);
      const exhaustive = ALL_SIGS.filter((sig) => cardsNeeded([...hand, probeCard(sig)], wild) < needed).sort();
      const pruned = drawOutlook(hand, wild, full).outs.map((out) => out.sig).sort();
      // Near a win the two must be identical; far from one a lone, unconnected card can still seed a new group.
      if (needed <= 4) expect(pruned, `seed ${seed}`).toEqual(exhaustive);
      else for (const sig of pruned) expect(exhaustive).toContain(sig);
    }
  });

  it("keeps the chance inside 0 to 1 and never reports an out that is not in the pool", () => {
    const hand = cards("5S 6S 7H 8H 9H 2D 2C 2H KD KC KS 3D 3C");
    const unseen = unseenCounts(known(hand));
    const outlook = drawOutlook(hand, "Q", unseen);
    for (const out of outlook.outs) expect(unseen.get(out.sig) ?? 0).toBeGreaterThan(0);
    expect(sigOf(card("5S"))).toBe("S5");
  });
});
