import type { LaneIndex } from "../types";

export const GRID_CONFIG = {
  COLS: 10,
  ROWS: 20,
  CELL_SIZE: 13, // Pixel size per LCD block
  PADDING: 6,
  CANVAS_WIDTH: 10 * 13 + 12, // 142px
  CANVAS_HEIGHT: 20 * 13 + 12, // 272px
} as const;

export const LANE_CENTERS: Record<LaneIndex, number> = {
  0: 2, // Left Lane (x in [1, 3])
  1: 5, // Center Lane (x in [4, 6])
  2: 7, // Right Lane (x in [6, 8])
};

export const LCD_THEME = {
  BG_COLOR: "#9BBC0F", // Classic GameBoy/Brick Game yellow-olive
  PIXEL_COLOR: "#0F380F", // Dark phosphor active LCD segment
  PIXEL_GHOST: "rgba(15, 56, 15, 0.08)", // Inactive matrix pixel outline
  BORDER_COLOR: "#0F380F",
  BEZEL_DARK: "#8BAC0F",
  ACCENT_AMBER: "#E4B128",
} as const;

export const SPEED_LEVELS: Record<number, number> = {
  1: 240,
  2: 215,
  3: 190,
  4: 165,
  5: 140,
  6: 115,
  7: 90,
  8: 65, // Turbo speed
};

export const SPRITES = {
  TROPHY: [
    [0, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
  ],
  SKULL: [
    [0, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1],
    [0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 0],
  ],
  CHECKER_FLAG: [
    [1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0],
  ],
};
