import { useEffect } from "react";
import { Heart } from "lucide-react";
import type { GamesFamilyOutletContext } from "../components/layout/GamesFamilyLayout";
import GameCard from "../components/games/GameCard";
import EmptyState from "../components/games/EmptyState";
import { filterGames } from "../components/bhalyam/CategoryFilter";
import { useFavourites } from "../hooks/useFavourites";
import { useNavigate, useOutletContext } from "react-router-dom";

/**
 * A dedicated page rather than a filter pill on /games — favourites are a
 * player-curated shortlist, not a way of slicing the catalog, and deserve
 * their own reachable URL from both the Home and Games Hub side navs.
 * Reuses the same GameCard grid /games already uses (no new card design).
 */
export default function FavoritesPage() {
  const { openGameSheet } = useOutletContext<GamesFamilyOutletContext>();
  const navigate = useNavigate();
  // Subscribed (return value unused) purely so this page re-renders the
  // instant a card's heart is toggled — including toggling the last
  // favourite off, which must empty this page live, not just on next visit.
  useFavourites();

  useEffect(() => {
    document.title = "Favorites · BHALYAM";
  }, []);

  const games = filterGames({ category: "favourites" });

  return (
    <>
      <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 w-full max-w-[1440px] mx-auto pb-20 min-w-0 overflow-hidden">
        <header className="space-y-1.5 text-left w-full min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Your Shortlist</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-ink-hi tracking-tight truncate">
            Favorites
          </h1>
          <p className="text-xs sm:text-sm text-ink-mid max-w-2xl">
            Games you've marked with the heart icon — tap it again on any
            card to remove it from here.
          </p>
        </header>

        <section aria-label="Favorite Games" className="w-full min-w-0">
          {games.length === 0 ? (
            <EmptyState
              title="No favorites yet"
              description="Tap the heart on any game card to keep it here for quick access."
              resetLabel="Browse all games"
              onReset={() => navigate("/games")}
            />
          ) : (
            <ul
              role="list"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full min-w-0"
            >
              {games.map((game) => (
                <li key={game.slug} role="listitem" className="w-full min-w-0 flex flex-col">
                  <GameCard game={game} onSelect={() => openGameSheet(game.slug)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
