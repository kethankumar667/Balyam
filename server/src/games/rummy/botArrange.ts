/**
 * Greedy arranger used by the bot AI. Tries to organise a hand into valid
 * melds (pure sequence + sequence/set + ...) so the bot can attempt a real
 * declaration when its hand allows. Returns null if no valid arrangement is
 * found.
 *
 * Strategy:
 *   1. For each possible discard card (14 options) — try arranging the other 13:
 *     a. Find the longest pure sequence in each suit.
 *     b. Find sets (same rank, distinct suits).
 *     c. Use remaining wild jokers for impure sequences.
 *     d. If the 13 cards all land in valid melds, declaration is ready.
 *   2. Return the first valid arrangement we find.
 *
 * Not optimal — a true exhaustive search is exponential. Good enough that bots
 * sometimes win when their hand cooperates, which is all the user asked for.
 */
import type { Card, Rank } from "@shared/types.js";
import { isPureSequence, isImpureSequence, isSet, classifyMeld } from "./melds.js";
import { validateDeclare } from "./declare.js";

const RANK_ORDER: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const RANK_INDEX: Record<Rank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i] as const),
) as Record<Rank, number>;

const RANK_POINTS: Record<Rank, number> = {
  A: 10, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  T: 10, J: 10, Q: 10, K: 10,
};

export interface BotDeclaration {
  melds: Card[][];
  discardCardId: string;
}

/**
 * Attempts to find a valid declaration arrangement for the given hand.
 * Returns null if the hand can't currently be arranged for a valid declare.
 */
export function findValidDeclaration(
  hand: Card[],
  wildJokerRank: Rank,
): BotDeclaration | null {
  if (hand.length !== 14) return null;

  // Try each card as the discard candidate, starting with the highest-point
  // cards (since keeping low-point cards is generally better if the declare
  // doesn't pan out and they continue playing).
  const orderedByPoints = hand
    .slice()
    .sort((a, b) => {
      const ap = a.isPrintedJoker || a.rank === wildJokerRank ? -1 : RANK_POINTS[a.rank];
      const bp = b.isPrintedJoker || b.rank === wildJokerRank ? -1 : RANK_POINTS[b.rank];
      return bp - ap;
    });

  for (const discard of orderedByPoints) {
    const rest = hand.filter((c) => c.id !== discard.id);
    const arrangement = greedyArrange(rest, wildJokerRank);
    if (!arrangement) continue;
    const result = validateDeclare(arrangement, wildJokerRank);
    if (result.ok) {
      return { melds: arrangement, discardCardId: discard.id };
    }
  }
  return null;
}

/**
 * Greedy meld-finding pass: returns groups that COVER all 13 cards, or null if
 * we couldn't fit every card into a valid meld.
 */
