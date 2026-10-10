import type { LudoColor, LudoToken } from "@shared/types.js";
import {
  STRETCH_LENGTH,
  colorStartFor,
  divertOffsetFor,
  lastTrackPosFor,
  resolveDestination,
  safeSquaresFor,
  trackLengthFor,
  type LudoDestination,
} from "@shared/ludo-rules.js";

/**
 * Which Ludo token a bot moves.
 *
 * The old bot scored a destination by counting rivals "within six squares" and gave a bonus for stacking
 * two of its own tokens. Two of those ideas are wrong in this engine:
 *
 *   - A capture here takes EVERY enemy token on the square, so a stack is not a defence, it is two pieces
 *     lost to one roll. Stacking on an unsafe square is a liability, and the old bonus walked into it.
 *   - Danger was a head count. It did not know that a rival can only reach a square it has not already
 *     turned off before (tokens leave the ring for their own home stretch), that a rival one square behind
 *     is exactly as dangerous as one six squares behind (a 1-in-6 roll either way), or that rivals in the
 *     yard threaten the squares just past their start after a six.
 *
 * This values each legal move as
 *
 *     what it wins now  (a capture and the extra roll it earns, a token home, a token released, ground gained)
 *   + what it threatens (rivals it would sit just behind)
 *   - what the position then risks (chance a rival hits each of my tokens before I move again, times what
 *     that token is worth, stacks counted once per piece)
 *
 * and plays the best. It reads only the position, so the same position always gives the same move; ties fall
 * to the earlier token id.
 */

/** Cost of a token having to start again: it needs a six to come out. */
const BASE_TOKEN_VALUE = 60;
/** A token is worth more the further round it has travelled. */
const VALUE_PER_CELL = 7;
/** A capture and a token home each give another roll. */
const EXTRA_ROLL_VALUE = 90;
const HOME_VALUE = 600;
const PROGRESS_PER_CELL = 4;
const YARD_RELEASE_VALUE = 55;
const YARD_RELEASE_PER_WAITING_TOKEN = 20;
const THREAT_WEIGHT = 0.3;
const ONE_ROLL = 1 / 6;
/** A six then a second roll: about 1 in 36. */
const SIX_THEN_ROLL = 1 / 36;

export interface LudoSeatView {
  /** The board arm (geometry), not the paint colour. */
  arm: LudoColor;
  tokens: readonly LudoToken[];
  /** Whether this seat has captured yet (matters under mandatory capture). */
  hasCaptured: boolean;
}

export interface LudoPositionView {
  playerCount: number;
  dice: number;
  /** The bot's own seat, tokens as they stand now. */
  mine: LudoSeatView;
  /** Every other seat still in the game. */
  rivals: readonly LudoSeatView[];
  /** Ids of the tokens that can legally move on this roll. */
  movable: readonly string[];
  mandatoryCapture: boolean;
  noSafeSquares: boolean;
}

interface Piece {
  token: LudoToken;
  /** Cells travelled from its own start; -1 in the yard. */
  path: number;
}

/** How far a token has travelled along its own route, from the yard (-1) to home. */
function pathIndex(token: LudoToken, arm: LudoColor, playerCount: number): number {
  const length = trackLengthFor(playerCount);
  if (token.state === "yard") return -1;
  const lastOnRing = length - divertOffsetFor(playerCount);
  if (token.state === "track") return ((((token.trackPos ?? 0) - colorStartFor(arm, playerCount)) % length) + length) % length;
  if (token.state === "stretch") return lastOnRing + 1 + (token.stretchPos ?? 0);
  return lastOnRing + 1 + STRETCH_LENGTH;
}

const worthOf = (path: number): number => BASE_TOKEN_VALUE + VALUE_PER_CELL * Math.max(0, path);

/** Whether a ring square protects whoever stands on it. */
function safetyOf(view: LudoPositionView): (position: number) => boolean {
  const colors = [view.mine.arm, ...view.rivals.map((r) => r.arm)];
  const protectedByBoard = safeSquaresFor(colors, view.playerCount);
  if (!view.noSafeSquares) return (position) => protectedByBoard.has(position);
  // "No safe squares" leaves only the seated colours' start squares protected.
  const starts = new Set(colors.map((arm) => colorStartFor(arm, view.playerCount)));
  return (position) => starts.has(position);
}

/** Chance that one rival's next turn lands on `target`, counting a six followed by another roll. */
function chanceRivalHits(rival: LudoSeatView, target: number, view: LudoPositionView, yardTokens: number): number {
  const length = trackLengthFor(view.playerCount);
  const last = lastTrackPosFor(rival.arm, view.playerCount);
  const canSailPast = view.mandatoryCapture && !rival.hasCaptured;
  const direct = new Set<number>();
  const afterSix = new Set<number>();

  for (const token of rival.tokens) {
    if (token.state !== "track" || token.trackPos == null) continue;
    const distance = (target - token.trackPos + length) % length;
    if (distance === 0) continue;
    // A rival turns off the ring at `last`; it cannot reach anything beyond it, unless it must sail past.
    const reach = (last - token.trackPos + length) % length;
    if (!canSailPast && distance > reach) continue;
    if (distance <= 6) direct.add(distance);
    else if (distance <= 12) afterSix.add(distance - 6);
  }

  let chance = direct.size * ONE_ROLL + afterSix.size * SIX_THEN_ROLL;
  // A rival with a token still in the yard comes out on a six and rolls again from its start square.
  if (yardTokens > 0) {
    const fromStart = (target - colorStartFor(rival.arm, view.playerCount) + length) % length;
    if (fromStart >= 1 && fromStart <= 6) chance += SIX_THEN_ROLL;
  }
  return Math.min(1, chance);
}

