import type { Card, Rank } from "@shared/types";

const RANK_ORDER: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const RANK_INDEX: Record<Rank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i] as const),
) as Record<Rank, number>;

const SUIT_RANK: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };

export type MeldKindClient =
  | "pureSequence"
  | "impureSequence"
  | "set"
  | "incomplete"
  | "invalid";

export interface MeldClassification {
  kind: MeldKindClient;
  /** Short human label (e.g. "Pure run", "Set", "Need 1 more"). */
  label: string;
  /** Border / badge color hex. */
  color: string;
  /** True for any valid meld (pureSequence, impureSequence, set). */
  valid: boolean;
}

const C_PURE  = "#10b981"; // emerald
const C_IMP   = "#06b6d4"; // cyan
const C_SET   = "#3b82f6"; // blue
const C_INC   = "#f97316"; // orange
const C_INV   = "#ef4444"; // red

function isWild(card: Card, wildRank: Rank): boolean {
  // Printed jokers act as wilds regardless of which rank the cut card chose.
  return card.isPrintedJoker === true || card.rank === wildRank;
}

export function classifyMeld(cards: Card[], wildRank: Rank): MeldClassification {
  if (cards.length === 0) return { kind: "incomplete", label: "Empty", color: C_INC, valid: false };
  if (cards.length < 3) {
    const needed = 3 - cards.length;
    return { kind: "incomplete", label: `Need ${needed} more`, color: C_INC, valid: false };
  }
  if (isPureSequence(cards, wildRank)) {
    return { kind: "pureSequence", label: "Pure run ✓", color: C_PURE, valid: true };
  }
  if (isImpureSequence(cards, wildRank)) {
    return { kind: "impureSequence", label: "Impure run ✓", color: C_IMP, valid: true };
  }
  if (isSet(cards, wildRank)) {
    return { kind: "set", label: "Set ✓", color: C_SET, valid: true };
  }
  return { kind: "invalid", label: "Not a meld", color: C_INV, valid: false };
}

function isPureSequence(cards: Card[], wildRank: Rank): boolean {
  if (cards.length < 3) return false;
  const natural = cards.filter((c) => !isWild(c, wildRank));
  if (natural.length < 3) return false;
  const suit = natural[0].suit;
  if (!natural.every((c) => c.suit === suit)) return false;
  return isConsecutiveRun(natural.map((c) => c.rank));
}

function isImpureSequence(cards: Card[], wildRank: Rank): boolean {
  if (cards.length < 3) return false;
  const jokers = cards.filter((c) => isWild(c, wildRank));
  const natural = cards.filter((c) => !isWild(c, wildRank));
  if (jokers.length === 0) return false;
  if (natural.length === 0) return false;
  const suit = natural[0].suit;
  if (!natural.every((c) => c.suit === suit)) return false;
  return canFormRunWithGaps(natural.map((c) => c.rank), jokers.length, cards.length);
}

function isSet(cards: Card[], wildRank: Rank): boolean {
  if (cards.length < 3 || cards.length > 4) return false;
  const jokers = cards.filter((c) => isWild(c, wildRank));
  const natural = cards.filter((c) => !isWild(c, wildRank));

  // Pure joker set: 3-4 cards of all wildcards/jokers
  if (natural.length === 0) return jokers.length >= 3;

  // Mixed set: natural cards + wildcards
  const rank = natural[0].rank;
  if (!natural.every((c) => c.rank === rank)) return false;
  const suits = new Set(natural.map((c) => c.suit));
  if (suits.size !== natural.length) return false;
  return jokers.length + natural.length === cards.length;
}

function isConsecutiveRun(ranks: Rank[]): boolean {
  if (ranks.length < 2) return ranks.length === 1;
  const aceLow = ranks.map((r) => RANK_INDEX[r]).sort((a, b) => a - b);
  if (isStrictlyIncrementing(aceLow)) return true;
  if (ranks.includes("A")) {
    const aceHigh = ranks
      .map((r) => (r === "A" ? RANK_INDEX["K"] + 1 : RANK_INDEX[r]))
      .sort((a, b) => a - b);
    if (isStrictlyIncrementing(aceHigh)) return true;
  }
  return false;
}

