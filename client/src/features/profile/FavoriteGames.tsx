import React from "react";
import type { PlayerStats } from "@shared/profile/PlayerStats";

interface FavoriteGamesProps {
  stats: PlayerStats;
}

export default function FavoriteGames({ stats }: FavoriteGamesProps) {
  const gamesList = Object.values(stats.perGame).filter(Boolean);

  if (gamesList.length === 0) {
    return (
      <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-6 text-center text-[var(--auth-ink-soft)] text-xs font-mono shadow-xs">
        No per-game matches recorded yet. Jump into Ludo, Rummy, or Hand Cricket to build your stats!
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono font-bold text-[var(--auth-ink-soft)] uppercase tracking-wider">
          Per-Game Career Breakdown
        </h2>
        <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          {gamesList.length} GAMES PLAYED
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {gamesList.map((g) => (
          <div
            key={g.game}
            className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] hover:border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-xs hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-[var(--auth-ink)] capitalize">
                {g.game}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-500">
                {g.winRate}% Win
              </span>
            </div>

            {/* Win Rate Bar */}
            <div className="h-2 bg-[var(--auth-field)] rounded-full overflow-hidden border border-[var(--auth-field-edge)] shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${g.winRate}%` }}
              />
            </div>

            <div className="grid grid-cols-3 text-center text-xs font-mono pt-2 border-t border-[var(--auth-field-edge)]">
              <div>
                <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase">Played</span>
                <span className="font-bold text-[var(--auth-ink)]">{g.matchesPlayed}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase">Wins</span>
                <span className="font-bold text-emerald-500">{g.wins}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase">Avg Time</span>
                <span className="font-bold text-amber-500">{g.averageMatchDurationMinutes}m</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
