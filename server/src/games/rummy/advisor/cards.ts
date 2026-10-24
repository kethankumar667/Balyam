import type { Card, Rank, Suit } from "@shared/types.js";
import { isWildJoker } from "../melds.js";

/** Shared card facts for the advisor. One place, so no module has its own idea of a card's worth or position. */

export const RANK_ORDER: readonly Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
export const RANK_INDEX: Readonly<Record<Rank, number>> = Object.fromEntries(
  RANK_ORDER.map((rank, index) => [rank, index]),
) as Record<Rank, number>;
export const SUITS: readonly Suit[] = ["S", "H", "D", "C"];
export const SUIT_INDEX: Readonly<Record<Suit, number>> = { S: 0, H: 1, D: 2, C: 3 };

/** Face value when a card is left over. Jokers (printed or wild-rank) count nothing. */
export const POINTS: Readonly<Record<Rank, number>> = {
  A: 10, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, T: 10, J: 10, Q: 10, K: 10,
};

/** A round's score is capped here, which is also the most a wrong show can cost. */
export const HAND_CAP = 80;
/** What leaving before the first draw of a turn costs (the engine's `DROP_PENALTY`); after drawing it is double. */
export const FIRST_DROP_COST = 20;
/** The double deck: two of every card, and four printed jokers. */
export const COPIES_PER_CARD = 2;
export const PRINTED_JOKERS = 4;
export const DECK_SIZE = SUITS.length * RANK_ORDER.length * COPIES_PER_CARD + PRINTED_JOKERS;

/** A card's identity for counting: every copy of the same card shares one signature. */
export type Sig = string;
export const JOKER_SIG: Sig = "JK";
export const sigOf = (card: Pick<Card, "suit" | "rank" | "isPrintedJoker">): Sig =>
  card.isPrintedJoker ? JOKER_SIG : `${card.suit}${card.rank}`;
export const suitOfSig = (sig: Sig): Suit => sig[0] as Suit;
export const rankOfSig = (sig: Sig): Rank => sig[1] as Rank;

export const isWild = (card: Card, wild: Rank): boolean => isWildJoker(card, wild);

/** Points a card adds when it is not in a meld. */
export const looseValue = (card: Card, wild: Rank): number => (isWild(card, wild) ? 0 : POINTS[card.rank]);

/** Every distinct card a player can draw, once each: 52 naturals and the printed joker. */
export const ALL_SIGS: readonly Sig[] = [
  ...SUITS.flatMap((suit) => RANK_ORDER.map((rank) => `${suit}${rank}` as Sig)),
  JOKER_SIG,
];

/** How many copies of a signature exist in the whole deck. */
export const copiesOf = (sig: Sig): number => (sig === JOKER_SIG ? PRINTED_JOKERS : COPIES_PER_CARD);

/** A stand-in card for "what if I drew this": never shown, never sent anywhere. */
export function probeCard(sig: Sig, index = 0): Card {
  return sig === JOKER_SIG
    ? { id: `probe_${index}_JK`, suit: "S", rank: "A", isPrintedJoker: true }
    : { id: `probe_${index}_${sig}`, suit: suitOfSig(sig), rank: rankOfSig(sig) };
}
