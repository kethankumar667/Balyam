import { useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { History } from "lucide-react";
import type { GamesFamilyOutletContext } from "../components/layout/GamesFamilyLayout";
import GameCard from "../components/games/GameCard";
import EmptyState from "../components/games/EmptyState";
import { BHALYAM_GAMES } from "../components/bhalyam/data";
import { useRecentlyPlayed } from "../hooks/useRecentlyPlayed";

/**
 * A dedicated page rather than a filter on /games — order here is recency,
 * not catalog order, which filterGames()/CategoryFilter has no concept of.
 * Reuses the same GameCard grid /games and /favorites already use.
 */
export default function RecentlyPlayedPage() {
  const { openGameSheet } = useOutletContext<GamesFamilyOutletContext>();
  const navigate = useNavigate();
  const { recentItems } = useRecentlyPlayed();


  // Newest-first, exactly as RecentlyPlayedManager stored it — resolved
  // against the live catalog so a game that's been re-themed or locked
  // since still renders with current data.
  const games = useMemo(
    () =>
      recentItems
        .map((item) => BHALYAM_GAMES.find((g) => g.slug === item.slug))
        .filter((g): g is NonNullable<typeof g> => g !== undefined),
    [recentItems],
  );

  return (
    <>
      <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 w-full max-w-[1440px] mx-auto pb-24 min-w-0">
        <header className="space-y-1.5 text-left w-full min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            <History className="w-3.5 h-3.5" />
            <span>Jump Back In</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-ink-hi tracking-tight truncate">
            Recently Played
          </h1>
          <p className="text-xs sm:text-sm text-ink-mid max-w-2xl">
            Your last {games.length > 0 ? games.length : ""} games, newest first.
          </p>
        </header>

        <section aria-label="Recently Played Games" className="w-full min-w-0">
          {games.length === 0 ? (
            <EmptyState
              title="Nothing played yet"
              description="Start a game and it'll show up here for quick access next time."
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
