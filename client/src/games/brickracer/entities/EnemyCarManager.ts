import type { EnemyCar, LaneIndex, Point } from "../types";
import { LANE_CENTERS } from "../utils/constants";
import { PlayerCar } from "./PlayerCar";
import { DifficultyEngine } from "../engine/DifficultyEngine";

const REACTION_MS = 300;
const STEERING_MS = 200;

export class EnemyCarManager {
  public enemies: EnemyCar[] = [];
  private nextId: number = 1;
  private spawnCooldown: number = 0;
  public readonly minSpawnCooldown: number = 4;

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

  public trySpawnWave(level: number, playerLane: LaneIndex): void {
    if (this.spawnCooldown > 0) return;

    // An open lane in one wave is insufficient; overlapping waves must also be reachable.
    const spawnDual = level >= 3 && Math.random() < 0.35;
    const lanes: LaneIndex[] = [0, 1, 2];

    // Pick first lane randomly
    const lane1Index = Math.floor(Math.random() * lanes.length);
    const lane1 = lanes[lane1Index];
    lanes.splice(lane1Index, 1);

    const wave: EnemyCar[] = [{
      id: `enemy_${this.nextId}`,
      lane: lane1,
      y: -4,
      speedBonus: false,
    }];

    if (spawnDual) {
      // Pick second lane from remaining 2 lanes
      const lane2Index = Math.floor(Math.random() * lanes.length);
      const lane2 = lanes[lane2Index];
      wave.push({
        id: `enemy_${this.nextId + 1}`,
        lane: lane2,
        y: -6,
        speedBonus: false,
      });
    }

    if (!this.hasEscapeRoute([...this.enemies, ...wave], playerLane)) return;
    this.enemies.push(...wave);
    this.nextId += wave.length;

    // Set cooldown based on level
    this.spawnCooldown = Math.max(
      this.minSpawnCooldown,
      10 - Math.min(4, Math.floor(level / 2))
    );
  }

  /**
   * Plan against the fastest Nitro tick so a later speed change cannot invalidate a
   * wave. Allow reaction time, then adjacent-lane taps at a human-sized interval.
   * Both ends of a move must be clear before and after the traffic advances.
   */
  private hasEscapeRoute(enemies: EnemyCar[], playerLane: LaneIndex): boolean {
    const tickMs = DifficultyEngine.getTickInterval(8, true);
    const steeringTicks = Math.ceil(STEERING_MS / tickMs);
    const reactionTicks = Math.ceil(REACTION_MS / tickMs);
    const player = new PlayerCar();
    const lanes: LaneIndex[] = [0, 1, 2];
    const horizon = Math.max(...enemies.map(enemy => player.y + 4 - enemy.y));
    const clear = Array.from({ length: horizon + 1 }, (_, tick) => lanes.map(lane => {
      player.lane = lane;
      const pixels = new Set(player.getPixels().map(point => `${point.x},${point.y}`));
      return enemies.every(enemy => this.getEnemyPixels({ ...enemy, y: enemy.y + tick })
        .every(point => !pixels.has(`${point.x},${point.y}`)));
    }));
    if (!clear[0][playerLane]) return false;
    let reachable = new Map<LaneIndex, number>([[playerLane, reactionTicks]]);
    for (let tick = 0; tick < horizon; tick++) {
      const next = new Map<LaneIndex, number>();
      for (const [lane, wait] of reachable) {
        for (const destination of lanes) {
          if (destination !== lane && (wait > 0 || Math.abs(destination - lane) !== 1)) continue;
          if (!clear[tick][destination] || !clear[tick + 1][destination]) continue;
          const cooldown = destination === lane ? Math.max(0, wait - 1) : steeringTicks - 1;
          next.set(destination, Math.min(next.get(destination) ?? Infinity, cooldown));
        }
      }
      if (next.size === 0) return false;
      reachable = next;
    }
    return true;
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
