import { BHALYAM_GAME_CATALOGUE } from "@shared/catalog";
import { isLocked, type BhalyamGameCard } from "../bhalyam/data";

export const FEATURED_DAY_MS = 86_400_000;
export const FEATURED_IST_OFFSET_MS = 19_800_000;
/** Home always shows this many of each; fewer only when the catalogue itself has fewer playable games. */
export const FEATURED_COUNT = 2;
export const POPULAR_COUNT = 4;

/** The catalogue's own popularity flag, by slug. A card with no catalogue entry is simply not flagged. */
const POPULAR_SLUGS: ReadonlySet<string> = new Set(
  BHALYAM_GAME_CATALOGUE.filter((game) => game.isPopular && game.availability === "playable").map((game) => game.id),
);

const bySlug = (a: BhalyamGameCard, b: BhalyamGameCard) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);

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

/**
 * Today's popular games: four of the catalogue's popular playable titles, never the two featured ones. The window
 * moves four places along a fixed, sorted list each IST day, so the row turns over daily and every popular game gets
 * its turn; a featured game it lands on is skipped. If fewer than four popular titles are playable, the gap is filled
 * from the rest so Home never shows a short row.
 */
export function dailyPopularGames(games: readonly BhalyamGameCard[], day: number): BhalyamGameCard[] {
  const featured = new Set(dailyFeaturedGames(games, day).map((game) => game.slug));
  const playable = games.filter((game) => !isLocked(game)).sort(bySlug);
  const count = Math.min(POPULAR_COUNT, playable.length - featured.size);
  if (count <= 0) return [];
  const popular = playable.filter((game) => POPULAR_SLUGS.has(game.slug));
  const pool = popular.length >= count + featured.size ? popular : [...popular, ...playable.filter((game) => !POPULAR_SLUGS.has(game.slug))];
  const start = ((day * POPULAR_COUNT) % pool.length + pool.length) % pool.length;
  const picks: BhalyamGameCard[] = [];
  for (let step = 0; step < pool.length && picks.length < count; step++) {
    const game = pool[(start + step) % pool.length];
    if (!featured.has(game.slug)) picks.push(game);
  }
  return picks;
}
