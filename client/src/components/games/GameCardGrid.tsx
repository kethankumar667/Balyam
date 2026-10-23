import { useEffect, useId, useState } from "react";
import type { BhalyamGameCard, BhalyamGameSlug } from "../bhalyam/data";
import GameCard from "./GameCard";
import { dailyFeaturedGames, featuredDay, FEATURED_DAY_MS, FEATURED_IST_OFFSET_MS } from "./dailyFeatured";

const GRID = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4";

export default function GameCardGrid({
  games, onSelect, showFeatured = true, limit,
}: {
  games: readonly BhalyamGameCard[];
  onSelect: (slug: BhalyamGameSlug) => void;
  showFeatured?: boolean;
  limit?: number;
}) {
  const id = useId();
  // Build-time HTML and hydration must agree even when they happen on different IST dates.
  const [day, setDay] = useState<number | null>(null);
  useEffect(() => {
    if (!showFeatured) return;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = Date.now();
      const currentDay = featuredDay(now);
      setDay(currentDay);
      timer = setTimeout(refresh, (currentDay + 1) * FEATURED_DAY_MS - FEATURED_IST_OFFSET_MS - now);
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [showFeatured]);
  const featured = showFeatured && day !== null ? dailyFeaturedGames(games, day).slice(0, limit) : [];
  const featuredIds = new Set(featured.map((game) => game.slug));
  const regular = games.filter((game) => !featuredIds.has(game.slug))
    .slice(0, limit === undefined ? undefined : Math.max(0, limit - featured.length));
  if (games.length === 0) return null;

  return (
    <div className="space-y-6">
      {featured.length > 0 && (
        <section aria-labelledby={`${id}-featured`}>
          <h3 id={`${id}-featured`} className="mb-3 font-display text-lg font-bold text-ink-hi sm:text-xl">Featured games</h3>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4">
            {featured.map((game) => (
              <li key={game.slug} className="min-w-0">
                <GameCard game={game} featured onSelect={() => onSelect(game.slug)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {regular.length > 0 && (
        <section aria-labelledby={`${id}-all`}>
          <h3 id={`${id}-all`} className="mb-3 font-display text-lg font-bold text-ink-hi sm:text-xl">
            {showFeatured ? "All games" : "Matching games"}
          </h3>
          <ul className={GRID}>
            {regular.map((game) => (
              <li key={game.slug} className="min-w-0">
                <GameCard game={game} onSelect={() => onSelect(game.slug)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
