import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "@shared/types.js";
import { buildDoubleDeck } from "../../deck.js";
import { bestArrangementForScoring } from "../../score.js";
import { findDeclaration } from "../../rummyStrategy.js";
import { solveArrangement } from "../arrangement.js";

/**
 * The advisor's foundation: the best way to group a hand, found exactly.
 *
 * The scoring code the engine already has takes the longest run per suit and stops there, which misses the
 * grouping a strong player finds at a glance (a run split in two so a set can use the middle card, a joker
 * spent on the sequence that needs it). These tests pin the exact solver against that baseline and against the
 * engine's own declaration check, which it must agree with.
 */

let seq = 0;
const card = (spec: string): Card => {
  const rank = spec.slice(0, -1) as Rank;
  const suit = spec.slice(-1) as Suit;
  return { id: `t${++seq}_${spec}`, rank, suit };
};
const joker = (): Card => ({ id: `pj${++seq}`, rank: "A", suit: "S", isPrintedJoker: true });
const cards = (spec: string): Card[] => spec.split(" ").map((s) => (s === "JK" ? joker() : card(s)));
const POINTS: Record<string, number> = { A: 10, T: 10, J: 10, Q: 10, K: 10 };
const pointsOf = (c: Card): number => POINTS[c.rank] ?? Number(c.rank);

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

function randomHand(seed: number, size: number): { hand: Card[]; wild: Rank } {
  const rand = mulberry32(seed);
  const deck = buildDoubleDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
  return { hand: deck.slice(0, size), wild: ranks[Math.floor(rand() * ranks.length)] };
}

