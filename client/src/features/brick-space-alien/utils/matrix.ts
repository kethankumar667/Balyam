import type { Alien, Position, Projectile } from "../types";
import { GRID_WIDTH, GRID_HEIGHT } from "../types";

/**
 * Returns the 4-pixel footprint of the player ship around centerX:
 * Top cannon pixel at (centerX, 18)
 * Base 3-pixel wing at (centerX - 1, 19), (centerX, 19), (centerX + 1, 19)
 */
export const getPlayerPixels = (centerX: number): readonly Position[] => [
  { x: centerX, y: 18 },
  { x: centerX - 1, y: 19 },
  { x: centerX, y: 19 },
  { x: centerX + 1, y: 19 },
];

/**
 * Validates if the entire player ship footprint stays within [0..GRID_WIDTH - 1].
 */
export function isValidPlayerCenterX(centerX: number): boolean {
  const pixels = getPlayerPixels(centerX);
  return pixels.every((p) => p.x >= 0 && p.x < GRID_WIDTH && p.y >= 0 && p.y < GRID_HEIGHT);
}

export type CellDisplayType =
  | "empty"
  | "player"
  | "player_invulnerable"
  | "alien_basic"
  | "alien_armored"
  | "alien_commander"
  | "player_bullet"
  | "alien_bullet";

/**
 * Builds a fast 1D indexed occupancy map for the 10x20 LCD matrix.
 * Avoids O(N*M) nested loops on every render cycle.
 */
export function buildOccupancyMatrix(
  playerCenterX: number,
  isInvulnerable: boolean,
  aliens: readonly Alien[],
  projectiles: readonly Projectile[]
): CellDisplayType[] {
  const matrix: CellDisplayType[] = new Array(GRID_WIDTH * GRID_HEIGHT).fill("empty");

  // 1. Populate Aliens
  for (let i = 0; i < aliens.length; i++) {
    const a = aliens[i];
    if (a.position.x >= 0 && a.position.x < GRID_WIDTH && a.position.y >= 0 && a.position.y < GRID_HEIGHT) {
      const idx = a.position.y * GRID_WIDTH + a.position.x;
      if (a.type === "COMMANDER") matrix[idx] = "alien_commander";
      else if (a.type === "ARMORED") matrix[idx] = "alien_armored";
      else matrix[idx] = "alien_basic";
    }
  }

  // 2. Populate Projectiles
  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i];
    if (p.position.x >= 0 && p.position.x < GRID_WIDTH && p.position.y >= 0 && p.position.y < GRID_HEIGHT) {
      const idx = p.position.y * GRID_WIDTH + p.position.x;
      matrix[idx] = p.owner === "PLAYER" ? "player_bullet" : "alien_bullet";
    }
  }

  // 3. Populate Player Ship (takes visual priority at bottom)
  const playerType = isInvulnerable ? "player_invulnerable" : "player";
  const playerPixels = getPlayerPixels(playerCenterX);
  for (let i = 0; i < playerPixels.length; i++) {
    const p = playerPixels[i];
    if (p.x >= 0 && p.x < GRID_WIDTH && p.y >= 0 && p.y < GRID_HEIGHT) {
      const idx = p.y * GRID_WIDTH + p.x;
      matrix[idx] = playerType;
    }
  }

  return matrix;
}
