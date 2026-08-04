import type { LudoColor } from "@shared/types";
import {
  PLAYER_COLORS_ORDER as SHARED_COLORS,
  colorStartFor as colorStartForShared,
  lastTrackPosFor as lastTrackPosForShared,
  playerCountFromTrackLength as playerCountFromTrackLengthShared,
  safeSquaresFor as safeSquaresForShared,
  trackLengthFor as trackLengthForShared,
} from "@shared/ludo-rules";

export interface Cell {
  row: number; // 0-14
  col: number; // 0-14
}

/** 52 track squares in clockwise order starting at Red's entry (position 0). */
export const TRACK_CELLS: Cell[] = [
  // Left arm bottom row of top edge, going right
  { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 },
  // Top arm left column going up
  { row: 5, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 6 }, { row: 2, col: 6 }, { row: 1, col: 6 }, { row: 0, col: 6 },
  // Top row across to right column
  { row: 0, col: 7 }, { row: 0, col: 8 },
  // Top arm right column going down
  { row: 1, col: 8 }, { row: 2, col: 8 }, { row: 3, col: 8 }, { row: 4, col: 8 }, { row: 5, col: 8 },
  // Right arm top row going right
  { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 }, { row: 6, col: 12 }, { row: 6, col: 13 }, { row: 6, col: 14 },
  // Right column down
  { row: 7, col: 14 }, { row: 8, col: 14 },
  // Right arm bottom row going left
  { row: 8, col: 13 }, { row: 8, col: 12 }, { row: 8, col: 11 }, { row: 8, col: 10 }, { row: 8, col: 9 },
  // Bottom arm right column going down
  { row: 9, col: 8 }, { row: 10, col: 8 }, { row: 11, col: 8 }, { row: 12, col: 8 }, { row: 13, col: 8 }, { row: 14, col: 8 },
  // Bottom row across to left
  { row: 14, col: 7 }, { row: 14, col: 6 },
  // Bottom arm left column going up
  { row: 13, col: 6 }, { row: 12, col: 6 }, { row: 11, col: 6 }, { row: 10, col: 6 }, { row: 9, col: 6 },
  // Left arm bottom row going left
  { row: 8, col: 5 }, { row: 8, col: 4 }, { row: 8, col: 3 }, { row: 8, col: 2 }, { row: 8, col: 1 }, { row: 8, col: 0 },
  // Left column up
  { row: 7, col: 0 }, { row: 6, col: 0 },
];

/** Per-color home-stretch cells for the 4-player cross board. Colors beyond the
 *  first 4 fall back to a 4-player slot since they're not rendered on the cross
 *  board (5-8 player games use the polygon geometry instead). */
const STUB_STRETCH: Cell[] = [
  { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 },
  { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 },
];
export const STRETCH_CELLS: Record<LudoColor, Cell[]> = {
  red: [
    { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 },
    { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 },
  ],
  green: [
    { row: 1, col: 7 }, { row: 2, col: 7 }, { row: 3, col: 7 },
    { row: 4, col: 7 }, { row: 5, col: 7 }, { row: 6, col: 7 },
  ],
  yellow: [
    { row: 7, col: 13 }, { row: 7, col: 12 }, { row: 7, col: 11 },
    { row: 7, col: 10 }, { row: 7, col: 9 }, { row: 7, col: 8 },
  ],
  blue: [
    { row: 13, col: 7 }, { row: 12, col: 7 }, { row: 11, col: 7 },
    { row: 10, col: 7 }, { row: 9, col: 7 }, { row: 8, col: 7 },
  ],
  purple: STUB_STRETCH,
  cyan: STUB_STRETCH,
  orange: STUB_STRETCH,
  brown: STUB_STRETCH,
};

