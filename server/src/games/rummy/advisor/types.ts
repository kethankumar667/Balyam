import type { Card, Rank, RummyMatchMode } from "@shared/types.js";

/**
 * Something every player at the table saw happen. The advisor may use exactly this and nothing else about
 * other players: a card lifted from the open pile is visible to all, a closed draw is not.
 */
export type PublicEvent =
  | { type: "draw"; playerId: string; source: "open"; card: Card }
  | { type: "draw"; playerId: string; source: "closed" }
  | { type: "discard"; playerId: string; card: Card }
  | { type: "reshuffle" };

/**
 * Everything the advisor is allowed to know. It is built from the asking player's own hand and the public
 * table; the closed deck's order and every other player's hand are deliberately absent from this type, so
 * the advisor cannot look at them even by accident.
 */
export interface AdvisorTable {
  myId: string;
  hand: Card[];
  wild: Rank;
  /** The face-up card that set the wild rank. It is on the table, not in the deck. */
  cutCard: Card;
  /** Every card in the open pile, oldest first; the last one is the top. */
  openPile: Card[];
  /** Whether a printed joker on top may still be lifted (only on the round's very first draw). */
  openJokerDrawable: boolean;
  closedDeckCount: number;
  /** Which half of the turn the player is in, or that it is not their turn. */
  phase: "draw" | "discard" | "waiting";
  /** What every player saw happen this round, oldest first. */
  log: PublicEvent[];
  /** The other players still in the round. */
  opponents: { id: string; handSize: number }[];
  mode: RummyMatchMode;
  /** The asking player's running total in a pool match; 0 in a single round. */
  myTotal: number;
  /** The pool's elimination line (101 or 201), or null in a single round. */
  poolTarget: number | null;
  /** How many turns the asking player has already taken this round. */
  myTurns: number;
}
