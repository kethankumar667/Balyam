import type { PlayerStats } from "@shared/profile/PlayerStats";

interface FavoriteGamesProps {
  stats: PlayerStats;
}

export default function FavoriteGames({ stats }: FavoriteGamesProps) {
  const gamesList = Object.values(stats.perGame).filter(Boolean);

  if (gamesList.length === 0) {
    return (
      <div className="bg-stone-900/60 dark:bg-zinc-900/60 border border-stone-800 dark:border-zinc-800 rounded-xl p-6 text-center text-stone-500 dark:text-zinc-500 text-xs">
        No per-game matches recorded yet. Jump into Ludo, Rummy, or Hand Cricket to build your stats!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-stone-200 dark:text-zinc-200 uppercase tracking-wider text-xs">
        Per-Game Career Breakdown
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {gamesList.map((g) => (
          <div
            key={g.game}
            className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-stone-100 dark:text-zinc-100 capitalize">
                {g.game}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {g.winRate}% Win
              </span>
            </div>

            {/* Win Rate Bar */}
            <div className="h-1.5 bg-stone-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${g.winRate}%` }}
              />
            </div>

            <div className="grid grid-cols-3 text-center text-xs font-mono pt-1 border-t border-stone-800/60 dark:border-zinc-800/60">
              <div>
                <span className="text-[10px] text-stone-500 block">Played</span>
                <span className="font-bold text-stone-200">{g.matchesPlayed}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Wins</span>
                <span className="font-bold text-emerald-400">{g.wins}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Avg Time</span>
                <span className="font-bold text-amber-400">{g.averageMatchDurationMinutes}m</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
