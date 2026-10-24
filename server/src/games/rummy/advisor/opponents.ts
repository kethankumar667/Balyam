import type { Card } from "@shared/types.js";
import { RANK_INDEX, sigOf } from "./cards.js";
import type { PublicEvent } from "./types.js";

/** What the table has seen one opponent do. */
export interface OpponentRead {
  /** Cards they lifted from the open pile and have not thrown back: the only cards of theirs anyone can know. */
  held: Card[];
  /** Everything they threw, oldest first. */
  discards: Card[];
  /** How often they took the open card rather than the closed one. */
  openPicks: number;
  closedDraws: number;
}

export interface OpponentReads {
  byPlayer: Map<string, OpponentRead>;
  /** Every card known to be in an opponent's hand, across all opponents. */
  heldByOpponents: Card[];
}

/**
 * Read the opponents from the public log.
 *
 * A strong player watches the open pile: a card lifted from it tells the table exactly what that player is
 * building, and a card thrown tells the table what they do not want. Nothing here is hidden information; it
 * is what every player at the table saw happen. (A closed draw tells nothing, so it is only counted.)
 */
export function readOpponents(log: readonly PublicEvent[], myId: string): OpponentReads {
  const byPlayer = new Map<string, OpponentRead>();
  const read = (id: string): OpponentRead => {
    const known = byPlayer.get(id);
    if (known) return known;
    const fresh: OpponentRead = { held: [], discards: [], openPicks: 0, closedDraws: 0 };
    byPlayer.set(id, fresh);
    return fresh;
  };

  for (const event of log) {
    if (event.type === "reshuffle" || event.playerId === myId) continue;
    const player = read(event.playerId);
    if (event.type === "draw") {
      if (event.source === "open") {
        player.held.push(event.card);
        player.openPicks += 1;
      } else {
        player.closedDraws += 1;
      }
    } else {
      player.discards.push(event.card);
      // Throwing a card they were known to hold puts it back in view.
      const at = player.held.findIndex((card) => sigOf(card) === sigOf(event.card));
      if (at >= 0) player.held.splice(at, 1);
    }
  }

  return { byPlayer, heldByOpponents: [...byPlayer.values()].flatMap((player) => player.held) };
}

/** How much a card would help a particular held card: same suit one or two ranks away, or the same rank. */
function link(card: Card, held: Card): number {
  if (card.isPrintedJoker || held.isPrintedJoker) return 0;
  if (card.rank === held.rank) return card.suit === held.suit ? 0.2 : 0.8;
  if (card.suit !== held.suit) return 0;
  const a = RANK_INDEX[card.rank];
  const b = RANK_INDEX[held.rank];
  const gap = Math.min(Math.abs(a - b), a === 0 ? 13 - b : Infinity, b === 0 ? 13 - a : Infinity);
  return gap === 1 ? 1 : gap === 2 ? 0.5 : 0;
}

/**
 * How much throwing `card` would feed the opponents: the sum, over every card an opponent was seen to pick
 * up, of how well this card fits it. Each opponent counts at most once and a half, so one table-long run of
 * pickups cannot swamp everything else the advisor weighs.
 */
export function feedRisk(card: Card, reads: OpponentReads): number {
  let total = 0;
  for (const player of reads.byPlayer.values()) {
    total += Math.min(1.5, player.held.reduce((sum, held) => sum + link(card, held), 0));
  }
  return total;
}