/** Expected loss over my tokens on the ring if play stopped here and the rivals rolled once each. */
function expectedLoss(
  mine: readonly Piece[],
  rivals: readonly LudoSeatView[],
  rivalYard: readonly number[],
  view: LudoPositionView,
  isSafe: (position: number) => boolean,
): number {
  const squares = new Map<number, number>();
  for (const piece of mine) {
    if (piece.token.state !== "track" || piece.token.trackPos == null) continue;
    squares.set(piece.token.trackPos, (squares.get(piece.token.trackPos) ?? 0) + worthOf(piece.path));
  }
  let loss = 0;
  for (const [square, worth] of squares) {
    if (isSafe(square)) continue;
    let escape = 1;
    rivals.forEach((rival, i) => {
      escape *= 1 - chanceRivalHits(rival, square, view, rivalYard[i]);
    });
    loss += (1 - escape) * worth;
  }
  return loss;
}

/** What taking these rival tokens is worth, including the extra roll a capture earns. */
function captureValue(taken: readonly { path: number }[]): number {
  return taken.reduce((sum, t) => sum + worthOf(t.path), 0) + EXTRA_ROLL_VALUE;
}

/** The token id to move, or `null` when nothing is movable. */
export function chooseLudoToken(view: LudoPositionView): string | null {
  const candidates = view.mine.tokens.filter((t) => view.movable.includes(t.id));
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].id;

  const length = trackLengthFor(view.playerCount);
  const isSafe = safetyOf(view);
  const ctx = {
    color: view.mine.arm,
    playerCount: view.playerCount,
    mandatoryCapture: view.mandatoryCapture,
    hasCaptured: view.mine.hasCaptured,
  };
  const waiting = view.mine.tokens.filter((t) => t.state === "yard").length;

  let best: { id: string; score: number } | null = null;
  for (const token of candidates) {
    const dest: LudoDestination | null = resolveDestination(token, view.dice, ctx);
    if (!dest) continue;

    // The board after this move: my token moved, any rival tokens on an unsafe landing square sent back.
    const moved: LudoToken =
      dest.state === "track"
        ? { ...token, state: "track", trackPos: dest.trackPos }
        : dest.state === "stretch"
          ? { ...token, state: "stretch", stretchPos: dest.stretchPos }
          : { ...token, state: "home" };
    const mineAfter: Piece[] = view.mine.tokens.map((t) => {
      const next = t.id === token.id ? moved : t;
      return { token: next, path: pathIndex(next, view.mine.arm, view.playerCount) };
    });

    const taken: { path: number }[] = [];
    const rivalsAfter: LudoSeatView[] = view.rivals.map((rival) => ({
      ...rival,
      tokens: rival.tokens.map((rt): LudoToken => {
        const captured =
          dest.state === "track" && !isSafe(dest.trackPos) && rt.state === "track" && rt.trackPos === dest.trackPos;
        if (!captured) return rt;
        taken.push({ path: pathIndex(rt, rival.arm, view.playerCount) });
        return { id: rt.id, color: rt.color, state: "yard" };
      }),
    }));
    const rivalYard = rivalsAfter.map((r) => r.tokens.filter((t) => t.state === "yard").length);

    // What the move wins now.
    let score = PROGRESS_PER_CELL * (pathIndex(moved, view.mine.arm, view.playerCount) - pathIndex(token, view.mine.arm, view.playerCount));
    if (token.state === "yard") score += YARD_RELEASE_VALUE + YARD_RELEASE_PER_WAITING_TOKEN * (waiting - 1);
    if (dest.state === "home") score += HOME_VALUE + EXTRA_ROLL_VALUE;
    if (taken.length > 0) score += captureValue(taken);

    // What it threatens: rivals sitting 1-6 squares ahead of where I now stand, on squares that can be taken.
    if (dest.state === "track") {
      let threatened = 0;
      for (const rival of rivalsAfter) {
        for (const rt of rival.tokens) {
          if (rt.state !== "track" || rt.trackPos == null || isSafe(rt.trackPos)) continue;
          const gap = (rt.trackPos - dest.trackPos + length) % length;
          if (gap >= 1 && gap <= 6) threatened += worthOf(pathIndex(rt, rival.arm, view.playerCount)) * ONE_ROLL;
        }
      }
      score += THREAT_WEIGHT * threatened;
    }

    // What the position then risks.
    score -= expectedLoss(mineAfter, rivalsAfter, rivalYard, view, isSafe);

    if (!best || score > best.score) best = { id: token.id, score };
  }
  return best?.id ?? candidates[0].id;
}
