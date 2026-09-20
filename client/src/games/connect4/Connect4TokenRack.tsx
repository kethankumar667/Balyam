import React from "react";
import type { Connect4ThemeConfig } from "./connect4Themes";

interface Connect4TokenRackProps {
  playerName: string;
  isSelf: boolean;
  discColor: "R" | "Y";
  tokensPlaced: number;
  totalTokens?: number;
  isActiveTurn: boolean;
  theme: Connect4ThemeConfig;
  className?: string;
}

export function Connect4TokenRack({
  playerName,
  isSelf,
  discColor,
  tokensPlaced,
  totalTokens = 21,
  isActiveTurn,
  theme,
  className = "",
}: Connect4TokenRackProps) {
  const remaining = Math.max(0, totalTokens - tokensPlaced);
  const isRed = discColor === "R";

  const tokenName = isRed ? theme.rName : theme.yName;
  const tokenGradient = isRed ? theme.rGradient : theme.yGradient;
  const tokenFill = isRed ? theme.rFill : theme.yFill;
  const tokenSpecular = isRed ? theme.rSpecular : theme.ySpecular;

  // Max visible stone pips in vault tray
  const maxStackTokens = 7;
  const visibleStackCount = Math.min(
    maxStackTokens,
    Math.ceil((remaining / totalTokens) * maxStackTokens)
  );

  return (
    <div
      className={`relative p-2 sm:p-2.5 rounded-2xl border transition-all duration-300 ${
        isActiveTurn
          ? `border-white/25 bg-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.6)] ring-1 ring-white/15`
          : `border-white/5 bg-black/30 opacity-75`
      } ${className}`}
    >
      {/* Active Turn Subtle Status Pill */}
      {isActiveTurn && (
        <div className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-mono text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{isSelf ? "Your Turn" : "Thinking"}</span>
        </div>
      )}

      {/* Player Header */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {/* Tactile Stone Preview Avatar */}
          <div
            className={`relative w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-md shrink-0 ${tokenGradient}`}
            style={{ backgroundColor: tokenFill }}
          >
            <div className="absolute inset-0 rounded-full border border-white/30 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4)]" />
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: tokenSpecular }}
            />
            <div className="w-[65%] h-[65%] rounded-full border border-black/25 shadow-inner bg-black/10 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white/40" />
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 leading-tight">
              <span className="text-xs sm:text-sm font-bold tracking-tight truncate text-white">
                {playerName}
              </span>
              {isSelf && (
                <span className="text-[10px] text-white/50 font-medium shrink-0">
                  (You)
                </span>
              )}
            </div>
            <span className="text-[10px] text-white/40 truncate font-mono tracking-tight leading-none mt-0.5">
              {tokenName}
            </span>
          </div>
        </div>

        {/* Remaining Stones Pill */}
        <div className="flex items-center gap-1 font-mono text-xs text-white/80 shrink-0">
          <span className="font-bold tabular-nums">{remaining}</span>
          <span className="text-[9px] text-white/40 uppercase">/ 21</span>
        </div>
      </div>

      {/* Tactile Vault Tray (Recessed stone trough) */}
      <div className="relative h-4 sm:h-4.5 w-full bg-black/40 rounded-lg border border-white/5 px-2 flex items-center justify-between overflow-hidden shadow-inner">
        {remaining === 0 ? (
          <span className="text-[9px] text-white/30 font-mono tracking-wider uppercase mx-auto">
            DEPLETED
          </span>
        ) : (
          <div className="flex items-center gap-1 w-full">
            {Array.from({ length: 7 }).map((_, i) => {
              const hasPip = i < visibleStackCount;
              return (
                <div
                  key={i}
                  className={`flex-1 h-1.5 sm:h-2 rounded-full transition-all duration-200 ${
                    hasPip
                      ? `shadow-xs ${tokenGradient}`
                      : "bg-white/5"
                  }`}
                  style={hasPip ? { backgroundColor: tokenFill } : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
export default Connect4TokenRack;
