import type { Point } from "../types";
import { PlayerCar } from "../entities/PlayerCar";
import { EnemyCarManager } from "../entities/EnemyCarManager";

export class CollisionEngine {
  public static checkCollision(
    player: PlayerCar,
    enemyManager: EnemyCarManager
  ): boolean {
    const playerPixels = player.getPixels();
    const playerPixelSet = new Set(playerPixels.map((p) => `${p.x},${p.y}`));

    for (const enemy of enemyManager.enemies) {
      // Fast AABB check: if enemy is well above the player, skip
      if (enemy.y + 4 < player.y || enemy.y > player.y + 4) {
        continue;
      }

      const enemyPixels = enemyManager.getEnemyPixels(enemy);
      for (const ep of enemyPixels) {
        if (playerPixelSet.has(`${ep.x},${ep.y}`)) {
          return true; // Direct physical overlap
        }
      }
    }

    return false;
  }
}
