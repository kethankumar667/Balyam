import { isLocked, type BhalyamGameCard } from "../bhalyam/data";

export const FEATURED_DAY_MS = 86_400_000;
export const FEATURED_IST_OFFSET_MS = 19_800_000;

export function featuredDay(timestamp: number): number {
  return Math.floor((timestamp + FEATURED_IST_OFFSET_MS) / FEATURED_DAY_MS);
}

/** Two steps per IST day give every playable game a turn without adjacent-day repeats in pools of four or more. */
export function dailyFeaturedGames(games: readonly BhalyamGameCard[], day: number): BhalyamGameCard[] {
  const eligible = games.filter((game) => !isLocked(game))
    .sort((a, b) => a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
  if (eligible.length === 0) return [];
  const start = ((day * 2) % eligible.length + eligible.length) % eligible.length;
  return Array.from({ length: Math.min(2, eligible.length) }, (_, index) => eligible[(start + index) % eligible.length]);
}
