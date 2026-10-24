import type { Card } from "@shared/types.js";
import { ALL_SIGS, copiesOf, sigOf, type Sig } from "./cards.js";

/** The cards a player can count on not being in the closed deck. Built only from public information. */
export interface KnownCards {
  /** The asking player's own cards. */
  hand: readonly Card[];
  /** Every card face-up in the open pile. */
  openPile: readonly Card[];
  /** The cut card that set the wild rank. */
  cutCard: Card;
  /** Cards other players picked up from the open pile and have not thrown back. */
  heldByOpponents: readonly Card[];
}

/**
 * How many copies of each card could still come off the closed deck, from this player's seat.
 *
 * Start from the whole double deck and remove everything accounted for: the player's hand, the open pile, the
 * cut card, and any card an opponent was seen to pick up. What remains is the pool a closed draw comes from,
 * as far as this player can know. (After a reshuffle the old discards return to the pool on their own,
 * because the open pile is read as it stands now.)
 */
export function unseenCounts(known: KnownCards): Map<Sig, number> {
  const counts = new Map<Sig, number>(ALL_SIGS.map((sig) => [sig, copiesOf(sig)]));
  const remove = (card: Card): void => {
    const sig = sigOf(card);
    counts.set(sig, Math.max(0, (counts.get(sig) ?? 0) - 1));
  };
  for (const card of known.hand) remove(card);
  for (const card of known.openPile) remove(card);
  remove(known.cutCard);
  for (const card of known.heldByOpponents) remove(card);
  return counts;
}

export const totalUnseen = (counts: ReadonlyMap<Sig, number>): number => {
  let total = 0;
  for (const value of counts.values()) total += value;
  return total;
};
