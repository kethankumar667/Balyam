import type { Card, Rank } from "@shared/types.js";
import { isPureSequence, isImpureSequence, isSet, isWildJoker } from "./melds.js";

const POINTS: Record<Rank, number> = {
  A: 10, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  T: 10, J: 10, Q: 10, K: 10,
};

const HAND_CAP = 80;
const INVALID_DECLARE_PENALTY = 80;

const RANK_ORDER: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const RANK_INDEX: Record<Rank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i] as const),
) as Record<Rank, number>;

/** Sum of all natural-card face values; jokers count zero. */
function rawHandPoints(cards: Card[], wildJokerRank: Rank): number {
  let total = 0;
  for (const c of cards) {
    if (isWildJoker(c, wildJokerRank)) continue;
    total += POINTS[c.rank];
  }
  return total;
}

/**
 * Legacy entry point kept for callers that just want "what's this hand
 * worth if nothing was melded". Returns the capped face-value sum.
 *
 * Prefer `bestArrangementForScoring()` when finalising a round — it
 * applies Indian Rummy's pure-sequence rule and returns the melds the
 * loser had assembled, which the scorecard renders verbatim.
 */
export function pointsOfHand(cards: Card[], wildJokerRank: Rank): number {
  return Math.min(rawHandPoints(cards, wildJokerRank), HAND_CAP);
}

export { HAND_CAP, INVALID_DECLARE_PENALTY };

/* ─────────────────────────────────────────────────────────────────
 * Indian Rummy loser scoring — meld hierarchy
 *
 * Mirrors the declare rules: at least one pure sequence is required
 * before anything is credited; sets become creditable once a SECOND
 * sequence (pure or impure) is also present. So the valid declare
 * shapes "pure + impure + sets" and "pure + pure + sets" both reduce
 * the loser's score, but "pure only" leaves any sets in hand
 * counting toward the score.
 *
 * Credit unlocks:
 *   1. No pure sequence → nothing credited; full face value (≤80).
 *   2. Pure sequence found → pure(s) credited. Impure sequences are
 *      credited too (they don't need anything beyond the pure to
 *      exist, since the pure already satisfies the declare anchor).
 *   3. ≥ 2 sequences total — pure+pure OR pure+impure — → sets are
 *      additionally credited.
 *
 * The return value carries the exact meld arrangement used so the
 * scorecard renders the SAME groups that produced the points —
 * display and scoring cannot diverge.
 * ──────────────────────────────────────────────────────────────── */

export interface ScoringArrangement {
  /** Meld groups credited to the loser (zero or more). */
  melds: Card[][];
  /** Cards that didn't fit in any credited meld. */
  ungrouped: Card[];
  /** Final points booked for the loser (capped at HAND_CAP). */
  points: number;
  /** True if at least one pure sequence was found. */
  hasPureSequence: boolean;
  /**
   * True if a second sequence (pure or impure) was credited. Sets
   * only become creditable once this is true.
   */
  hasSecondSequence: boolean;
}

/**
 * Compute the loser's best-credit arrangement:
 *   1. Take the longest pure sequence per suit, iteratively.
 *      No pure → bail; loser pays the full face value.
 *   2. Take impure sequences using available wild jokers.
 *   3. If at least TWO sequences exist total (pure+pure or
 *      pure+impure), take valid sets too. With only a single pure
 *      and no impure, sets stay ungrouped and count toward the score.
 *   4. Anything left is ungrouped and counts toward the score.
 */
