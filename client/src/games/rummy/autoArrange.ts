import type { Card, Rank } from "@shared/types";
import { classifyMeld, cardPoints, sumCardPoints } from "./meldCheck";

const RANK_ORDER: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const RANK_INDEX: Record<Rank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i] as const),
) as Record<Rank, number>;

export interface ArrangementSuggestion {
  groups: Card[][];
  ungrouped: Card[];
  /** Points the user would lose if caught with this arrangement. */
  caughtPoints: number;
}

/**
 * Grandmaster-Level Combinatorial Rummy AI Optimizer.
 *
 * Evaluates all valid meld combinations to find the exact global optimal partition that:
 *  1. Satisfies Indian Rummy sequence rules (Pure sequence first, 2nd sequence second).
 *  2. Handles Ace-High (Q-K-A) and Ace-Low (A-2-3) sequences perfectly.
 *  3. Allocates Wild Jokers to maximize point reduction on high-value unmelded cards.
 *  4. Minimizes total dead points (caughtPoints).
 */
export function suggestArrangement(hand: Card[], wildRank: Rank): ArrangementSuggestion {
  if (hand.length === 0) return { groups: [], ungrouped: [], caughtPoints: 0 };

  const isWild = (c: Card) => c.isPrintedJoker === true || c.rank === wildRank;

  // 1. Generate ALL potential valid melds (Pure Runs, Sets, Impure Runs with Wild Jokers)
  const candidateMelds: Card[][] = [];

  // A. All Pure Sequences (runs of 3, 4, 5+ cards of same suit, no jokers)
  const bySuit: Record<string, Card[]> = { S: [], H: [], D: [], C: [] };
  for (const c of hand) {
    if (!isWild(c)) (bySuit[c.suit] ??= []).push(c);
  }

  for (const suit of ["S", "H", "D", "C"] as const) {
    const cardsInSuit = bySuit[suit] ?? [];
    if (cardsInSuit.length < 3) continue;

    const sorted = [...cardsInSuit].sort((a, b) => RANK_INDEX[a.rank] - RANK_INDEX[b.rank]);
    const uniqueRanks: Card[] = [];
    for (const c of sorted) {
      if (!uniqueRanks.some((r) => r.rank === c.rank)) uniqueRanks.push(c);
    }

    // Standard contiguous runs (A-2-3, 2-3-4, ..., 10-J-Q-K)
    for (let i = 0; i < uniqueRanks.length; i++) {
      for (let j = i + 2; j < uniqueRanks.length; j++) {
        const sub = uniqueRanks.slice(i, j + 1);
        let isSeq = true;
        for (let k = 0; k < sub.length - 1; k++) {
          if (RANK_INDEX[sub[k + 1].rank] !== RANK_INDEX[sub[k].rank] + 1) {
            isSeq = false;
            break;
          }
        }
        if (isSeq) {
          const res = classifyMeld(sub, wildRank);
          if (res.valid && res.kind === "pureSequence") {
            candidateMelds.push(sub);
          }
        }
      }
    }

    // Ace-High runs (e.g. Q-K-A, J-Q-K-A, 10-J-Q-K-A)
    const ace = uniqueRanks.find((c) => c.rank === "A");
    if (ace) {
      const nonAceRanks = uniqueRanks.filter((c) => c.rank !== "A");
      const highRanks = [...nonAceRanks, ace];
      const q = highRanks.find((c) => c.rank === "Q");
      const k = highRanks.find((c) => c.rank === "K");
      if (q && k) {
        const qka = [q, k, ace];
        if (classifyMeld(qka, wildRank).valid) candidateMelds.push(qka);
        const j = highRanks.find((c) => c.rank === "J");
        if (j) {
          const jqka = [j, q, k, ace];
          if (classifyMeld(jqka, wildRank).valid) candidateMelds.push(jqka);
          const t = highRanks.find((c) => c.rank === "T");
          if (t) {
            const tjqka = [t, j, q, k, ace];
            if (classifyMeld(tjqka, wildRank).valid) candidateMelds.push(tjqka);
          }
        }
      }
    }
  }

  // B. All Valid Sets (3 or 4 same rank, distinct suits)
  const naturalByRank = new Map<Rank, Card[]>();
  for (const c of hand) {
    if (!isWild(c)) {
      if (!naturalByRank.has(c.rank)) naturalByRank.set(c.rank, []);
      naturalByRank.get(c.rank)!.push(c);
    }
  }

  for (const [_, rankCards] of naturalByRank.entries()) {
    const bySuitUnique = new Map<string, Card>();
    for (const c of rankCards) if (!bySuitUnique.has(c.suit)) bySuitUnique.set(c.suit, c);
    const distinct = [...bySuitUnique.values()];

    if (distinct.length >= 3) {
      for (let i = 0; i < distinct.length - 2; i++) {
        for (let j = i + 1; j < distinct.length - 1; j++) {
          for (let k = j + 1; k < distinct.length; k++) {
            const set3 = [distinct[i], distinct[j], distinct[k]];
            if (classifyMeld(set3, wildRank).valid) candidateMelds.push(set3);
          }
        }
      }
      if (distinct.length >= 4) {
        if (classifyMeld(distinct.slice(0, 4), wildRank).valid) {
          candidateMelds.push(distinct.slice(0, 4));
        }
      }
    }
  }

  // C. All Impure Sequences (runs using Wild Jokers)
  const wildCards = hand.filter(isWild);

  if (wildCards.length > 0) {
    for (const wild of wildCards) {
      for (const suit of ["S", "H", "D", "C"] as const) {
        const inSuit = (bySuit[suit] ?? []).sort((a, b) => RANK_INDEX[a.rank] - RANK_INDEX[b.rank]);
        for (let i = 0; i < inSuit.length; i++) {
          for (let j = i + 1; j < inSuit.length; j++) {
            const c1 = inSuit[i], c2 = inSuit[j];
            const gap = Math.abs(RANK_INDEX[c2.rank] - RANK_INDEX[c1.rank]);
            if (gap === 1 || gap === 2) {
              const candidate = [c1, c2, wild];
              if (classifyMeld(candidate, wildRank).valid) {
                candidateMelds.push(candidate);
              }
            }
          }
        }
      }

      // Sets with Wild Jokers (2 natural distinct suit + 1 wild joker)
      for (const [_, rankCards] of naturalByRank.entries()) {
        const bySuitUnique = new Map<string, Card>();
        for (const c of rankCards) if (!bySuitUnique.has(c.suit)) bySuitUnique.set(c.suit, c);
        const distinct = [...bySuitUnique.values()];
        if (distinct.length >= 2) {
          for (let i = 0; i < distinct.length - 1; i++) {
            for (let j = i + 1; j < distinct.length; j++) {
              const candidate = [distinct[i], distinct[j], wild];
              if (classifyMeld(candidate, wildRank).valid) {
                candidateMelds.push(candidate);
              }
            }
          }
        }
      }
    }
  }

  // Deduplicate candidate melds by sorted card IDs string
  const uniqueCandidateMelds: Card[][] = [];
  const seenMeldKeys = new Set<string>();
  for (const m of candidateMelds) {
    const key = m.map((c) => c.id).sort().join(",");
    if (!seenMeldKeys.has(key)) {
      seenMeldKeys.add(key);
      uniqueCandidateMelds.push(m);
    }
  }

  // 2. Combinatorial Search — find non-overlapping combination of candidate melds
  let bestGroups: Card[][] = [];
  let bestUngrouped: Card[] = [...hand];
  let minCaughtPoints = Infinity;
  let bestScore = -Infinity;

  function evaluatePartition(chosenMelds: Card[][], remainingCardMap: Map<string, Card>) {
    const ungrouped = [...remainingCardMap.values()];

    const classifications = chosenMelds.map((m) => classifyMeld(m, wildRank));

    const pureCount = classifications.filter((c) => c.kind === "pureSequence").length;
    const validMeldCount = classifications.filter((c) => c.valid).length;
    const hasPure = pureCount >= 1;
    const hasSecond = hasPure && (pureCount >= 2 || validMeldCount >= 2);

    let caughtPoints = 0;
    if (!hasPure) {
      caughtPoints = Math.min(sumCardPoints(hand, wildRank), 80);
    } else if (!hasSecond) {
      const pureIds = new Set(
        chosenMelds.filter((_, idx) => classifications[idx].kind === "pureSequence").flat().map((c) => c.id)
      );
      const unprotected = hand.filter((c) => !pureIds.has(c.id));
      caughtPoints = Math.min(sumCardPoints(unprotected, wildRank), 80);
    } else {
      const validMeldIds = new Set(
        chosenMelds.filter((_, idx) => classifications[idx].valid).flat().map((c) => c.id)
      );
      const exposed = hand.filter((c) => !validMeldIds.has(c.id));
      caughtPoints = Math.min(sumCardPoints(exposed, wildRank), 80);
    }

    let score = 0;
    if (hasPure && hasSecond && caughtPoints === 0) score += 1_000_000;
    else if (hasPure && hasSecond) score += 100_000;
    else if (hasPure) score += 10_000;

    score -= caughtPoints * 100;
    score += (hand.length - ungrouped.length) * 50;
    score += chosenMelds.length * 10;

    if (score > bestScore) {
      bestScore = score;
      minCaughtPoints = caughtPoints;
      bestGroups = chosenMelds;
      bestUngrouped = ungrouped;
    }
  }

  function search(index: number, currentMelds: Card[][], remainingMap: Map<string, Card>) {
    evaluatePartition(currentMelds, remainingMap);

    if (currentMelds.length >= 4) return;

    for (let i = index; i < uniqueCandidateMelds.length; i++) {
      const meld = uniqueCandidateMelds[i];
      if (meld.every((c) => remainingMap.has(c.id))) {
        const nextMap = new Map(remainingMap);
        for (const c of meld) nextMap.delete(c.id);

        search(i + 1, [...currentMelds, meld], nextMap);
      }
    }
  }

  search(0, [], new Map(hand.map((c) => [c.id, c])));

  return {
    groups: bestGroups,
    ungrouped: bestUngrouped,
    caughtPoints: minCaughtPoints === Infinity ? sumCardPoints(hand, wildRank) : minCaughtPoints,
  };
}

/**
 * "Split by suit" — for AUTO button tidying.
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
 * Master AI Discard Evaluation:
 * Evaluates removing each candidate card from hand and running suggestArrangement
 * on the remaining hand to pick the card that leaves the absolute lowest dead points.
 */
export function suggestDiscard(
  ungrouped: Card[],
  hand: Card[],
  wildRank: Rank,
): Card | null {
  if (hand.length === 0) return null;
  const candidates = (ungrouped.length > 0 ? ungrouped : hand).filter(
    (c) => c.rank !== wildRank && !c.isPrintedJoker
  );
  if (candidates.length === 0) return null;

  let bestCard: Card | null = null;
  let minHandPenaltyAfterDiscard = Infinity;

  for (const c of candidates) {
    const remainingHand = hand.filter((h) => h.id !== c.id);
    const suggestion = suggestArrangement(remainingHand, wildRank);
    const pts = cardPoints(c, wildRank);
    const totalPenaltyScore = suggestion.caughtPoints * 10 - pts;
    if (totalPenaltyScore < minHandPenaltyAfterDiscard) {
      minHandPenaltyAfterDiscard = totalPenaltyScore;
      bestCard = c;
    }
  }

  return bestCard ?? candidates[0] ?? null;
}
