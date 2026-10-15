import { describe, expect, it } from "vitest";
import type { GameKind } from "@shared/types.js";
import { INITIAL_PLAYER_STATS, type GameStats, type PlayerStats } from "@shared/profile/PlayerStats.js";
import { withoutRetiredGames } from "../retiredGameStats.js";

/**
 * A player's saved stats can still hold a record for a game that has since been removed. The profile
 * screens list every game in the record, so without this a removed game would keep showing up on the
 * shelf with no tile behind it, and could even be named as the player's favourite.
 */

const RETIRED = "carrom" as unknown as GameKind;

function record(game: GameKind, matchesPlayed: number): GameStats {
  return {
    game,
    matchesPlayed,
    wins: Math.floor(matchesPlayed / 2),
    losses: Math.ceil(matchesPlayed / 2),
    draws: 0,
    winRate: 50,
    averageMatchDurationMinutes: 5,
    totalPlayTimeMinutes: matchesPlayed * 5,
  };
}

function statsWith(perGame: Partial<Record<GameKind, GameStats>>, favoriteGame: GameKind | "none"): PlayerStats {
  return { ...INITIAL_PLAYER_STATS("player-1"), totalMatches: 40, wins: 20, losses: 20, favoriteGame, perGame };
}

describe("withoutRetiredGames", () => {
  it("drops the removed game from the per-game record and keeps the others", () => {
    const stats = statsWith({ [RETIRED]: record(RETIRED, 12), ludo: record("ludo", 8) }, RETIRED);

    const out = withoutRetiredGames(stats);

    expect(Object.keys(out.perGame)).toEqual(["ludo"]);
  });

  it("names the most-played remaining game as favourite when the removed one was", () => {
    const stats = statsWith({ [RETIRED]: record(RETIRED, 12), ludo: record("ludo", 8), uno: record("uno", 3) }, RETIRED);

    expect(withoutRetiredGames(stats).favoriteGame).toBe("ludo");
  });

  it("has no favourite when the removed game was the only one played", () => {
    const stats = statsWith({ [RETIRED]: record(RETIRED, 12) }, RETIRED);

    expect(withoutRetiredGames(stats).favoriteGame).toBe("none");
  });

  it("leaves a favourite that still exists alone, even if a removed game has more matches", () => {
    const stats = statsWith({ [RETIRED]: record(RETIRED, 30), ludo: record("ludo", 8) }, "ludo");

    expect(withoutRetiredGames(stats).favoriteGame).toBe("ludo");
  });

  it("keeps the lifetime totals, which are real whatever game they came from", () => {
    const stats = statsWith({ [RETIRED]: record(RETIRED, 12) }, RETIRED);

    const out = withoutRetiredGames(stats);

    expect(out.totalMatches).toBe(40);
    expect(out.wins).toBe(20);
    expect(out.losses).toBe(20);
  });

  it("changes nothing for a record that never had the removed game", () => {
    const stats = statsWith({ ludo: record("ludo", 8) }, "ludo");

    expect(withoutRetiredGames(stats)).toEqual(stats);
  });

  it("does not change the stats it was given", () => {
    const stats = statsWith({ [RETIRED]: record(RETIRED, 12), ludo: record("ludo", 8) }, RETIRED);
    const before = JSON.stringify(stats);

    withoutRetiredGames(stats);

    expect(JSON.stringify(stats)).toBe(before);
  });
});
