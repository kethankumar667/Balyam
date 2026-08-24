import React from "react";
import type { DotsBoxesSkin, DotsBoxesPlayerTheme } from "./dotsboxes-theme";
import { getPlayerInitials } from "./dotsboxes-theme";
import type { Player } from "@shared/types";

export interface RankedPlayerInfo {
  pid: string;
  score: number;
  player?: Player;
  theme: DotsBoxesPlayerTheme;
  rank: number;
}

export interface DotsBoxesDominanceBarProps {
  rankedPlayers: RankedPlayerInfo[];
  totalBoxes: number;
  skin?: DotsBoxesSkin;
  className?: string;
  compact?: boolean;
}

/**
 * Real-Time Territory Dominance Tug-of-War Progress Bar
 * Dynamically updates as players conquer boxes across the grid.
 */
export default function DotsBoxesDominanceBar({
  rankedPlayers,
  totalBoxes,
  skin = "neon",
  className = "",
  compact = false,
}: DotsBoxesDominanceBarProps) {
  const claimedTotal = rankedPlayers.reduce((acc, p) => acc + p.score, 0);
  const unclaimed = Math.max(0, totalBoxes - claimedTotal);
  const unclaimedPct = totalBoxes > 0 ? (unclaimed / totalBoxes) * 100 : 100;

  const isNotebook = skin === "notebook";

  return (
    <div
      className={`w-full flex flex-col gap-1 select-none ${
        isNotebook ? "font-['Patrick_Hand',cursive]" : ""
      } ${className}`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between text-[11px] px-1 font-black uppercase tracking-wider">
        <span
          className={
            isNotebook
              ? "text-stone-700 font-['Architects_Daughter',cursive]"
              : "text-slate-400"
          }
        >
          {isNotebook ? "🗺️ Territory Map" : "⚡ Territory Dominance"}
        </span>
        <span className={isNotebook ? "text-stone-500 font-bold" : "text-slate-400 font-bold"}>
          {claimedTotal}/{totalBoxes} Boxes ({Math.round(100 - unclaimedPct)}%)
        </span>
      </div>

      {/* Segmented Multi-Color Progress Track */}
      <div
        className={`w-full h-3 sm:h-3.5 rounded-full overflow-hidden flex items-center p-0.5 border shadow-inner transition-all ${
          isNotebook
            ? "bg-[#EFE7D5] border-[#D7C9B1]"
            : "bg-slate-950/80 border-slate-800 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        }`}
      >
        {rankedPlayers.map((p) => {
          if (p.score <= 0) return null;
          const pct = totalBoxes > 0 ? (p.score / totalBoxes) * 100 : 0;
          if (pct <= 0) return null;

          return (
            <div
              key={p.pid}
              style={{
                width: `${pct}%`,
                backgroundColor: p.theme.primary,
                boxShadow: isNotebook ? undefined : `0 0 8px ${p.theme.glow}`,
              }}
              title={`${p.player?.name || p.pid}: ${p.score} boxes (${Math.round(pct)}%)`}
              className="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-center relative overflow-hidden group min-w-[8px]"
            >
              {/* Glossy Top Highlight */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/25 rounded-t-full pointer-events-none" />

              {/* Mini Label when wide enough */}
              {!compact && pct >= 14 && (
                <span className="text-[9px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] px-1 truncate">
                  {getPlayerInitials(p.player?.name || p.pid)} {Math.round(pct)}%
                </span>
              )}
            </div>
          );
        })}

        {/* Unclaimed Space */}
        {unclaimedPct > 0 && (
          <div
            style={{ width: `${unclaimedPct}%` }}
            className={`h-full transition-all duration-500 ease-out ${
              isNotebook ? "opacity-30" : "opacity-20"
            }`}
          />
        )}
      </div>
    </div>
  );
}
