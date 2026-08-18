import type { PlayerStats } from "@shared/profile/PlayerStats";

interface StatsOverviewProps {
  stats: PlayerStats;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Matches */}
      <div className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
        <span className="text-xs font-medium text-stone-400 dark:text-zinc-400">Matches Played</span>
        <div className="text-2xl sm:text-3xl font-black font-mono text-stone-100 dark:text-zinc-100 mt-1">
          {stats.totalMatches}
        </div>
        <span className="text-[11px] text-stone-500 font-mono">
          {stats.wins}W • {stats.losses}L • {stats.draws}D
        </span>
      </div>

      {/* Win Rate */}
      <div className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
        <span className="text-xs font-medium text-stone-400 dark:text-zinc-400">Win Rate</span>
        <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">
          {stats.winRate}%
        </div>
        <span className="text-[11px] text-stone-500 font-mono">
          {stats.wins} victories
        </span>
      </div>

      {/* Total Play Time */}
      <div className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
        <span className="text-xs font-medium text-stone-400 dark:text-zinc-400">Total Play Time</span>
        <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 mt-1">
          {stats.totalPlayTimeMinutes} <span className="text-xs font-normal text-stone-500">min</span>
        </div>
        <span className="text-[11px] text-stone-500 font-mono">
          Avg {stats.averageMatchMinutes} min/match
        </span>
      </div>

      {/* Favorite Game */}
      <div className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
        <span className="text-xs font-medium text-stone-400 dark:text-zinc-400">Best Game</span>
        <div className="text-lg sm:text-xl font-bold capitalize text-sky-400 mt-1 truncate">
          {stats.favoriteGame === "none" ? "None yet" : stats.favoriteGame}
        </div>
        <span className="text-[11px] text-stone-500 font-mono">
          Most active table
        </span>
      </div>
    </div>
  );
}
