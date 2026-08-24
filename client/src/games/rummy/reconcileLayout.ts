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
 * In Rummy, drawn cards (whether from the open pile or closed deck) must NEVER
 * silently merge into a player's carefully arranged pure sequences, sequences,
 * or sets — doing so invalidates melds and frustrates players.
 *
 * Every newly-incoming card ALWAYS starts its own dedicated group at the end of the hand,
 * or appends to the trailing loose-cards group if MAX_MELD_GROUPS is reached.
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

    if (newGroups.length < maxGroups) {
      newGroups.push({ id: newGroupId(), cardIds: [id] });
    } else if (newGroups.length > 0) {
      // Append to the last (loose/trailing) group, NEVER to newGroups[0] (which is typically the pure sequence)
      newGroups[newGroups.length - 1].cardIds.push(id);
    } else {
      newGroups.push({ id: newGroupId(), cardIds: [id] });
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
 * Redistributes a known set of card ids among existing meld groups — used
 * when a player dismisses ("ungroups") a meld and its cards need a new home.
 *
 * Ungrouped cards must NEVER be silently shoved into existing pure sequences or
 * sets. Each card from the dismissed group receives its own group, or folds
 * into the last group if maxGroups is reached.
 */
export function redistributeCards(
  groups: MeldGroup[],
  cardIds: string[],
  byId: Map<string, Card>,
  openPickupId: string | null,
  newGroupId: () => string,
  maxGroups: number = MAX_MELD_GROUPS,
): MeldGroup[] {
  const updatedGroups = groups.map((g) => ({ ...g, cardIds: [...g.cardIds] }));
  for (const id of cardIds) {
    if (updatedGroups.length < maxGroups) {
      updatedGroups.push({ id: newGroupId(), cardIds: [id] });
    } else if (updatedGroups.length > 0) {
      updatedGroups[updatedGroups.length - 1].cardIds.push(id);
    } else {
      updatedGroups.push({ id: newGroupId(), cardIds: [id] });
    }
  }
  return updatedGroups;
}
