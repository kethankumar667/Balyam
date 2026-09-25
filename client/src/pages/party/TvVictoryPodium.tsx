import { useEffect } from "react";
import { Crown, Trophy, Medal, Award, Flame, RotateCcw } from "lucide-react";
import type { Player } from "@shared/types";
import { findAvatar } from "../../lib/avatars";
import type { TvPodiumEntry } from "./types";
import { confetti } from "@tsparticles/confetti";
import { getPrefersReducedMotion } from "../../hooks/useReducedMotion";

export interface TvVictoryPodiumProps {
  entries: TvPodiumEntry[];
  roomName: string | null;
  gameName: string;
  hostPlayer?: Player;
}

export function TvVictoryPodium({
  entries,
  roomName,
  gameName,
  hostPlayer,
}: TvVictoryPodiumProps) {
  const sorted = [...entries].sort((a, b) => a.rank - b.rank);
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  // Celebrate champion on mount with Olympic gold confetti
  useEffect(() => {
    if (getPrefersReducedMotion() || !first) return;

    try {
      confetti({
        count: 140,
        spread: 120,
        startVelocity: 50,
        position: { x: 50, y: 35 },
        colors: ["#F59E0B", "#FBBF24", "#EF4444", "#3B82F6", "#10B981", "#FFFFFF"],
      }).catch(() => {});

      const timer = setTimeout(() => {
        confetti({
          count: 80,
          spread: 90,
          startVelocity: 42,
          position: { x: 50, y: 40 },
          colors: ["#F59E0B", "#FBBF24", "#F97316", "#E5E7EB"],
        }).catch(() => {});
      }, 550);

      return () => clearTimeout(timer);
    } catch {
      // Ignored if canvas unavailable in headless test environment
    }
  }, [first]);

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col justify-between items-center gap-6 p-4 sm:p-6 select-none">
      {/* Victory Header Banner */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs uppercase tracking-widest mb-2 shadow-md">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Match Final Results</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-amber-100 tracking-tight">
          Victory Podium
        </h2>
        <p className="text-xs sm:text-sm text-amber-400/80 font-bold tracking-wider uppercase mt-1">
          {roomName || "BHALYAM LOUNGE"} • {gameName}
        </p>
      </div>

      {/* 3D Olympic / Arcade Style Top 3 Podium */}
      <div className="w-full max-w-3xl grid grid-cols-3 gap-2 sm:gap-6 items-end justify-center pt-6 pb-2">
        {/* 2nd Place: Silver Pedestal (Left) */}
        {second ? (
          <div className="flex flex-col items-center order-1">
            <div className="relative mb-3 flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-stone-900 border-2 border-slate-300 shadow-[0_0_25px_rgba(203,213,225,0.4)] flex items-center justify-center overflow-hidden">
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
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-950 text-xs font-mono font-black flex items-center gap-1 shadow-md border border-white">
                <Medal className="w-3.5 h-3.5 text-slate-800" />
                <span>#2</span>
              </div>
            </div>

            <p className="text-sm sm:text-base font-black text-slate-200 truncate max-w-full text-center mb-1">
              {second.name}
            </p>
            {second.scoreOrStat !== undefined && (
              <span className="text-xs font-mono font-bold text-slate-400 mb-2">
                {second.scoreOrStat}
              </span>
            )}

            {/* Silver Pedestal Block */}
            <div className="w-full h-32 sm:h-40 rounded-t-2xl bg-gradient-to-b from-slate-300 via-slate-500 to-slate-800 border-t-2 border-x-2 border-slate-200 flex flex-col items-center justify-start pt-3 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-950">
                2ND
              </span>
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-900">
                Runner-Up
              </span>
            </div>
          </div>
        ) : (
          <div className="order-1" />
        )}

        {/* 1st Place: Gold Pedestal (Center - Highest) */}
        {first && (
          <div className="flex flex-col items-center order-2">
            <div className="relative mb-3 flex flex-col items-center">
              {/* Crown above 1st place */}
              <div className="text-amber-400 mb-1 animate-bounce">
                <Crown className="w-8 h-8 filter drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
              </div>

              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-amber-950 border-4 border-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.6)] flex items-center justify-center overflow-hidden">
                {first.avatar ? (
                  <img
                    src={findAvatar(first.avatar)?.src || "/Avatars/avatar-01.png"}
                    alt={first.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-amber-200">
                    {first.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-stone-950 text-xs font-mono font-black flex items-center gap-1 shadow-lg border border-amber-200">
                <Flame className="w-3.5 h-3.5 text-orange-950" />
                <span>#1 CHAMPION</span>
              </div>
            </div>

            <p className="text-base sm:text-xl font-black text-amber-100 truncate max-w-full text-center mb-1">
              {first.name}
            </p>
            {first.scoreOrStat !== undefined && (
              <span className="text-xs sm:text-sm font-mono font-bold text-amber-300 mb-2">
                {first.scoreOrStat}
              </span>
            )}

            {/* Gold Pedestal Block */}
            <div className="w-full h-44 sm:h-56 rounded-t-2xl bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-800 border-t-4 border-x-2 border-yellow-200 flex flex-col items-center justify-start pt-4 shadow-[0_-15px_30px_rgba(245,158,11,0.4)]">
              <span className="text-3xl sm:text-4xl font-black font-mono text-stone-950">
                1ST
              </span>
              <span className="text-xs uppercase tracking-widest font-black text-stone-900">
                Winner
              </span>
            </div>
          </div>
        )}

        {/* 3rd Place: Bronze Pedestal (Right) */}
        {third ? (
          <div className="flex flex-col items-center order-3">
            <div className="relative mb-3 flex flex-col items-center">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-stone-900 border-2 border-amber-700 shadow-[0_0_20px_rgba(217,119,6,0.3)] flex items-center justify-center overflow-hidden">
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
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-700 text-amber-100 text-xs font-mono font-black flex items-center gap-1 shadow-md border border-amber-500">
                <Award className="w-3.5 h-3.5 text-amber-200" />
                <span>#3</span>
              </div>
            </div>

            <p className="text-sm sm:text-base font-black text-amber-200 truncate max-w-full text-center mb-1">
              {third.name}
            </p>
            {third.scoreOrStat !== undefined && (
              <span className="text-xs font-mono font-bold text-amber-500 mb-2">
                {third.scoreOrStat}
              </span>
            )}

            {/* Bronze Pedestal Block */}
            <div className="w-full h-24 sm:h-32 rounded-t-2xl bg-gradient-to-b from-amber-600 via-amber-700 to-amber-950 border-t-2 border-x-2 border-amber-500 flex flex-col items-center justify-start pt-3 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-200">
                3RD
              </span>
              <span className="text-[10px] uppercase tracking-widest font-black text-amber-300">
                Bronze
              </span>
            </div>
          </div>
        ) : (
          <div className="order-3" />
        )}
      </div>

      {/* Rematch Status Footer Card */}
      <div className="w-full max-w-2xl py-3 px-6 rounded-2xl bg-black/60 border border-amber-900/50 flex items-center justify-between gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 text-amber-200">
          <RotateCcw className="w-4 h-4 text-amber-400 animate-spin" />
          <span>
            Waiting for host <strong className="text-amber-100 font-bold">{hostPlayer?.name || "Host"}</strong> to launch rematch...
          </span>
        </div>
        <span className="text-stone-400 font-mono text-xs">
          Match Finished
        </span>
      </div>
    </div>
  );
}
