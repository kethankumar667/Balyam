import type { UnoCard, UnoColor } from "@shared/types.js";

/**
 * How a UNO bot chooses which legal card to play.
 *
 * The bot used to play the FIRST legal card in its hand, so it burned its Wilds on turn one, ignored
 * the opponent about to win, and never thought about colour. This plays the way a good human does:
 *
 *   dump the heavy cards early   they are the penalty if someone else goes out first
 *   hold the Wilds in reserve    they are the cards that get you out of trouble, so they are spent when
 *                                you are about to win or when you must stop someone who is
 *   hit the player who is close  a +2 or Skip is worth much more against someone on two cards
 *   steer the colour             leave the table on a colour you hold plenty of, so the next turn is easy
 *   keep colour-switch options   a number card whose twin is still in hand lets you change colour later
 *
 * ── Fair play ────────────────────────────────────────────────────────
 * It sees exactly what a player at the table sees: its own hand, the card on top, and how MANY cards
 * each opponent holds. It never reads another hand. It also never bluffs a Wild Draw Four (one is only
 * legal when no card matches the current colour, and breaking that invites a challenge it cannot win).
 *
 * Pure and deterministic: the same situation always gives the same choice, which is what makes it
 * testable. Ties break on card id.
 */

export interface UnoBotView {
  /** The bot's whole hand. */
  hand: readonly UnoCard[];
  /** The cards in `hand` that may legally be played right now. */
  playable: readonly UnoCard[];
  /** The colour currently in force (the top card's, or the one a Wild called). */
  currentColor: UnoColor | null;
  /** How many cards the player who plays next is holding. */
  nextOpponentHandSize: number;
}

export interface UnoBotChoice {
  card: UnoCard;
  /** For a Wild: the colour to call. */
  color?: UnoColor;
}

const COLORS: readonly UnoColor[] = ["R", "G", "B", "Y"];

const isWild = (c: UnoCard): boolean => c.rank === "Wild" || c.rank === "Wild+4";
const isAction = (c: UnoCard): boolean => c.rank === "Skip" || c.rank === "Reverse" || c.rank === "+2";

/** What a card costs its holder when someone else goes out. */
function points(card: UnoCard): number {
  if (isWild(card)) return 50;
  if (isAction(card)) return 20;
  const n = Number(card.rank);
  return Number.isFinite(n) ? n : 0;
}

function countOf(cards: readonly UnoCard[], color: UnoColor | null): number {
  return color === null ? 0 : cards.filter((c) => c.color === color).length;
}

/** The colour to call: the one the rest of the hand holds most of, red when the hand has no colour at all. */
export function bestColor(cards: readonly UnoCard[]): UnoColor {
  let best: UnoColor = "R";
  let bestCount = -1;
  for (const color of COLORS) {
    const n = countOf(cards, color);
    if (n > bestCount) {
      best = color;
      bestCount = n;
    }
  }
  return best;
}

function scoreCard(card: UnoCard, view: UnoBotView): number {
  const remaining = view.hand.filter((c) => c.id !== card.id);
  if (remaining.length === 0) return 1_000_000; // going out wins the round

  const wild = isWild(card);
  const nearWin = view.nextOpponentHandSize <= 2;
  let score = points(card) * 0.5;

  if (wild) {
    score -= 45;
    if (remaining.length <= 1) score += 30; // one card left after this, so spend it and go out next turn
    if (nearWin) score += 35; // someone is about to win, so this is the moment
    // A Wild Draw Four is only legal with no card of the current colour; anything else is a bluff that can be challenged.
    if (card.rank === "Wild+4" && countOf(view.hand, view.currentColor) > 0) score -= 500;
  }

  if (isAction(card)) {
    score += view.nextOpponentHandSize <= 3 ? 60 : 12;
    if (card.rank === "+2" && nearWin) score += 25;
  }

  const leavesOn: UnoColor | null = wild ? bestColor(remaining) : card.color;
  score += 5 * countOf(remaining, leavesOn);

  if (!wild && !isAction(card)) score += 3 * remaining.filter((c) => c.rank === card.rank).length;

  return score;
}

/** The best legal card, or `null` when none can be played (the bot must draw). */
export function chooseUnoCard(view: UnoBotView): UnoBotChoice | null {
  if (view.playable.length === 0) return null;

  let best: UnoCard | null = null;
  let bestScore = -Infinity;
  for (const card of view.playable) {
    const s = scoreCard(card, view);
    if (s > bestScore || (s === bestScore && best !== null && card.id < best.id)) {
      best = card;
      bestScore = s;
    }
  }
  if (!best) return null;

  const remaining = view.hand.filter((c) => c.id !== best!.id);
  return isWild(best) ? { card: best, color: bestColor(remaining) } : { card: best };
}
