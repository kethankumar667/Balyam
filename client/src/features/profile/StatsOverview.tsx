import React from "react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import CountUp from "../../components/CountUp";
import { Gamepad2, Target, Clock, Crown, TrendingUp, Zap } from "lucide-react";

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
      {/* 1. Total Matches - Royal Violet Power Tile */}
      <div className="group relative rounded-3xl p-1 bg-gradient-to-b from-purple-400 via-purple-600 to-purple-900 shadow-[0_6px_0_rgba(88,28,135,0.8),0_10px_20px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_0_rgba(88,28,135,0.9),0_14px_25px_rgba(168,85,247,0.3)]">
        <div className="h-full bg-gradient-to-b from-[#18152e] via-[#100e21] to-[#0a0815] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border-t border-purple-300/30 relative overflow-hidden">
          {/* Subtle Ambient Light */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />

          <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-purple-500 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(88,28,135,1)] group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5 text-purple-100" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-950/80 px-2.5 py-1 rounded-full border border-purple-500/40 shadow-inner">
              {isColdStart ? "Debut" : "Matches"}
            </span>
          </div>

          <div className="min-w-0 relative z-10">
            <span className="text-xs font-black uppercase tracking-wider text-purple-200/80 block truncate">
              Matches Played
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight my-1 drop-shadow-sm">
              <CountUp end={stats.totalMatches} duration={1.2} />
            </div>
            <span className="text-[11px] text-purple-300/70 font-mono font-medium block truncate">
              {isColdStart ? "Ready for your 1st match" : `${stats.wins}W • ${stats.losses}L • ${stats.draws}D`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Win Rate - Toxic Emerald Power Tile */}
      <div className="group relative rounded-3xl p-1 bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-900 shadow-[0_6px_0_rgba(6,95,70,0.8),0_10px_20px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_0_rgba(6,95,70,0.9),0_14px_25px_rgba(16,185,129,0.3)]">
        <div className="h-full bg-gradient-to-b from-[#0e241e] via-[#091713] to-[#050e0c] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border-t border-emerald-300/30 relative overflow-hidden">
          {/* Subtle Ambient Light */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />

          <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(6,95,70,1)] group-hover:scale-105 transition-transform">
              <Target className="w-5 h-5 text-emerald-100" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40 shadow-inner flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              {isColdStart ? "Calibrating" : "Ratio"}
            </span>
          </div>

          <div className="min-w-0 relative z-10">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-200/80 block truncate">
              Win Rate
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 leading-tight tracking-tight my-1 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]">
              {isColdStart ? (
                <span className="text-stone-400">—%</span>
              ) : (
                <CountUp end={stats.winRate} suffix="%" duration={1.2} />
              )}
            </div>
            <span className="text-[11px] text-emerald-300/70 font-mono font-medium block truncate">
              {isColdStart ? "Play 1 match to rank" : `${stats.wins} victorious rounds`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Total Play Time - High-Octane Amber Power Tile */}
      <div className="group relative rounded-3xl p-1 bg-gradient-to-b from-amber-400 via-amber-600 to-amber-900 shadow-[0_6px_0_rgba(180,83,9,0.8),0_10px_20px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_0_rgba(180,83,9,0.9),0_14px_25px_rgba(245,158,11,0.3)]">
        <div className="h-full bg-gradient-to-b from-[#261c10] via-[#1a1309] to-[#0f0b05] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border-t border-amber-300/30 relative overflow-hidden">
          {/* Subtle Ambient Light */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />

          <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(180,83,9,1)] group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5 text-stone-950" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/40 shadow-inner">
              Lounge Time
            </span>
          </div>

          <div className="min-w-0 relative z-10">
            <span className="text-xs font-black uppercase tracking-wider text-amber-200/80 block truncate">
              Total Play Time
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 leading-tight tracking-tight my-1 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              <CountUp end={stats.totalPlayTimeMinutes} duration={1.2} separator="," />{" "}
              <span className="text-xs font-bold text-amber-200/70 font-mono">min</span>
            </div>
            <span className="text-[11px] text-amber-300/70 font-mono font-medium block truncate">
              {isColdStart ? "Lounge debut today" : `Avg ${stats.averageMatchMinutes} min/match`}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Best Game - Electric Blue Power Tile */}
      <div className="group relative rounded-3xl p-1 bg-gradient-to-b from-blue-400 via-blue-600 to-blue-900 shadow-[0_6px_0_rgba(30,58,138,0.8),0_10px_20px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_0_rgba(30,58,138,0.9),0_14px_25px_rgba(59,130,246,0.3)]">
        <div className="h-full bg-gradient-to-b from-[#111e38] via-[#0b1426] to-[#060b17] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border-t border-blue-300/30 relative overflow-hidden">
          {/* Subtle Ambient Light */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />

          <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-blue-400 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(30,58,138,1)] group-hover:scale-105 transition-transform">
              <Crown className="w-5 h-5 text-blue-100" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-500/40 shadow-inner">
              {isColdStart ? "Awaiting" : "Signature"}
            </span>
          </div>

          <div className="min-w-0 relative z-10">
            <span className="text-xs font-black uppercase tracking-wider text-blue-200/80 block truncate">
              Best Game
            </span>
            <div className="text-xl sm:text-2xl font-black capitalize text-blue-400 leading-tight tracking-tight my-1 truncate drop-shadow-[0_0_12px_rgba(59,130,246,0.4)]">
              {bestGame}
            </div>
            <span className="text-[11px] text-blue-300/70 font-mono font-medium block truncate">
              {isColdStart ? "Try Ludo or Hand Cricket" : "Most active table"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
