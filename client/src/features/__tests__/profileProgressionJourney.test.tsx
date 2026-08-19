import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileHeader from "../profile/ProfileHeader";
import StatsOverview from "../profile/StatsOverview";
import CareerMetrics from "../profile/CareerMetrics";
import AchievementsPanel from "../profile/AchievementsPanel";
import { AchievementRevealModal } from "../profile/AchievementRevealModal";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats";
import { ACHIEVEMENT_CATALOG } from "@shared/profile/Achievements";

describe("Priority 5: Profile, XP Progression & Achievements User Journey", () => {
  const mockProfile: PlayerProfile = {
    playerId: "player_champ_99",
    displayName: "Vikram The Champ",
    avatar: "👑",
    joinedAt: 1700000000000,
    lastSeenAt: 1700000000000,
    level: 7,
    experiencePoints: 650,
  };

  describe("1. Profile Header & Customization", () => {
    it("renders player name, avatar, level indicator, and member date", () => {
      const onEditName = vi.fn();

      render(<ProfileHeader profile={mockProfile} onEditName={onEditName} />);

      expect(screen.getByText("Vikram The Champ")).toBeDefined();
      expect(screen.getByText("👑")).toBeDefined();
      expect(screen.getByText("LVL 7")).toBeDefined();
      expect(screen.getByText(/Lifetime XP/i)).toBeDefined();

      const editBtn = screen.getByRole("button", { name: "Edit display name" });
      fireEvent.click(editBtn);
      expect(onEditName).toHaveBeenCalledTimes(1);
    });
  });

  describe("2. Stats Overview & Performance Ratios", () => {
    it("renders total matches, wins, win rate, and play time accurately", () => {
      const stats = {
        ...INITIAL_PLAYER_STATS("player_champ_99"),
        totalMatches: 50,
        wins: 35,
        losses: 15,
        winRate: 70,
        winStreak: 4,
        bestWinStreak: 8,
        totalPlayTimeMinutes: 180,
      };

      render(<StatsOverview stats={stats} />);

      expect(screen.getByText("50")).toBeDefined();
      expect(screen.getByText("70%")).toBeDefined();
      expect(screen.getByText(/180/i)).toBeDefined();
      expect(screen.getByText(/35W • 15L • 0D/i)).toBeDefined();
    });
  });

  describe("3. Career Game Breakdown", () => {
    it("renders endurance and telemetry metrics", () => {
      const stats = {
        ...INITIAL_PLAYER_STATS("player_champ_99"),
        longestMatchMinutes: 25,
        totalDraws: 3,
        seatRecoveries: 2,
      };

      render(<CareerMetrics stats={stats} />);

      expect(screen.getByText("Endurance & Resilience Telemetry")).toBeDefined();
      expect(screen.getByText("Longest Match")).toBeDefined();
      expect(screen.getByText("Seat Recoveries")).toBeDefined();
    });
  });

  describe("4. Achievements & Unlock Modal", () => {
    it("renders achievements panel with unlocked badges and progress percentages", () => {
      const achievements = ACHIEVEMENT_CATALOG.slice(0, 3).map((a, idx) => ({
        ...a,
        unlocked: idx === 0,
        unlockedAt: idx === 0 ? 1700000000000 : undefined,
        currentProgress: idx === 0 ? 1 : 0,
        progressPercent: idx === 0 ? 100 : 0,
      }));

      render(<AchievementsPanel achievements={achievements} />);

      expect(screen.getByText(/Player Achievements \(1 \/ 3 Unlocked\)/i)).toBeDefined();
    });

    it("renders AchievementRevealModal celebration popup on unlock", () => {
      const onClose = vi.fn();
      const achievement = {
        ...ACHIEVEMENT_CATALOG[0],
        unlocked: true,
        currentProgress: 1,
        progressPercent: 100,
      };

      render(
        <AchievementRevealModal
          isOpen={true}
          achievement={achievement}
          onClose={onClose}
        />
      );

      expect(screen.getByText(achievement.title)).toBeDefined();
      expect(screen.getByText(achievement.description)).toBeDefined();
      expect(screen.getByText(/Unlocked & Recorded/i)).toBeDefined();

      const closeBtn = screen.getByRole("button", { name: /Close/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
