import { apiJson } from "./playerIdentity";

export interface RaceGhostPoint {
  atMs: number;
  tile: number;
}

export interface Game2048CloudStats {
  bestScore: { battle: number; timeattack: number; zen: number };
  bestRaceTimeMs: number | null;
  bestRaceGhost: RaceGhostPoint[] | null;
  /** Today's Daily Challenge best — resets each day, so it travels with a date the server can compare. */
  dailyBestScore: number;
  dailyDate: string | null;
}

const STATS_ENDPOINT = "/api/games/2048/stats";

/**
 * Reads the caller's cloud-synced 2048 personal bests, or `null` on any
 * failure — offline, a signed-out guest whose mint failed, or a server error.
 * `apiJson` never throws (see `playerIdentity.ts`), so callers never need a
 * try/catch around this.
 */
export function getGame2048Stats(): Promise<Game2048CloudStats | null> {
  return apiJson<Game2048CloudStats>(STATS_ENDPOINT);
}

/**
 * Pushes a locally-recorded personal best onto the cloud record. The server
 * merges rather than overwrites (`Game2048StatsService.syncStats`), so this
 * is safe to call fire-and-forget from the caller's perspective.
 */
export function syncGame2048Stats(stats: Game2048CloudStats): Promise<Game2048CloudStats | null> {
  return apiJson<Game2048CloudStats>(STATS_ENDPOINT, {
    method: "PUT",
    body: JSON.stringify(stats),
  });
}
