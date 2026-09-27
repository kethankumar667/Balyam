import React from "react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import CountUp from "../../components/CountUp";
import { Star, Timer, Scale, Armchair, Gamepad2 } from "lucide-react";

export interface RecentMatchItem {
  id?: string;
  game: string;
  result: "won" | "lost" | "draw";
  playedAt?: number;
}

interface CareerMetricsProps {
  stats: PlayerStats;
  recentMatches?: RecentMatchItem[];
}

export default function CareerMetrics({ stats, recentMatches = [] }: CareerMetricsProps) {
  const isColdStart = stats.totalMatches === 0;

  return (
    <div className="bg-white/95 dark:bg-[#121829]/95 backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xs relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500/20" />
          <h2 className="font-bold text-base text-stone-900 dark:text-white">
            Your Game Journey & Play Style
          </h2>
          <span className="sr-only">Endurance & Resilience Telemetry</span>
        </div>
        <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
          PLAYING TELEMETRY
        </span>
      </div>

      {/* 4 Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Longest Match */}
        <div className="bg-stone-50/90 dark:bg-[#182138] border border-stone-200/70 dark:border-white/5 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center shrink-0">
            <Timer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 block truncate">
              Longest Match
            </span>
            <span className="text-base font-black text-stone-900 dark:text-white">
              {isColdStart ? (
                <span className="text-stone-400 dark:text-slate-500">0 min</span>
              ) : (
                <>
                  <CountUp end={stats.longestMatchMinutes} duration={1.2} />{" "}
                  <span className="text-xs font-normal text-stone-400 dark:text-slate-400">min</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Average Duration */}
        <div className="bg-stone-50/90 dark:bg-[#182138] border border-stone-200/70 dark:border-white/5 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/40 flex items-center justify-center shrink-0">
            <Timer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 block truncate">
              Average Duration
            </span>
            <span className="text-base font-black text-stone-900 dark:text-white">
              {isColdStart ? (
                <span className="text-stone-400 dark:text-slate-500">0 min</span>
              ) : (
                <>
                  <CountUp end={stats.averageMatchMinutes} decimals={1} duration={1.2} />{" "}
                  <span className="text-xs font-normal text-stone-400 dark:text-slate-400">min</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Total Draws */}
        <div className="bg-stone-50/90 dark:bg-[#182138] border border-stone-200/70 dark:border-white/5 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/40 flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 block truncate">
              Total Draws
            </span>
            <span className="text-base font-black text-stone-900 dark:text-white">
              <CountUp end={stats.draws} duration={1.2} />
            </span>
          </div>
        </div>

        {/* Seat Recoveries */}
        <div className="bg-stone-50/90 dark:bg-[#182138] border border-stone-200/70 dark:border-white/5 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
            <Armchair className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 block truncate">
              Seat Recoveries
            </span>
            <span className="text-base font-black text-stone-900 dark:text-white">
              <CountUp end={stats.recoveryCount} duration={1.2} />
            </span>
          </div>
        </div>
      </div>

      {/* Subheader: Recent Activity or Quick Starter Hub */}
      <div className="pt-2 border-t border-stone-200/70 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-stone-900 dark:text-white">
            {recentMatches.length > 0 ? "Recent Activity" : "Quick Play Lounge Gateway"}
          </h3>
          <a
            href="/games"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition px-2 py-1 min-h-[44px] inline-flex items-center cursor-pointer"
          >
            All Games →
          </a>
        </div>

        {recentMatches.length > 0 ? (
          <div className="space-y-2">
            {recentMatches.map((m, idx) => (
              <div
                key={m.id || idx}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50/80 dark:bg-[#182138] border border-stone-200/70 dark:border-white/5 text-xs hover:border-amber-500/30 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-stone-900 dark:text-white capitalize">
                    {m.game}
                  </span>
                </div>
                <span
                  className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                    m.result === "won"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-stone-200/60 text-stone-600 dark:bg-stone-800 dark:text-slate-300"
                  }`}
                >
                  {m.result === "won" ? "Victory" : "Defeat"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-stone-600 dark:text-slate-300">
              Pick a quick classic to record your debut telemetry, earn your first victory badge, and rank up:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Game 1: Ludo */}
              <a
                href="/games"
                className="group p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 hover:border-amber-500/50 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">🎲</span>
                    <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                      2-4 Players
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                    Ludo Classic
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-snug mt-1">
                    Roll a 6 & race all 4 tokens to home base.
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Play Now →
                </span>
              </a>

              {/* Game 2: Hand Cricket */}
              <a
                href="/games"
                className="group p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 hover:border-emerald-500/50 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">🏏</span>
                    <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                      Fast 1v1
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-stone-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    Hand Cricket
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-snug mt-1">
                    Classic schoolyard fingers showdown.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Play Now →
                </span>
              </a>

              {/* Game 3: Rummy */}
              <a
                href="/games"
                className="group p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/25 hover:border-purple-500/50 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">🃏</span>
                    <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                      Strategy
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-stone-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                    Rummy Lounge
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-snug mt-1">
                    Form sets & pure sequences to declare.
                  </p>
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Play Now →
                </span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
