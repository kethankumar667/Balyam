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
      <div className="py-8 text-center space-y-3">
        {/* Bookmark Heart Artwork */}
        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-[#EA580C] flex items-center justify-center mx-auto mb-2 opacity-80 border border-orange-100 dark:border-orange-900/30 shadow-2xs">
          <Bookmark className="w-7 h-7 stroke-[1.5]" />
        </div>
        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
          No favorite games recorded yet.
        </h4>
        <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto">
          Explore & add your favorite games!
        </p>
        <div className="pt-2">
          <a
            href="/games"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#D94F04] hover:to-[#EA580C] text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Explore Games
          </a>
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
