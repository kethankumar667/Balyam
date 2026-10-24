import type { Card, CoachHint } from "@shared/types";

/**
 * What approving a coach hint does to the player's hand.
 *
 * The server's hint names cards by id: the groups to form and, when it is a discard or a show, the card to
 * throw. This turns that into the three piles the board lays out, and notices when the hand has moved on since
 * the hint was made (the AFK safety net can play a turn while a hint is open), because applying a plan that
 * names a card no longer held would leave an empty meld box on the table.
 */
export interface HintPlan {
  /** The groups the coach would form. */
  groups: Card[][];
  /** Every other card in the hand, the card to throw included. */
  ungrouped: Card[];
  /** The card to select for discarding, if the coach named one. */
  discard: Card | null;
  /** The card just taken from the open pile, kept as its own group so it stays easy to spot. */
  openPickup: Card | null;
  /** The just-drawn open card is part of a suggested group, so it cannot be kept apart. */
  pickupInGroup: boolean;
  /** The hint names a card that is no longer in the hand. */
  stale: boolean;
}

const EMPTY: HintPlan = { groups: [], ungrouped: [], discard: null, openPickup: null, pickupInGroup: false, stale: false };

function discardIdOf(hint: CoachHint): string | null {
  const action = hint.action;
  if (action?.type === "discard") return action.cardId;
  if (action?.type === "declare") return action.discardCardId;
  return null;
}

export function planFromHint(hint: CoachHint, hand: ReadonlyMap<string, Card>, openPickupId: string | null): HintPlan {
  const groupIds = hint.groups ?? [];
  const discardId = discardIdOf(hint);
  const named = [...groupIds.flat(), ...(discardId ? [discardId] : [])];
  if (named.some((id) => !hand.has(id))) return { ...EMPTY, stale: true };

  const groups = groupIds.map((ids) => ids.map((id) => hand.get(id) as Card)).filter((cards) => cards.length > 0);
  const grouped = new Set(groups.flat().map((card) => card.id));
  const pickupInGroup = openPickupId !== null && grouped.has(openPickupId);
  const openPickup = openPickupId !== null && !pickupInGroup ? (hand.get(openPickupId) ?? null) : null;
  const ungrouped = [...hand.values()].filter((card) => !grouped.has(card.id) && card.id !== openPickup?.id);

  return {
    groups,
    ungrouped,
    discard: discardId ? (hand.get(discardId) ?? null) : null,
    openPickup,
    pickupInGroup,
    stale: false,
  };
}

/** Whether approving would change anything on the table: a hint with no groups and no discard has nothing to apply. */
export const hasPlan = (plan: HintPlan): boolean => plan.groups.length > 0 || plan.discard !== null;
