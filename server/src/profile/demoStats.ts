import type { PlayerStats } from "@shared/profile/PlayerStats.js";
import {
  calculateMiniclipXPProgression,
  type MiniclipXPProgression,
} from "@shared/progression/MiniclipProgression.js";
import type { GameKind } from "@shared/types.js";

/**
 * TEMPORARY demo numbers so a Mandali profile has something to show while the real record is built up.
 *
 * REMOVE BEFORE PRODUCTION LAUNCH: delete this file, its two call sites in `ProfileController.ts`, the
 * `demo` field on `PlayerStats` / `MiniclipXPProgression`, and the "Demo data" chip in `MemberRecordPanels`.
 * Unset `DEMO_PROFILE_STATS` and the whole thing is inert in the meantime.
 *
 * Three guards keep it harmless: it is off unless `DEMO_PROFILE_STATS=on`; it fills only a profile with
 * NO real matches (a real record is never overwritten or blended); and it is applied only to the two
 * read-only public profile routes, so no leaderboard, reward, XP grant or settlement ever sees it.
 * The numbers are derived from the player id, so a person looks the same on every visit. Everything
 * carries `demo: true` and the client labels it.
 */
const DEMO_GAMES: readonly GameKind[] = ["ludo", "uno", "rummy", "handcricket", "snl"];

/** Hosting dashboards capitalise values ("On"), so accept the usual spellings of yes. */
export const isDemoStatsEnabled = (): boolean =>
  ["on", "true", "1", "yes"].includes((process.env.DEMO_PROFILE_STATS ?? "").trim().toLowerCase());

/** Small stable hash (FNV-1a) so each id maps to the same numbers every time. */
function seedOf(playerId: string): number {
  let h = 2166136261;
  for (let i = 0; i < playerId.length; i += 1) {
    h = Math.imul(h ^ playerId.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

const pick = (seed: number, shift: number, span: number): number => ((seed >>> shift) % span);

export function demoStatsFor(real: PlayerStats): PlayerStats {
  if (!isDemoStatsEnabled() || real.totalMatches > 0) return real;
  const seed = seedOf(real.playerId);
  const totalMatches = 24 + pick(seed, 0, 60);
  const wins = Math.round(totalMatches * (0.35 + pick(seed, 8, 30) / 100));
  const draws = pick(seed, 16, 4);
  const losses = totalMatches - wins - draws;
  const favourite = DEMO_GAMES[pick(seed, 20, DEMO_GAMES.length)];
  const averageMatchMinutes = 8 + pick(seed, 4, 9);
  return {
    ...real,
    demo: true,
    totalMatches,
    wins,
    losses,
    draws,
    winRate: Math.round((wins / totalMatches) * 1000) / 10,
    averageMatchMinutes,
    totalPlayTimeMinutes: averageMatchMinutes * totalMatches,
    longestMatchMinutes: averageMatchMinutes * 3,
    currentWinStreak: pick(seed, 12, 4),
    bestWinStreak: 3 + pick(seed, 24, 6),
    currentPlayStreak: 1 + pick(seed, 14, 5),
    bestPlayStreak: 4 + pick(seed, 26, 8),
    favoriteGame: favourite,
  };
}

export function demoProgressionFor(
  playerId: string,
  real: MiniclipXPProgression,
): MiniclipXPProgression {
  if (!isDemoStatsEnabled() || real.totalLifetimeXP > 0) return real;
  const xp = 600 + pick(seedOf(playerId), 6, 2400);
  return { ...calculateMiniclipXPProgression(xp), demo: true };
}
