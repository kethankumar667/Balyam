/**
 * Miniclip Games Inspired XP, Levels & Progression Architecture.
 *
 * Implements the iconic 8-tier progression system seen in Miniclip games
 * (such as 8 Ball Pool, Agar.io, Soccer Stars):
 *  - 8 Prestigious Level Tiers (Bronze, Silver, Cobalt, Gold, Ruby, Amethyst, Emerald, Celestial)
 *  - Dynamic badge styling with laurels, crowns, stars, and metallic gradients
 *  - Milestone rewards roadmap (coins, titles, badges)
 *  - Post-match XP breakdown (Participation, Victory, Win Streaks, Table Stakes)
 *  - Level-up fanfare celebrations
 */

export type LevelTierId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type LevelTierName =
  | "Bronze"
  | "Silver"
  | "Cobalt"
  | "Gold"
  | "Ruby"
  | "Amethyst"
  | "Emerald"
  | "Celestial";

export interface LevelTier {
  id: LevelTierId;
  name: LevelTierName;
  minLevel: number;
  maxLevel: number;
  title: string;
  themeColor: string;
  secondaryColor: string;
  rimGradient: string;
  glowColor: string;
  stars: number;
  hasWings: boolean;
  hasLaurel: boolean;
  hasCrown: boolean;
  badgeShape: "circle" | "octagon" | "shield" | "sunburst" | "crowned-shield" | "imperial-crest" | "dragon-crest" | "celestial-crown";
}

export interface LevelReward {
  coins: number;
  title?: string;
  badgeLabel?: string;
  perkDescription?: string;
}

export interface LevelMilestone {
  level: number;
  tierId: LevelTierId;
  reward: LevelReward;
  isMajor: boolean;
}

export interface MatchXPItem {
  id: string;
  label: string;
  amount: number;
  category: "base" | "outcome" | "streak" | "stakes" | "recovery";
}

export interface MatchXPBreakdown {
  totalXP: number;
  items: MatchXPItem[];
  previousXP: number;
  newXP: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  rewardsUnlocked: LevelReward[];
}

export interface MiniclipXPProgression {
  currentXP: number;
  currentLevel: number;
  nextLevelXP: number;
  levelProgressPercent: number;
  totalXPForNextLevel: number;
  totalLifetimeXP: number;
  tier: LevelTier;
  levelTitle: string;
  rewardForNextLevel: LevelReward;
  unclaimedRewards?: LevelMilestone[];
}

export const XP_CONFIG = {
  MATCH_PLAYED: 15,
  MATCH_WIN: 35,
  MATCH_DRAW: 10,
  WIN_STREAK_BONUS_PER_WIN: 5,
  MAX_STREAK_BONUS: 25,
  RECOVERY_BONUS: 20,
  ACHIEVEMENT_UNLOCK: 50,
  DAILY_CHALLENGE_REWARD: 75,
  WEEKLY_CHALLENGE_REWARD: 200,
  XP_PER_LEVEL: 100,
};

