import type { Alien, AlienFormation, AlienType } from "../types";
import { BRICK_SPACE_ALIEN_CONFIG } from "../constants";

/**
 * Creates wave alien formation patterns.
 * Wave 1: 3 rows of 6 aliens (18 total)
 * Wave 2: 4 rows of 6 aliens (24 total) with Armored row
 * Wave 3+: 4 rows of 7 aliens with Commander top row & high armor
 */
export function generateWaveAliens(wave: number): {
  aliens: Alien[];
  formation: AlienFormation;
} {
  const aliens: Alien[] = [];
  const rows = Math.min(5, 3 + Math.floor((wave - 1) / 2));
  const cols = Math.min(8, 6 + ((wave - 1) % 3));
  const startX = Math.floor((10 - cols) / 2);
  const startY = 2; // Start near top of matrix

  let idCounter = 1;

  for (let r = 0; r < rows; r++) {
    let type: AlienType = "BASIC";
    let hp = 1;
    let score: number = BRICK_SPACE_ALIEN_CONFIG.SCORE_BASIC;

    if (r === 0 && wave >= 2) {
      type = "COMMANDER";
      hp = 2;
      score = BRICK_SPACE_ALIEN_CONFIG.SCORE_COMMANDER;
    } else if (r <= 1 && wave >= 3) {
      type = "ARMORED";
      hp = 2;
      score = BRICK_SPACE_ALIEN_CONFIG.SCORE_ARMORED;
    }

    for (let c = 0; c < cols; c++) {
      aliens.push({
        id: `w${wave}-a${idCounter++}`,
        position: { x: startX + c, y: startY + r },
        formationRow: r,
        formationColumn: c,
        type,
        hitPoints: hp,
        scoreValue: score,
      });
    }
  }

  // Calculate base step interval for this wave
  const waveSpeedFactor = Math.pow(1 - BRICK_SPACE_ALIEN_CONFIG.SPEEDUP_PER_WAVE_PERCENT, wave - 1);
  const stepIntervalMs = Math.max(
    BRICK_SPACE_ALIEN_CONFIG.MIN_STEP_INTERVAL_MS,
    Math.round(BRICK_SPACE_ALIEN_CONFIG.INITIAL_STEP_INTERVAL_MS * waveSpeedFactor)
  );

  const formation: AlienFormation = {
    direction: 1, // Start moving Right
    movementAccumulatorMs: 0,
    stepIntervalMs,
  };

  return { aliens, formation };
}
