import type { LudoColor, LudoToken } from "./types.js";

/**
 * Ludo rules — the ONE definition of the track and of where a move lands.
 *
 * Both ends need these. The server needs them to be authoritative; the client
 * needs them to draw the hover preview, to animate a token step-by-step, and
 * to know which cells exist. Until now each end kept its own copy:
 * `server/src/games/ludo/track.ts` and `client/src/games/ludo/board-layout.ts`
 * + `predict.ts`, with a comment asking future readers to keep them in sync.
 *
 * They did not stay in sync. Two real bugs came out of exactly that:
 *
 *   1. The home-stretch divert point was off by one on the cross board and had
 *      to be fixed in BOTH files; nothing would have caught it if only one had
 *      been changed.
 *   2. `predictDestination` applied Mandatory Capture unconditionally while
 *      the engine gated it on `options.mandatoryCapture` — so in a room with
 *      the option off, the hover preview showed a token sailing past its own
 *      home entrance when the engine would have turned it in.
 *
 * Anything here is a RULE. Pixel geometry (which grid cell a track index maps
 * to) stays in the client, because the server has no opinion about pixels.
 */

/**
 * Track is segmented into N "wedges" of 13 cells each, where N is the player
 * count (clamped to a minimum of 4 so the classic 2-4 player cross board keeps
 * its 52-cell track). For 5-8 players the track scales to 13*N cells laid out
 * along a regular N-gon.
 */
export const CELLS_PER_WEDGE = 13;
export const STRETCH_LENGTH = 6;

/** All 8 colors in canonical play order. */
export const PLAYER_COLORS_ORDER: LudoColor[] = [
  "red", "green", "yellow", "blue",
  "purple", "cyan", "orange", "brown",
];

/** Effective number of wedges used for track sizing. */
export function wedgeCountFor(playerCount: number): number {
  return Math.max(4, playerCount);
}

export function trackLengthFor(playerCount: number): number {
  return CELLS_PER_WEDGE * wedgeCountFor(playerCount);
}

/** Inverse of `trackLengthFor`, for callers that only carry a track length. */
export function playerCountFromTrackLength(trackLength: number): number {
  return Math.max(4, Math.round(trackLength / CELLS_PER_WEDGE));
}

/** Position where each color enters the track when leaving the yard. */
export function colorStartFor(color: LudoColor, _playerCount?: number): number {
  const idx = PLAYER_COLORS_ORDER.indexOf(color);
  return idx * CELLS_PER_WEDGE;
}

/**
 * Safe squares: every wedge's start cell and its mid-wedge star (start + 8).
 *
 * Keyed to the BOARD, not to who happens to be playing. The board always
 * draws a full set of wedges — a 2-player cross board still shows all four
 * arms with all eight stars — so scoping safety to the seated colors made
 * stars belonging to absent colors look protective while offering no
 * protection at all. A token parked on a drawn star could be captured, which
 * is precisely the opposite of what the star means to a player.
 */
export function safeSquaresFor(_activeColors: LudoColor[], playerCount: number): Set<number> {
  const tl = trackLengthFor(playerCount);
  const wedges = wedgeCountFor(playerCount);
  const out = new Set<number>();
  for (let w = 0; w < wedges; w++) {
    const s = w * CELLS_PER_WEDGE;
    out.add(s);
    out.add((s + 8) % tl);
  }
  return out;
}

/**
 * How many cells BEFORE its own start square a color diverts into its home
 * stretch. This differs between the two board geometries, and conflating them
 * was a real routing bug on the cross board.
 *
 *   • Cross board (2-4 players, 15x15 grid): the ring's last cell before a
 *     color's start sits on the OUTER edge, one row away from that color's
 *     lane — a token there can only step onto its own start square and lap
 *     forever. The lane is fed by the cell before it. Diverting at start-2
 *     is both the adjacent cell and the canonical 57-step journey
 *     (51 ring + 6 stretch).
 *
 *   • Polygon boards (5-8 players): each arm is 6 out-column + 1 tip +
 *     6 in-column, and start-1 IS the in-column's outermost cell, from which
 *     a finishing token sidesteps into the lane's arrow cell. See the
 *     "Engine compatibility" note at the top of client print-board.ts.
 *
 * Verified geometrically: on the cross board start-2 is orthogonally adjacent
 * to stretch[0] for all four colors, start-1 is two cells away.
 */
