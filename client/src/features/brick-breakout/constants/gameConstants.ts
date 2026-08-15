/**
 * Game constants for Brick Breakout
 */

export const BREAKOUT_CONSTANTS = {
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
  PADDLE_ROW: 18,
  PADDLE_WIDTH: 3,
  INITIAL_LIVES: 3,

  // Speed timings in ms per tick based on level
  BASE_TICK_MS: 160,
  MIN_TICK_MS: 70,
  TICK_SPEED_DECREMENT_PER_LEVEL: 12,

  // Scores
  SCORE_NORMAL_BRICK: 100,
  SCORE_STRONG_BRICK: 250,
  SCORE_LEVEL_CLEAR_BASE: 1000,

  // Serve Delay
  SERVE_AUTO_DELAY_MS: 400,

  // Retro LCD Palette
  LCD_COLORS: {
    background: "#9bbc0f",
    light: "#8bac0f",
    medium: "#306230",
    dark: "#0f380f",
  },
} as const;

export const STORAGE_KEY_BREAKOUT = "bhalyam_brick_breakout_v1";
