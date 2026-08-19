import type { LaneIndex } from "../types";

export const GRID_CONFIG = {
  COLS: 12,
  ROWS: 12,
  CELL_SIZE: 18, // Pixel size per LCD block
  PADDING: 6,
  CANVAS_WIDTH: 12 * 18 + 12, // 228px
  CANVAS_HEIGHT: 12 * 18 + 12, // 228px
} as const;

export const LANE_CENTERS: Record<LaneIndex, number> = {
  0: 3, // Left Lane (x in [2, 4])
  1: 6, // Center Lane (x in [5, 7])
  2: 9, // Right Lane (x in [8, 10])
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
