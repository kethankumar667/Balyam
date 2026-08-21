import type { Card, Rank } from "@shared/types";
import { suggestArrangement, suggestDiscard } from "./autoArrange";

export interface RummyHint {
  actionType: "draw" | "discard" | "declare" | "idle";
  title: string;
  description: string;
  recommendedDeck?: "open" | "closed";
  recommendedDiscardCardId?: string;
  recommendedCard?: Card;
  reason: string;
  jokerTip?: string;
}

/**
 * Pure, deterministic hint generator for Indian Rummy.
 * Analyzes the player's private hand, open pile top card, and wild joker
 * to recommend the best immediate tactical move without altering game state.
 */
export function generateRummyHint(params: {
  hand: Card[];
  wildRank: Rank;
  turnAction: "draw" | "discardOrDeclare" | null;
  canDraw: boolean;
  canDiscardOrDeclare: boolean;
  topOfOpenPile: Card | null;
  openJokerDrawable: boolean;
  isReadyToDeclare: boolean;
}): RummyHint {
  const {
    hand,
    wildRank,
    turnAction,
    canDraw,
    canDiscardOrDeclare,
    topOfOpenPile,
    openJokerDrawable,
    isReadyToDeclare,
  } = params;

  if (hand.length === 0) {
    return {
      actionType: "idle",
      title: "Waiting for Deal",
      description: "Cards are being dealt for the round.",
      reason: "No cards in hand.",
    };
  }

  // 1. If the player is ready to declare and it's their discard turn
  if (canDiscardOrDeclare && isReadyToDeclare) {
    const suggestion = suggestArrangement(hand, wildRank);
    const discardCard = suggestDiscard(suggestion.ungrouped, hand, wildRank);
    return {
      actionType: "declare",
      title: "Hand Ready to Declare! 🏆",
      description: discardCard
        ? `Select ${discardCard.rank}${discardCard.suit} and press Declare to finish.`
        : "Press Declare to submit your winning hand.",
      recommendedDiscardCardId: discardCard?.id,
      recommendedCard: discardCard ?? undefined,
      reason: "All 13 cards form valid pure/impure sequences and sets with 0 deadwood.",
    };
  }

  // 2. Draw Phase Recommendation
  if (canDraw && turnAction === "draw") {
    if (!topOfOpenPile) {
      return {
        actionType: "draw",
        title: "Draw from Closed Deck",
        description: "Open discard pile is currently empty. Draw from the closed deck.",
        recommendedDeck: "closed",
        reason: "Closed deck is the only available draw source.",
      };
    }

    const isOpenWild =
      topOfOpenPile.isPrintedJoker || topOfOpenPile.rank === wildRank;

    const currentSuggestion = suggestArrangement(hand, wildRank);
    const handWithOpenCard = [...hand, topOfOpenPile];
    const openCardSuggestion = suggestArrangement(handWithOpenCard, wildRank);

    const isPickLegal =
      !topOfOpenPile.isPrintedJoker || openJokerDrawable;

    const improvesHand =
      isPickLegal &&
      (isOpenWild ||
        openCardSuggestion.caughtPoints < currentSuggestion.caughtPoints ||
        openCardSuggestion.groups.length > currentSuggestion.groups.length);

    if (improvesHand) {
      return {
        actionType: "draw",
        title: "Pick from Open Deck 💡",
        description: `Top discard (${topOfOpenPile.rank}${topOfOpenPile.suit}) helps build your melds.`,
        recommendedDeck: "open",
        reason: isOpenWild
          ? "The open card is a Wild Joker — valuable for completing impure sequences and sets."
          : `Taking ${topOfOpenPile.rank}${topOfOpenPile.suit} reduces your deadwood points.`,
        jokerTip: isOpenWild
          ? "Remember: an open-drawn card will enter a new meld group for clarity."
          : undefined,
      };
    }

    return {
      actionType: "draw",
      title: "Draw from Closed Deck 🃏",
      description: "Draw an unseen card from the closed stockpile.",
      recommendedDeck: "closed",
      reason: `The open card (${topOfOpenPile.rank}${topOfOpenPile.suit}) does not directly benefit your hand.`,
    };
  }

  // 3. Discard Phase Recommendation
  if (canDiscardOrDeclare && turnAction === "discardOrDeclare") {
    const currentSuggestion = suggestArrangement(hand, wildRank);
    const bestDiscard = suggestDiscard(
      currentSuggestion.ungrouped,
      hand,
      wildRank
    );

    let jokerTip: string | undefined;
    const wildCount = hand.filter(
      (c) => c.rank === wildRank || c.isPrintedJoker
    ).length;
    if (wildCount > 0) {
      jokerTip = `You have ${wildCount} Wild Joker${wildCount > 1 ? "s" : ""} (${wildRank}). Ensure you have 1 Pure sequence without Jokers first.`;
    }

    if (bestDiscard) {
      return {
        actionType: "discard",
        title: "Recommended Discard",
        description: `Discard ${bestDiscard.rank}${bestDiscard.suit} (unmatched high card).`,
        recommendedDiscardCardId: bestDiscard.id,
        recommendedCard: bestDiscard,
        reason: `Discarding ${bestDiscard.rank}${bestDiscard.suit} leaves your hand with minimal deadwood points.`,
        jokerTip,
      };
    }

    return {
      actionType: "discard",
      title: "Discard a Card",
      description: "Select one high-value unmatched card to discard.",
      reason: "Reduce remaining hand points.",
      jokerTip,
    };
  }

  // 4. Idle / Opponent's Turn
  const suggestion = suggestArrangement(hand, wildRank);
  const bestDiscard = suggestDiscard(
    suggestion.ungrouped,
    hand,
    wildRank
  );

  return {
    actionType: "idle",
    title: "Hand Overview 🔎",
    description: `Current deadwood: ${suggestion.caughtPoints} pts. ${
      bestDiscard ? `Weakest card: ${bestDiscard.rank}${bestDiscard.suit}.` : ""
    }`,
    recommendedDiscardCardId: bestDiscard?.id,
    recommendedCard: bestDiscard ?? undefined,
    reason: "Plan your moves while waiting for your turn.",
  };
}
