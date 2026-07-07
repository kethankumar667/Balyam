import type { Card, Rank } from "@shared/types";
import { classifyMeld, cardPoints, sumCardPoints } from "./meldCheck";

const RANK_ORDER: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const RANK_INDEX: Record<Rank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i] as const),
) as Record<Rank, number>;

/**
 * Suggest a sensible grouping of the player's hand into melds and ungrouped.
 *
 * Strategy (greedy, biased toward valid melds):
 *   1. Find the LONGEST pure sequence per suit (anchored, no jokers).
 *   2. Find additional pure runs in other suits.
 *   3. Find sets of 3+ same-rank cards (different suits).
 *   4. Add impure sequences using remaining wild jokers.
 *   5. Everything else goes ungrouped.
 *
 * Not optimal — a true brute-force would be too slow on every render. Good enough
 * to give the user a sensible starting point they can manually tweak.
 */
export interface ArrangementSuggestion {
  groups: Card[][];
  ungrouped: Card[];
  /** Points the user would lose if caught with this arrangement. */
  caughtPoints: number;
}

export function suggestArrangement(hand: Card[], wildRank: Rank): ArrangementSuggestion {
  const remaining = new Map(hand.map((c) => [c.id, c]));
  const isWild = (c: Card) => c.isPrintedJoker === true || c.rank === wildRank;
  const wildCards = hand.filter(isWild);
  const naturalCards = hand.filter((c) => !isWild(c));

  const groups: Card[][] = [];

  // 1. Pure sequences — for each suit, find runs.
  for (const suit of ["S", "H", "D", "C"] as const) {
    while (true) {
      const inSuit = [...remaining.values()].filter(
        (c) => c.suit === suit && !isWild(c),
      );
      const run = findLongestRun(inSuit);
      if (run.length < 3) break;
      groups.push(run);
      for (const c of run) remaining.delete(c.id);
    }
  }

  // 2. Sets — group by rank (among naturals only).
  const naturalsLeft = [...remaining.values()].filter((c) => !isWild(c));
  const byRank = new Map<Rank, Card[]>();
  for (const c of naturalsLeft) {
    if (!byRank.has(c.rank)) byRank.set(c.rank, []);
    byRank.get(c.rank)!.push(c);
  }
  // Sort sets by size desc — bigger sets first.
  const candidateSets = [...byRank.entries()]
    .map(([rank, cards]) => {
      // Dedupe by suit: a set needs distinct suits.
      const bySuit = new Map<string, Card>();
      for (const c of cards) if (!bySuit.has(c.suit)) bySuit.set(c.suit, c);
      return { rank, cards: [...bySuit.values()] };
    })
    .filter(({ cards }) => cards.length >= 3)
    .sort((a, b) => b.cards.length - a.cards.length);

  for (const { cards } of candidateSets) {
    // Validate before committing — also check no overlap with already-claimed.
    const stillAvailable = cards.filter((c) => remaining.has(c.id));
    if (stillAvailable.length >= 3) {
      const set = stillAvailable.slice(0, 4); // sets can be 3-4
      const classification = classifyMeld(set, wildRank);
      if (classification.valid) {
        groups.push(set);
        for (const c of set) remaining.delete(c.id);
      }
    }
  }

  // 3. Impure sequences using wild jokers — find near-runs missing one card.
  const wildPool = wildCards.filter((w) => remaining.has(w.id));
  if (wildPool.length > 0) {
    for (const suit of ["S", "H", "D", "C"] as const) {
      const inSuit = [...remaining.values()].filter(
        (c) => c.suit === suit && !isWild(c),
      );
      const pair = findNearRun(inSuit);
      if (pair && wildPool.length > 0) {
        const wild = wildPool.pop()!;
        const candidate = [...pair, wild];
        const classification = classifyMeld(candidate, wildRank);
        if (classification.valid) {
          groups.push(candidate);
          for (const c of candidate) remaining.delete(c.id);
        }
      }
    }
  }

  // 4. Leftover wilds — if any remaining, try to extend an existing impure-eligible meld
  // (already covered above). Otherwise they sit ungrouped.

  const ungrouped = [...remaining.values()];

  // 5. Compute caught risk for this arrangement.
  const protectedByPure = groups.some((g) => classifyMeld(g, wildRank).kind === "pureSequence");
  let caughtPoints = 0;
  if (!protectedByPure) {
    caughtPoints = Math.min(sumCardPoints([...naturalCards, ...wildCards], wildRank), 80);
  } else {
    const protectedIds = new Set(
      groups.filter((g) => classifyMeld(g, wildRank).valid).flatMap((g) => g.map((c) => c.id)),
    );
    const exposed = hand.filter((c) => !protectedIds.has(c.id));
    caughtPoints = Math.min(sumCardPoints(exposed, wildRank), 80);
  }

  return { groups, ungrouped, caughtPoints };
}

