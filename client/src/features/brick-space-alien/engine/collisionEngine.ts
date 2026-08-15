import type { Alien, PlayerShip, Projectile } from "../types";
import { GRID_HEIGHT, GRID_WIDTH } from "../types";
import { getPlayerPixels } from "../utils/matrix";

export interface CollisionResult {
  survivingAliens: Alien[];
  survivingProjectiles: Projectile[];
  destroyedAlienCount: number;
  scoreGained: number;
  playerHit: boolean;
}

/**
 * Deterministic projectile movement and collision resolution.
 */
export function simulateProjectilesAndCollisions(
  projectiles: readonly Projectile[],
  aliens: readonly Alien[],
  player: PlayerShip,
  nowMs: number
): CollisionResult {
  // 1. Advance projectiles with previousPosition tracking
  const movedProjectiles: Projectile[] = [];
  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i];
    const nextY = p.position.y + p.direction;

    // Filter out of bounds immediately
    if (nextY >= 0 && nextY < GRID_HEIGHT) {
      movedProjectiles.push({
        ...p,
        previousPosition: { ...p.position },
        position: { x: p.position.x, y: nextY },
      });
    }
  }

  // 2. Projectile-to-Projectile Collisions (Mutual destruction on same cell or crossing path)
  const deadProjectileIds = new Set<string>();
  const playerBullets = movedProjectiles.filter((p) => p.owner === "PLAYER");
  const alienBullets = movedProjectiles.filter((p) => p.owner === "ALIEN");

  for (let pIdx = 0; pIdx < playerBullets.length; pIdx++) {
    const pb = playerBullets[pIdx];
    for (let aIdx = 0; aIdx < alienBullets.length; aIdx++) {
      const ab = alienBullets[aIdx];
      if (pb.position.x === ab.position.x) {
        // Same cell collision
        const sameCell = pb.position.y === ab.position.y;
        // Head-on crossing collision (e.g. pb passed ab)
        const crossed =
          pb.previousPosition.y >= ab.previousPosition.y &&
          pb.position.y <= ab.position.y;

        if (sameCell || crossed) {
          deadProjectileIds.add(pb.id);
          deadProjectileIds.add(ab.id);
        }
      }
    }
  }

  // Filter out destroyed projectiles from projectile vs projectile collisions
  let activeBullets = movedProjectiles.filter((p) => !deadProjectileIds.has(p.id));

  // 3. Player Projectile-to-Alien Collisions
  let currentAliens = [...aliens];
  let scoreGained = 0;
  let destroyedAlienCount = 0;

  for (let i = 0; i < activeBullets.length; i++) {
    const bullet = activeBullets[i];
    if (bullet.owner !== "PLAYER") continue;

    // Find alien occupying bullet position or passed by bullet
    const hitIndex = currentAliens.findIndex(
      (a) =>
        a.position.x === bullet.position.x &&
        (a.position.y === bullet.position.y || a.position.y === bullet.previousPosition.y)
    );

    if (hitIndex !== -1) {
      deadProjectileIds.add(bullet.id);
      const hitAlien = currentAliens[hitIndex];
      const remainingHp = hitAlien.hitPoints - 1;

      if (remainingHp <= 0) {
        // Destroyed alien
        scoreGained += hitAlien.scoreValue;
        destroyedAlienCount++;
        currentAliens.splice(hitIndex, 1);
      } else {
        // Damaged alien (armor absorbed hit)
        currentAliens[hitIndex] = {
          ...hitAlien,
          hitPoints: remainingHp,
        };
      }
    }
  }

  activeBullets = activeBullets.filter((p) => !deadProjectileIds.has(p.id));

  // 4. Alien Projectile-to-Player Collisions
  let playerHit = false;
  const isPlayerInvulnerable = nowMs < player.invulnerableUntilMs;
  const playerPixels = getPlayerPixels(player.centerX);

  for (let i = 0; i < activeBullets.length; i++) {
    const bullet = activeBullets[i];
    if (bullet.owner !== "ALIEN") continue;

    const hitPlayer = playerPixels.some(
      (p) =>
        p.x === bullet.position.x &&
        (p.y === bullet.position.y || p.y === bullet.previousPosition.y)
    );

    if (hitPlayer) {
      deadProjectileIds.add(bullet.id);
      if (!isPlayerInvulnerable && !playerHit) {
        playerHit = true;
      }
    }
  }

  const finalSurvivingProjectiles = activeBullets.filter((p) => !deadProjectileIds.has(p.id));

  return {
    survivingAliens: currentAliens,
    survivingProjectiles: finalSurvivingProjectiles,
    destroyedAlienCount,
    scoreGained,
    playerHit,
  };
}
