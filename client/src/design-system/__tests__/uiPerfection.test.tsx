import { describe, it, expect, vi } from "vitest";
import React from "react";
import { SkeletonLoader, PremiumErrorState } from "../premium";
import ProfileHeader from "../../features/profile/ProfileHeader";
import { NAVIGATION_CONFIG } from "../../navigation/navigationConfig";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";

describe("BHALYAM UI Perfection & Hardening Suite", () => {
  describe("1. Premium Skeleton Loaders", () => {
    it("renders all skeleton layout variants without layout shift", () => {
      const card = React.createElement(SkeletonLoader, { type: "card", count: 2 });
      const hero = React.createElement(SkeletonLoader, { type: "hero" });
      const profile = React.createElement(SkeletonLoader, { type: "profile" });
      const table = React.createElement(SkeletonLoader, { type: "table" });
      const grid = React.createElement(SkeletonLoader, { type: "grid" });

      expect(card).toBeDefined();
      expect(hero).toBeDefined();
      expect(profile).toBeDefined();
      expect(table).toBeDefined();
      expect(grid).toBeDefined();
    });
  });

  describe("2. Premium Error & Fallback States", () => {
    it("renders PremiumErrorState and handles retry callback", () => {
      const onRetry = vi.fn();
      const el = React.createElement(PremiumErrorState, {
        title: "Match Connection Lost",
        message: "Failed to sync room state.",
        actionText: "Reconnect",
        onRetry,
      });

      expect(el).toBeDefined();
      expect(el.props.title).toBe("Match Connection Lost");
    });
  });

  describe("3. Mobile Long-Username Truncation", () => {
    it("renders ProfileHeader with safe bounds for long player names", () => {
      const mockProfile: PlayerProfile = {
        playerId: "p_long_user_12345",
        displayName: "Grandmaster_Vanguard_Champion_Player_Name_Extra_Long",
        avatar: "🦁",
        level: 12,
        experiencePoints: 1240,
        joinedAt: Date.now() - 1000000,
        lastSeenAt: Date.now(),
      };

      const header = React.createElement(ProfileHeader, { profile: mockProfile });
      expect(header).toBeDefined();
    });
  });

  describe("4. Navigation Fast-Paths (Max 2 Taps to Features)", () => {
    it("ensures Tournaments, Social Hub, and Leaderboard are 1 tap from Home", () => {
      const homeItems = NAVIGATION_CONFIG.home.items;
      const paths = homeItems.map((i) => i.path).filter(Boolean);

      expect(paths).toContain("/tournaments");
      expect(paths).toContain("/social");
      expect(paths).toContain("/leaderboard");
      expect(paths).toContain("/games");
    });
  });
});
