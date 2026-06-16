import type { Card, Rank, Suit } from "@shared/types.js";

const SUITS: Suit[] = ["S", "H", "D", "C"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];

/** Build a 108-card double deck (2 standard decks + 4 printed jokers). */
export function buildDoubleDeck(): Card[] {
  const out: Card[] = [];
  for (let copy = 0; copy < 2; copy++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        out.push({ id: `${suit}${rank}_${copy}`, suit, rank });
      }
    }
  }
  // 4 printed jokers — 2 per standard deck. Suit/rank are placeholder filler
  // for serialization; consumers should check isPrintedJoker first.
  for (let i = 0; i < 4; i++) {
    out.push({ id: `PJ_${i}`, suit: "S", rank: "A", isPrintedJoker: true });
  }
  return out;
}

/** Fisher-Yates shuffle with crypto randomness. */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface DealResult {
  hands: Record<string, Card[]>;
  closedDeck: Card[];
  openPile: Card[];
  wildJoker: Card;
}

/**
 * Deal 13 cards each, pick a wild joker (a face-up card from the remaining deck),
 * and seed the open pile with one card.
 */
export function deal(playerIds: string[]): DealResult {
  if (playerIds.length < 2 || playerIds.length > 6) {
    throw new Error("Rummy supports 2-6 players");
  }
  const deck = shuffle(buildDoubleDeck());
  const hands: Record<string, Card[]> = {};
  for (const id of playerIds) hands[id] = [];

  let cursor = 0;
  for (let c = 0; c < 13; c++) {
    for (const id of playerIds) {
      hands[id].push(deck[cursor++]);
    }
  }
  // Cut card → wild joker. Printed jokers can't designate a wild rank since
  // they don't carry one, so skip past any printed jokers when picking.
  while (deck[cursor].isPrintedJoker) cursor++;
  const wildJoker = deck[cursor++];
  const openPile: Card[] = [deck[cursor++]];
  const closedDeck = deck.slice(cursor);

  return { hands, closedDeck, openPile, wildJoker };
}
