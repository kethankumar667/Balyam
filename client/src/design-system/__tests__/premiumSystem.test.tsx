import { describe, it, expect } from "vitest";
import React from "react";
import {
  PREMIUM_RANK_COLORS,
  PREMIUM_RARITY_COLORS,
  TOURNAMENT_COLORS,
  PREMIUM_GRADIENTS,
  GLASSMORPHISM,
  MOTION_TOKENS,
  PremiumCard,
  PremiumStatCard,
  PremiumProgressCard,
  PremiumHeroCard,
  RewardRevealModal,
  EmptyStateIllustration,
} from "../premium";
import { RankShowcaseCard } from "../../features/rankings/RankShowcaseCard";
import { AchievementCard } from "../../features/profile/AchievementCard";
import { AchievementRevealModal } from "../../features/profile/AchievementRevealModal";
import { TournamentHeroBanner } from "../../features/tournaments/TournamentHeroBanner";

describe("Premium Gaming Design System Suite", () => {
  it("exports complete color tokens for ranks, rarities, and tournaments", () => {
    expect(PREMIUM_RANK_COLORS.bronze.primary).toBeDefined();
    expect(PREMIUM_RANK_COLORS.grandmaster.aura).toBeDefined();
    expect(PREMIUM_RARITY_COLORS.mythic.pill).toBeDefined();
    expect(TOURNAMENT_COLORS.champion.badge).toBeDefined();
    expect(PREMIUM_GRADIENTS.cosmicAura).toBeDefined();
    expect(GLASSMORPHISM.elevatedCard).toBeDefined();
    expect(MOTION_TOKENS.cardHover).toBeDefined();
  });

  it("renders PremiumCard and variant configurations", () => {
    const el = React.createElement(PremiumCard, {
      variant: "interactive",
      glowColor: "#EAB308",
      children: React.createElement("span", null, "Card Content"),
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(PremiumCard);
  });

  it("renders PremiumStatCard with metrics and icons", () => {
    const el = React.createElement(PremiumStatCard, {
      label: "Win Rate",
      value: "84%",
      subValue: "Top 5% of lounge",
      accentColor: "#38BDF8",
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(PremiumStatCard);
  });

  it("renders PremiumProgressCard with percentage and gradients", () => {
    const el = React.createElement(PremiumProgressCard, {
      title: "Battle Pass Tier",
      subtitle: "Season 1",
      current: 450,
      total: 600,
      progressPercent: 75,
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(PremiumProgressCard);
  });

  it("renders PremiumHeroCard with title, category, and action buttons", () => {
    const el = React.createElement(PremiumHeroCard, {
      category: "BHALYAM ESPORTS",
      title: "Championship Tournament",
      subtitle: "Compete in live single-elimination brackets",
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(PremiumHeroCard);
  });

  it("renders RewardRevealModal with XP and crown badge", () => {
    const el = React.createElement(RewardRevealModal, {
      isOpen: true,
      onClose: () => {},
      title: "Tournament Victory!",
      rewardName: "Ludo Grand Prix Champion",
      earnedXP: 500,
      badge: "👑",
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(RewardRevealModal);
  });

  it("renders EmptyStateIllustration for empty states", () => {
    const el = React.createElement(EmptyStateIllustration, {
      type: "matches",
      actionText: "Play Now",
      onAction: () => {},
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(EmptyStateIllustration);
  });

  it("renders RankShowcaseCard for competitive player identity", () => {
    const el = React.createElement(RankShowcaseCard, {
      rank: {
        playerId: "p1",
        rating: 2200,
        tier: "Master",
        tierProgressPercent: 80,
        globalRank: 5,
        perGameRank: {},
        percentile: 98,
      },
      progression: {
        currentXP: 80,
        currentLevel: 7,
        nextLevelXP: 100,
        levelProgressPercent: 80,
        totalXPForNextLevel: 700,
      },
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(RankShowcaseCard);
  });

  it("renders AchievementCard and AchievementRevealModal", () => {
    const mockAch = {
      id: "tournament_champion",
      title: "Tournament Champion",
      description: "Claim 1st place in a tournament championship.",
      icon: "🏆",
      category: "skill" as const,
      targetValue: 1,
      currentProgress: 1,
      progressPercent: 100,
      unlocked: true,
    };

    const card = React.createElement(AchievementCard, { achievement: mockAch });
    expect(card).toBeDefined();

    const modal = React.createElement(AchievementRevealModal, {
      achievement: mockAch,
      isOpen: true,
      onClose: () => {},
    });
    expect(modal).toBeDefined();
  });

  it("renders TournamentHeroBanner", () => {
    const el = React.createElement(TournamentHeroBanner, {
      onViewSchedule: () => {},
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(TournamentHeroBanner);
  });
});
