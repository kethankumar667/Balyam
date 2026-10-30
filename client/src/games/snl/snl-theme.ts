/**
 * Snakes & Ladders — "holo-table" palette.
 *
 * One home for every colour the board art and HUD use, so the SVG layers and
 * the side panels can never drift apart. The game world keeps its own identity
 * (like Ludo's worlds) rather than following the document theme: the table is
 * dark graphite in both light and dark mode, so contrast is the same everywhere.
 *
 * Contrast notes (checked against the tile fills below):
 *  - TILE_INK on TILE_A / TILE_B  ≥ 7:1
 *  - FINISH_INK on the gold finish square ≥ 7:1
 */

/** Board surface — beveled glass tiles alternate between two cool tints. */
export const TILE_A = "#16233B";
export const TILE_B = "#1B2B47";
/** Every tenth square is a checkpoint, a touch brighter so the rows read at a glance. */
export const TILE_MILESTONE = "#223A5E";
/** Lit top edge of each tile gradient — the bottom stop is the base tint above. */
export const TILE_A_TOP = "#20324F";
export const TILE_B_TOP = "#263B60";
export const TILE_MILESTONE_TOP = "#2E4F80";
export const TILE_EDGE = "#3A5C8F";
export const TILE_LIGHT = "#7FB4FF";
export const TILE_INK = "#E6EEFF";

/** Square 100 — the brand gold, as a lit sunburst. */
export const FINISH_LIGHT = "#FFF1B8";
export const FINISH_GOLD = "#F5B83D";
export const FINISH_DEEP = "#B9770E";
export const FINISH_INK = "#2A1A04";

/** Frame and backdrop. */
export const FRAME_METAL_TOP = "#4A5568";
export const FRAME_METAL_BOTTOM = "#10151F";
export const FRAME_LED = "#38E1FF";
export const BACKDROP_CENTER = "#0E1A30";
export const BACKDROP_EDGE = "#05080F";

/** Ladders — brushed metal rails, amber energy rungs. */
export const LADDER_RAIL_LIGHT = "#C9D3E3";
export const LADDER_RAIL_MID = "#8A97AD";
export const LADDER_RAIL_DARK = "#3B4558";
export const LADDER_RUNG_CORE = "#FFD479";
export const LADDER_RUNG_GLOW = "#FF9F1C";

/**
 * Snakes — body, shaded end, contour, scale highlight and the glow they cast.
 * Fixed list: the snake count is bounded by the server config, and index
 * order keeps a given snake the same colour on every client.
 */
export interface SnakePalette {
  body: string;
  shade: string;
  outline: string;
  scale: string;
  glow: string;
}

export const SNAKE_PALETTES: readonly SnakePalette[] = [
  { body: "#3FBF7F", shade: "#0F5A3A", outline: "#04281A", scale: "#9CF5C8", glow: "#2EF2A0" },
  { body: "#E2A13C", shade: "#7A4A0C", outline: "#2F1A03", scale: "#FFE0A3", glow: "#FFB347" },
  { body: "#5B8CFF", shade: "#1B2F7A", outline: "#0A1238", scale: "#B5CBFF", glow: "#6FA0FF" },
  { body: "#B26BFF", shade: "#4A1F7A", outline: "#1A0A33", scale: "#E2C4FF", glow: "#C58BFF" },
  { body: "#FF6B7A", shade: "#7A1F2B", outline: "#33080E", scale: "#FFC2C9", glow: "#FF8A97" },
];

/** Event accents used by the toast, the feed icons and the roster chips. */
export const EVENT_LADDER = "#22C98A";
export const EVENT_SNAKE = "#F0506E";
export const EVENT_BOUNCE = "#F59E0B";
export const EVENT_WIN = "#A78BFA";

/** Holo-accent used for the active-turn ring and the HUD edge lights. */
export const HOLO_CYAN = "#38E1FF";
