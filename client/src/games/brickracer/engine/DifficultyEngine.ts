import { SPEED_LEVELS } from "../utils/constants";

export class DifficultyEngine {
  public static calculateLevel(carsDodged: number): number {
    // Level increases every 10 cars dodged, max level 8
    return Math.min(8, Math.floor(carsDodged / 10) + 1);
  }

  public static getTickInterval(level: number, isBoosting: boolean): number {
    const base = SPEED_LEVELS[level] ?? 240;
    if (isBoosting) {
      return Math.max(40, Math.floor(base / 1.8));
    }
    return base;
  }

  public static getSpeedKmh(level: number, isBoosting: boolean): number {
    const baseSpeed = 90 + (level - 1) * 20;
    return isBoosting ? Math.floor(baseSpeed * 1.5) : baseSpeed;
  }
}
