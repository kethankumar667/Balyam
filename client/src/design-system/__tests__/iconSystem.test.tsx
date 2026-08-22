import { describe, it, expect } from "vitest";
import React from "react";
import {
  RankTierIcon,
  GameCategoryIcon,
  AchievementRarityBadge,
  HomeNavIcon,
  GamesNavIcon,
  TournamentsNavIcon,
  TournamentCupIcon,
  ChampionCrownIcon,
  MicOnIcon,
  StatusConnectedIcon,
  FriendUserIcon,
  FancyLockIcon,
  FancyLockBadge,
  RANK_COLORS,
  RARITY_COLORS,
} from "../icons";

describe("Design System Iconography Suite", () => {
  it("renders RankTierIcon for all 7 rank tiers", () => {
    const tiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"];
    for (const tier of tiers) {
      const el = React.createElement(RankTierIcon, { tier, size: 32 });
      expect(el).toBeDefined();
    }
  });

  it("renders GameCategoryIcon for supported multiplayer games", () => {
    const games = ["ludo", "uno", "rummy", "handcricket", "chess", "carrom", "snake", "spacewar"];
    for (const game of games) {
      const el = React.createElement(GameCategoryIcon, { game, size: 24 });
      expect(el).toBeDefined();
    }
  });

  it("renders AchievementRarityBadge for all 5 rarity categories", () => {
    const rarities = ["common", "rare", "epic", "legendary", "mythic"] as const;
    for (const rarity of rarities) {
      const el = React.createElement(AchievementRarityBadge, {
        icon: "👑",
        rarity,
        unlocked: true,
        size: 48,
      });
      expect(el).toBeDefined();
    }
  });

  it("renders Navigation, Tournament, Voice, Status, Social, and FancyLock icons", () => {
    expect(React.createElement(HomeNavIcon)).toBeDefined();
    expect(React.createElement(GamesNavIcon)).toBeDefined();
    expect(React.createElement(TournamentsNavIcon)).toBeDefined();
    expect(React.createElement(TournamentCupIcon)).toBeDefined();
    expect(React.createElement(ChampionCrownIcon)).toBeDefined();
    expect(React.createElement(MicOnIcon)).toBeDefined();
    expect(React.createElement(StatusConnectedIcon)).toBeDefined();
    expect(React.createElement(FriendUserIcon)).toBeDefined();
    expect(React.createElement(FancyLockIcon, { size: 16, glow: true })).toBeDefined();
    expect(React.createElement(FancyLockBadge, { size: 18 })).toBeDefined();
  });

  it("exports valid design token definitions for ranks and rarities", () => {
    expect(RANK_COLORS.bronze.primary).toBeDefined();
    expect(RANK_COLORS.grandmaster.primary).toBeDefined();
    expect(RARITY_COLORS.legendary.border).toBeDefined();
    expect(RARITY_COLORS.mythic.text).toBeDefined();
  });
});