export const MINICLIP_LEVEL_TIERS: Record<LevelTierName, LevelTier> = {
  Bronze: {
    id: 1,
    name: "Bronze",
    minLevel: 1,
    maxLevel: 5,
    title: "Trainee",
    themeColor: "#cd7f32",
    secondaryColor: "#78350f",
    rimGradient: "from-amber-600 via-amber-700 to-amber-900",
    glowColor: "rgba(205, 127, 50, 0.4)",
    stars: 1,
    hasWings: false,
    hasLaurel: false,
    hasCrown: false,
    badgeShape: "circle",
  },
  Silver: {
    id: 2,
    name: "Silver",
    minLevel: 6,
    maxLevel: 15,
    title: "Amateur",
    themeColor: "#94a3b8",
    secondaryColor: "#334155",
    rimGradient: "from-slate-200 via-slate-400 to-slate-700",
    glowColor: "rgba(148, 163, 184, 0.45)",
    stars: 2,
    hasWings: false,
    hasLaurel: false,
    hasCrown: false,
    badgeShape: "octagon",
  },
  Cobalt: {
    id: 3,
    name: "Cobalt",
    minLevel: 16,
    maxLevel: 30,
    title: "Semi-Pro",
    themeColor: "#3b82f6",
    secondaryColor: "#1e3a8a",
    rimGradient: "from-blue-400 via-blue-600 to-indigo-900",
    glowColor: "rgba(59, 130, 246, 0.5)",
    stars: 2,
    hasWings: true,
    hasLaurel: false,
    hasCrown: false,
    badgeShape: "shield",
  },
  Gold: {
    id: 4,
    name: "Gold",
    minLevel: 31,
    maxLevel: 50,
    title: "Professional",
    themeColor: "#eab308",
    secondaryColor: "#854d0e",
    rimGradient: "from-yellow-200 via-amber-400 to-yellow-700",
    glowColor: "rgba(234, 179, 8, 0.55)",
    stars: 3,
    hasWings: true,
    hasLaurel: true,
    hasCrown: false,
    badgeShape: "sunburst",
  },
  Ruby: {
    id: 5,
    name: "Ruby",
    minLevel: 51,
    maxLevel: 75,
    title: "Master",
    themeColor: "#ef4444",
    secondaryColor: "#881337",
    rimGradient: "from-rose-400 via-red-600 to-rose-950",
    glowColor: "rgba(239, 68, 68, 0.6)",
    stars: 4,
    hasWings: true,
    hasLaurel: true,
    hasCrown: true,
    badgeShape: "crowned-shield",
  },
  Amethyst: {
    id: 6,
    name: "Amethyst",
    minLevel: 76,
    maxLevel: 100,
    title: "Grandmaster",
    themeColor: "#a855f7",
    secondaryColor: "#581c87",
    rimGradient: "from-purple-300 via-fuchsia-500 to-purple-950",
    glowColor: "rgba(168, 85, 247, 0.65)",
    stars: 5,
    hasWings: true,
    hasLaurel: true,
    hasCrown: true,
    badgeShape: "imperial-crest",
  },
  Emerald: {
    id: 7,
    name: "Emerald",
    minLevel: 101,
    maxLevel: 150,
    title: "Legendary",
    themeColor: "#10b981",
    secondaryColor: "#064e3b",
    rimGradient: "from-emerald-300 via-teal-500 to-emerald-950",
    glowColor: "rgba(16, 185, 129, 0.7)",
    stars: 5,
    hasWings: true,
    hasLaurel: true,
    hasCrown: true,
    badgeShape: "dragon-crest",
  },
  Celestial: {
    id: 8,
    name: "Celestial",
    minLevel: 151,
    maxLevel: 9999,
    title: "Immortal",
    themeColor: "#06b6d4",
    secondaryColor: "#164e63",
    rimGradient: "from-cyan-300 via-sky-400 to-indigo-950",
    glowColor: "rgba(6, 182, 212, 0.8)",
    stars: 5,
    hasWings: true,
    hasLaurel: true,
    hasCrown: true,
    badgeShape: "celestial-crown",
  },
};

/**
 * Returns the LevelTier for a given numerical level.
 */
export function getLevelTier(level: number): LevelTier {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= 5) return MINICLIP_LEVEL_TIERS.Bronze;
  if (safeLevel <= 15) return MINICLIP_LEVEL_TIERS.Silver;
  if (safeLevel <= 30) return MINICLIP_LEVEL_TIERS.Cobalt;
  if (safeLevel <= 50) return MINICLIP_LEVEL_TIERS.Gold;
  if (safeLevel <= 75) return MINICLIP_LEVEL_TIERS.Ruby;
  if (safeLevel <= 100) return MINICLIP_LEVEL_TIERS.Amethyst;
  if (safeLevel <= 150) return MINICLIP_LEVEL_TIERS.Emerald;
  return MINICLIP_LEVEL_TIERS.Celestial;
}

/**
 * Detailed level titles tailored to Miniclip progression style.
 */
export function getLevelTitle(level: number): string {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel === 1) return "Novice";
  if (safeLevel === 2) return "Rookie";
  if (safeLevel <= 4) return "Trainee";
  if (safeLevel === 5) return "Rising Talent";
  if (safeLevel <= 8) return "Amateur";
  if (safeLevel <= 10) return "Contender";
  if (safeLevel <= 15) return "Club Regular";
  if (safeLevel <= 20) return "Sharpshooter";
  if (safeLevel <= 25) return "Table Virtuoso";
  if (safeLevel <= 30) return "Semi-Pro Specialist";
  if (safeLevel <= 35) return "Professional";
  if (safeLevel <= 40) return "Mastermind";
  if (safeLevel <= 50) return "High Roller";
  if (safeLevel <= 60) return "Master Champion";
  if (safeLevel <= 75) return "Grand Master";
  if (safeLevel <= 90) return "Grandmaster Elite";
  if (safeLevel <= 100) return "Table Overlord";
  if (safeLevel <= 125) return "Mythic Striker";
  if (safeLevel <= 150) return "Legendary Icon";
  return "Living Legend";
}

