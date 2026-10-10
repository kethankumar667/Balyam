import {
  LEVEL_MILESTONES,
  XP_CONFIG,
  calculateMiniclipXPProgression,
  getLevelTier,
  getLevelTitle,
  type LevelTier,
} from "@shared/progression/MiniclipProgression";

/**
 * What a level-up screen needs to say, worked out from the player's REAL level and XP.
 *
 * Nothing here is invented: the progress is the XP actually earned into the new level, the next reward
 * is the next real milestone in `LEVEL_MILESTONES`, and what a win or a played match is worth comes
 * from `XP_CONFIG`. Motivation comes from showing the player a true, specific next step, never from
 * urgency or a made-up number.
 */

export interface NextMilestone {
  level: number;
  coins: number;
  title: string | null;
  levelsAway: number;
}

export interface LevelUpView {
  fromLevel: number;
  toLevel: number;
  tier: LevelTier;
  title: string;
  /** The player moved into a new tier (a new badge look), not just a new number. */
  isNewTier: boolean;
  /** XP earned into the new level, and what that level needs in all. */
  xpIntoLevel: number;
  xpPerLevel: number;
  progressPercent: number;
  xpToNext: number;
  /** Coins from milestone rewards crossed on the way up (claimed in the Level Roadmap), or 0. */
  unlockedCoins: number;
  next: NextMilestone | null;
  winXp: number;
  playXp: number;
}

export function describeLevelUp(fromLevel: number, toLevel: number, totalXp: number): LevelUpView {
  const from = Math.max(1, Math.floor(fromLevel));
  const to = Math.max(from, Math.floor(toLevel));
  const progression = calculateMiniclipXPProgression(totalXp);
  const tier = getLevelTier(to);

  const unlockedCoins = LEVEL_MILESTONES.filter((m) => m.level > from && m.level <= to).reduce((sum, m) => sum + m.reward.coins, 0);
  const upcoming = LEVEL_MILESTONES.find((m) => m.level > to);

  return {
    fromLevel: from,
    toLevel: to,
    tier,
    title: getLevelTitle(to),
    isNewTier: getLevelTier(from).id !== tier.id,
    xpIntoLevel: progression.currentXP,
    xpPerLevel: progression.nextLevelXP,
    progressPercent: progression.levelProgressPercent,
    xpToNext: Math.max(0, progression.nextLevelXP - progression.currentXP),
    unlockedCoins,
    next: upcoming
      ? { level: upcoming.level, coins: upcoming.reward.coins, title: upcoming.reward.title ?? null, levelsAway: upcoming.level - to }
      : null,
    winXp: XP_CONFIG.MATCH_WIN,
    playXp: XP_CONFIG.MATCH_PLAYED,
  };
}
