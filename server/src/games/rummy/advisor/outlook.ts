import type { Card, Rank } from "@shared/types.js";
import { ALL_SIGS, JOKER_SIG, RANK_INDEX, probeCard, rankOfSig, suitOfSig, type Sig } from "./cards.js";
import { cardsNeeded } from "./distance.js";
import { totalUnseen } from "./unseen.js";

/** One kind of card that would help, and how many copies of it could still turn up. */
export interface Out {
  sig: Sig;
  copies: number;
}

/** What the next draw can do for a 13-card hand. */
export interface DrawOutlook {
  /** Cards the hand still needs. */
  needed: number;
  /** Every card kind that brings the hand closer, with copies still unseen. */
  outs: Out[];
  outCopies: number;
  unseenTotal: number;
  /** Chance that one card off the closed deck is an out. */
  chance: number;
}

/**
 * Card kinds that could possibly change this hand: jokers, wild-rank cards, any card of a rank already held
 * (set material), and any card of a held suit within two ranks (run material). A card with nothing to connect
 * to cannot reduce the cards needed, so it is skipped rather than tested.
 */
export function connectingSigs(hand: readonly Card[], wild: Rank): Sig[] {
  const held = hand.filter((card) => !card.isPrintedJoker);
  // Each joker in hand can stand in for one more rank between two real cards, so it widens how far a card can reach.
  const reach = 2 + hand.filter((card) => card.isPrintedJoker || card.rank === wild).length;
  return ALL_SIGS.filter((sig) => {
    if (sig === JOKER_SIG || rankOfSig(sig) === wild) return true;
    const rank = RANK_INDEX[rankOfSig(sig)];
    const suit = suitOfSig(sig);
    return held.some((card) => {
      if (card.rank === rankOfSig(sig)) return true;
      if (card.suit !== suit) return false;
      const other = RANK_INDEX[card.rank];
      const gap = Math.abs(rank - other);
      // An Ace also sits above the King, so Q-K-A and A-2-3 both connect.
      return gap <= reach || (rank === 0 && 13 - other <= reach) || (other === 0 && 13 - rank <= reach);
    });
  });
}

/**
 * Which unseen cards bring a 13-card hand closer to showing, and the chance of drawing one.
 *
 * A card is an "out" when the hand plus that card needs fewer cards than the hand does now. The chance is the
 * unseen copies of all outs over every unseen card, which is exact for a draw from the closed deck.
 */
export function drawOutlook(hand: readonly Card[], wild: Rank, unseen: ReadonlyMap<Sig, number>): DrawOutlook {
  const needed = cardsNeeded(hand, wild);
  const unseenTotal = totalUnseen(unseen);
  if (needed === 0) {
    return { needed, outs: [], outCopies: unseenTotal, unseenTotal, chance: 1 };
  }

  const outs: Out[] = [];
  let outCopies = 0;
  for (const sig of connectingSigs(hand, wild)) {
    const copies = unseen.get(sig) ?? 0;
    if (copies === 0) continue;
    if (cardsNeeded([...hand, probeCard(sig)], wild) < needed) {
      outs.push({ sig, copies });
      outCopies += copies;
    }
  }
  return { needed, outs, outCopies, unseenTotal, chance: unseenTotal === 0 ? 0 : outCopies / unseenTotal };
}