/**
 * Calculates standard coin rewards granted for reaching a given level.
 */
export function calculateLevelCoinReward(level: number): number {
  const safeLevel = Math.max(2, Math.floor(level));
  return 100 + (safeLevel - 1) * 35;
}

/**
 * Catalog of milestone rewards for the progression roadmap.
 */
export const LEVEL_MILESTONES: LevelMilestone[] = [
  { level: 2, tierId: 1, isMajor: false, reward: { coins: 150, title: "First Steps" } },
  { level: 3, tierId: 1, isMajor: false, reward: { coins: 200 } },
  { level: 4, tierId: 1, isMajor: false, reward: { coins: 250 } },
  { level: 5, tierId: 1, isMajor: true, reward: { coins: 500, title: "Rising Star", badgeLabel: "Bronze Star" } },
  { level: 6, tierId: 2, isMajor: true, reward: { coins: 600, title: "Amateur Contender", perkDescription: "Unlocked Silver Tier Badging" } },
  { level: 8, tierId: 2, isMajor: false, reward: { coins: 700 } },
  { level: 10, tierId: 2, isMajor: true, reward: { coins: 1000, title: "Club Regular", badgeLabel: "Silver Laurel" } },
  { level: 12, tierId: 2, isMajor: false, reward: { coins: 1200 } },
  { level: 15, tierId: 2, isMajor: true, reward: { coins: 1500, title: "Table Virtuoso" } },
  { level: 16, tierId: 3, isMajor: true, reward: { coins: 1800, title: "Cobalt Striker", perkDescription: "Unlocked Winged Badges" } },
  { level: 20, tierId: 3, isMajor: true, reward: { coins: 2500, title: "Cue Maestro", badgeLabel: "Sapphire Crest" } },
  { level: 25, tierId: 3, isMajor: true, reward: { coins: 3500, title: "Precision Virtuoso" } },
  { level: 30, tierId: 3, isMajor: true, reward: { coins: 5000, title: "Grand Champion" } },
  { level: 31, tierId: 4, isMajor: true, reward: { coins: 6000, title: "Golden Pro", perkDescription: "Unlocked Golden Laurel Sunburst" } },
  { level: 35, tierId: 4, isMajor: false, reward: { coins: 7000 } },
  { level: 40, tierId: 4, isMajor: true, reward: { coins: 10000, title: "High Roller" } },
  { level: 50, tierId: 4, isMajor: true, reward: { coins: 15000, title: "Mastermind Elite", badgeLabel: "Golden Laurel" } },
  { level: 51, tierId: 5, isMajor: true, reward: { coins: 20000, title: "Ruby Sovereign", perkDescription: "Unlocked Crowned Shield Badges" } },
  { level: 60, tierId: 5, isMajor: true, reward: { coins: 25000, title: "Grand Sovereign" } },
  { level: 75, tierId: 5, isMajor: true, reward: { coins: 35000, title: "Royal Crown Master", badgeLabel: "Ruby Crown" } },
  { level: 76, tierId: 6, isMajor: true, reward: { coins: 40000, title: "Amethyst Warlord", perkDescription: "Unlocked Imperial Crest Badges" } },
  { level: 85, tierId: 6, isMajor: false, reward: { coins: 50000 } },
  { level: 100, tierId: 6, isMajor: true, reward: { coins: 75000, title: "Table Overlord", badgeLabel: "Amethyst Crown" } },
  { level: 101, tierId: 7, isMajor: true, reward: { coins: 100000, title: "Dragon Lord", perkDescription: "Unlocked Dragon Crest Badges" } },
  { level: 125, tierId: 7, isMajor: true, reward: { coins: 150000, title: "Apex Legend" } },
  { level: 150, tierId: 7, isMajor: true, reward: { coins: 250000, title: "Mythic Striker", badgeLabel: "Emerald Dragon" } },
  { level: 151, tierId: 8, isMajor: true, reward: { coins: 500000, title: "Celestial Deity", perkDescription: "Unlocked Celestial Starlight Badges" } },
  { level: 200, tierId: 8, isMajor: true, reward: { coins: 1000000, title: "Living Legend", badgeLabel: "Hall of Fame Sun" } },
];

/**
 * Returns rewards unlocked when crossing into a new level.
 */
export function getLevelReward(level: number): LevelReward {
  const milestone = LEVEL_MILESTONES.find((m) => m.level === level);
  if (milestone) {
    return milestone.reward;
  }
  return {
    coins: calculateLevelCoinReward(level),
  };
}