function greedyArrange(cards: Card[], wildJokerRank: Rank): Card[][] | null {
  const isWild = (c: Card) => c.isPrintedJoker || c.rank === wildJokerRank;
  const remaining = new Map(cards.map((c) => [c.id, c]));
  const groups: Card[][] = [];

  // 1. Pure sequences per suit (longest first).
  for (const suit of ["S", "H", "D", "C"] as const) {
    while (true) {
      const inSuit = [...remaining.values()].filter(
        (c) => c.suit === suit && !isWild(c),
      );
      const run = findLongestRun(inSuit);
      if (run.length < 3) break;
      if (!isPureSequence(run, wildJokerRank)) break;
      groups.push(run);
      for (const c of run) remaining.delete(c.id);
    }
  }

  // 2. Sets — same rank, distinct suits, 3+ cards.
  const byRank = new Map<Rank, Card[]>();
  for (const c of remaining.values()) {
    if (isWild(c)) continue;
    if (!byRank.has(c.rank)) byRank.set(c.rank, []);
    byRank.get(c.rank)!.push(c);
  }
  const candidateSets = [...byRank.values()]
    .map((cards) => {
      // Dedupe by suit.
      const bySuit = new Map<string, Card>();
      for (const c of cards) if (!bySuit.has(c.suit)) bySuit.set(c.suit, c);
      return [...bySuit.values()];
    })
    .filter((cards) => cards.length >= 3)
    .sort((a, b) => b.length - a.length);

  for (const candidate of candidateSets) {
    const stillAvailable = candidate.filter((c) => remaining.has(c.id));
    if (stillAvailable.length < 3) continue;
    const set = stillAvailable.slice(0, 4);
    if (isSet(set, wildJokerRank)) {
      groups.push(set);
      for (const c of set) remaining.delete(c.id);
    }
  }

  // 3. Impure sequences using jokers.
  const wildPool = [...remaining.values()].filter(isWild);
  if (wildPool.length > 0) {
    for (const suit of ["S", "H", "D", "C"] as const) {
      const inSuit = [...remaining.values()].filter(
        (c) => c.suit === suit && !isWild(c),
      );
      const pair = findNearRun(inSuit);
      if (pair && wildPool.length > 0) {
        const wild = wildPool.shift()!;
        const candidate = [...pair, wild];
        if (isImpureSequence(candidate, wildJokerRank)) {
          groups.push(candidate);
          for (const c of candidate) remaining.delete(c.id);
        } else {
          wildPool.push(wild); // put it back
        }
      }
    }
  }

  // 4. Any leftover jokers — try slotting them into sets to extend size, or
  // create a joker-only impure-sequence triplet.
  while (wildPool.length >= 1) {
    const wild = wildPool.shift()!;
    let placed = false;

    // Try extending an existing set to 4 cards.
    for (const g of groups) {
      const cls = classifyMeld(g, wildJokerRank);
      if (cls?.kind === "set" && g.length < 4) {
        const candidate = [...g, wild];
        if (isSet(candidate, wildJokerRank)) {
          g.push(wild);
          remaining.delete(wild.id);
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      // Can't usefully place this joker — leave it in remaining so the
      // arrangement fails and we try a different discard.
      remaining.set(wild.id, wild);
      break;
    }
  }

  // If anything is still ungrouped, this arrangement isn't a valid declaration.
  if (remaining.size > 0) return null;
  return groups;
}

/** Longest same-suit consecutive run (no jokers). */
function findLongestRun(cards: Card[]): Card[] {
  if (cards.length < 3) return [];
  const sorted = cards.slice().sort((a, b) => RANK_INDEX[a.rank] - RANK_INDEX[b.rank]);
  const dedup: Card[] = [];
  let lastRank = -1;
  for (const c of sorted) {
    if (RANK_INDEX[c.rank] !== lastRank) {
      dedup.push(c);
      lastRank = RANK_INDEX[c.rank];
    }
  }
  let bestStart = 0;
  let bestLen = 0;
  let curStart = 0;
  for (let i = 1; i <= dedup.length; i++) {
    if (
      i < dedup.length &&
      RANK_INDEX[dedup[i].rank] === RANK_INDEX[dedup[i - 1].rank] + 1
    ) {
      continue;
    }
    const curLen = i - curStart;
    if (curLen > bestLen) {
      bestLen = curLen;
      bestStart = curStart;
    }
    curStart = i;
  }
  if (bestLen < 3) return [];
  return dedup.slice(bestStart, bestStart + bestLen);
}

/** Two consecutive same-suit cards (used to seed an impure run with a joker). */
function findNearRun(cards: Card[]): Card[] | null {
  if (cards.length < 2) return null;
  const sorted = cards.slice().sort((a, b) => RANK_INDEX[a.rank] - RANK_INDEX[b.rank]);
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = RANK_INDEX[sorted[i + 1].rank] - RANK_INDEX[sorted[i].rank];
    if (gap === 1) return [sorted[i], sorted[i + 1]];
  }
  return null;
}
