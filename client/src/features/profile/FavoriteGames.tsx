import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Heart } from "lucide-react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import { getProfileGameLabel } from "./gameLabel";

interface FavoriteGamesProps {
  stats: PlayerStats;
}

export default function FavoriteGames({ stats }: FavoriteGamesProps) {
  const gamesList = Object.values(stats.perGame).filter(Boolean);

  if (gamesList.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-start justify-center px-5 py-8 sm:px-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20">
          <Heart className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-5 text-base font-bold text-stone-950 dark:text-white">Build your game shelf</p>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-stone-600 dark:text-slate-300">
          Favorite the tables you return to most. Their records and mastery progress will appear here.
        </p>
        <Link
          to="/games"
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300"
        >
          Browse games
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-200/80 px-5 sm:px-6 dark:divide-slate-700/70">
      {gamesList.map((game) => (
        <div key={game.game} className="py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-slate-800 dark:text-slate-200">
                <Gamepad2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-stone-950 dark:text-white">{getProfileGameLabel(game.game)}</p>
                <p className="mt-0.5 text-sm text-stone-500 dark:text-slate-400">{game.matchesPlayed} matches · {game.wins} wins</p>
              </div>
            </div>
            <strong className="shrink-0 text-lg tabular-nums text-emerald-700 dark:text-emerald-300">{game.winRate}%</strong>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div
              role="progressbar"
              aria-label={`${getProfileGameLabel(game.game)} win rate`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={game.winRate}
              className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800"
            >
              <div className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400" style={{ width: `${game.winRate}%` }} />
            </div>
            <span className="shrink-0 text-sm text-stone-500 dark:text-slate-400">{game.totalPlayTimeMinutes} min</span>
          </div>
        </div>
      ))}
    </div>
  );
}