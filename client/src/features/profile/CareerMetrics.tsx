import React from "react";
import { Link } from "react-router-dom";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import CountUp from "../../components/CountUp";
import { Star, Timer, Scale, Armchair, Gamepad2 } from "lucide-react";

interface CareerMetricsProps {
  stats: PlayerStats;
  recentMatches?: any[];
}

export default function CareerMetrics({ stats, recentMatches = [] }: CareerMetricsProps) {
  return (
    <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-7 space-y-6 shadow-xs relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Star className="w-5 h-5 text-purple-600 fill-purple-600/20" />
          <h2 className="font-bold text-base text-slate-900 dark:text-white">
            Your Game Journey & Play Style
          </h2>
          <span className="sr-only">Endurance & Resilience Telemetry</span>
        </div>
        <span className="bg-[#FAF5FF] text-[#9333EA] border border-[#F3E8FF] px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
          PLAYING HIGHLIGHTS
        </span>
      </div>

      {/* 4 Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Longest Match */}
        <div className="bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center shrink-0">
            <Timer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">
              Longest Match
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white">
              <CountUp end={stats.longestMatchMinutes} duration={1.2} />{" "}
              <span className="text-xs font-normal text-slate-400">min</span>
            </span>
          </div>
        </div>

        {/* Average Duration */}
        <div className="bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-[#ECFEFF] text-[#0891B2] flex items-center justify-center shrink-0">
            <Timer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">
              Average Duration
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white">
              <CountUp end={stats.averageMatchMinutes} decimals={1} duration={1.2} />{" "}
              <span className="text-xs font-normal text-slate-400">min</span>
            </span>
          </div>
        </div>

        {/* Total Draws */}
        <div className="bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">
              Total Draws
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white">
              <CountUp end={stats.draws} duration={1.2} />
            </span>
          </div>
        </div>

        {/* Seat Recoveries */}
        <div className="bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center shrink-0">
            <Armchair className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 block truncate">
              Seat Recoveries
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white">
              <CountUp end={stats.recoveryCount} duration={1.2} />
            </span>
          </div>
        </div>
      </div>

      {/* Subheader: Recent Activity */}
      <div className="pt-2 border-t border-[#F3EFE9] dark:border-[#202740]">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
          Recent Activity
        </h3>

        {recentMatches.length > 0 ? (
          <div className="space-y-2">
            {recentMatches.map((m: any, idx: number) => (
              <div
                key={m.id || idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs"
              >
                <span className="font-bold text-slate-800 dark:text-white capitalize">
                  {m.game}
                </span>
                <span className={`font-bold ${m.result === "won" ? "text-emerald-500" : "text-slate-400"}`}>
                  {m.result === "won" ? "Victory" : "Defeat"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            {/* Gamepad Artwork */}
            <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-400 dark:text-purple-300 flex items-center justify-center mx-auto mb-2 opacity-80">
              <Gamepad2 className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              No recent matches yet
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Start playing games to see your activity here!
            </p>
            <div className="pt-2">
              <a
                href="/games"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Play a Game
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
