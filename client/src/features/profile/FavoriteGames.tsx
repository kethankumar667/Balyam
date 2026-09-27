import React from "react";
import { Link } from "react-router-dom";
import { Bookmark, Heart, ArrowRight } from "lucide-react";
import type { PlayerStats } from "@shared/profile/PlayerStats";

interface FavoriteGamesProps {
  stats: PlayerStats;
}

export default function FavoriteGames({ stats }: FavoriteGamesProps) {
  const gamesList = Object.values(stats.perGame).filter(Boolean);

  if (gamesList.length === 0) {
    return (
      <div className="py-4 space-y-4">
        <div className="text-center space-y-1.5">
          <p className="text-xs text-stone-600 dark:text-slate-300">
            You haven't favorited any games yet. Jump into these trending lounge hits or browse the full catalog:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/games"
            className="group p-3.5 rounded-2xl bg-stone-50/80 dark:bg-[#182138] border border-stone-200/70 dark:border-white/5 hover:border-amber-500/40 transition flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-lg shrink-0">
              🎲
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-xs text-stone-900 dark:text-white block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition truncate">
                Ludo Lounge
              </span>
              <span className="text-[11px] text-stone-400 dark:text-slate-400 block truncate">
                Classic multiplayer board
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>

          <Link
            to="/games"
            className="group p-3.5 rounded-2xl bg-stone-50/80 dark:bg-[#182138] border border-stone-200/70 dark:border-white/5 hover:border-amber-500/40 transition flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/40 flex items-center justify-center text-lg shrink-0">
              🐍
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-xs text-stone-900 dark:text-white block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition truncate">
                Snakes & Ladders
              </span>
              <span className="text-[11px] text-stone-400 dark:text-slate-400 block truncate">
                Nostalgic roll-and-climb
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        </div>

        <div className="pt-1 text-center">
          <Link
            to="/favorites"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-stone-100 hover:bg-stone-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>Manage Favorites Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {gamesList.map((g) => (
          <div
            key={g.game}
            className="bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] hover:border-amber-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-2xs hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white capitalize">
                {g.game}
              </span>
              <span className="text-xs font-mono font-bold text-[#16A34A]">
                {g.winRate}% Win
              </span>
            </div>

            {/* Win Rate Bar */}
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${g.winRate}%` }}
              />
            </div>

            <div className="grid grid-cols-3 text-center text-xs font-mono pt-2 border-t border-[#F3EFE9] dark:border-[#252D4A]">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Played</span>
                <span className="font-bold text-slate-900 dark:text-white">{g.matchesPlayed}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Wins</span>
                <span className="font-bold text-[#16A34A]">{g.wins}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Time</span>
                <span className="font-bold text-slate-900 dark:text-white">{g.totalPlayTimeMinutes}m</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