function isStrictlyIncrementing(sorted: number[]): boolean {
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

function canFormRunWithGaps(naturalRanks: Rank[], jokerCount: number, totalLength: number): boolean {
  if (naturalRanks.length + jokerCount !== totalLength) return false;
  const tryWindow = (positions: number[]): boolean => {
    if (new Set(positions).size !== positions.length) return false;
    positions.sort((a, b) => a - b);
    for (let start = 0; start <= 13 - totalLength + 1; start++) {
      const window = Array.from({ length: totalLength }, (_, i) => start + i);
      if (positions.every((p) => window.includes(p))) return true;
    }
    return false;
  };
  const aceLow = naturalRanks.map((r) => RANK_INDEX[r]);
  if (tryWindow(aceLow)) return true;
  if (naturalRanks.includes("A")) {
    const aceHigh = naturalRanks.map((r) =>
      r === "A" ? RANK_INDEX["K"] + 1 : RANK_INDEX[r],
    );
    if (tryWindow(aceHigh)) return true;
  }
  return false;
}

/**
 * Sort cards into a sensible meld layout:
 *   • For runs (cards of one suit) — by rank ascending.
 *   • For sets (cards of one rank) — by suit.
 *   • Mixed — by suit then rank, wild jokers last.
 */
export function sortMeldCards(cards: Card[], wildRank: Rank): Card[] {
  const wilds = cards.filter((c) => isWild(c, wildRank));
  const naturals = cards.filter((c) => !isWild(c, wildRank));
  const oneSuit = naturals.length > 0 && naturals.every((c) => c.suit === naturals[0].suit);
  const oneRank = naturals.length > 0 && naturals.every((c) => c.rank === naturals[0].rank);

  const sorted = naturals.slice().sort((a, b) => {
    if (oneSuit) {
      return RANK_INDEX[a.rank] - RANK_INDEX[b.rank];
    }
    if (oneRank) {
      return SUIT_RANK[a.suit] - SUIT_RANK[b.suit];
    }
    const s = SUIT_RANK[a.suit] - SUIT_RANK[b.suit];
    if (s !== 0) return s;
    return RANK_INDEX[a.rank] - RANK_INDEX[b.rank];
  });
  return [...sorted, ...wilds];
}

// === Point scoring (mirrors server/games/rummy/score.ts) ===
//   • A, K, Q, J, T = 10 points each
//   • 2-9 = face value
//   • Wild jokers = 0
//   • Hand total is capped at 80

const POINTS: Record<Rank, number> = {
  A: 10, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  T: 10, J: 10, Q: 10, K: 10,
};

export const HAND_CAP = 80;
export const DROP_PENALTY = 20;

export function cardPoints(card: Card, wildRank: Rank): number {
  if (isWild(card, wildRank)) return 0;
  return POINTS[card.rank];
}

export function sumCardPoints(cards: Card[], wildRank: Rank): number {
  return cards.reduce((s, c) => s + cardPoints(c, wildRank), 0);
}

/**
 * What the player would lose right now, broken down so they can decide:
 *   • finish:     0 (if they actually declare successfully)
 *   • dropNow:    DROP_PENALTY fixed (= 20)
 *   • caughtNow:  full hand if no pure sequence; else only un-melded cards.
 *     Capped at HAND_CAP (80) like the server.
 *
 * `valid` flag on a meld means it classifies as a sequence/set. Pure-sequence
 * protection follows real Indian Rummy: without one, ALL cards still count.
 */
export interface LivePoints {
  /** Raw hand value (jokers excluded), capped at HAND_CAP. The absolute worst case. */
  handTotal: number;
  /** What you'd lose if caught right now, accounting for protection rules. */
  caughtNow: number;
  /** Whether a valid pure sequence currently protects melded cards. */
  protectedByPure: boolean;
  /** Cards that are NOT in valid melds (these count toward caughtNow when protected). */
  unmeldedCount: number;
  /** Fixed drop penalty for comparison. */
  dropNow: number;
}

export function computeLivePoints(
  groups: Array<{ cards: Card[]; classification: MeldClassification }>,
  ungroupedCards: Card[],
  wildRank: Rank,
): LivePoints {
  const allCards = [...groups.flatMap((g) => g.cards), ...ungroupedCards];
  const handTotal = Math.min(sumCardPoints(allCards, wildRank), HAND_CAP);
  const protectedByPure = groups.some((g) => g.classification.kind === "pureSequence");

  if (!protectedByPure) {
    return {
      handTotal,
      caughtNow: handTotal,
      protectedByPure: false,
      unmeldedCount: ungroupedCards.length +
        groups.filter((g) => !g.classification.valid).reduce((s, g) => s + g.cards.length, 0),
      dropNow: DROP_PENALTY,
    };
  }

  const protectedIds = new Set(
    groups.filter((g) => g.classification.valid).flatMap((g) => g.cards.map((c) => c.id)),
  );
  const unprotected = allCards.filter((c) => !protectedIds.has(c.id));
  const caughtNow = Math.min(sumCardPoints(unprotected, wildRank), HAND_CAP);

  return {
    handTotal,
    caughtNow,
    protectedByPure: true,
    unmeldedCount: unprotected.length,
    dropNow: DROP_PENALTY,
  };
}

/**
 * Look at the whole hand layout and report what's needed to declare:
 *   • 1+ pure sequence
 *   • 2+ sequences total (pure + impure)
 *   • All groups must classify as valid melds
 */
export interface FinishReadiness {
  ready: boolean;
  reasons: string[];
  pureCount: number;
  sequenceCount: number;
  invalidGroups: number;
  validGroups: number;
}

export function evaluateFinishReadiness(
  groups: Array<{ cards: Card[] }>,
  wildRank: Rank,
  totalCardsInGroups: number,
  totalNonGroupedCards: number,
): FinishReadiness {
  let pureCount = 0;
  let sequenceCount = 0;
  let invalidGroups = 0;
  let validGroups = 0;
  for (const g of groups) {
    const c = classifyMeld(g.cards, wildRank);
    if (c.kind === "pureSequence") {
      pureCount += 1;
      sequenceCount += 1;
      validGroups += 1;
    } else if (c.kind === "impureSequence") {
      sequenceCount += 1;
      validGroups += 1;
    } else if (c.kind === "set") {
      validGroups += 1;
    } else {
      invalidGroups += 1;
    }
  }
  const reasons: string[] = [];
  if (totalCardsInGroups !== 13) {
    reasons.push(`Need exactly 13 cards in groups (have ${totalCardsInGroups})`);
  }
  if (totalNonGroupedCards !== 1) {
    reasons.push(`Need 1 ungrouped card as discard (have ${totalNonGroupedCards})`);
  }
  if (invalidGroups > 0) reasons.push(`${invalidGroups} group(s) not valid melds`);
  if (pureCount < 1) reasons.push("Need 1+ pure sequence");
  if (sequenceCount < 2) reasons.push(`Need 2+ sequences (have ${sequenceCount})`);

  return {
    ready: reasons.length === 0 && groups.length > 0,
    reasons,
    pureCount,
    sequenceCount,
    invalidGroups,
    validGroups,
  };
}
