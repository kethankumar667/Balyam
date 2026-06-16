import type { LudoColor } from "@shared/types";

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
export const HOME_SLOTS: Record<LudoColor, Cell[]> = {
  red: [
    { row: 6.55, col: 6.32 },
    { row: 7.05, col: 6.32 },
    { row: 7.55, col: 6.32 },
    { row: 8.05, col: 6.32 },
  ],
  green: [
    { row: 6.32, col: 6.55 },
    { row: 6.32, col: 7.05 },
    { row: 6.32, col: 7.55 },
    { row: 6.32, col: 8.05 },
  ],
  yellow: [
    { row: 6.55, col: 8.68 },
    { row: 7.05, col: 8.68 },
    { row: 7.55, col: 8.68 },
    { row: 8.05, col: 8.68 },
  ],
  blue: [
    { row: 8.68, col: 6.55 },
    { row: 8.68, col: 7.05 },
    { row: 8.68, col: 7.55 },
    { row: 8.68, col: 8.05 },
  ],
  purple: STUB_HOME,
  cyan: STUB_HOME,
  orange: STUB_HOME,
  brown: STUB_HOME,
};

export const SAFE_SQUARES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

export const TRACK_LENGTH = 52;
export const STRETCH_LENGTH = 6;

export const COLOR_START_POSITION: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
  purple: 52, // only relevant for 5+ player polygon boards
  cyan: 65,
  orange: 78,
  brown: 91,
};

export function lastTrackPosFor(color: LudoColor, trackLength: number = TRACK_LENGTH): number {
  return (COLOR_START_POSITION[color] + trackLength - 1) % trackLength;
}

export const COLOR_HEX: Record<LudoColor, string> = {
  red: "#ef4444",
  green: "#10b981",
  yellow: "#f59e0b",
  blue: "#3b82f6",
  purple: "#a855f7",
  cyan: "#06b6d4",
  orange: "#f97316",
  brown: "#92400e",
};

export const COLOR_HEX_DARK: Record<LudoColor, string> = {
  red: "#b91c1c",
  green: "#047857",
  yellow: "#b45309",
  blue: "#1d4ed8",
  purple: "#7e22ce",
  cyan: "#0e7490",
  orange: "#c2410c",
  brown: "#7c2d12",
};

export const PLAYER_COLORS_ORDER: LudoColor[] = [
  "red", "green", "yellow", "blue",
  "purple", "cyan", "orange", "brown",
];

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
