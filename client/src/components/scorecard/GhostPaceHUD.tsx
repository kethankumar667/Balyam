import React from "react";
import { Zap, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import type { GhostPaceStatus } from "@shared/profile/Scorecard";

interface GhostPaceHUDProps {
  pace: GhostPaceStatus | null;
  className?: string;
}

export default function GhostPaceHUD({ pace, className = "" }: GhostPaceHUDProps) {
  if (!pace || pace.personalBest <= 0) return null;

  const { personalBest, currentScore, delta, isAhead, isOverdrive, scoringDirection } = pace;

  const sign = delta > 0 ? "+" : "";
  const deltaText = `${sign}${delta}`;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md text-xs font-mono select-none transition-all duration-300 ${
        isOverdrive
          ? "bg-amber-950/70 border-amber-400 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.4)] animate-pulse"
          : isAhead
          ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          : "bg-slate-900/70 border-slate-700 text-slate-300"
      } ${className}`}
      role="status"
      aria-label={`Personal best pace tracker: target ${personalBest}, current ${currentScore}`}
    >
      {isOverdrive ? (
        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
      ) : (
        <Trophy className="w-3.5 h-3.5 text-cyan-400" />
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">PB Pace:</span>
        <span className="font-bold text-white">{currentScore}</span>
        <span className="text-slate-500">/</span>
        <span className="text-slate-400">{personalBest}</span>
      </div>

      <div
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${
          isOverdrive
            ? "bg-amber-500/20 text-amber-300"
            : isAhead
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-rose-500/20 text-rose-400"
        }`}
      >
        {isAhead ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>{deltaText}</span>
      </div>

      {isOverdrive && (
        <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
          OVERDRIVE
        </span>
      )}
    </div>
  );
}
