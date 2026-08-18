import { describe, it, expect } from "vitest";
import React from "react";
import TournamentCard from "../TournamentCard";
import TournamentBracket from "../TournamentBracket";
import SeasonDashboard from "../SeasonDashboard";
import SeasonLeaderboard from "../SeasonLeaderboard";
import TournamentHistory from "../TournamentHistory";

import type { Tournament } from "@shared/tournaments/Tournament";
import type { TournamentBracket as TournamentBracketType } from "@shared/tournaments/Bracket";
import type { Season, PlayerSeasonStats } from "@shared/seasons/Season";

describe("Tournament & Seasons UI Components", () => {
  const mockTournament: Tournament = {
    id: "t_test_1",
    title: "Ludo Open Cup",
    description: "Weekly knockout tournament",
    game: "ludo",
    type: "SINGLE_ELIMINATION",
    status: "REGISTRATION_OPEN",
    config: {
      minPlayers: 4,
      maxPlayers: 8,
      allowLateJoin: false,
      autoAdvanceByes: true,
      checkInRequired: false,
      visibility: "PUBLIC",
    },
    participants: [
      { playerId: "u1", displayName: "Alice", seed: 1, checkedIn: true, status: "CHECKED_IN" },
    ],
    currentRound: 0,
    totalRounds: 3,
    startsAt: Date.now() + 3600000,
    createdAt: Date.now(),
    createdBy: "system",
    rewards: [
      { placement: 1, name: "Champion", xp: 500, badge: "👑" },
    ],
  };

  it("creates TournamentCard element with props", () => {
    const el = React.createElement(TournamentCard, {
      tournament: mockTournament,
      onViewBracket: () => {},
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(TournamentCard);
  });

  it("creates TournamentBracket element with props", () => {
    const mockBracket: TournamentBracketType = {
      tournamentId: "t_test_1",
      rounds: [
        {
          roundNumber: 1,
          name: "Finals",
          matches: [
            {
              matchId: "m1",
              roundNumber: 1,
              matchNumber: 1,
              player1: mockTournament.participants[0]!,
              player2: null,
              winnerId: null,
              score1: 0,
              score2: 0,
              status: "READY",
              spectatorsAllowed: true,
            },
          ],
        },
      ],
    };

    const el = React.createElement(TournamentBracket, {
      tournament: mockTournament,
      bracket: mockBracket,
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(TournamentBracket);
  });

  it("creates SeasonDashboard element with props", () => {
    const mockSeason: Season = {
      id: "season_1",
      name: "Season 1: Launch",
      seasonNumber: 1,
      startsAt: Date.now() - 10000,
      endsAt: Date.now() + 100000,
      isActive: true,
    };

    const mockStats: PlayerSeasonStats = {
      playerId: "u1",
      seasonId: "season_1",
      seasonXP: 450,
      seasonLevel: 5,
      seasonRankTier: "Contender",
      seasonWins: 6,
      seasonMatches: 8,
      seasonWinRate: 75,
      tournamentWins: 1,
      rewardsClaimed: [],
    };

    const el = React.createElement(SeasonDashboard, {
      season: mockSeason,
      stats: mockStats,
      rewards: [],
      onClaimReward: async () => {},
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(SeasonDashboard);
  });

  it("creates SeasonLeaderboard element with props", () => {
    const el = React.createElement(SeasonLeaderboard, {
      leaderboard: [],
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(SeasonLeaderboard);
  });

  it("creates TournamentHistory element with props", () => {
    const el = React.createElement(TournamentHistory, {
      history: [],
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(TournamentHistory);
  });
});
