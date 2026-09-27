import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import MatchHistoryList from "../MatchHistoryList";
import CareerMetrics from "../CareerMetrics";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory";
import { INITIAL_PLAYER_STATS, type PlayerStats } from "@shared/profile/PlayerStats";

const mockEmptyStats: PlayerStats = INITIAL_PLAYER_STATS("player-test-1");

const mockPopulatedStats: PlayerStats = {
  ...INITIAL_PLAYER_STATS("player-test-1"),
  totalMatches: 12,
  wins: 9,
  losses: 2,
  draws: 1,
  winRate: 75,
  currentWinStreak: 4,
  bestWinStreak: 7,
  longestMatchMinutes: 24,
  averageMatchMinutes: 8.5,
  recoveryCount: 3,
  favoriteGame: "handcricket",
  totalPlayTimeMinutes: 102,
  perGame: {
    handcricket: {
      game: "handcricket",
      matchesPlayed: 8,
      wins: 6,
      losses: 1,
      draws: 1,
      winRate: 75,
      averageMatchDurationMinutes: 7.5,
      totalPlayTimeMinutes: 60,
    },
    ludo: {
      game: "ludo",
      matchesPlayed: 4,
      wins: 3,
      losses: 1,
      draws: 0,
      winRate: 75,
      averageMatchDurationMinutes: 10.5,
      totalPlayTimeMinutes: 42,
    },
  },
};

const mockMatches: MatchHistoryItem[] = [
  {
    matchId: "match-hc-1",
    roomCode: "HC1234",
    game: "handcricket",
    startedAt: 1724300000000,
    finishedAt: 1724300600000,
    durationMs: 600000,
    result: "WIN",
    participants: [
      { playerId: "player-test-1", name: "Champion", isWinner: true, score: 28 },
      { playerId: "bot-1", name: "Rival Bot", isWinner: false, score: 14, isBot: true },
    ],
    replayAvailable: false,
  },
  {
    matchId: "match-ludo-2",
    roomCode: "LD5678",
    game: "ludo",
    startedAt: 1724310000000,
    finishedAt: 1724311200000,
    durationMs: 1200000,
    result: "LOSS",
    participants: [
      { playerId: "player-test-1", name: "Champion", isWinner: false },
      { playerId: "player-2", name: "Aarav", isWinner: true },
    ],
    replayAvailable: false,
  },
];

describe("Profile Real Data Integration Tests", () => {
  describe("MatchHistoryList Real Telemetry Rendering", () => {
    it("renders authentic empty state when player has zero matches without dummy fallbacks", () => {
      render(
        <MatchHistoryList
          matches={[]}
          total={0}
          selectedGame={undefined}
          onSelectGame={vi.fn()}
          stats={mockEmptyStats}
        />
      );

      // Verify no fake matches or fake dates
      expect(screen.queryByText("Aug 20 – Aug 22, 2026")).toBeNull();
      expect(screen.queryByText("Pintu")).toBeNull();

      // Verify authentic empty cards
      expect(screen.getByText("No matches recorded yet.")).toBeDefined();
      expect(screen.getByText("No victories recorded yet.")).toBeDefined();
      expect(screen.getByText("0 Wins")).toBeDefined();
      expect(screen.getByText("Win consecutive rounds to forge a streak!")).toBeDefined();
    });

    it("renders authentic dynamic match data with real participant scores and opponent names", () => {
      render(
        <MatchHistoryList
          matches={mockMatches}
          total={2}
          selectedGame={undefined}
          onSelectGame={vi.fn()}
          stats={mockPopulatedStats}
        />
      );

      // Verify streak is derived from real stats
      expect(screen.getByText("7 Wins")).toBeDefined();
      expect(screen.getByText(/Current streak: 4 wins/i)).toBeDefined();

      // Verify most played games derived from stats.perGame
      expect(screen.getByText("8 Matches")).toBeDefined();
      expect(screen.getByText("4 Matches")).toBeDefined();

      // Verify real score calculation from participant scores (28 - 14)
      const scoreElements = screen.getAllByText("28 - 14");
      expect(scoreElements.length).toBeGreaterThanOrEqual(1);

      // Verify real participant name
      expect(screen.getAllByText(/Rival Bot/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("CareerMetrics Real Data Rendering", () => {
    it("renders real recent activity items when provided with match logs", () => {
      const recentMatches = [
        { id: "1", game: "handcricket", result: "won" as const, playedAt: Date.now() },
        { id: "2", game: "ludo", result: "lost" as const, playedAt: Date.now() - 3600000 },
      ];

      render(<CareerMetrics stats={mockPopulatedStats} recentMatches={recentMatches} />);

      expect(screen.getByText("Recent Activity")).toBeDefined();
      expect(screen.getByText("handcricket")).toBeDefined();
      expect(screen.getByText("ludo")).toBeDefined();
      expect(screen.getByText("Victory")).toBeDefined();
      expect(screen.getByText("Defeat")).toBeDefined();
    });

    it("renders gateway starter hub when player has 0 recent matches", () => {
      render(<CareerMetrics stats={mockEmptyStats} recentMatches={[]} />);

      expect(screen.getByText("Quick Play Lounge Gateway")).toBeDefined();
      expect(screen.getByText("All Games →")).toBeDefined();
    });
  });
});
