import type { Alien, AlienFormation } from "../types";
import { GRID_WIDTH, PLAYER_ROW } from "../types";

/**
 * Calculates collective alien formation movement:
 * 1. Proposes next horizontal position for all surviving aliens.
 * 2. If ANY alien would exceed [0..GRID_WIDTH - 1], the formation drops down 1 row and flips direction.
 * 3. Otherwise, moves horizontally.
 */
export function stepFormation(
  aliens: readonly Alien[],
  formation: AlienFormation
): { updatedAliens: Alien[]; updatedFormation: AlienFormation; invaded: boolean } {
  if (aliens.length === 0) {
    return { updatedAliens: [], updatedFormation: formation, invaded: false };
  }

  let hitBoundary = false;
  for (let i = 0; i < aliens.length; i++) {
    const nextX = aliens[i].position.x + formation.direction;
    if (nextX < 0 || nextX >= GRID_WIDTH) {
      hitBoundary = true;
      break;
    }
  }

  let invaded = false;
  let updatedAliens: Alien[];
  let nextDirection = formation.direction;

  if (hitBoundary) {
    // Drop down 1 row and reverse direction
    nextDirection = (formation.direction === 1 ? -1 : 1) as -1 | 1;
    updatedAliens = aliens.map((a) => {
      const nextY = a.position.y + 1;
      if (nextY >= PLAYER_ROW - 1) {
        invaded = true;
      }
      return {
        ...a,
        position: { x: a.position.x, y: nextY },
      };
    });
  } else {
    // Normal horizontal step
    updatedAliens = aliens.map((a) => ({
      ...a,
      position: { x: a.position.x + formation.direction, y: a.position.y },
    }));
  }

  return {
    updatedAliens,
    updatedFormation: {
      ...formation,
      direction: nextDirection,
      movementAccumulatorMs: 0,
    },
    invaded,
  };
}

/**
 * Selects only the lowest surviving alien in each active column to safely fire projectiles.
 */
export function getEligibleShooters(aliens: readonly Alien[]): Alien[] {
  const lowestByCol = new Map<number, Alien>();

  for (let i = 0; i < aliens.length; i++) {
    const a = aliens[i];
    const col = a.position.x;
    const existing = lowestByCol.get(col);
    if (!existing || a.position.y > existing.position.y) {
      lowestByCol.set(col, a);
    }
  }

  return Array.from(lowestByCol.values());
}