export function bestArrangementForScoring(
  hand: Card[],
  wildJokerRank: Rank,
): ScoringArrangement {
  const wild = (c: Card) => isWildJoker(c, wildJokerRank);
  const remaining = new Map(hand.map((c) => [c.id, c]));
  const melds: Card[][] = [];
  let pureCount = 0;
  let sequenceCount = 0;

  // ── 1. Pure sequences per suit, longest-first ──
  for (const suit of ["S", "H", "D", "C"] as const) {
    while (true) {
      const inSuit = [...remaining.values()].filter(
        (c) => c.suit === suit && !c.isPrintedJoker,
      );
      // Only natural cards can anchor a pure sequence — printed jokers
      // are excluded, but wild-rank cards in their own slot are natural.
      const run = findLongestRun(inSuit);
      if (run.length < 3) break;
      if (!isPureSequence(run, wildJokerRank)) break;
      melds.push(run);
      pureCount += 1;
      sequenceCount += 1;
      for (const c of run) remaining.delete(c.id);
    }
  }

  // Without a pure sequence the loser can't claim any reduction. Bail
  // out early so the score reflects the full hand value.
  if (pureCount === 0) {
    const ungrouped = [...remaining.values()];
    return {
      melds: [],
      ungrouped,
      points: Math.min(rawHandPoints(ungrouped, wildJokerRank), HAND_CAP),
      hasPureSequence: false,
      hasSecondSequence: false,
    };
  }

  // ── 2. Impure sequences using jokers ──
  let wildPool = [...remaining.values()].filter(wild);
  for (const suit of ["S", "H", "D", "C"] as const) {
    if (wildPool.length === 0) break;
    const inSuit = [...remaining.values()].filter(
      (c) => c.suit === suit && !wild(c),
    );
    const pair = findNearRun(inSuit);
    if (!pair) continue;
    const w = wildPool[0];
    const candidate = [...pair, w];
    if (isImpureSequence(candidate, wildJokerRank)) {
      melds.push(candidate);
      sequenceCount += 1;
      for (const c of candidate) remaining.delete(c.id);
      wildPool = wildPool.slice(1);
    }
  }

  // ── 3. Sets — only when a second sequence has unlocked them ──
  if (sequenceCount >= 2) {
    const byRank = new Map<Rank, Card[]>();
    for (const c of remaining.values()) {
      if (wild(c)) continue;
      const arr = byRank.get(c.rank) ?? [];
      arr.push(c);
      byRank.set(c.rank, arr);
    }
    const candidates = [...byRank.values()]
      .map((cards) => {
        const bySuit = new Map<string, Card>();
        for (const c of cards) if (!bySuit.has(c.suit)) bySuit.set(c.suit, c);
        return [...bySuit.values()];
      })
      .filter((cards) => cards.length >= 3)
      .sort((a, b) => b.length - a.length);

    for (const candidate of candidates) {
      const available = candidate.filter((c) => remaining.has(c.id));
      if (available.length < 3) continue;
      const set = available.slice(0, 4);
      if (isSet(set, wildJokerRank)) {
        melds.push(set);
        for (const c of set) remaining.delete(c.id);
      }
    }

    // Extend a set to 4 with one leftover wild joker if it helps.
    wildPool = [...remaining.values()].filter(wild);
    while (wildPool.length > 0) {
      const w = wildPool[0];
      let placed = false;
      for (const g of melds) {
        // Sets are flat same-rank groups; sequences are consecutive — easy
        // to tell apart by checking same-rank-ness.
        const allSameRank = g.every((c) => c.rank === g[0].rank || wild(c));
        if (!allSameRank) continue;
        if (g.length >= 4) continue;
        const candidate = [...g, w];
        if (isSet(candidate, wildJokerRank)) {
          g.push(w);
          remaining.delete(w.id);
          placed = true;
          break;
        }
      }
      if (!placed) break;
      wildPool = wildPool.slice(1);
    }
  }

  const ungrouped = [...remaining.values()];
  const points = Math.min(rawHandPoints(ungrouped, wildJokerRank), HAND_CAP);
  return {
    melds,
    ungrouped,
    points,
    hasPureSequence: true,
    hasSecondSequence: sequenceCount >= 2,
  };
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

/** Two same-suit cards exactly one rank apart (seed for impure sequence). */
function findNearRun(cards: Card[]): Card[] | null {
  if (cards.length < 2) return null;
  const sorted = cards.slice().sort((a, b) => RANK_INDEX[a.rank] - RANK_INDEX[b.rank]);
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = RANK_INDEX[sorted[i + 1].rank] - RANK_INDEX[sorted[i].rank];
    if (gap === 1) return [sorted[i], sorted[i + 1]];
  }
  return null;
}
