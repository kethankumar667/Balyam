import {
  calculateLevel,
  type MatchXPBreakdown,
} from "@shared/progression/MiniclipProgression";

/**
 * The "XP earned this match" card's numbers, from the player's REAL XP before and after the match.
 *
 * The server decides what a match is worth (win, draw, streak, practice caps and so on) and writes it to the
 * player's profile. The client does not recompute that: it reads the profile before and after and reports the
 * difference. That is why the breakdown is one honest line ("XP earned from this match") and not an
 * itemised list the client would have to guess at.
 *
 * Returns `null` when no XP was gained, so nothing is shown for a match that earned none.
 */
export function buildMatchXpBreakdown(previousXp: number, newXp: number): MatchXPBreakdown | null {
  const before = Math.max(0, Math.floor(previousXp));
  const after = Math.max(0, Math.floor(newXp));
  const earned = after - before;
  if (earned <= 0) return null;

  const previousLevel = calculateLevel(before);
  const newLevel = calculateLevel(after);
  return {
    totalXP: earned,
    items: [{ id: "match_xp", label: "XP earned from this match", amount: earned, category: "base" }],
    previousXP: before,
    newXP: after,
    previousLevel,
    newLevel,
    leveledUp: newLevel > previousLevel,
    rewardsUnlocked: [],
  };
}
