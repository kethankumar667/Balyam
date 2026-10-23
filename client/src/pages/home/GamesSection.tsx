import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, Gamepad2 } from "lucide-react";
import { RevealOnScroll } from "../../components/RevealOnScroll";
import { useFavourites } from "../../hooks/useFavourites";
import CategoryFilter, { filterGames, type GameFilter } from "../../components/bhalyam/CategoryFilter";
import type { BhalyamGameSlug } from "../../components/bhalyam/data";
import GameCardGrid from "../../components/games/GameCardGrid";
import { gamesForWay, type PlayWay } from "./playWay";

export { default as GameTile, GameArtwork as GameTileArt } from "../../components/games/GameCard";

const HOME_TILE_CAP = 6;

export function GamesSection({
  onSelect, way = null, onClearWay,
}: {
  onSelect: (slug: BhalyamGameSlug) => void;
  way?: PlayWay | null;
  onClearWay?: () => void;
}) {
  const [filter, setFilter] = useState<GameFilter>({ category: "all" });
  const { favourites } = useFavourites();
  const matches = gamesForWay(filterGames(filter, false), way);
  const shown = filter.category === "favourites" ? matches : matches.slice(0, HOME_TILE_CAP);
  const narrowed = filter.category !== "all";
  const filtered = narrowed || way !== null;

  return (
    <section className="pb-12 sm:pb-14">
      <RevealOnScroll as="header" className="mb-4">
        <h2 className="bhalyam-display leading-tight text-[#1D2C4A] dark:text-white"
            style={{ fontSize: "clamp(24px, 6.5vw, 44px)" }}>
          <span className="bhalyam-underline">Pick a game</span>
        </h2>
        <p className="mt-1 text-xs font-medium text-ink-mid sm:text-sm">
          Tap Play now to host a room, invite friends, or challenge bots.
        </p>
      </RevealOnScroll>
      <CategoryFilter value={filter} onChange={setFilter} className="mb-4" />
      <p className="mb-4 text-[13px] font-semibold text-ink-mid" aria-live="polite">
        {matches.length === 0
          ? filter.category === "favourites" ? "No favourite games selected yet." : "No games found in this category."
          : shown.length < matches.length
            ? `Showing ${shown.length} of ${matches.length} games.`
            : `${matches.length} game${matches.length === 1 ? "" : "s"}.`}
      </p>
      {matches.length === 0 ? (
        <div className="space-y-3 rounded-3xl border border-black/10 bg-black/5 p-8 text-center dark:border-white/10 dark:bg-white/5 sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
            {filter.category === "favourites" ? <Heart className="h-6 w-6" aria-hidden="true" /> : <Gamepad2 className="h-6 w-6" aria-hidden="true" />}
          </div>
          <h3 className="text-base font-extrabold text-ink-hi">
            {filter.category === "favourites" ? "No Favourite Games Yet" : "No Games in this Filter"}
          </h3>
          <p className="mx-auto max-w-sm text-xs text-ink-mid">
            {filter.category === "favourites"
              ? favourites.length > 0 && way !== null
                ? "Your favourites do not fit this way of playing. Show all games to see them."
                : "Tap the heart icon on any game card below to add your favorite childhood classics to your shortlist for quick access."
              : "Try switching to another category or explore all childhood classics."}
          </p>
          <button
            type="button"
            onClick={() => { setFilter({ category: "all" }); onClearWay?.(); }}
            className="inline-flex min-h-[44px] items-center rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
          >
            Show All Games
          </button>
        </div>
      ) : (
        <GameCardGrid
          games={matches}
          limit={filter.category === "favourites" ? undefined : HOME_TILE_CAP}
          onSelect={onSelect}
          showFeatured={!filtered}
        />
      )}
      <div className="mt-5 flex justify-center">
        <Link
          to={narrowed ? `/games?c=${filter.category}` : "/games"}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-black/15 bg-surface-1 px-6 py-3 text-sm font-extrabold text-ink-hi shadow-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:border-white/20"
        >
          {narrowed
            ? filter.category === "favourites" ? "View all favourites" : "View all in this filter"
            : way !== null ? "Browse every game" : "View all games"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
