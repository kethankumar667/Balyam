import type { EnemyCar, LaneIndex, Point } from "../types";
import { LANE_CENTERS } from "../utils/constants";

export class EnemyCarManager {
  public enemies: EnemyCar[] = [];
  private nextId: number = 1;
  private spawnCooldown: number = 0;
  public readonly minSpawnCooldown: number = 4; // Minimum 4 rows vertical gap between waves

  public reset(): void {
    this.enemies = [];
    this.nextId = 1;
    this.spawnCooldown = 3;
  }

  public advance(): { dodgedCount: number } {
    let dodgedCount = 0;
    const remaining: EnemyCar[] = [];

    for (const enemy of this.enemies) {
      enemy.y += 1;
      if (enemy.y > 12) {
        // Car passed beyond 12-row screen
        dodgedCount++;
      } else {
        remaining.push(enemy);
      }
    }

    this.enemies = remaining;
    if (this.spawnCooldown > 0) {
      this.spawnCooldown--;
    }

    return { dodgedCount };
  }

  public trySpawnWave(level: number): void {
    if (this.spawnCooldown > 0) return;

    // Determine if spawning 1 or 2 cars (never 3 cars to ensure at least 1 open lane)
    const spawnDual = level >= 3 && Math.random() < 0.35;
    const lanes: LaneIndex[] = [0, 1, 2];

    // Pick first lane randomly
    const lane1Index = Math.floor(Math.random() * lanes.length);
    const lane1 = lanes[lane1Index];
    lanes.splice(lane1Index, 1);

    this.enemies.push({
      id: `enemy_${this.nextId++}`,
      lane: lane1,
      y: -4,
      speedBonus: false,
    });

    if (spawnDual) {
      // Pick second lane from remaining 2 lanes
      const lane2Index = Math.floor(Math.random() * lanes.length);
      const lane2 = lanes[lane2Index];
      // Stagger second enemy by 2 rows to allow smooth zig-zag dodging
      this.enemies.push({
        id: `enemy_${this.nextId++}`,
        lane: lane2,
        y: -6,
        speedBonus: false,
      });
    }

    // Set cooldown based on level
    this.spawnCooldown = Math.max(
      this.minSpawnCooldown,
      10 - Math.min(4, Math.floor(level / 2))
    );
  }

  public getEnemyPixels(enemy: EnemyCar): Point[] {
    const cx = LANE_CENTERS[enemy.lane];
    const y = enemy.y;
    return [
      { x: cx, y: y },
      { x: cx - 1, y: y + 1 },
      { x: cx, y: y + 1 },
      { x: cx + 1, y: y + 1 },
      { x: cx, y: y + 2 },
      { x: cx - 1, y: y + 3 },
      { x: cx, y: y + 3 },
      { x: cx + 1, y: y + 3 },
    ];
  }
}
