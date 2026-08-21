import type { Card } from "@shared/types";
import { splitBySuit } from "./autoArrange";

export interface MeldGroup {
  id: string;
  cardIds: string[];
}

export interface Layout {
  groups: MeldGroup[];
  ungrouped: string[];
}

export const MAX_MELD_GROUPS = 7;

/**
 * Fresh reconciliation — used the moment there are no surviving groups to
 * carry forward: the initial deal, or the first reconciliation pass after
 * a remount mid-turn (page refresh, reconnect, or the board swapping
 * between RummyBoardDesktop/RummyBoardMobile at a viewport breakpoint).
 *
 * Splits the hand into suit lanes, EXCEPT the open-deck pickup (if any),
 * which is carved out first and always gets its own dedicated group — the
 * open-deck placement rule must hold even on a fresh mount, not just on a
 * continuing hand, which is why this takes `openPickupId` at all rather
 * than only being reachable through {@link appendIncomingCards}.
 */
export function freshMeldLayout(
  hand: Card[],
  openPickupId: string | null,
  newGroupId: () => string,
  maxGroups: number = MAX_MELD_GROUPS,
): Layout {
  const rest = openPickupId ? hand.filter((c) => c.id !== openPickupId) : hand;
  const suitLanes = splitBySuit(rest);
  const groups = suitLanes.slice(0, maxGroups - (openPickupId ? 1 : 0)).map((cards) => ({
    id: newGroupId(),
    cardIds: cards.map((c) => c.id),
  }));
  if (openPickupId) groups.push({ id: newGroupId(), cardIds: [openPickupId] });
  return { groups, ungrouped: [] };
}

/**
 * Steady-state reconciliation — appends newly-incoming card ids onto
 * existing groups (mutating none of them; returns a new array).
 *
 * A card drawn from the open deck (`id === openPickupId`) ALWAYS starts a
 * brand new group — the entire point of this module: an open-pile pickup
 * must never silently merge into an existing sequence/set/pile just
 * because it happens to share a suit. Every other incoming card (a
 * closed-deck draw, whose identity carries no strategic information worth
 * protecting) aligns with an existing same-suit group when one exists, or
 * starts a new one, or — once `maxGroups` is reached — folds into the
 * first group rather than growing an unbounded number of piles.
 */
export function appendIncomingCards(
  groups: MeldGroup[],
  incoming: string[],
  byId: Map<string, Card>,
  openPickupId: string | null,
  newGroupId: () => string,
  maxGroups: number = MAX_MELD_GROUPS,
): MeldGroup[] {
  const newGroups = groups.map((g) => ({ ...g, cardIds: [...g.cardIds] }));
  for (const id of incoming) {
    const card = byId.get(id);
    if (!card) continue;

    if (id === openPickupId) {
      newGroups.push({ id: newGroupId(), cardIds: [id] });
      continue;
    }

    const matchingGroup = newGroups.find((g) => {
      const firstCard = byId.get(g.cardIds[0]);
      return firstCard && firstCard.suit === card.suit;
    });
    if (matchingGroup) {
      matchingGroup.cardIds.push(id);
    } else if (newGroups.length < maxGroups) {
      newGroups.push({ id: newGroupId(), cardIds: [id] });
    } else if (newGroups.length > 0) {
      newGroups[0].cardIds.push(id);
    }
  }
  return newGroups;
}

/**
 * Converts an approved Smart Hint suggestion into meld groups, enforcing the
 * same open-deck isolation invariant as {@link appendIncomingCards} and
 * {@link freshMeldLayout}.
 *
 * `suggestArrangement` (the hint's combinatorial optimizer) has no concept
 * of the open-deck pickup — callers must exclude it before generating a
 * suggestion — but without this step the pickup card would simply be
 * missing from the applied layout. It always gets appended as its own
 * dedicated group, exactly where the rest of this module puts it, so a
 * player can never end up unable to tell a just-drawn open-deck card apart
 * from cards that were already sitting in a meld.
 */
export function applyHintSuggestion(
  suggestionGroups: Card[][],
  ungrouped: Card[],
  openPickupCard: Card | null,
  newGroupId: () => string,
): MeldGroup[] {
  const groups: MeldGroup[] = suggestionGroups.map((cards) => ({
    id: newGroupId(),
    cardIds: cards.map((c) => c.id),
  }));
  if (ungrouped.length > 0) {
    groups.push({ id: newGroupId(), cardIds: ungrouped.map((c) => c.id) });
  }
  if (openPickupCard) {
    groups.push({ id: newGroupId(), cardIds: [openPickupCard.id] });
  }
  return groups;
}

/**
 * Redistributes a known set of card ids among existing meld groups by
 * suit-matching — used when a player dismisses ("ungroups") a meld and its
 * cards need a new home.
 *
 * Enforces the same open-deck isolation invariant as
 * {@link appendIncomingCards}: if the open-deck pickup is among the cards
 * being redistributed, it's excluded from suit-matching entirely — both as
 * a card to place AND as a target other cards could land next to — and
 * always ends up back in its own dedicated group. Without this, dismissing
 * the pickup's own one-card meld (the obvious thing to do with a lone card
 * that looks like a mistake) would silently fold it into whatever
 * same-suit meld it best matched, exactly like an unguarded Smart Hint or
 * reconciliation pass would.
 */
export function redistributeCards(
  groups: MeldGroup[],
  cardIds: string[],
  byId: Map<string, Card>,
  openPickupId: string | null,
  newGroupId: () => string,
): MeldGroup[] {
  const updatedGroups = groups.map((g) => ({ ...g, cardIds: [...g.cardIds] }));
  for (const id of cardIds) {
    if (id === openPickupId) continue;
    const card = byId.get(id);
    const match = updatedGroups.find((g) => {
      const firstCard = byId.get(g.cardIds[0]);
      return firstCard && card && firstCard.suit === card.suit;
    });
    if (match) {
      match.cardIds.push(id);
    } else if (updatedGroups.length > 0) {
      updatedGroups[0].cardIds.push(id);
    }
  }
  if (openPickupId && cardIds.includes(openPickupId)) {
    updatedGroups.push({ id: newGroupId(), cardIds: [openPickupId] });
  }
  return updatedGroups;
}
