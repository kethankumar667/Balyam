import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { Sparkles } from "lucide-react";
import type { GamesFamilyOutletContext } from "../components/layout/GamesFamilyLayout";
import JoinRoomModal from "../components/bhalyam/JoinRoomModal";
import GameCard from "../components/games/GameCard";
import GameCardSkeleton from "../components/games/GameCardSkeleton";
import SearchField from "../components/games/SearchField";
import FilterBar from "../components/games/FilterBar";
import EmptyState from "../components/games/EmptyState";
import OfflineBanner from "../components/games/OfflineBanner";
import {
  BHALYAM_GAMES,
  type GameTag,
} from "../components/bhalyam/data";
import {
  filterGames,
  type CategorySelection,
  type GameFilter,
} from "../components/bhalyam/CategoryFilter";
import { getSocket } from "../lib/socket";
import { useTheme } from "../lib/useTheme";

export default function GamesPage() {
  const { openGameSheet } = useOutletContext<GamesFamilyOutletContext>();
  const [joinOpen, setJoinOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [theme] = useTheme();
  const isLight = theme === "light";

  const [params, setParams] = useSearchParams();
  const filter: GameFilter = useMemo(() => {
    const raw = params.get("c");
    const valid = raw === "favourites" || (raw && BHALYAM_GAMES.some((g) => g.tags.includes(raw as GameTag)));
    return { category: (valid ? (raw as CategorySelection) : "all") };
  }, [params]);

  function setFilter(next: GameFilter) {
    const p = new URLSearchParams();
    if (next.category !== "all") p.set("c", next.category);
    setParams(p, { replace: true });
  }

  useEffect(() => {
    document.title = "All Games · BHALYAM";
    getSocket();
  }, []);

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilter({ category: "all" });
  };

  // Base list of games filtered by active category & live search query
  const displayedGames = useMemo(() => {
    let list = filterGames(filter, true);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.blurb.toLowerCase().includes(q) ||
          (g.nostalgiaQuote && g.nostalgiaQuote.toLowerCase().includes(q)) ||
          (g.teluguTitle && g.teluguTitle.toLowerCase().includes(q)) ||
          g.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [filter, searchQuery]);

  return (
    <>
      <OfflineBanner />

      <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 w-full max-w-[1440px] mx-auto pb-24 min-w-0">
        {/* Page Header */}
        <header className="space-y-1.5 text-left w-full min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nostalgic Indian Games Lounge</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-ink-hi tracking-tight truncate">
            Explore All Games
          </h1>
          <p className="text-xs sm:text-sm text-ink-mid max-w-2xl">
            Relive your 90s school days with Nokia mobile classics, board games, cards, and multiplayer school games with friends.
          </p>
        </header>

        {/* Search Bar & Category Navigation */}
        <div className="space-y-3.5 w-full min-w-0">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full min-w-0">
            <div className="flex-1 min-w-0">
              {/* Placeholder and accessible name both come from SearchField's
                  own defaults. The override that used to live here — "Search
                  games by title, rules, or nostalgia quote…" — is 49 characters
                  and clipped to "…or nost" at 390px. */}
              <SearchField value={searchQuery} onChange={setSearchQuery} />
            </div>
            <div className="text-xs font-bold text-ink-mute flex items-center justify-end px-1 whitespace-nowrap">
              {displayedGames.length} {displayedGames.length === 1 ? "game" : "games"} found
            </div>
          </div>

          <FilterBar
            selectedCategory={filter.category}
            onSelectCategory={(cat) => setFilter({ category: cat })}
          />
        </div>

        {/* Games Grid / Skeletons / Empty State */}
        <section aria-label="Games Catalog" className="w-full min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full min-w-0">
              {Array.from({ length: 8 }).map((_, idx) => (
                <GameCardSkeleton key={idx} />
              ))}
            </div>
          ) : displayedGames.length === 0 ? (
            <EmptyState
              title={
                searchQuery
                  ? `No games matching "${searchQuery}"`
                  : "No games in this category"
              }
              description="Try changing your search terms or selecting 'All Games' to discover our full nostalgic collection."
              onReset={handleResetFilters}
            />
          ) : (
            <ul
              role="list"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full min-w-0"
            >
              {displayedGames.map((game) => (
                <li key={game.slug} role="listitem" className="w-full min-w-0 flex flex-col">
                  <GameCard
                    game={game}
                    onSelect={() => openGameSheet(game.slug)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  );
}