describe("solveArrangement", () => {
  it("credits nothing without a pure sequence, however neat the rest is", () => {
    const hand = cards("5H 6H 8H 9D 9C 9S KD QC JD 2S 3C 4D AH");
    const result = solveArrangement(hand, "7");

    expect(result.hasPureSequence).toBe(false);
    expect(result.melds).toEqual([]);
    expect(result.deadwood).toBe(Math.min(80, hand.reduce((sum, c) => sum + pointsOf(c), 0)));
  });

  it("finds a pure sequence, a second sequence and a set, and leaves only the odd card", () => {
    const hand = cards("4S 5S 6S 7H 8H 9H 2D 2C 2H KD KC KS 9D");
    const result = solveArrangement(hand, "3");

    expect(result.hasPureSequence).toBe(true);
    expect(result.hasSecondSequence).toBe(true);
    expect(result.deadwood).toBe(9);
    expect(result.ungrouped.map((c) => c.rank + c.suit)).toEqual(["9D"]);
  });

  it("does not credit a set until a second sequence exists", () => {
    const hand = cards("4S 5S 6S 9H 9D 9C KD QC JD 2H 3C 8D AH");
    const result = solveArrangement(hand, "7");

    expect(result.hasPureSequence).toBe(true);
    expect(result.hasSecondSequence).toBe(false);
    expect(result.melds).toHaveLength(1);
  });

  it("spends a joker where it completes the second sequence", () => {
    const hand = cards("4S 5S 6S 9H TH JH JK 2D 2C 2H KD KC KS");
    const result = solveArrangement(hand, "3");

    expect(result.deadwood).toBe(0);
    expect(result.hasSecondSequence).toBe(true);
  });

  it("counts a wild-rank card in its own slot as natural, so it can make a sequence pure", () => {
    const hand = cards("6H 7H 8H 2S 2D 2C 4D 5D 6D KH KS KC 9C");
    const result = solveArrangement(hand, "8");

    expect(result.hasPureSequence).toBe(true);
  });

  it("treats Ace as low or high in a run", () => {
    const low = solveArrangement(cards("AS 2S 3S 5H 6H 7H 9D 9C 9S KD KC KH 4D"), "T");
    const high = solveArrangement(cards("QS KS AS 5H 6H 7H 9D 9C 9S 2D 2C 2H 4D"), "T");

    expect(low.hasPureSequence).toBe(true);
    expect(high.hasPureSequence).toBe(true);
    expect(high.deadwood).toBe(4);
  });

  it("splits a long run so the shared card can serve a set", () => {
    // 4-5-6-7 of spades is the longest run, but then 7H and 7D are stranded. Taking only 4-5-6 lets 7S join them.
    const hand = cards("4S 5S 6S 7S 7H 7D 8H 9H TH 2C 2D 2S KD");
    const exact = solveArrangement(hand, "3");
    const greedy = bestArrangementForScoring(hand, "3");

    expect(exact.deadwood).toBe(10);
    expect(greedy.points).toBeGreaterThan(exact.deadwood);
  });

  it("uses both copies of a duplicated card in two different groups", () => {
    const hand = cards("4S 5S 6S 5S 6S 7S 9H 9D 9C KD KC KH 2D");
    const result = solveArrangement(hand, "T");

    expect(result.hasPureSequence).toBe(true);
    expect(result.hasSecondSequence).toBe(true);
    expect(result.deadwood).toBe(2);
  });

  it("never does worse than the engine's own greedy scoring, over many random hands", () => {
    let strictlyBetter = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const { hand, wild } = randomHand(seed, 13);
      const exact = solveArrangement(hand, wild);
      const greedy = bestArrangementForScoring(hand, wild);
      expect(exact.deadwood, `seed ${seed}`).toBeLessThanOrEqual(greedy.points);
      if (exact.deadwood < greedy.points) strictlyBetter += 1;
    }
    // The point of the exact solver: it is sometimes strictly better, never worse.
    expect(strictlyBetter).toBeGreaterThan(0);
  });

  it("agrees with the engine's declaration check on whether a 14-card hand can show", () => {
    for (let seed = 1; seed <= 120; seed++) {
      const { hand, wild } = randomHand(1000 + seed, 14);
      const engineSays = findDeclaration(hand, wild) !== null;
      const solverSays = hand.some(
        (out) => solveArrangement(hand.filter((c) => c.id !== out.id), wild).deadwood === 0,
      );
      expect(solverSays, `seed ${seed}`).toBe(engineSays);
    }
  });

  it("agrees with the declaration check on near-winning hands too", () => {
    // Random deals almost never win, so also test hands built from melds with one card disturbed.
    const rand = mulberry32(77);
    const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q"];
    const suits: Suit[] = ["S", "H", "D", "C"];
    for (let i = 0; i < 100; i++) {
      const s1 = suits[Math.floor(rand() * 4)];
      const r1 = Math.floor(rand() * (ranks.length - 3));
      const run = [0, 1, 2].map((k) => card(ranks[r1 + k] + s1));
      const s2 = suits[Math.floor(rand() * 4)];
      const r2 = Math.floor(rand() * (ranks.length - 3));
      const run2 = [0, 1, 2].map((k) => card(ranks[r2 + k] + s2));
      const setRank = ranks[Math.floor(rand() * ranks.length)];
      const set = suits.slice(0, 3).map((s) => card(setRank + s));
      const filler = [0, 1, 2, 3].map(() => card(ranks[Math.floor(rand() * ranks.length)] + suits[Math.floor(rand() * 4)]));
      const hand = [...run, ...run2, ...set, ...filler, ...(rand() < 0.5 ? [joker()] : [card("A" + suits[Math.floor(rand() * 4)])])];
      expect(hand).toHaveLength(14);
      const wild = ranks[Math.floor(rand() * ranks.length)];
      const engineSays = findDeclaration(hand, wild) !== null;
      const solverSays = hand.some(
        (out) => solveArrangement(hand.filter((c) => c.id !== out.id), wild).deadwood === 0,
      );
      expect(solverSays, `case ${i}`).toBe(engineSays);
    }
  });

  it("is quick enough to run many times per hint", () => {
    const start = Date.now();
    for (let seed = 1; seed <= 200; seed++) {
      const { hand, wild } = randomHand(5000 + seed, 14);
      solveArrangement(hand, wild);
    }
    expect(Date.now() - start).toBeLessThan(3000);
  });
});