/**
 * Calculates level based on total XP (100 XP per level).
 */
export function calculateLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.max(0, xp) / XP_CONFIG.XP_PER_LEVEL) + 1);
}

/**
 * Returns total accumulated XP required to reach a specific level.
 */
export function totalXPForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return (safeLevel - 1) * XP_CONFIG.XP_PER_LEVEL;
}

/**
 * Calculates full Miniclip XP Progression breakdown from total XP.
 */
export function calculateMiniclipXPProgression(totalXP: number): MiniclipXPProgression {
  const safeTotalXP = Math.max(0, Math.floor(totalXP));
  const currentLevel = calculateLevel(safeTotalXP);
  const currentLevelStartXP = (currentLevel - 1) * XP_CONFIG.XP_PER_LEVEL;
  const currentXP = safeTotalXP - currentLevelStartXP;
  const nextLevelXP = XP_CONFIG.XP_PER_LEVEL;
  const levelProgressPercent = Math.min(100, Math.round((currentXP / nextLevelXP) * 100));
  const totalXPForNextLevel = currentLevel * XP_CONFIG.XP_PER_LEVEL;
  const tier = getLevelTier(currentLevel);
  const levelTitle = getLevelTitle(currentLevel);
  const rewardForNextLevel = getLevelReward(currentLevel + 1);

  return {
    currentXP,
    currentLevel,
    nextLevelXP,
    levelProgressPercent,
    totalXPForNextLevel,
    totalLifetimeXP: safeTotalXP,
    tier,
    levelTitle,
    rewardForNextLevel,
  };
}

/**
 * Calculates match XP with detailed Miniclip breakdown.
 */
export function calculateMiniclipMatchXP(params: {
  isWinner: boolean;
  isDraw?: boolean;
  durationMs: number;
  recoveryCount?: number;
  currentWinStreak?: number;
  entryStakeCoins?: number;
  previousXP: number;
}): MatchXPBreakdown {
  const items: MatchXPItem[] = [];

  // 1. Base participation
  items.push({
    id: "match_played",
    label: "Match Played",
    amount: XP_CONFIG.MATCH_PLAYED,
    category: "base",
  });

  // 2. Result bonus
  if (params.isWinner) {
    items.push({
      id: "match_win",
      label: "Victory Bonus",
      amount: XP_CONFIG.MATCH_WIN,
      category: "outcome",
    });
  } else if (params.isDraw) {
    items.push({
      id: "match_draw",
      label: "Draw Bonus",
      amount: XP_CONFIG.MATCH_DRAW,
      category: "outcome",
    });
  }

  // 3. Win streak bonus
  if (params.isWinner && params.currentWinStreak && params.currentWinStreak > 1) {
    const streakBonus = Math.min(
      (params.currentWinStreak - 1) * XP_CONFIG.WIN_STREAK_BONUS_PER_WIN,
      XP_CONFIG.MAX_STREAK_BONUS
    );
    if (streakBonus > 0) {
      items.push({
        id: "win_streak",
        label: `${params.currentWinStreak}x Win Streak Bonus`,
        amount: streakBonus,
        category: "streak",
      });
    }
  }

  // 4. Stakes tier bonus (Miniclip table stakes multiplier)
  if (params.entryStakeCoins && params.entryStakeCoins >= 50) {
    const stakeBonus = params.entryStakeCoins >= 500 ? 15 : params.entryStakeCoins >= 200 ? 10 : 5;
    items.push({
      id: "stakes_tier",
      label: "High Stakes Table Bonus",
      amount: stakeBonus,
      category: "stakes",
    });
  }

  // 5. Recovery bonus
  if (params.recoveryCount && params.recoveryCount > 0) {
    items.push({
      id: "recovery_bonus",
      label: "Turn Recovery Bonus",
      amount: XP_CONFIG.RECOVERY_BONUS,
      category: "recovery",
    });
  }

  const earnedXP = items.reduce((acc, item) => acc + item.amount, 0);
  const previousXP = Math.max(0, params.previousXP);
  const newXP = previousXP + earnedXP;
  const previousLevel = calculateLevel(previousXP);
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > previousLevel;

  const rewardsUnlocked: LevelReward[] = [];
  if (leveledUp) {
    for (let lvl = previousLevel + 1; lvl <= newLevel; lvl++) {
      rewardsUnlocked.push(getLevelReward(lvl));
    }
  }

  return {
    totalXP: earnedXP,
    items,
    previousXP,
    newXP,
    previousLevel,
    newLevel,
    leveledUp,
    rewardsUnlocked,
  };
}
