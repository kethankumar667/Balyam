import React from "react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import CountUp from "../../components/CountUp";
import { Gamepad2, Target, Clock, Crown } from "lucide-react";

interface StatsOverviewProps {
  stats: PlayerStats;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  const bestGame =
    !stats.favoriteGame || stats.favoriteGame === "none" || stats.totalMatches === 0
      ? "None Yet"
      : stats.favoriteGame;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* 1. Total Matches */}
      <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-xs hover:shadow-sm transition">
        <div className="w-10 h-10 rounded-2xl bg-[#FAF5FF] text-[#9333EA] border border-[#F3E8FF] flex items-center justify-center shrink-0 shadow-2xs">
          <Gamepad2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate">
            Matches Played
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight my-0.5">
            <CountUp end={stats.totalMatches} duration={1.2} />
          </div>
          <span className="text-[11px] text-slate-400 font-medium block truncate">
            {stats.wins}W • {stats.losses}L • {stats.draws}D
          </span>
        </div>
      </div>

      {/* 2. Win Rate */}
      <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-xs hover:shadow-sm transition">
        <div className="w-10 h-10 rounded-2xl bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7] flex items-center justify-center shrink-0 shadow-2xs">
          <Target className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate">
            Win Rate
          </span>
          <div className="text-xl sm:text-2xl font-black text-[#16A34A] leading-tight my-0.5">
            <CountUp end={stats.winRate} suffix="%" duration={1.2} />
          </div>
          <span className="text-[11px] text-slate-400 font-medium block truncate">
            {stats.wins} victories
          </span>
        </div>
      </div>

      {/* 3. Total Play Time */}
      <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-xs hover:shadow-sm transition">
        <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5] flex items-center justify-center shrink-0 shadow-2xs">
          <Clock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate">
            Total Play Time
          </span>
          <div className="text-xl sm:text-2xl font-black text-[#EA580C] leading-tight my-0.5">
            <CountUp end={stats.totalPlayTimeMinutes} duration={1.2} separator="," />{" "}
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">min</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium block truncate">
            Avg {stats.averageMatchMinutes} min/match
          </span>
        </div>
      </div>

      {/* 4. Best Game */}
      <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-xs hover:shadow-sm transition">
        <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] flex items-center justify-center shrink-0 shadow-2xs">
          <Crown className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate">
            Best Game
          </span>
          <div className="text-base sm:text-lg font-black capitalize text-[#2563EB] leading-tight my-0.5 truncate">
            {bestGame}
          </div>
          <span className="text-[11px] text-slate-400 font-medium block truncate">
            Most active table
          </span>
        </div>
      </div>
    </div>
  );
}
