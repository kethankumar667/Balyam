/**
 * The look of the Vamana Guntalu table, in one place so the board, the seeds, the cards and the
 * chrome around them stay one family on every screen size.
 */

export const GOLD = "#E4B128";
export const GOLD_BRIGHT = "#FFD25E";
export const CAPTURE_ORANGE = "#F97316";

/** Dark walnut table the whole game sits on. */
export const TABLE_BACKGROUND = "radial-gradient(ellipse at 50% 0%, #6b3f1d 0%, #4a2a13 46%, #2b160a 100%)";

/** The honey-coloured board itself. The grain is a second, faint layer drawn over this. */
export const BOARD_WOOD = "linear-gradient(150deg, #d28f4f 0%, #b9763a 46%, #94592a 100%)";
export const BOARD_GRAIN =
  "repeating-linear-gradient(92deg, rgba(60,30,10,0.10) 0px, rgba(60,30,10,0.10) 1px, transparent 1px, transparent 7px), " +
  "repeating-linear-gradient(88deg, rgba(255,226,170,0.07) 0px, rgba(255,226,170,0.07) 2px, transparent 2px, transparent 15px)";

/** Parchment used for player cards and the like. */
export const CARD_CREAM = "linear-gradient(180deg, #fff8e8 0%, #f6e7c6 100%)";
export const CARD_INK = "#3b2412";
export const CARD_INK_SOFT = "#6a5338";
export const TURN_GREEN = "#15803d";
export const TURN_GREEN_BRIGHT = "#4ade80";

/** A dark, slightly translucent plank used for the turn bar, hint pill and action dock. */
export const PLANK_BACKGROUND = "linear-gradient(180deg, rgba(84,48,22,0.92) 0%, rgba(52,29,13,0.94) 100%)";
export const PLANK_BORDER = "1px solid rgba(228,177,40,0.38)";

/**
 * Board geometry, in units of one pit cell. Pits sit on a 2 x 7 (or 7 x 2) grid with a `FRAME` of
 * wood all round, and `ORNAMENT` extra wood at the two ends of the long axis for the carved motif.
 * Without ornaments (a short phone) the board is the plain grid plus its frame.
 */
const PITS_PER_ROW = 7;
const ROWS = 2;
const FRAME = 0.22;
const ORNAMENT = 0.42;

export interface BoardGeometry {
  /** Width divided by height of the whole board. */
  aspect: number;
  /** Where the pit grid sits inside the board, as percentages of the board's width and height. */
  insetXPercent: number;
  insetYPercent: number;
}

export function boardGeometry(orientation: "horizontal" | "vertical", withOrnaments: boolean): BoardGeometry {
  const cap = withOrnaments ? ORNAMENT : 0;
  const longSide = PITS_PER_ROW + FRAME * 2 + cap * 2;
  const shortSide = ROWS + FRAME * 2;
  const longInset = ((FRAME + cap) / longSide) * 100;
  const shortInset = (FRAME / shortSide) * 100;
  return orientation === "horizontal"
    ? { aspect: longSide / shortSide, insetXPercent: longInset, insetYPercent: shortInset }
    : { aspect: shortSide / longSide, insetXPercent: shortInset, insetYPercent: longInset };
}
