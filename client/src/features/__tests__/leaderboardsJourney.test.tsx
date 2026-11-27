import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LeaderboardTable from "../rankings/LeaderboardTable";
import type { LeaderboardEntry } from "@shared/ranking/PlayerRank";

describe("Priority 6: Leaderboards User Journey", () => {
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
      currentWinStreak: 5,
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
      currentWinStreak: 2,
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
      currentWinStreak: 0,
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
});
