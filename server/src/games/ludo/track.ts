import type { LudoColor } from "@shared/types.js";

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

/** Position where each color enters the track when leaving the yard. */
export function colorStartFor(color: LudoColor, _playerCount: number): number {
  const idx = PLAYER_COLORS_ORDER.indexOf(color);
  return idx * CELLS_PER_WEDGE;
}

/**
 * Safe squares: every wedge's start cell and its mid-wedge star (start + 8).
 *
 * Keyed to the BOARD, not to who happens to be playing. The board always
 * draws a full set of wedges — a 2-player cross board still shows all four
 * arms with all eight stars — so scoping safety to `activeColors` made stars
 * belonging to absent colors look protective while offering no protection at
 * all. A token parked on a drawn star could be captured, which is precisely
 * the opposite of what the star means to a player.
 *
 * `activeColors` is retained for call-site compatibility and is deliberately
 * unused: safety is a property of the square, identical for everyone.
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

export function lastTrackPosFor(color: LudoColor, playerCount: number): number {
  const tl = trackLengthFor(playerCount);
  return (colorStartFor(color, playerCount) + tl - divertOffsetFor(playerCount)) % tl;
}
