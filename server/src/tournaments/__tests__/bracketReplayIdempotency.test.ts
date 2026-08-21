import { describe, it, expect, beforeEach } from "vitest";
import { tournamentService } from "../TournamentService.js";
import { BracketEngine } from "../BracketEngine.js";
import { profileService } from "../../profile/ProfileService.js";
import { seasonService } from "../../seasons/SeasonService.js";
import type { TournamentBracket } from "@shared/tournaments/Bracket.js";
import type { TournamentParticipant } from "@shared/tournaments/Tournament.js";

/**
 * Regression for MULTIPLAYER-RELIABILITY-BASELINE.md gap G3: a retried or
 * duplicated report of an already-decided match (most consequentially the
 * tournament final) used to re-run TournamentService.distributeRewards on
 * every replay — XP and season stats have no ledger of their own here, so a
 * replay silently double-counted them. The fix is a guard in
 * BracketEngine.advanceWinner: once a match has a recorded result, a second
 * report of it (same or different winnerId) is a no-op success rather than
 * a re-processed outcome.
 *
 * Four real participants throughout (not two) — BracketEngine pads any
 * smaller field up to a minimum bracket size of 4, which for exactly two
 * real players produces a final match with a permanently-empty second slot
 * (a separate, pre-existing bracket-sizing quirk, not this gap). Four
 * players fill the bracket exactly and exercise the real final cleanly.
 */
describe("BracketEngine.advanceWinner — idempotent against replayed match reports", () => {
  function buildBracket(id: string): TournamentBracket {
    return BracketEngine.generateBracket(
      id,
      [1, 2, 3, 4].map((n) => ({ playerId: `u${n}`, displayName: `User ${n}` }) as TournamentParticipant),
    );
  }

  it("a second report of an already-completed non-final match does not re-propagate or overwrite its recorded winner", () => {
    const bracket = buildBracket("t1");
    const semi1 = bracket.rounds[0]!.matches[0]!;

    const first = BracketEngine.advanceWinner(bracket, semi1.matchId, semi1.player1!.playerId, 2, 0);
    expect(first.success).toBe(true);
    expect(semi1.status).toBe("COMPLETED");
    expect(semi1.winnerId).toBe(semi1.player1!.playerId);

    // Replay with a DIFFERENT winnerId — must be ignored, not overwrite history.
    const replay = BracketEngine.advanceWinner(bracket, semi1.matchId, semi1.player2!.playerId, 2, 0);
    expect(replay.success).toBe(true);
    expect(replay.isTournamentOver).toBe(false);
    expect(semi1.winnerId).toBe(semi1.player1!.playerId); // unchanged
  });

  it("a second report of the completed FINAL does not re-signal isTournamentOver", () => {
    const bracket = buildBracket("t2");
    const semi1 = bracket.rounds[0]!.matches[0]!;
    const semi2 = bracket.rounds[0]!.matches[1]!;
    BracketEngine.advanceWinner(bracket, semi1.matchId, semi1.player1!.playerId, 2, 0);
    BracketEngine.advanceWinner(bracket, semi2.matchId, semi2.player1!.playerId, 2, 0);

    const final = bracket.rounds[1]!.matches[0]!;
    const championId = final.player1!.playerId;

    const first = BracketEngine.advanceWinner(bracket, final.matchId, championId, 2, 0);
    expect(first.isTournamentOver).toBe(true);
    expect(first.championId).toBe(championId);

    const replay = BracketEngine.advanceWinner(bracket, final.matchId, championId, 2, 0);
    // Same winner, replayed report: still a "success", but MUST NOT
    // re-signal isTournamentOver — that flag is what TournamentService
    // gates distributeRewards on, so a false here is what prevents a
    // second XP/season-stat grant.
    expect(replay.success).toBe(true);
    expect(replay.isTournamentOver).toBe(false);
  });
});

describe("TournamentService.reportMatchResult — replaying the final does not double-grant rewards", () => {
  beforeEach(() => {
    tournamentService.reset();
    profileService.reset();
    seasonService.reset();
  });

  it("XP, season stats, and tournament history are granted exactly once even if the final is reported twice", () => {
    const tourney = tournamentService.createTournament({
      title: "Replay Guard Test",
      description: "4-player knockout",
      game: "ludo",
      config: { minPlayers: 4, maxPlayers: 4, checkInRequired: false },
    });
    tournamentService.registerPlayer(tourney.id, { playerId: "u1", displayName: "User 1" });
    tournamentService.registerPlayer(tourney.id, { playerId: "u2", displayName: "User 2" });
    tournamentService.registerPlayer(tourney.id, { playerId: "u3", displayName: "User 3" });
    tournamentService.registerPlayer(tourney.id, { playerId: "u4", displayName: "User 4" });

    const startRes = tournamentService.startTournament(tourney.id);
    const bracket = startRes.bracket!;
    const semi1 = bracket.rounds[0]!.matches[0]!;
    const semi2 = bracket.rounds[0]!.matches[1]!;
    tournamentService.reportMatchResult(tourney.id, semi1.matchId, "u1", 2, 0);
    tournamentService.reportMatchResult(tourney.id, semi2.matchId, "u3", 2, 1);

    const finals = bracket.rounds[1]!.matches[0]!;
    const firstReport = tournamentService.reportMatchResult(tourney.id, finals.matchId, "u1", 2, 0);
    expect(firstReport.isTournamentOver).toBe(true);
    expect(firstReport.championId).toBe("u1");

    const xpAfterFirst = profileService.getOrCreateProfile("u1").experiencePoints;
    const seasonXpAfterFirst = seasonService.getPlayerSeasonStats("u1").seasonXP;
    const historyAfterFirst = tournamentService.getPlayerTournamentHistory("u1").length;
    expect(xpAfterFirst).toBeGreaterThan(0);

    // Replay: same tournament, same match, same winner — simulates a
    // retried admin request or a duplicated client submission.
    const replayReport = tournamentService.reportMatchResult(tourney.id, finals.matchId, "u1", 2, 0);
    expect(replayReport.isTournamentOver).toBe(false); // no second reward signal

    expect(profileService.getOrCreateProfile("u1").experiencePoints).toBe(xpAfterFirst);
    expect(seasonService.getPlayerSeasonStats("u1").seasonXP).toBe(seasonXpAfterFirst);
    expect(tournamentService.getPlayerTournamentHistory("u1").length).toBe(historyAfterFirst);
  });
});
