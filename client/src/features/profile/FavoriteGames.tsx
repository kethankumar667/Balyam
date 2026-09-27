import React from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowRight, Trophy } from "lucide-react";
import type { PlayerStats } from "@shared/profile/PlayerStats";

interface FavoriteGamesProps {
  stats: PlayerStats;
}

export default function FavoriteGames({ stats }: FavoriteGamesProps) {
  const gamesList = Object.values(stats.perGame).filter(Boolean);

  if (gamesList.length === 0) {
    return (
      <div className="py-2 space-y-4">
        <div className="text-center space-y-1.5">
          <p className="text-xs text-stone-300 font-medium">
            You haven't favorited any games yet. Jump into these trending lounge hits or browse the full catalog:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/games"
            className="group p-3.5 rounded-2xl bg-gradient-to-r from-[#16243d] to-[#0e1728] border-2 border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_3px_0_rgba(4,120,87,0.4)] active:translate-y-0.5 active:shadow-none transition flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-stone-950 font-black text-xl flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(4,120,87,1)]">
              🎲
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-black text-xs text-white block group-hover:text-emerald-300 transition truncate">
                Ludo Lounge
              </span>
              <span className="text-[11px] text-stone-400 block truncate font-medium">
                Classic multiplayer board
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </Link>

          <Link
            to="/games"
            className="group p-3.5 rounded-2xl bg-gradient-to-r from-[#16243d] to-[#0e1728] border-2 border-orange-500/30 hover:border-orange-400/60 shadow-[0_3px_0_rgba(194,65,12,0.4)] active:translate-y-0.5 active:shadow-none transition flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 text-stone-950 font-black text-xl flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(194,65,12,1)]">
              🐍
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-black text-xs text-white block group-hover:text-orange-300 transition truncate">
                Snakes & Ladders
              </span>
              <span className="text-[11px] text-stone-400 block truncate font-medium">
                Nostalgic roll-and-climb
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </Link>
        </div>

        <div className="pt-1 text-center">
          <Link
            to="/favorites"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white text-xs font-black uppercase tracking-wider border-b-4 border-slate-950 active:border-b-0 active:translate-y-0.5 border border-white/10 transition shadow-md cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
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
            className="bg-gradient-to-b from-[#162238] to-[#0e1628] border-2 border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-4 space-y-3 shadow-[0_3px_0_rgba(180,83,9,0.3)] transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-white capitalize tracking-tight">
                {g.game}
              </span>
              <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full shadow-inner">
                {g.winRate}% Win
              </span>
            </div>

            {/* Glowing Win Rate Bar */}
            <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                style={{ width: `${g.winRate}%` }}
              />
            </div>

            <div className="grid grid-cols-3 text-center text-xs font-mono pt-2 border-t border-white/10">
              <div>
                <span className="text-[10px] text-stone-400 block uppercase font-bold">Played</span>
                <span className="font-black text-white">{g.matchesPlayed}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block uppercase font-bold">Wins</span>
                <span className="font-black text-emerald-400">{g.wins}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block uppercase font-bold">Time</span>
                <span className="font-black text-amber-400">{g.totalPlayTimeMinutes}m</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
