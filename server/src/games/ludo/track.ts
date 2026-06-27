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

/** Safe squares: each color's start + mid-wedge safe (start + 8) per active color. */
export function safeSquaresFor(activeColors: LudoColor[], playerCount: number): Set<number> {
  const tl = trackLengthFor(playerCount);
  const out = new Set<number>();
  for (const c of activeColors) {
    const s = colorStartFor(c, playerCount);
    out.add(s);
    out.add((s + 8) % tl);
  }
  return out;
}

export function lastTrackPosFor(color: LudoColor, playerCount: number): number {
  const tl = trackLengthFor(playerCount);
  return (colorStartFor(color, playerCount) + tl - 1) % tl;
}
