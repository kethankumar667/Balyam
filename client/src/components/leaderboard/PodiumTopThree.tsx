import { Crown, Medal, Award, Zap } from "lucide-react";
import { findAvatar } from "../../lib/avatars";
import type { FoilTier } from "@shared/profile/Scorecard";

export interface PodiumCompetitor {
  rank: number;
  playerId: string;
  name: string;
  avatar?: string;
  scoreOrRating: number;
  scoreLabel?: string;
  tier?: string;
  winRate?: string;
  foilTier?: FoilTier;
}

interface PodiumTopThreeProps {
  competitors: PodiumCompetitor[];
  unit?: string;
}

export default function PodiumTopThree({ competitors, unit = "ELO" }: PodiumTopThreeProps) {
  if (!competitors || competitors.length < 2) return null;

  const first = competitors.find((c) => c.rank === 1) || competitors[0];
  const second = competitors.find((c) => c.rank === 2) || competitors[1];
  const third = competitors.find((c) => c.rank === 3) || competitors[2];

  if (!first) return null;

  return (
    <div
      className="w-full py-4 px-2 select-none"
      role="region"
      aria-label="Top 3 Lounge Champions Podium"
    >
      <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2 sm:gap-4 items-end justify-center pt-8 pb-4">
        {/* 2nd Place: Silver Pedestal (Left) */}
        {second && (
          <div className="flex flex-col items-center order-1 group">
            {/* Player Avatar & Floating Badge */}
            <div className="relative mb-2 flex flex-col items-center">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-slate-900 border-2 border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.4)] flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
                {second.avatar ? (
                  <img
                    src={findAvatar(second.avatar)?.src || "/Avatars/avatar-01.png"}
                    alt={second.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl font-black text-slate-200">
                    {second.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-200 text-slate-950 text-[10px] font-mono font-black flex items-center gap-1 shadow-md border border-white">
                <Medal className="w-3 h-3 text-slate-800" />
                <span>#2</span>
              </div>
            </div>

            <span className="text-xs sm:text-sm font-bold text-[var(--chrome-ink)] truncate max-w-[90px] sm:max-w-[130px] text-center">
              {second.name}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-mono font-black text-slate-400">
                {second.scoreOrRating.toLocaleString()}
              </span>
              <span className="text-[10px] font-mono text-slate-500">{unit}</span>
            </div>

            {/* Pedestal Block */}
            <div className="w-full h-24 sm:h-32 mt-3 rounded-t-2xl bg-gradient-to-b from-slate-400/20 via-slate-600/10 to-transparent border-t-2 border-x border-slate-400/40 relative overflow-hidden flex flex-col items-center pt-3 shadow-inner">
              <span className="text-2xl sm:text-4xl font-black font-mono text-slate-400/50">2</span>
              {second.tier && (
                <span className="mt-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">
                  {second.tier}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 1st Place: Gold Pedestal (Center - Highest) */}
        {first && (
          <div className="flex flex-col items-center order-2 group relative z-10 -mt-6">
            {/* Holographic Golden Crown Flare */}
            <div className="relative mb-2 flex flex-col items-center">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400 animate-bounce">
                <Crown className="w-6 h-6 fill-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
              </div>

              <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-3xl bg-amber-950/60 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
                {first.avatar ? (
                  <img
                    src={findAvatar(first.avatar)?.src || "/Avatars/avatar-01.png"}
                    alt={first.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-amber-300">
                    {first.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 text-xs font-mono font-black flex items-center gap-1 shadow-lg border border-amber-200">
                <Zap className="w-3 h-3 fill-slate-950" />
                <span>APEX #1</span>
              </div>
            </div>

            <span className="text-sm sm:text-base font-black text-[var(--chrome-ink)] truncate max-w-[100px] sm:max-w-[150px] text-center mt-1">
              {first.name}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-base sm:text-xl font-mono font-black text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                {first.scoreOrRating.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-amber-500/80">{unit}</span>
            </div>

            {/* Pedestal Block */}
            <div className="w-full h-32 sm:h-44 mt-3 rounded-t-2xl bg-gradient-to-b from-amber-500/25 via-amber-600/10 to-transparent border-t-2 border-x border-amber-400/60 relative overflow-hidden flex flex-col items-center pt-4 shadow-lg">
              <span className="text-3xl sm:text-5xl font-black font-mono text-amber-400/60">1</span>
              {first.tier && (
                <span className="mt-1 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  {first.tier}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 3rd Place: Bronze Pedestal (Right) */}
        {third && (
          <div className="flex flex-col items-center order-3 group">
            {/* Player Avatar & Floating Badge */}
            <div className="relative mb-2 flex flex-col items-center">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-amber-950/40 border-2 border-amber-700/70 shadow-[0_0_20px_rgba(180,83,9,0.3)] flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
                {third.avatar ? (
                  <img
                    src={findAvatar(third.avatar)?.src || "/Avatars/avatar-01.png"}
                    alt={third.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl font-black text-amber-600">
                    {third.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-700 text-amber-100 text-[10px] font-mono font-black flex items-center gap-1 shadow-md border border-amber-600">
                <Award className="w-3 h-3 text-amber-300" />
                <span>#3</span>
              </div>
            </div>

            <span className="text-xs sm:text-sm font-bold text-[var(--chrome-ink)] truncate max-w-[90px] sm:max-w-[130px] text-center">
              {third.name}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-mono font-black text-amber-600 dark:text-amber-500">
                {third.scoreOrRating.toLocaleString()}
              </span>
              <span className="text-[10px] font-mono text-amber-700/80">{unit}</span>
            </div>

            {/* Pedestal Block */}
            <div className="w-full h-20 sm:h-28 mt-3 rounded-t-2xl bg-gradient-to-b from-amber-800/20 via-amber-900/10 to-transparent border-t-2 border-x border-amber-700/40 relative overflow-hidden flex flex-col items-center pt-3 shadow-inner">
              <span className="text-2xl sm:text-4xl font-black font-mono text-amber-700/50">3</span>
              {third.tier && (
                <span className="mt-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-400 border border-amber-700/30">
                  {third.tier}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
