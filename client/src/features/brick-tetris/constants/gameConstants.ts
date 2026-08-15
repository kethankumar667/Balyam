export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const VISIBLE_QUEUE_SIZE = 4;
export const DEFAULT_LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;

export const DEFAULT_DAS_MS = 140; // Delayed Auto Shift initial delay
export const DEFAULT_ARR_MS = 35; // Auto Repeat Rate

export const LINE_CLEAR_ANIMATION_MS = 250;
export const GARBAGE_INTERVAL_MS = 18000;

export const BASE_GRAVITY_BY_LEVEL: Record<number, number> = {
  1: 1000,
  2: 850,
  3: 700,
  4: 550,
  5: 420,
  6: 300,
  7: 200,
  8: 120,
  9: 70,
  10: 40,
};

export const MENU_ITEMS = [
  "START GAME",
  "MODE: CLASSIC",
  "HIGH SCORES",
  "INSTRUCTIONS",
] as const;

export const LCD_PALETTE = {
  bg: "#8BAC0F",
  bgGhost: "#7F9F0E",
  segmentInactive: "#76970D",
  segmentActive: "#0F380F",
  segmentGhost: "rgba(15, 56, 15, 0.28)",
  highlight: "#9BBC0F",
  borderDark: "#306230",
};
