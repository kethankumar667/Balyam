import { describe, it, expect, beforeEach } from "vitest";
import { tournamentService } from "../TournamentService.js";
import { profileService } from "../../profile/ProfileService.js";
import { seasonService } from "../../seasons/SeasonService.js";

describe("Tournament Service Full Lifecycle Integration", () => {
  beforeEach(() => {
    tournamentService.reset();
    profileService.reset();
    seasonService.reset();
  });

  it("handles registration, start, bracket progression, and rewards distribution", () => {
    // 1. Create tournament
    const tourney = tournamentService.createTournament({
      title: "Test Championship",
      description: "Knockout test tournament",
      game: "ludo",
      config: { minPlayers: 4, maxPlayers: 4, checkInRequired: false },
    });

    expect(tourney.status).toBe("REGISTRATION_OPEN");

    // 2. Register 4 players
    const p1 = tournamentService.registerPlayer(tourney.id, { playerId: "u1", displayName: "User 1" });
    const p2 = tournamentService.registerPlayer(tourney.id, { playerId: "u2", displayName: "User 2" });
    const p3 = tournamentService.registerPlayer(tourney.id, { playerId: "u3", displayName: "User 3" });
    const p4 = tournamentService.registerPlayer(tourney.id, { playerId: "u4", displayName: "User 4" });

    expect(p1.success).toBe(true);
    expect(p2.success).toBe(true);
    expect(p3.success).toBe(true);
    expect(p4.success).toBe(true);

    // 5th player registration should fail (max capacity 4)
    const p5 = tournamentService.registerPlayer(tourney.id, { playerId: "u5", displayName: "User 5" });
    expect(p5.success).toBe(false);

    // 3. Start tournament
    const startRes = tournamentService.startTournament(tourney.id);
    expect(startRes.success).toBe(true);
    expect(tourney.status).toBe("IN_PROGRESS");
    expect(startRes.bracket).toBeDefined();

    const bracket = startRes.bracket!;
    const semi1 = bracket.rounds[0]!.matches[0]!;
    const semi2 = bracket.rounds[0]!.matches[1]!;

    // 4. Report Semifinal 1 match (u1 wins)
    const semi1Res = tournamentService.reportMatchResult(tourney.id, semi1.matchId, "u1", 2, 0);
    expect(semi1Res.success).toBe(true);
    expect(semi1Res.isTournamentOver).toBe(false);

    // 5. Report Semifinal 2 match (u3 wins)
    const semi2Res = tournamentService.reportMatchResult(tourney.id, semi2.matchId, "u3", 2, 1);
    expect(semi2Res.success).toBe(true);
    expect(semi2Res.isTournamentOver).toBe(false);

    // Finals match should now be ready
    const finals = bracket.rounds[1]!.matches[0]!;
    expect(finals.status).toBe("READY");

    // 6. Report Finals match (u1 wins Championship)
    const finalsRes = tournamentService.reportMatchResult(tourney.id, finals.matchId, "u1", 3, 2);
    expect(finalsRes.isTournamentOver).toBe(true);
    expect(finalsRes.championId).toBe("u1");
    expect(tourney.status).toBe("FINISHED");

    // 7. Verify Tournament Rewards & History
    const historyU1 = tournamentService.getPlayerTournamentHistory("u1");
    expect(historyU1.length).toBe(1);
    expect(historyU1[0]!.placement).toBe(1);
    expect(historyU1[0]!.prizeXP).toBe(500);

    const historyU3 = tournamentService.getPlayerTournamentHistory("u3");
    expect(historyU3.length).toBe(1);
    expect(historyU3[0]!.placement).toBe(2);
    expect(historyU3[0]!.prizeXP).toBe(250);

    // Verify Seasonal Stats updated
    const sStatsU1 = seasonService.getPlayerSeasonStats("u1");
    expect(sStatsU1.tournamentWins).toBe(1);
    expect(sStatsU1.seasonXP).toBe(500);
  });
});
