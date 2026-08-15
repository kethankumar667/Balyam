import type { Brick, BrickType } from "../types";
import { BREAKOUT_CONSTANTS } from "../constants/gameConstants";
import { PRESET_LEVELS, parseBlueprintToBricks, type LevelBlueprint } from "../constants/levelLayouts";
import { createMulberry32 } from "../utils/prng";

/**
 * Generates brick arrangements for any level index (1-based).
 */
export function generateLevelBricks(level: number, customSeed?: number): Brick[] {
  // If we have a preset blueprint for this level (1 to 4), use it
  const preset = PRESET_LEVELS.find((p) => p.levelNumber === level);
  if (preset) {
    return parseBlueprintToBricks(preset);
  }

  // Otherwise, procedurally generate a balanced, mirrored layout
  const rng = createMulberry32(customSeed ?? (level * 7919 + 1337));
  const bricks: Brick[] = [];
  const numRows = Math.min(7, 4 + Math.floor((level - 4) / 2));
  const startY = 1;
  let index = 0;

  for (let r = 0; r < numRows; r++) {
    const y = startY + r;
    // Generate left half (cols 0..4) and mirror to right half (cols 9..5)
    for (let x = 0; x < 5; x++) {
      const roll = rng();
      // 25% empty, 45% normal, 20% strong, 10% indestructible
      if (roll < 0.22) continue;

      let type: BrickType = "NORMAL";
      let hitPoints: number = 1;
      let scoreValue: number = BREAKOUT_CONSTANTS.SCORE_NORMAL_BRICK;

      if (roll > 0.90 && level >= 6 && r > 1) {
        type = "INDESTRUCTIBLE";
        hitPoints = 999;
        scoreValue = 0;
      } else if (roll > 0.65 || level >= 5 && roll > 0.50) {
        type = "STRONG";
        hitPoints = 2;
        scoreValue = BREAKOUT_CONSTANTS.SCORE_STRONG_BRICK;
      }

      // Left brick
      bricks.push({
        id: `gen_${level}_${index++}_${x}_${y}`,
        position: { x, y },
        type,
        hitPoints,
        maxHitPoints: hitPoints,
        scoreValue,
      });

      // Mirrored right brick
      const mirrorX = BREAKOUT_CONSTANTS.GRID_WIDTH - 1 - x;
      if (mirrorX !== x) {
        bricks.push({
          id: `gen_${level}_${index++}_${mirrorX}_${y}`,
          position: { x: mirrorX, y },
          type,
          hitPoints,
          maxHitPoints: hitPoints,
          scoreValue,
        });
      }
    }
  }

  // Ensure at least 6 destructible bricks exist
  const destructibleCount = bricks.filter((b) => b.type !== "INDESTRUCTIBLE").length;
  if (destructibleCount < 6) {
    return generateLevelBricks(1);
  }

  return bricks;
}

/**
 * Calculates game tick speed in milliseconds based on level.
 */
export function calculateTickSpeed(level: number): number {
  const speed =
    BREAKOUT_CONSTANTS.BASE_TICK_MS - (level - 1) * BREAKOUT_CONSTANTS.TICK_SPEED_DECREMENT_PER_LEVEL;
  return Math.max(BREAKOUT_CONSTANTS.MIN_TICK_MS, speed);
}