/** Token resting spots inside each color's yard (4-player cross board only). */
const STUB_YARD: Cell[] = [
  { row: 1.3, col: 1.3 }, { row: 1.3, col: 3.7 },
  { row: 3.7, col: 1.3 }, { row: 3.7, col: 3.7 },
];
export const YARD_CELLS: Record<LudoColor, Cell[]> = {
  red: [
    { row: 1.3, col: 1.3 }, { row: 1.3, col: 3.7 },
    { row: 3.7, col: 1.3 }, { row: 3.7, col: 3.7 },
  ] as Cell[],
  green: [
    { row: 1.3, col: 10.3 }, { row: 1.3, col: 12.7 },
    { row: 3.7, col: 10.3 }, { row: 3.7, col: 12.7 },
  ] as Cell[],
  yellow: [
    { row: 10.3, col: 10.3 }, { row: 10.3, col: 12.7 },
    { row: 12.7, col: 10.3 }, { row: 12.7, col: 12.7 },
  ] as Cell[],
  blue: [
    { row: 10.3, col: 1.3 }, { row: 10.3, col: 3.7 },
    { row: 12.7, col: 1.3 }, { row: 12.7, col: 3.7 },
  ] as Cell[],
  purple: STUB_YARD,
  cyan: STUB_YARD,
  orange: STUB_YARD,
  brown: STUB_YARD,
};

/** Center home spot once a token finishes. Tokens stack here visually offset. */
export const HOME_CENTER: Cell = { row: 7, col: 7 };

/**
 * Per-color slots for finished tokens — laid out inside each color's center
 * triangle so all 4 tokens are visible side by side instead of overlapping.
 * Index 0..3 corresponds to token id `<color>-0` .. `<color>-3`.
 */
const STUB_HOME: Cell[] = [
  { row: 7.0, col: 7.0 }, { row: 7.0, col: 7.0 },
  { row: 7.0, col: 7.0 }, { row: 7.0, col: 7.0 },
];
/**
 * Where a colour's four FINISHED tokens sit inside its centre triangle.
 *
 * These used to be a straight line of four, 0.5 cells apart, hugging the
 * triangle's outer edge. Home tokens render ~0.63 cells wide, so consecutive
 * pieces overlapped by roughly a fifth of their width, and because each
 * triangle tapers to a point the two END slots fell OUTSIDE the triangle
 * entirely — finished tokens spilled onto the neighbouring wedge.
 *
 * Now a 2x2 block placed in the WIDE part of each triangle, where there is
 * actually room. Every slot is verified inside its triangle: for the left
 * (red) wedge the boundary at row r is col <= 6 + min(r-6, 9-r), and the
 * widest span is around row 7.5 — which is where the block sits. The four
 * colours are exact 90-degree rotations of each other about the centre
 * (7.5, 7.5), so all four read identically however the board is spun.
 *
 * The geometry is a genuine constraint solve, not eyeballing: pushing the two
 * rows further apart buys vertical clearance but COSTS horizontal room, since
 * the wedge narrows away from row 7.5. With a token radius of ~0.28 cells the
 * half-separation h must satisfy 0.29 <= h <= 0.39; h = 0.34 sits in the
 * middle. Slot spacing lands at 0.60 x 0.68 cells — keep the home token size
 * (see `token.state === "home"` in ludo-board-composites.tsx) under that, and
 * see home-slots.test.ts, which checks containment and overlap directly.
 */
export const HOME_SLOTS: Record<LudoColor, Cell[]> = {
  // LEFT wedge.
  red: [
    { row: 7.16, col: 6.28 },
    { row: 7.16, col: 6.88 },
    { row: 7.84, col: 6.28 },
    { row: 7.84, col: 6.88 },
  ],
  // TOP wedge.
  green: [
    { row: 6.28, col: 7.84 },
    { row: 6.88, col: 7.84 },
    { row: 6.28, col: 7.16 },
    { row: 6.88, col: 7.16 },
  ],
  // RIGHT wedge.
  yellow: [
    { row: 7.84, col: 8.72 },
    { row: 7.84, col: 8.12 },
    { row: 7.16, col: 8.72 },
    { row: 7.16, col: 8.12 },
  ],
  // BOTTOM wedge.
  blue: [
    { row: 8.72, col: 7.16 },
    { row: 8.12, col: 7.16 },
    { row: 8.72, col: 7.84 },
    { row: 8.12, col: 7.84 },
  ],
  purple: STUB_HOME,
  cyan: STUB_HOME,
  orange: STUB_HOME,
  brown: STUB_HOME,
};

