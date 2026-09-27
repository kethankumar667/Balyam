import React from "react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import CountUp from "../../components/CountUp";
import { Gamepad2, Target, Clock, Crown, TrendingUp } from "lucide-react";

interface StatsOverviewProps {
  stats: PlayerStats;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  const isColdStart = stats.totalMatches === 0;
  const bestGame =
    !stats.favoriteGame || stats.favoriteGame === "none" || stats.totalMatches === 0
      ? "Discovering"
      : stats.favoriteGame;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
      {/* 1. Total Matches */}
      <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-purple-500/25 dark:via-transparent dark:to-purple-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5">
        <div className="h-full bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/80 dark:border-white/10 shadow-xs transition">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/70 dark:border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/10 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-full border border-purple-200/80 dark:border-purple-800/50">
              {isColdStart ? "Debut" : "Matches"}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-stone-600 dark:text-slate-300 block truncate">
              Matches Played
            </span>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white leading-tight tracking-tight my-1">
              <CountUp end={stats.totalMatches} duration={1.2} />
            </div>
            <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium block truncate">
              {isColdStart ? "Ready for your 1st match" : `${stats.wins}W • ${stats.losses}L • ${stats.draws}D`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Win Rate */}
      <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-emerald-500/25 dark:via-transparent dark:to-emerald-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5">
        <div className="h-full bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/80 dark:border-white/10 shadow-xs transition">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10 group-hover:scale-105 transition-transform">
              <Target className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/50 flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              {isColdStart ? "Calibrating" : "Ratio"}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-stone-600 dark:text-slate-300 block truncate">
              Win Rate
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-tight tracking-tight my-1">
              {isColdStart ? (
                <span className="text-stone-400 dark:text-slate-500">—%</span>
              ) : (
                <CountUp end={stats.winRate} suffix="%" duration={1.2} />
              )}
            </div>
            <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium block truncate">
              {isColdStart ? "Play 1 match to rank" : `${stats.wins} victorious rounds`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Total Play Time */}
      <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-amber-500/25 dark:via-transparent dark:to-amber-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5">
        <div className="h-full bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/80 dark:border-white/10 shadow-xs transition">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/10 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800/50">
              Lounge Time
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-stone-600 dark:text-slate-300 block truncate">
              Total Play Time
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 leading-tight tracking-tight my-1">
              <CountUp end={stats.totalPlayTimeMinutes} duration={1.2} separator="," />{" "}
              <span className="text-xs font-bold text-stone-400 dark:text-slate-400">min</span>
            </div>
            <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium block truncate">
              {isColdStart ? "Lounge debut today" : `Avg ${stats.averageMatchMinutes} min/match`}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Best Game */}
      <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-blue-500/25 dark:via-transparent dark:to-blue-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5">
        <div className="h-full bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/80 dark:border-white/10 shadow-xs transition">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/10 group-hover:scale-105 transition-transform">
              <Crown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-full border border-blue-200/80 dark:border-blue-800/50">
              {isColdStart ? "Awaiting" : "Signature"}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-stone-600 dark:text-slate-300 block truncate">
              Best Game
            </span>
            <div className="text-xl sm:text-2xl font-black capitalize text-blue-600 dark:text-blue-400 leading-tight tracking-tight my-1 truncate">
              {bestGame}
            </div>
            <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium block truncate">
              {isColdStart ? "Try Ludo or Hand Cricket" : "Most active table"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
