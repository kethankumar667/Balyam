import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "@shared/types.js";
import { buildDoubleDeck } from "../../deck.js";
import { findDeclaration } from "../../rummyStrategy.js";
import { ALL_SIGS, JOKER_SIG, RANK_INDEX, probeCard, rankOfSig, suitOfSig, type Sig } from "../cards.js";
import { cardsNeeded } from "../distance.js";

/**
 * "How many more cards do I need?" for a 13-card hand: the number of swaps before it can show.
 *
 * 0 means all 13 cards already sit in valid groups (draw anything, show). 1 means one particular kind of card
 * completes it. The measure is only worth having if it is RIGHT, so it is checked against the engine's own
 * declaration test, which is the real win condition: for every hand, "needs at most one card" must be true
 * exactly when some single drawn card lets the engine's `findDeclaration` succeed.
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

function randomHand(seed: number, size: number): { hand: Card[]; wild: Rank } {
  const rand = mulberry32(seed);
  const deck = buildDoubleDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { hand: deck.slice(0, size), wild: RANKS[Math.floor(rand() * RANKS.length)] };
}

/** A hand built from two runs and a set, then disturbed, so many of them are one or two cards from winning. */
function nearWinningHand(seed: number): { hand: Card[]; wild: Rank } {
  const rand = mulberry32(seed);
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
  const run = (): Card[] => {
    const suit = pick(SUITS);
    const start = Math.floor(rand() * (RANKS.length - 3));
    return [0, 1, 2].map((k) => card(RANKS[start + k] + suit));
  };
  const setRank = pick(RANKS.slice(1, 12));
  const set = SUITS.slice(0, 3).map((suit) => card(setRank + suit));
  const body = [...run(), ...run(), ...set];
  const spare = [0, 1, 2, 3].map(() => card(pick(RANKS) + pick(SUITS)));
  const hand = [...body, ...spare].slice(0, 13);
  // Disturb a few cards so the hand is close to, but not on, a win.
  const disturbed = Math.floor(rand() * 3);
  for (let i = 0; i < disturbed; i++) hand[Math.floor(rand() * 13)] = card(pick(RANKS) + pick(SUITS));
  if (rand() < 0.3) hand[Math.floor(rand() * 13)] = joker();
  return { hand, wild: pick(RANKS) };
}

/** Whether ONE drawn card, of any kind the deck holds, lets the engine's own check show. */
function oneCardWins(hand: Card[], wild: Rank): boolean {
  return ALL_SIGS.some((sig) => findDeclaration([...hand, probeCard(sig)], wild) !== null);
}

/** Card kinds that could matter to this hand: jokers, wild-rank cards, and anything near a held card. */
function candidateSigs(hand: Card[], wild: Rank): Sig[] {
  return ALL_SIGS.filter((sig) => {
    if (sig === JOKER_SIG || rankOfSig(sig) === wild) return true;
    return hand.some((c) => {
      if (c.isPrintedJoker) return false;
      if (rankOfSig(sig) === c.rank) return true;
      if (suitOfSig(sig) !== c.suit) return false;
      const gap = Math.abs(RANK_INDEX[rankOfSig(sig)] - RANK_INDEX[c.rank]);
      return gap <= 3 || gap >= 10; // an Ace or King end of the run
    });
  });
}

/** Two draws: the 14-card hand left after drawing twice and discarding once in between must be showable. */
function twoCardsWin(hand: Card[], wild: Rank): boolean {
  const sigs = candidateSigs(hand, wild);
  for (const thrown of hand) {
    const kept = hand.filter((c) => c.id !== thrown.id);
    for (let i = 0; i < sigs.length; i++) {
      for (let j = i; j < sigs.length; j++) {
        const final = [...kept, probeCard(sigs[i], 0), probeCard(sigs[j], 1)];
        if (findDeclaration(final, wild) !== null) return true;
      }
    }
  }
  return false;
}

describe("cardsNeeded", () => {
  it("is 0 for a hand already fully in valid groups", () => {
    const hand = cards("4S 5S 6S 7H 8H 9H 2D 2C 2H KD KC KS KH");
    expect(cardsNeeded(hand, "3")).toBe(0);
  });

  it("is 1 when a single card of some kind would complete the hand", () => {
    const hand = cards("4S 5S 6S 7H 8H 9H 2D 2C 2H KD KC KS 9D");
    expect(cardsNeeded(hand, "3")).toBe(1);
  });

  it("counts a pure sequence as a hard requirement that a joker cannot fill", () => {
    // Plenty of jokers' worth of cards, but no pure sequence yet.
    const hand = cards("4S 5S 9H TH 2D 2C 2H KD KC KS JK JK 8C");
    expect(cardsNeeded(hand, "3")).toBeGreaterThanOrEqual(1);
  });

  it("lets jokers fill every other gap", () => {
    // Pure 4-5-6 of spades, a run of 9-10 hearts with a joker, a set of twos and a set of kings with a joker.
    const hand = cards("4S 5S 6S 9H TH JK 2D 2C 2H KD KC JK 7D");
    expect(cardsNeeded(hand, "3")).toBeLessThanOrEqual(1);
  });

  it("treats a wild-rank card in its own slot as natural for the pure sequence", () => {
    const hand = cards("6H 7H 8H 2S 2D 2C 4D 5D 6D KH KS KC 9C");
    expect(cardsNeeded(hand, "8")).toBeLessThanOrEqual(1);
  });

  it("is large for a hand of scattered cards, and never negative", () => {
    const hand = cards("2S 5H 9D KC 4D 8H JS 3C 6C TH QD AS 9S");
    expect(cardsNeeded(hand, "7")).toBeGreaterThanOrEqual(5);
  });

  it("never rises when a card is added", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { hand, wild } = randomHand(seed, 13);
      const before = cardsNeeded(hand, wild);
      const sig = ALL_SIGS[seed % ALL_SIGS.length];
      expect(cardsNeeded([...hand, probeCard(sig)], wild), `seed ${seed}`).toBeLessThanOrEqual(before);
    }
  });

  it("agrees with the engine's own declaration check on whether one card is enough (random hands)", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { hand, wild } = randomHand(2000 + seed, 13);
      expect(cardsNeeded(hand, wild) <= 1, `seed ${seed}`).toBe(oneCardWins(hand, wild));
    }
  });

  it("agrees with the engine's own declaration check on hands that are close to winning", () => {
    let oneAway = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const { hand, wild } = nearWinningHand(seed);
      const expected = oneCardWins(hand, wild);
      if (expected) oneAway += 1;
      expect(cardsNeeded(hand, wild) <= 1, `near-win seed ${seed}`).toBe(expected);
    }
    // The generator has to produce real positives, or this test proves nothing.
    expect(oneAway).toBeGreaterThan(10);
  });

  it("agrees with the engine on whether TWO cards are enough", () => {
    let checked = 0;
    for (let seed = 1; seed <= 400 && checked < 8; seed++) {
      const { hand, wild } = nearWinningHand(9000 + seed);
      const needed = cardsNeeded(hand, wild);
      if (needed < 2 || needed > 3) continue; // only the interesting boundary
      checked += 1;
      expect(needed <= 2, `seed ${seed}`).toBe(twoCardsWin(hand, wild));
    }
    expect(checked).toBeGreaterThan(3);
  }, 180_000);

  it("is quick enough to evaluate hundreds of times per hint", () => {
    const start = Date.now();
    for (let seed = 1; seed <= 300; seed++) {
      const { hand, wild } = randomHand(7000 + seed, 13);
      cardsNeeded(hand, wild);
    }
    expect(Date.now() - start).toBeLessThan(3000);
  });
});