/**
 * "Split by symbols" — the AUTO button's behaviour. Groups the whole hand into
 * one lane per suit (♠ ♥ ♦ ♣), each sorted by rank, with printed jokers
 * collected into their own trailing lane. It deliberately does NOT build
 * sequences or sets: AUTO only tidies the hand by symbol, so the player still
 * has to form their own melds (which is what makes the post-show 15-second
 * window matter). Empty suits are skipped.
 */
export function splitBySuit(hand: Card[]): Card[][] {
  const bySuit: Record<string, Card[]> = { S: [], H: [], D: [], C: [] };
  const jokers: Card[] = [];
  for (const c of hand) {
    if (c.isPrintedJoker) jokers.push(c);
    else (bySuit[c.suit] ??= []).push(c);
  }
  const lanes: Card[][] = [];
  for (const suit of ["S", "H", "D", "C"] as const) {
    const cards = bySuit[suit];
    if (cards.length > 0) {
      cards.sort((a, b) => RANK_INDEX[a.rank] - RANK_INDEX[b.rank]);
      lanes.push(cards);
    }
  }
  if (jokers.length > 0) lanes.push(jokers);
  return lanes;
}

/**
 * Find the longest same-suit consecutive run within a single suit. No jokers.
 */
function findLongestRun(cards: Card[]): Card[] {
  if (cards.length < 3) return [];
  const sorted = cards
    .slice()
    .sort((a, b) => RANK_INDEX[a.rank] - RANK_INDEX[b.rank]);
  // Dedupe consecutive same-rank cards
  const dedup: Card[] = [];
  let lastRank = -1;
  for (const c of sorted) {
    if (RANK_INDEX[c.rank] !== lastRank) {
      dedup.push(c);
      lastRank = RANK_INDEX[c.rank];
    }
  }
  let bestStart = 0, bestLen = 0;
  let curStart = 0;
  for (let i = 1; i <= dedup.length; i++) {
    if (
      i < dedup.length &&
      RANK_INDEX[dedup[i].rank] === RANK_INDEX[dedup[i - 1].rank] + 1
    ) {
      continue;
    }
    const len = i - curStart;
    if (len > bestLen) {
      bestLen = len;
      bestStart = curStart;
    }
    curStart = i;
  }
  if (bestLen >= 3) return dedup.slice(bestStart, bestStart + bestLen);
  return [];
}

/**
 * Find 2 consecutive same-suit cards that can be extended with a wild joker to make a 3-card impure run.
 */
function findNearRun(cards: Card[]): Card[] | null {
  if (cards.length < 2) return null;
  const sorted = cards
    .slice()
    .sort((a, b) => RANK_INDEX[a.rank] - RANK_INDEX[b.rank]);
  // Find any 2 cards whose ranks are 1 or 2 apart (so a single wild can bridge).
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    const gap = RANK_INDEX[b.rank] - RANK_INDEX[a.rank];
    if (gap === 1 || gap === 2) return [a, b];
  }
  return null;
}

/**
 * Pick the best card to discard from the ungrouped tray.
 * Heuristic: highest point value, breaking ties by isolation (no nearby same-suit ranks
 * AND no other same-rank cards remaining in hand). Wild jokers are never suggested.
 */
export function suggestDiscard(
  ungrouped: Card[],
  hand: Card[],
  wildRank: Rank,
): Card | null {
  if (ungrouped.length === 0) return null;
  const candidates = ungrouped.filter((c) => c.rank !== wildRank);
  if (candidates.length === 0) return null;

  // Score: higher = better discard candidate.
  function score(c: Card): number {
    const pts = cardPoints(c, wildRank);
    // Penalty if there are nearby same-suit cards (could form a run).
    const nearbySameSuit = hand.filter(
      (other) =>
        other.id !== c.id &&
        other.suit === c.suit &&
        Math.abs(RANK_INDEX[other.rank] - RANK_INDEX[c.rank]) <= 2,
    ).length;
    // Penalty if there are other same-rank cards (could form a set).
    const otherSameRank = hand.filter(
      (other) => other.id !== c.id && other.rank === c.rank,
    ).length;
    return pts - nearbySameSuit * 2 - otherSameRank * 3;
  }

  return candidates.slice().sort((a, b) => score(b) - score(a))[0] ?? null;
}
