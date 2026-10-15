import type { GameKind } from "@shared/types.js";
import { isRetiredGame } from "@shared/retiredGames.js";
import type { PlayerStats } from "@shared/profile/PlayerStats.js";

/**
 * A player's stats without any game that has since been removed.
 *
 * Their saved record can still hold one, and the profile screens list every game in it, so the
 * removed game would keep appearing with no tile behind it, or be named as their favourite. The
 * lifetime totals are left as they are: they are real, and they cannot be split back out by game.
 */
export function withoutRetiredGames(stats: PlayerStats): PlayerStats {
  const kept = Object.entries(stats.perGame).filter(([game]) => !isRetiredGame(game));
  if (kept.length === Object.keys(stats.perGame).length) return stats;

  const favoriteIsRetired = stats.favoriteGame !== "none" && isRetiredGame(stats.favoriteGame);
  return {
    ...stats,
    perGame: Object.fromEntries(kept) as PlayerStats["perGame"],
    favoriteGame: favoriteIsRetired ? mostPlayed(kept) : stats.favoriteGame,
  };
}

function mostPlayed(records: ReadonlyArray<[string, PlayerStats["perGame"][GameKind]]>): GameKind | "none" {
  let best: GameKind | "none" = "none";
  let bestMatches = 0;
  for (const [game, record] of records) {
    if (record && record.matchesPlayed > bestMatches) {
      bestMatches = record.matchesPlayed;
      best = game as GameKind;
    }
  }
  return best;
}
