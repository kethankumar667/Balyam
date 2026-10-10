import {
  LEVEL_MILESTONES,
  XP_CONFIG,
  calculateMiniclipXPProgression,
  type LevelTier,
} from "@shared/progression/MiniclipProgression";

/**
 * Everything the profile's Level & XP card says, worked out from the player's REAL lifetime XP.
 *
 * Nothing here is made up: the bar is the XP actually earned into the current level, the "ways to earn"
 * are the values in `XP_CONFIG`, and the reward rail is the next entries of `LEVEL_MILESTONES`. A number
 * the player cannot trust is worse than none, so there is no filler (no fake streak, no made-up rank).
 */

/** One bar segment per this many XP, so a level reads as ten steps. */
export const XP_PER_SEGMENT = 10;
const UPCOMING_LIMIT = 4;

export interface UpcomingMilestone {
  level: number;
  coins: number;
  title: string | null;
  perk: string | null;
  levelsAway: number;
  /** True for the nearest one, which the card draws attention to. */
  isNext: boolean;
}

export interface EarnWay {
  id: "win" | "draw" | "played";
  label: string;
  xp: number;
}

export interface XpJourney {
  level: number;
  nextLevel: number;
  title: string;
  tier: LevelTier;
  lifetimeXp: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  percent: number;
  xpToNext: number;
  /** Bar segments: how many are full and how full the one after them is (0..1). */
  segments: { count: number; full: number; partial: number };
  winsToLevel: number;
  matchesToLevel: number;
  earn: EarnWay[];
  upcoming: UpcomingMilestone[];
}

export function describeXpJourney(totalXp: number): XpJourney {
  const progression = calculateMiniclipXPProgression(totalXp);
  const xpIntoLevel = progression.currentXP;
  const xpPerLevel = progression.nextLevelXP;
  const xpToNext = Math.max(0, xpPerLevel - xpIntoLevel);
  const count = Math.round(xpPerLevel / XP_PER_SEGMENT);
  const full = Math.min(count, Math.floor(xpIntoLevel / XP_PER_SEGMENT));
  const partial = full >= count ? 0 : (xpIntoLevel % XP_PER_SEGMENT) / XP_PER_SEGMENT;

  const upcoming = LEVEL_MILESTONES.filter((m) => m.level > progression.currentLevel)
    .slice(0, UPCOMING_LIMIT)
    .map((m, index) => ({
      level: m.level,
      coins: m.reward.coins,
      title: m.reward.title ?? null,
      perk: m.reward.perkDescription ?? null,
      levelsAway: m.level - progression.currentLevel,
      isNext: index === 0,
    }));

  return {
    level: progression.currentLevel,
    nextLevel: progression.currentLevel + 1,
    title: progression.levelTitle,
    tier: progression.tier,
    lifetimeXp: progression.totalLifetimeXP,
    xpIntoLevel,
    xpPerLevel,
    percent: progression.levelProgressPercent,
    xpToNext,
    segments: { count, full, partial },
    winsToLevel: Math.ceil(xpToNext / XP_CONFIG.MATCH_WIN),
    matchesToLevel: Math.ceil(xpToNext / XP_CONFIG.MATCH_PLAYED),
    earn: [
      { id: "win", label: "A win", xp: XP_CONFIG.MATCH_WIN },
      { id: "draw", label: "A draw", xp: XP_CONFIG.MATCH_DRAW },
      { id: "played", label: "Any match played", xp: XP_CONFIG.MATCH_PLAYED },
    ],
    upcoming,
  };
}