export function divertOffsetFor(playerCount: number): number {
  return playerCount <= 4 ? 2 : 1;
}

/** The last track cell a color occupies before turning into its home stretch. */
export function lastTrackPosFor(color: LudoColor, playerCount: number): number {
  const tl = trackLengthFor(playerCount);
  return (colorStartFor(color, playerCount) + tl - divertOffsetFor(playerCount)) % tl;
}

/**
 * Final standings for a table: everyone who placed, in order, then whoever
 * never placed (at most one, since the game ends when all but one are home).
 *
 * Sorting by `finishedCount` alone is NOT enough — every placed player has 4,
 * so their relative order would be arbitrary. `finishOrder` is the only record
 * of who actually got there first.
 */
export function standingsFor(
  playerOrder: string[],
  finishOrder: string[],
  finishedCount: Record<string, number>,
): string[] {
  const placed = finishOrder.filter((id) => playerOrder.includes(id));
  const rest = playerOrder
    .filter((id) => !placed.includes(id))
    .sort((a, b) => (finishedCount[b] ?? 0) - (finishedCount[a] ?? 0));
  return [...placed, ...rest];
}

/** "1st" / "2nd" / "3rd" / "4th" ... */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export type LudoDestination =
  | { state: "track"; trackPos: number }
  | { state: "stretch"; stretchPos: number }
  | { state: "home" };

export interface LudoMoveContext {
  /** The moving token's BOARD ARM — geometry, not the color it is painted. */
  color: LudoColor;
  playerCount: number;
  /** Room option: a token may not enter its home stretch before capturing. */
  mandatoryCapture: boolean;
  /** Whether this player has already captured in this game. */
  hasCaptured: boolean;
}

/**
 * Where `token` lands on `dice`, or null if the move is illegal.
 *
 * Pure and total — no engine state, no DOM. The server calls it to decide the
 * move; the client calls it to predict the same move. If they ever disagree,
 * the hover preview lies to the player, so this must have exactly one body.
 */
export function resolveDestination(
  token: Pick<LudoToken, "state" | "trackPos" | "stretchPos">,
  dice: number,
  ctx: LudoMoveContext,
): LudoDestination | null {
  const TL = trackLengthFor(ctx.playerCount);

  if (token.state === "yard") {
    // Only a six frees a token from the yard.
    if (dice !== 6) return null;
    return { state: "track", trackPos: colorStartFor(ctx.color, ctx.playerCount) };
  }

  if (token.state === "stretch") {
    const next = (token.stretchPos ?? 0) + dice;
    // Home must be reached exactly; overshooting is not a legal move.
    if (next > STRETCH_LENGTH) return null;
    if (next === STRETCH_LENGTH) return { state: "home" };
    return { state: "stretch", stretchPos: next };
  }

  if (token.state === "track") {
    const last = lastTrackPosFor(ctx.color, ctx.playerCount);
    const cur = token.trackPos ?? 0;
    const distToLast = (last - cur + TL) % TL;

    // Still short of the turn-off: plain travel along the ring.
    if (dice <= distToLast) return { state: "track", trackPos: (cur + dice) % TL };

    // Mandatory Capture: until this player has captured once, their tokens
    // must sail PAST their own entrance and go round again.
    if (ctx.mandatoryCapture && !ctx.hasCaptured) {
      return { state: "track", trackPos: (cur + dice) % TL };
    }

    const intoStretch = dice - distToLast;
    if (intoStretch > STRETCH_LENGTH) return null;
    if (intoStretch === STRETCH_LENGTH) return { state: "home" };
    return { state: "stretch", stretchPos: intoStretch - 1 };
  }

  // "home" — already finished, nothing to do.
  return null;
}
