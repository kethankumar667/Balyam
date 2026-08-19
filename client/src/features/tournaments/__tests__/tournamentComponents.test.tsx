import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import TournamentCard from "../TournamentCard";
import TournamentBracket from "../TournamentBracket";
import { TournamentHeroBanner } from "../TournamentHeroBanner";
import { TournamentTrustStrip } from "../TournamentTrustStrip";
import { TournamentGameArtwork, TournamentTrophyArtwork, TournamentPodiumCard } from "../TournamentArtwork";
import SeasonDashboard from "../SeasonDashboard";
import SeasonLeaderboard from "../SeasonLeaderboard";
import TournamentHistory from "../TournamentHistory";

import type { Tournament } from "@shared/tournaments/Tournament";
import type { TournamentBracket as TournamentBracketType } from "@shared/tournaments/Bracket";
import type { Season, PlayerSeasonStats } from "@shared/seasons/Season";

describe("Tournament & Seasons UI Components", () => {
  const mockTournament: Tournament = {
    id: "t_test_1",
    title: "Ludo Grand Prix — Weekly Open",
    description: "Fast-paced 8-player knockout championship with double XP rewards.",
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

  it("renders TournamentCard with dynamic metadata, artwork, and Register button", () => {
    render(
      <TournamentCard
        tournament={mockTournament}
        currentPlayerId="u2"
        onRegister={async () => {}}
        onViewBracket={() => {}}
      />
    );

    expect(screen.getByText("Ludo Grand Prix — Weekly Open")).toBeDefined();
    expect(screen.getByText(/1 \/ 8 Players/i)).toBeDefined();
    expect(screen.getByText(/500 XP/i)).toBeDefined();
    expect(screen.getByText("REGISTRATION OPEN")).toBeDefined();
    expect(screen.getByText("View Bracket")).toBeDefined();
    expect(screen.getByText("Register")).toBeDefined();
  });

  it("renders registered state badge on TournamentCard when player is enrolled", () => {
    render(
      <TournamentCard
        tournament={mockTournament}
        currentPlayerId="u1"
        onRegister={async () => {}}
        onViewBracket={() => {}}
      />
    );

    expect(screen.getByText("✓ Checked In")).toBeDefined();
  });

  it("renders TournamentHeroBanner with featured badge, title, prize pool, and Enter Arena button", () => {
    render(
      <TournamentHeroBanner
        tournament={mockTournament}
        onEnterArena={() => {}}
      />
    );

    expect(screen.getByText(/Featured Arena Event/i)).toBeDefined();
    expect(screen.getByText("Ludo Grand Prix — Weekly Open")).toBeDefined();
    expect(screen.getByText(/500 XP \+ Trophy/i)).toBeDefined();
    expect(screen.getByText("Enter Tournament Arena")).toBeDefined();
  });

  it("renders TournamentTrustStrip with all 4 championship trust pillars", () => {
    render(<TournamentTrustStrip />);

    expect(screen.getByText("Fair Play Certified")).toBeDefined();
    expect(screen.getByText("Exciting Rewards")).toBeDefined();
    expect(screen.getByText("For Everyone")).toBeDefined();
    expect(screen.getByText("BHALYAM Arena")).toBeDefined();
  });

  it("renders vector artwork scenes without errors", () => {
    const uno = render(<TournamentGameArtwork game="uno" />);
    expect(uno.container.querySelector("svg")).toBeDefined();

    const ludo = render(<TournamentGameArtwork game="ludo" />);
    expect(ludo.container.querySelector("svg")).toBeDefined();

    const rummy = render(<TournamentGameArtwork game="rummy" />);
    expect(rummy.container.querySelector("svg")).toBeDefined();

    const trophy = render(<TournamentTrophyArtwork size={120} />);
    expect(trophy.container.querySelector("svg")).toBeDefined();

    const podium = render(<TournamentPodiumCard />);
    expect(podium.getByText("Championship Arena")).toBeDefined();
  });

  it("renders TournamentBracket element with knockout rounds and matches", () => {
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

    render(
      <TournamentBracket
        tournament={mockTournament}
        bracket={mockBracket}
      />
    );

    expect(screen.getByText("Finals")).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
  });

  it("renders SeasonDashboard with season progression and reward ladder", () => {
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

    render(
      <SeasonDashboard
        season={mockSeason}
        stats={mockStats}
        rewards={[
          { tierId: "t1", name: "Novice Badge", minSeasonXP: 100, bonusXP: 50, icon: "🎖️", badge: "🎖️", title: "Novice", unlocked: true, claimed: false },
        ]}
        onClaimReward={async () => {}}
      />
    );

    expect(screen.getByText("Season 1: Launch")).toBeDefined();
    expect(screen.getByText(/Season Level 5/i)).toBeDefined();
    expect(screen.getByText("450 Total Season XP")).toBeDefined();
    expect(screen.getByText("Claim +50 XP")).toBeDefined();
  });

  it("renders SeasonLeaderboard with rank badges", () => {
    render(
      <SeasonLeaderboard
        leaderboard={[
          {
            playerId: "u1",
            seasonId: "s1",
            displayName: "Alice Master",
            seasonXP: 1200,
            seasonLevel: 10,
            seasonRankTier: "Champion",
            seasonWins: 15,
            seasonMatches: 20,
            seasonWinRate: 75,
            tournamentWins: 3,
            rewardsClaimed: [],
            rank: 1,
          },
        ]}
      />
    );

    expect(screen.getByText("Alice Master")).toBeDefined();
    expect(screen.getByText("Champion")).toBeDefined();
    expect(screen.getByText("1200")).toBeDefined();
  });

  it("renders TournamentHistory with placement badges and XP won", () => {
    render(
      <TournamentHistory
        history={[
          {
            tournamentId: "t_old_1",
            tournamentName: "UNO Blitz Cup",
            game: "uno",
            placement: 1,
            participatedAt: Date.now() - 86400000,
            prizeXP: 500,
            badge: "👑",
          },
        ]}
      />
    );

    expect(screen.getByText("UNO Blitz Cup")).toBeDefined();
    expect(screen.getByText(/1st Place \(Champion\)/i)).toBeDefined();
    expect(screen.getByText("+500 XP")).toBeDefined();
  });
});
