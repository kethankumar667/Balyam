import { useId } from "react";
import { BHALYAM_GAME_CATALOGUE } from "@shared/catalog";
import type { BhalyamGameCard, BhalyamGameSlug } from "../bhalyam/data";
import GameCard from "./GameCard";

const POPULAR_IDS = new Set(BHALYAM_GAME_CATALOGUE.filter((game) => game.isPopular).map((game) => game.id));
const GRID = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4";

export default function GameCardGrid({
  games, onSelect, showFeatured = true,
}: {
  games: readonly BhalyamGameCard[];
  onSelect: (slug: BhalyamGameSlug) => void;
  showFeatured?: boolean;
}) {
  const id = useId();
  const featured = showFeatured ? games.filter((game) => POPULAR_IDS.has(game.slug)).slice(0, 2) : [];
  const regular = games.filter((game) => !featured.includes(game));
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
