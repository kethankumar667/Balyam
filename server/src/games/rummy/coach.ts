import type { Card, CoachHint, Rank } from "@shared/types.js";
import { bestArrangementForScoring } from "./score.js";
import { findValidDeclaration, pickBestDiscard, shouldDrawFromOpen } from "./botArrange.js";

/**
 * Rummy coach.
 *
 * Deliberately thin. Every judgement here already existed for the bot AI —
 * `findValidDeclaration`, `pickBestDiscard`, `shouldDrawFromOpen`,
 * `bestArrangementForScoring`. Writing a second, separate "hint intelligence"
 * would mean two engines that can disagree about the same hand, and the one
 * the player sees would be the one nobody tested against real rounds.
 *
 * So the coach's only real job is translation: turn a bot decision into a
 * sentence that explains itself. The teaching is in `detail`, not in the
 * recommendation — a beginner who is told "discard the K♦" learns nothing,
 * and a beginner who is told why learns the shape of the game.
 */

function cardLabel(card: Card): string {
  const suit = { S: "♠", H: "♥", D: "♦", C: "♣" }[card.suit] ?? card.suit;
  return `${card.rank}${suit}`;
}

function labelsOf(cards: Card[]): string {
  return cards.map(cardLabel).join(" ");
}

export interface RummyHintInput {
  hand: Card[];
  wildJokerRank: Rank;
  /** Whether it is this player's turn, and which half of it. */
  isMyTurn: boolean;
  turnAction: "draw" | "discardOrDeclare";
  /** Top of the open pile, or null when it is empty. */
  openTop: Card | null;
}

export function rummyHint(input: RummyHintInput): CoachHint {
  const { hand, wildJokerRank, isMyTurn, turnAction, openTop } = input;

  if (hand.length === 0) {
    return {
      kind: "wait",
      headline: "Nothing to work with yet",
      detail: "Your hand is empty — wait for the deal.",
      highlight: [],
    };
  }

  const arrangement = bestArrangementForScoring(hand, wildJokerRank);
  const groups = arrangement.melds.map((m) => m.map((c) => c.id));

  // Off-turn the coach still shows the grouping. Planning while an opponent
  // thinks is the single biggest thing good players do that beginners don't,
  // so the button is most useful exactly when it is not your move.
  if (!isMyTurn) {
    return {
      kind: "wait",
      headline: describeShape(arrangement.hasPureSequence, arrangement.hasSecondSequence),
      detail: arrangement.melds.length
        ? `Best grouping so far: ${arrangement.melds.map(labelsOf).join(" | ")}. Plan your discard before your turn starts.`
        : "No melds yet. Look for three cards in a row in one suit — that pure sequence is mandatory.",
      highlight: arrangement.melds.flat().map((c) => c.id),
      groups,
    };
  }

  if (turnAction === "draw") {
    const takeOpen = openTop ? shouldDrawFromOpen(hand, openTop, wildJokerRank) : false;
    return {
      kind: "draw",
      headline: takeOpen && openTop ? `Take ${cardLabel(openTop)} from the open pile` : "Draw from the closed deck",
      detail:
        takeOpen && openTop
          ? `${cardLabel(openTop)} extends a group you are already building, which is worth more than an unknown card.`
          : openTop
          ? `${cardLabel(openTop)} does not help any group you hold. An unknown card from the closed deck has better odds.`
          : "The open pile is empty, so the closed deck is your only option.",
      highlight: arrangement.melds.flat().map((c) => c.id),
      groups,
    };
  }

  // discardOrDeclare — the decision that actually wins or loses the round.
  const declaration = findValidDeclaration(hand, wildJokerRank);
  if (declaration) {
    const toss = hand.find((c) => c.id === declaration.discardCardId);
    return {
      kind: "declare",
      headline: "You can declare — every card is in a valid meld",
      detail: `Discard ${toss ? cardLabel(toss) : "the spare card"} and declare. Check the grouping first: a wrong show costs the full penalty.`,
      highlight: [declaration.discardCardId],
      groups: declaration.melds.map((g) => g.map((c) => c.id)),
    };
  }

  const discardId = pickBestDiscard(hand, wildJokerRank);
  const discard = hand.find((c) => c.id === discardId);
  return {
    kind: "discard",
    headline: discard ? `Discard ${cardLabel(discard)}` : "Discard your least useful card",
    detail: discard
      ? `${cardLabel(discard)} is the card doing least for your hand${
          arrangement.hasPureSequence
            ? ""
            : " — and you still need a pure sequence, so keep same-suit runs together"
        }. ${describeGap(arrangement.hasPureSequence, arrangement.hasSecondSequence)}`
      : "Drop the high card that belongs to no group.",
    highlight: discard ? [discard.id] : [],
    groups,
  };
}

function describeShape(hasPure: boolean, hasSecond: boolean): string {
  if (hasPure && hasSecond) return "You have both sequences — build sets now";
  if (hasPure) return "Pure sequence done — find a second sequence";
  return "No pure sequence yet — that is the priority";
}

function describeGap(hasPure: boolean, hasSecond: boolean): string {
  if (!hasPure) return "A pure sequence (no joker) is required before anything else counts.";
  if (!hasSecond) return "You need a second sequence before your sets can be credited.";
  return "Both sequences are done, so the rest of your cards can go into sets.";
}
