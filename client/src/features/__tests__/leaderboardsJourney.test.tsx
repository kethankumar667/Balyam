import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LeaderboardTable from "../rankings/LeaderboardTable";
import TournamentCard from "../tournaments/TournamentCard";
import type { LeaderboardEntry } from "@shared/ranking/PlayerRank";
import type { Tournament } from "@shared/tournaments/Tournament";

describe("Priority 6: Leaderboards & Tournaments User Journey", () => {
  const mockEntries: LeaderboardEntry[] = [
    {
      playerId: "p_1",
      displayName: "Grandmaster Ace",
      avatar: "👑",
      rating: 1850,
      tier: "Grandmaster",
      wins: 120,
      matchesPlayed: 150,
      winRate: 80,
      level: 25,
      totalPlayTimeMinutes: 300,
      favoriteGame: "ludo",
      rank: 1,
    },
    {
      playerId: "p_2",
      displayName: "Rani Champion",
      avatar: "🎯",
      rating: 1720,
      tier: "Master",
      wins: 95,
      matchesPlayed: 130,
      winRate: 73,
      level: 20,
      totalPlayTimeMinutes: 240,
      favoriteGame: "rummy",
      rank: 2,
    },
    {
      playerId: "p_3",
      displayName: "Desi Strategist",
      avatar: "🎲",
      rating: 1590,
      tier: "Diamond",
      wins: 70,
      matchesPlayed: 110,
      winRate: 63,
      level: 15,
      totalPlayTimeMinutes: 180,
      favoriteGame: "snl",
      rank: 3,
    },
  ];

  describe("1. Leaderboard Table Rendering & Filtering", () => {
    it("renders top 3 leaderboard ranks with medals and stats", () => {
      render(
        <LeaderboardTable
          entries={mockEntries}
          total={3}
          selectedMetric="rating"
          onSelectMetric={vi.fn()}
          onSelectGame={vi.fn()}
        />
      );

      expect(screen.getAllByText("Grandmaster Ace").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Rani Champion").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Desi Strategist").length).toBeGreaterThan(0);
      expect(screen.getAllByText("1850").length).toBeGreaterThan(0);
      expect(screen.getAllByText("80%").length).toBeGreaterThan(0);
    });

    it("filters players dynamically by search query", () => {
      render(
        <LeaderboardTable
          entries={mockEntries}
          total={3}
          selectedMetric="rating"
          onSelectMetric={vi.fn()}
          onSelectGame={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search competitor...");
      fireEvent.change(searchInput, { target: { value: "Rani" } });

      expect(screen.getAllByText("Rani Champion").length).toBeGreaterThan(0);
      expect(screen.queryByText("Grandmaster Ace")).toBeNull();
      expect(screen.queryByText("Desi Strategist")).toBeNull();
    });

    it("displays friendly empty state when search matches no players", () => {
      render(
        <LeaderboardTable
          entries={mockEntries}
          total={3}
          selectedMetric="rating"
          onSelectMetric={vi.fn()}
          onSelectGame={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search competitor...");
      fireEvent.change(searchInput, { target: { value: "NonExistentPlayerXYZ" } });

      expect(screen.getByText("No competitors found matching your criteria.")).toBeDefined();
    });

    it("triggers onSelectMetric when clicking metric filter button", () => {
      const onSelectMetric = vi.fn();

      render(
        <LeaderboardTable
          entries={mockEntries}
          total={3}
          selectedMetric="rating"
          onSelectMetric={onSelectMetric}
          onSelectGame={vi.fn()}
        />
      );

      const winRateBtn = screen.getByRole("button", { name: /Win Rate/i });
      fireEvent.click(winRateBtn);

      expect(onSelectMetric).toHaveBeenCalledWith("winRate");
    });
  });

  describe("2. Tournament Discovery & Cards", () => {
    const mockTournament: Tournament = {
      id: "tourney_ludo_diwali",
      title: "Diwali Grand Ludo Championship",
      description: "Knockout championship with mega XP rewards!",
      game: "ludo",
      type: "SINGLE_ELIMINATION",
      status: "REGISTRATION_OPEN",
      startsAt: Date.now() + 86400000,
      createdAt: Date.now(),
      createdBy: "admin",
      currentRound: 1,
      totalRounds: 4,
      config: {
        minPlayers: 4,
        maxPlayers: 16,
        allowLateJoin: false,
        autoAdvanceByes: true,
        checkInRequired: true,
        visibility: "PUBLIC",
      },
      rewards: [
        { placement: 1, name: "Champion", xp: 500 },
      ],
      participants: [
        { playerId: "p_1", displayName: "Ace", seed: 1, checkedIn: true, status: "REGISTERED" },
      ],
    };

    it("renders tournament title, game badge, participant count, and prize pool", () => {
      const onRegister = vi.fn().mockResolvedValue(undefined);
      const onViewBracket = vi.fn();

      render(
        <TournamentCard
          tournament={mockTournament}
          currentPlayerId="player_viewer"
          onRegister={onRegister}
          onViewBracket={onViewBracket}
        />
      );

      expect(screen.getByText("Diwali Grand Ludo Championship")).toBeDefined();
      expect(screen.getByText(/Players/i)).toBeDefined();

      const registerBtn = screen.getByRole("button", { name: /Register/i });
      fireEvent.click(registerBtn);
      expect(onRegister).toHaveBeenCalledWith("tourney_ludo_diwali");
    });
  });
});