/**
 * RULES come from shared/ludo-rules.ts — this file owns PIXEL GEOMETRY only
 * (which grid cell a track index maps to). The constants below used to be
 * hand-maintained copies of the server's, which is how the home-stretch
 * divert point ended up off by one on this board while the server was right.
 */
export {
  CELLS_PER_WEDGE,
  STRETCH_LENGTH,
  PLAYER_COLORS_ORDER,
  wedgeCountFor,
  trackLengthFor,
  playerCountFromTrackLength,
  colorStartFor,
  safeSquaresFor,
  divertOffsetFor,
  resolveDestination,
  type LudoDestination,
  type LudoMoveContext,
} from "@shared/ludo-rules";

/** The classic cross board's ring length. Kept as a named constant because
 *  the 15x15 cell tables in this file are inherently 4-arm. */
export const TRACK_LENGTH = trackLengthForShared(4);

/** Safe squares as drawn on the cross board — derived, not hand-listed. */
export const SAFE_SQUARES: Set<number> = safeSquaresForShared([], 4);

/** Track index of each color's launch square. Derived from the shared rule so
 *  it cannot disagree with the server about where a token enters. */
export const COLOR_START_POSITION: Record<LudoColor, number> = Object.fromEntries(
  SHARED_COLORS.map((c) => [c, colorStartForShared(c)]),
) as Record<LudoColor, number>;

/**
 * Adapter over the shared rule for callers that carry a track LENGTH rather
 * than a player count (the animation and preview paths derive theirs from the
 * polygon geometry). The rule itself lives in shared/ludo-rules.ts.
 */
export function lastTrackPosFor(color: LudoColor, trackLength: number = TRACK_LENGTH): number {
  return lastTrackPosForShared(color, playerCountFromTrackLengthShared(trackLength));
}

/**
 * Global Ludo seat palette (user-specified, 2026-07-26). One source of truth
 * for the 8 seat colors across cards, tokens, avatars and the cross board;
 * `print-board.ts`'s SEAT_COLORS mirrors these exact values (indexed) for the
 * 5-8 polygon boards, so a 4-player and an 8-player game read identically.
 *   red Crimson · green Emerald · blue Royal Blue · yellow Gold ·
 *   purple Violet · cyan Magenta · orange Orange · brown Bronze
 */
export const COLOR_HEX: Record<LudoColor, string> = {
  red: "#D7263D",    // Crimson
  green: "#00A86B",  // Emerald
  yellow: "#F4B400", // Gold
  blue: "#2563EB",   // Royal Blue
  purple: "#7B2CBF", // Violet
  cyan: "#E11D8A",   // Magenta
  orange: "#F97316", // Orange
  brown: "#A16207",  // Bronze
};

/** ~0.7× shade of each, for token bases, card rims and pip/border edges. */
export const COLOR_HEX_DARK: Record<LudoColor, string> = {
  red: "#971B2B",
  green: "#00764B",
  yellow: "#AB7E00",
  blue: "#1A45A5",
  purple: "#561F86",
  cyan: "#9E1461",
  orange: "#AE510F",
  brown: "#714505",
};

/** Yard corner regions (6x6 each) for SVG painting. */
export const YARD_REGIONS: Record<LudoColor, { r0: number; c0: number }> = {
  red: { r0: 0, c0: 0 },
  green: { r0: 0, c0: 9 },
  yellow: { r0: 9, c0: 9 },
  blue: { r0: 9, c0: 0 },
  purple: { r0: 0, c0: 0 },
  cyan: { r0: 0, c0: 0 },
  orange: { r0: 0, c0: 0 },
  brown: { r0: 0, c0: 0 },
};
