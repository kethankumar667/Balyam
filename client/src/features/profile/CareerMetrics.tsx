import React from "react";
import { Link, useInRouterContext } from "react-router-dom";
import type { PlayerStats } from "@shared/profile/PlayerStats";

function SafeLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  const hasRouter = useInRouterContext();
  if (hasRouter) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}
import CountUp from "../../components/CountUp";
import { Star, Timer, Scale, Armchair, Gamepad2, ArrowRight, Shield, Zap } from "lucide-react";

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
    <div className="bg-gradient-to-br from-[#0c1424] via-[#121c33] to-[#090e1c] border-2 border-amber-500/30 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background Subtle Accent Glow */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-[0_2px_0_rgba(180,83,9,1)]">
            <Star className="w-4 h-4 fill-stone-950" />
          </div>
          <div>
            <h2 className="font-black text-base text-white tracking-tight">
              Your Game Journey & Play Style
            </h2>
            <span className="sr-only">Endurance & Resilience Telemetry</span>
          </div>
        </div>
        <span className="bg-amber-400/15 text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono shadow-inner">
          PLAYING TELEMETRY
        </span>
      </div>

      {/* 4 Metric Telemetry Plaques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Longest Match */}
        <div className="bg-gradient-to-b from-[#18233c] to-[#0e1628] border-2 border-purple-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-[0_4px_0_rgba(88,28,135,0.4)] hover:border-purple-400/60 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-purple-500 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(88,28,135,1)]">
            <Timer className="w-5 h-5 text-purple-100" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-200/70 block truncate">
              Longest Match
            </span>
            <span className="text-base sm:text-lg font-black text-white drop-shadow-sm font-mono">
              {isColdStart ? (
                <span className="text-stone-400">0 min</span>
              ) : (
                <>
                  <CountUp end={stats.longestMatchMinutes} duration={1.2} />{" "}
                  <span className="text-xs font-bold text-purple-300/80">min</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Average Duration */}
        <div className="bg-gradient-to-b from-[#18233c] to-[#0e1628] border-2 border-cyan-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-[0_4px_0_rgba(14,116,144,0.4)] hover:border-cyan-400/60 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-cyan-500 to-cyan-700 text-white flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(14,116,144,1)]">
            <Timer className="w-5 h-5 text-cyan-100" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-cyan-200/70 block truncate">
              Average Duration
            </span>
            <span className="text-base sm:text-lg font-black text-white drop-shadow-sm font-mono">
              {isColdStart ? (
                <span className="text-stone-400">0 min</span>
              ) : (
                <>
                  <CountUp end={stats.averageMatchMinutes} decimals={1} duration={1.2} />{" "}
                  <span className="text-xs font-bold text-cyan-300/80">min</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Total Draws */}
        <div className="bg-gradient-to-b from-[#18233c] to-[#0e1628] border-2 border-orange-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-[0_4px_0_rgba(194,65,12,0.4)] hover:border-orange-400/60 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-orange-500 to-orange-700 text-white flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(194,65,12,1)]">
            <Scale className="w-5 h-5 text-orange-100" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-200/70 block truncate">
              Total Draws
            </span>
            <span className="text-base sm:text-lg font-black text-white drop-shadow-sm font-mono">
              <CountUp end={stats.draws} duration={1.2} />
            </span>
          </div>
        </div>

        {/* Seat Recoveries */}
        <div className="bg-gradient-to-b from-[#18233c] to-[#0e1628] border-2 border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-[0_4px_0_rgba(4,120,87,0.4)] hover:border-emerald-400/60 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(4,120,87,1)]">
            <Armchair className="w-5 h-5 text-emerald-100" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200/70 block truncate">
              Seat Recoveries
            </span>
            <span className="text-base sm:text-lg font-black text-white drop-shadow-sm font-mono">
              <CountUp end={stats.recoveryCount} duration={1.2} />
            </span>
          </div>
        </div>
      </div>

      {/* Subheader: Recent Activity or Quick Starter Hub */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{recentMatches.length > 0 ? "Recent Activity" : "Quick Play Lounge Gateway"}</span>
          </h3>
          <SafeLink
            to="/games"
            className="text-xs font-black text-amber-400 hover:text-amber-300 transition px-3 py-1.5 min-h-[44px] inline-flex items-center cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl"
          >
            All Games →
          </SafeLink>
        </div>

        {recentMatches.length > 0 ? (
          <div className="space-y-2.5">
            {recentMatches.map((m, idx) => (
              <div
                key={m.id || idx}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#141e34] to-[#0c1424] border-2 border-white/10 text-xs hover:border-amber-500/40 transition shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-white capitalize block text-sm">
                      {m.game}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Lounge Match
                    </span>
                  </div>
                </div>
                <span
                  className={`font-black font-mono px-3 py-1 rounded-full text-xs uppercase tracking-wider shadow-sm border-2 ${
                    m.result === "won"
                      ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/60 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                      : "bg-rose-950/80 text-rose-400 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                  }`}
                >
                  {m.result === "won" ? "Victory" : "Defeat"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-stone-300 font-medium">
              Pick a quick classic to record your debut telemetry, earn your first victory badge, and rank up:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Game 1: Ludo */}
              <SafeLink
                to="/games"
                className="group p-4 rounded-2xl bg-gradient-to-b from-[#182642] to-[#0f172a] border-2 border-amber-500/30 hover:border-amber-400 shadow-[0_4px_0_rgba(180,83,9,0.5)] active:translate-y-0.5 active:shadow-none transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl drop-shadow">🎲</span>
                    <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-md font-mono">
                      2-4 Players
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-white group-hover:text-amber-300 transition">
                    Ludo Classic
                  </h4>
                  <p className="text-[11px] text-stone-300 leading-snug mt-1">
                    Roll a 6 & race all 4 tokens to home base.
                  </p>
                </div>
                <span className="text-xs font-black text-amber-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Play Now →
                </span>
              </SafeLink>

              {/* Game 2: Hand Cricket */}
              <SafeLink
                to="/games"
                className="group p-4 rounded-2xl bg-gradient-to-b from-[#122e25] to-[#0a1b15] border-2 border-emerald-500/30 hover:border-emerald-400 shadow-[0_4px_0_rgba(4,120,87,0.5)] active:translate-y-0.5 active:shadow-none transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl drop-shadow">🏏</span>
                    <span className="text-[10px] font-black uppercase text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono">
                      Fast 1v1
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-white group-hover:text-emerald-300 transition">
                    Hand Cricket
                  </h4>
                  <p className="text-[11px] text-stone-300 leading-snug mt-1">
                    Classic schoolyard fingers showdown.
                  </p>
                </div>
                <span className="text-xs font-black text-emerald-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Play Now →
                </span>
              </SafeLink>

              {/* Game 3: Rummy */}
              <SafeLink
                to="/games"
                className="group p-4 rounded-2xl bg-gradient-to-b from-[#241738] to-[#140c21] border-2 border-purple-500/30 hover:border-purple-400 shadow-[0_4px_0_rgba(88,28,135,0.5)] active:translate-y-0.5 active:shadow-none transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl drop-shadow">🃏</span>
                    <span className="text-[10px] font-black uppercase text-purple-300 bg-purple-950/80 border border-purple-500/40 px-2 py-0.5 rounded-md font-mono">
                      Strategy
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-white group-hover:text-purple-300 transition">
                    Rummy Lounge
                  </h4>
                  <p className="text-[11px] text-stone-300 leading-snug mt-1">
                    Form sets & pure sequences to declare.
                  </p>
                </div>
                <span className="text-xs font-black text-purple-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Play Now →
                </span>
              </SafeLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
