import { useScorecardStore } from "../store/scorecardStore";
import { useStreakStore } from "../store/streakStore";
import { getGame2048Stats, syncGame2048Stats } from "../lib/game2048StatsApi";

const STORAGE_2048_KEY = "bhalyam.2048.stats.v1";

interface Local2048Stats {
  bestScore: {
    battle: number;
    timeattack: number;
    zen: number;
  };
  bestRaceTimeMs: number | null;
  bestRaceGhost?: Array<{ atMs: number; tile: number }> | null;
  dailyBestScore: number;
  dailyDate: string | null;
}

function readLocal2048Stats(): Local2048Stats {
  try {
    const raw = localStorage.getItem(STORAGE_2048_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bestScore: {
          battle: Number(parsed?.bestScore?.battle) || 0,
          timeattack: Number(parsed?.bestScore?.timeattack) || 0,
          zen: Number(parsed?.bestScore?.zen) || 0,
        },
        bestRaceTimeMs: typeof parsed?.bestRaceTimeMs === "number" ? parsed.bestRaceTimeMs : null,
        bestRaceGhost: Array.isArray(parsed?.bestRaceGhost) ? parsed.bestRaceGhost : null,
        dailyBestScore: Number(parsed?.dailyBestScore) || 0,
        dailyDate: typeof parsed?.dailyDate === "string" ? parsed.dailyDate : null,
      };
    }
  } catch {
    // Ignore corrupt local storage
  }

  return {
    bestScore: { battle: 0, timeattack: 0, zen: 0 },
    bestRaceTimeMs: null,
    bestRaceGhost: null,
    dailyBestScore: 0,
    dailyDate: null,
  };
}

function writeLocal2048Stats(stats: Local2048Stats): void {
  try {
    localStorage.setItem(STORAGE_2048_KEY, JSON.stringify(stats));
  } catch {
    // Quota exceeded
  }
}

/**
 * Reconciles cloud-synced 2048 personal bests with device local storage.
 * Keeps the highest score / fastest race time between local and server.
 * Handles null cloud data by syncing local records to the cloud for new accounts.
 */
async function sync2048Data(): Promise<void> {
  try {
    const cloud = await getGame2048Stats();
    const local = readLocal2048Stats();

    const cloudBest = cloud?.bestScore ?? { battle: 0, timeattack: 0, zen: 0 };
    let raceTime = local.bestRaceTimeMs;
    if (cloud?.bestRaceTimeMs !== null && cloud?.bestRaceTimeMs !== undefined) {
      if (raceTime === null || cloud.bestRaceTimeMs < raceTime) {
        raceTime = cloud.bestRaceTimeMs;
      }
    }

    const merged: Local2048Stats = {
      bestScore: {
        battle: Math.max(local.bestScore.battle, cloudBest.battle || 0),
        timeattack: Math.max(local.bestScore.timeattack, cloudBest.timeattack || 0),
        zen: Math.max(local.bestScore.zen, cloudBest.zen || 0),
      },
      bestRaceTimeMs: raceTime,
      bestRaceGhost: cloud?.bestRaceGhost ?? local.bestRaceGhost ?? null,
      dailyBestScore: Math.max(local.dailyBestScore, cloud?.dailyBestScore || 0),
      dailyDate: cloud?.dailyDate || local.dailyDate,
    };

    writeLocal2048Stats(merged);

    // If local had higher numbers than cloud (or cloud had no record yet), push the reconciled bests back up
    const hasHigherLocal =
      local.bestScore.battle > (cloudBest.battle || 0) ||
      local.bestScore.timeattack > (cloudBest.timeattack || 0) ||
      local.bestScore.zen > (cloudBest.zen || 0) ||
      (local.bestRaceTimeMs !== null &&
        (cloud?.bestRaceTimeMs === null ||
          cloud?.bestRaceTimeMs === undefined ||
          local.bestRaceTimeMs < cloud.bestRaceTimeMs)) ||
      (!cloud &&
        (local.bestScore.battle > 0 ||
          local.bestScore.timeattack > 0 ||
          local.bestScore.zen > 0 ||
          local.bestRaceTimeMs !== null));

    if (hasHigherLocal) {
      void syncGame2048Stats({
        bestScore: merged.bestScore,
        bestRaceTimeMs: merged.bestRaceTimeMs,
        bestRaceGhost: merged.bestRaceGhost ?? null,
        dailyBestScore: merged.dailyBestScore,
        dailyDate: merged.dailyDate,
      });
    }
  } catch {
    // Non-blocking sync failure
  }
}

/**
 * Orchestrates full user data synchronization on authentication / login:
 * 1. Scorecard Archive & Personal Bests (/api/profile/:playerId/scorecards)
 * 2. Cloud-synced 2048 Arcade Stats (/api/games/2048/stats)
 * 3. Daily Login Streak (/api/streaks)
 */
export async function syncUserDataOnLogin(playerId: string): Promise<void> {
  if (!playerId) return;

  await Promise.allSettled([
    useScorecardStore.getState().fetchScorecards(playerId),
    sync2048Data(),
    useStreakStore.getState().fetchStreak(),
  ]);
}

/**
 * Flushes memory and local scorecard caches when the player logs out.
 * Purges both the scorecard archive cache and 2048 local stats to prevent
 * cross-account data contamination on shared devices.
 */
export function clearUserDataOnSignOut(playerId?: string): void {
  useScorecardStore.getState().clearScorecards(playerId);
  useStreakStore.getState().resetTransientState();
  try {
    localStorage.removeItem(STORAGE_2048_KEY);
  } catch {
    // Ignore storage quota or access failures
  }
}
