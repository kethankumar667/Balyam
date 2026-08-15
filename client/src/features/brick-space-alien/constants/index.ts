/**
 * Centralized Game Constants & Balance configuration for Brick Space Alien
 */

export const STORAGE_KEY_SPACE_ALIEN = "bhalyam_space_alien_v1";

export const BRICK_SPACE_ALIEN_CONFIG = {
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
  PLAYER_ROW: 19,
  INITIAL_LIVES: 3,

  // Player Timing & Cooldowns
  PLAYER_FIRE_COOLDOWN_MS: 300,
  PLAYER_INVULNERABILITY_MS: 2500,
  OVERLAY_DISPLAY_MS: 1600,
  BOOT_DURATION_MS: 1800,

  // Projectile Limits & Frequencies
  MAX_PLAYER_PROJECTILES: 2,
  MAX_ALIEN_PROJECTILES: 3,
  PROJECTILE_STEP_INTERVAL_MS: 90, // Simulation step for bullets

  // Formation Speeds (ms per horizontal/vertical step)
  INITIAL_STEP_INTERVAL_MS: 650,
  MIN_STEP_INTERVAL_MS: 120, // Prevents uncontrollable speed
  SPEED_ACCELERATION_PER_KILL_MS: 14,
  SPEEDUP_PER_WAVE_PERCENT: 0.12,

  // Enemy Firing
  BASE_ALIEN_FIRE_INTERVAL_MS: 1200,
  MIN_ALIEN_FIRE_INTERVAL_MS: 450,

  // Scoring
  SCORE_BASIC: 10,
  SCORE_ARMORED: 25,
  SCORE_COMMANDER: 50,
  SCORE_WAVE_BONUS_BASE: 200,
} as const;

export const MENU_OPTIONS = [
  "START GAME",
  "INSTRUCTIONS",
  "HIGH SCORES",
  "SOUND: ON",
] as const;
