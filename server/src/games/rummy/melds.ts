import type { Card, Meld, Rank } from "@shared/types.js";

const RANK_ORDER: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const RANK_INDEX: Record<Rank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i])
) as Record<Rank, number>;

/**
 * A card is a wild joker if (a) it's a printed joker, or (b) its rank matches
 * the cut card's rank (the wild rank for this round).
 */
export function isWildJoker(card: Card, wildJokerRank: Rank): boolean {
  if (card.isPrintedJoker) return true;
  return card.rank === wildJokerRank;
}

/**
 * A pure sequence is 3+ cards of the same suit in consecutive rank order,
 * with NO printed jokers.
 *
 * Wild-rank-matching cards — e.g. the 8♥ when 8 is this round's wild rank —
 * count as their natural face value here. Indian Rummy variants (RummyCircle,
 * Junglee) treat a wild-rank card used in its own slot as natural, since the
 * player isn't invoking its "wild" property. Example: when 8 is wild,
 * 6♥-7♥-8♥ is a pure run because the 8♥ is in its natural position, not
 * substituting for a missing card. Only PRINTED jokers (the 4 dedicated
 * joker cards in the double deck) disqualify a meld from purity.
 *
 * Ace can be low (A-2-3) or high (Q-K-A) but does not wrap.
 *
 * @param _wildJokerRank kept for API parity but no longer consulted — pure
 *   runs are about printed jokers only.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isPureSequence(cards: Card[], _wildJokerRank: Rank): boolean {
  if (cards.length < 3) return false;
  if (cards.some((c) => c.isPrintedJoker)) return false;

  const suit = cards[0].suit;
  if (!cards.every((c) => c.suit === suit)) return false;

  return isConsecutiveRun(cards.map((c) => c.rank));
}

/**
 * An impure sequence is 3+ cards forming a same-suit consecutive run where one or more
 * positions are filled by wild jokers (substituting for the rank that would be needed).
 */
export function isImpureSequence(cards: Card[], wildJokerRank: Rank): boolean {
  if (cards.length < 3) return false;

  const jokers = cards.filter((c) => isWildJoker(c, wildJokerRank));
  const natural = cards.filter((c) => !isWildJoker(c, wildJokerRank));

  if (jokers.length === 0) return false;
  if (natural.length === 0) return false;

  const suit = natural[0].suit;
  if (!natural.every((c) => c.suit === suit)) return false;

  return canFormRunWithGaps(natural.map((c) => c.rank), jokers.length, cards.length);
}

/**
 * A set is 3 or 4 cards of the same rank, with all natural (non-joker) cards
 * having distinct suits. Wild jokers may substitute.
 *
 * Special case: a group of 3-4 cards that are ALL jokers (printed or
 * wild-rank) also counts as a valid set — common house rule in Indian
 * Rummy and what most online platforms recognise.
 */
export function isSet(cards: Card[], wildJokerRank: Rank): boolean {
  if (cards.length < 3 || cards.length > 4) return false;

  const jokers = cards.filter((c) => isWildJoker(c, wildJokerRank));
  const natural = cards.filter((c) => !isWildJoker(c, wildJokerRank));

  // All-joker set: 3-4 wilds with no natural cards is valid.
  if (natural.length === 0) return jokers.length >= 3 && jokers.length <= 4;

  const rank = natural[0].rank;
  if (!natural.every((c) => c.rank === rank)) return false;

  const suits = new Set(natural.map((c) => c.suit));
  if (suits.size !== natural.length) return false;

  return jokers.length + natural.length === cards.length;
}

export function classifyMeld(cards: Card[], wildJokerRank: Rank): Meld | null {
  if (isPureSequence(cards, wildJokerRank)) return { kind: "pureSequence", cards };
  if (isImpureSequence(cards, wildJokerRank)) return { kind: "impureSequence", cards };
  if (isSet(cards, wildJokerRank)) return { kind: "set", cards };
  return null;
}

/** Sort ranks ascending and verify they form a consecutive run, allowing Ace-high. */
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

/**
 * Given the natural cards' ranks and the number of jokers available, check whether
 * placing the jokers as fillers can produce a single same-suit consecutive run of
 * length `totalLength`. Ace may be considered low or high (not wrap-around).
 */
function canFormRunWithGaps(
  naturalRanks: Rank[],
  jokerCount: number,
  totalLength: number,
): boolean {
  if (naturalRanks.length + jokerCount !== totalLength) return false;
  const tryWindow = (positions: number[]): boolean => {
    if (new Set(positions).size !== positions.length) return false;
    positions.sort((a, b) => a - b);
    for (let start = 0; start <= 13 - totalLength + 1; start++) {
      const window = Array.from({ length: totalLength }, (_, i) => start + i);
      if (positions.every((p) => window.includes(p))) {
        return true;
      }
    }
    return false;
  };

  const aceLowPositions = naturalRanks.map((r) => RANK_INDEX[r]);
  if (tryWindow(aceLowPositions)) return true;

  if (naturalRanks.includes("A")) {
    const aceHighPositions = naturalRanks.map((r) =>
      r === "A" ? RANK_INDEX["K"] + 1 : RANK_INDEX[r]
    );
    if (tryWindow(aceHighPositions)) return true;
  }
  return false;
}
