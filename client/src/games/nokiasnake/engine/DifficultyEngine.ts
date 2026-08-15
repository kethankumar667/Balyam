import { SPEED_LEVELS } from "../utils/constants";

export class DifficultyEngine {
  public static calculateLevel(foodEaten: number): number {
    // Level increases every 5 foods eaten, max level 8
    return Math.min(8, Math.floor(foodEaten / 5) + 1);
  }

  public static getTickInterval(level: number): number {
    return SPEED_LEVELS[level] ?? 120;
  }

  public static calculateNormalScore(level: number): number {
    return level * 10;
  }

  public static calculateBonusScore(level: number, timeRemaining: number, maxTime: number): number {
    const fraction = Math.max(0.2, timeRemaining / maxTime);
    return Math.round(level * 50 * fraction);
  }
}
