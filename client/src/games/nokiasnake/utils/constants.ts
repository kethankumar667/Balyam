export const GRID_CONFIG = {
  COLS: 20,
  ROWS: 20,
  CELL_SIZE: 7, // Logical pixels per cell
  OFFSET_X: 10,
  OFFSET_Y: 16,
  ARENA_WIDTH: 140, // 20 * 7 = 140px
  ARENA_HEIGHT: 140, // 20 * 7 = 140px
  CANVAS_WIDTH: 160,
  CANVAS_HEIGHT: 160,
} as const;

export const LCD_THEME = {
  BG_COLOR: "#87A96B",
  PIXEL_COLOR: "#0F2A1D",
  PIXEL_GHOST: "rgba(15, 42, 29, 0.08)",
  BORDER_COLOR: "#3F5E4D",
  BEZEL_DARK: "#2D4738",
  ACCENT_AMBER: "#E4B128",
} as const;

export const SPEED_LEVELS: Record<number, number> = {
  1: 220,
  2: 195,
  3: 170,
  4: 145,
  5: 120, // Nokia standard
  6: 100,
  7: 80,
  8: 60, // Turbo
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
  SNAKE_LOGO: [
    [0, 0, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 0, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0],
    [0, 1, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0],
  ],
  BONUS_INSECT: [
    [1, 0, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 1, 0, 1],
  ],
  FOOD_PELLET: [
    [0, 1, 1, 0],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [0, 1, 1, 0],
  ],
  HEART: [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
};
