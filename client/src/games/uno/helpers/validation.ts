import type { UnoCard, UnoColor } from "@shared/types";

/**
 * Check if a card can be played on top of another card.
 * Used to pre-compute valid moves and disable invalid buttons on the client.
 *
 * Note: Server performs authoritative validation. This is for UI only.
 */
export function canPlayCard(
  card: UnoCard,
  topCard: UnoCard,
  currentColor: UnoColor | null
): boolean {
  // Wild and Wild+4 are always playable
  if (card.rank === "Wild" || card.rank === "Wild+4") {
    return true;
  }

  // If top card is Wild/Wild+4, must match chosen color
  if (topCard.rank === "Wild" || topCard.rank === "Wild+4") {
    return card.color === currentColor;
  }

  // Otherwise, match color OR rank
  return card.color === topCard.color || card.rank === topCard.rank;
}

/**
 * Filter a hand to show only playable cards.
 */
export function getPlayableCards(
  hand: UnoCard[],
  topCard: UnoCard,
  currentColor: UnoColor | null
): UnoCard[] {
  return hand.filter((card) => canPlayCard(card, topCard, currentColor));
}

/**
 * Check if a card requires a color choice.
 */
export function requiresColorChoice(card: UnoCard): boolean {
  return card.rank === "Wild" || card.rank === "Wild+4";
}

/**
 * Validate that a color has been chosen for a Wild card.
 */
export function isColorChosen(card: UnoCard, chosenColor: UnoColor | null): boolean {
  if (!requiresColorChoice(card)) return true;
  return chosenColor !== null;
}

/**
 * Check if player can pass (only after drawing).
 */
export function canPass(drewLastTurn: boolean): boolean {
  return drewLastTurn;
}
