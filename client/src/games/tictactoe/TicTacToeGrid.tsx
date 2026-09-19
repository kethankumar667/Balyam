import React from "react";
import type { TicTacToeCell } from "@shared/types.js";
import type { TicTacToeThemeConfig } from "./tictactoeThemes";

interface TicTacToeGridProps {
  grid: (TicTacToeCell | null)[];
  winningLine: number[] | null;
  lastEvaporatedCell: number | null;
  theme: TicTacToeThemeConfig;
  isMyTurn: boolean;
  disabled: boolean;
  onCellClick: (index: number) => void;
}

export function TicTacToeGrid({
  grid,
  winningLine,
  lastEvaporatedCell,
  theme,
  isMyTurn,
  disabled,
  onCellClick,
}: TicTacToeGridProps) {
  // Laser strike beam coordinates for winning combinations
  const getWinningBeamCoordinates = (): { x1: string; y1: string; x2: string; y2: string } | null => {
    if (!winningLine || winningLine.length !== 3) return null;
    const sorted = [...winningLine].sort((a, b) => a - b).join(",");

    switch (sorted) {
      case "0,1,2":
        return { x1: "6%", y1: "16.6%", x2: "94%", y2: "16.6%" };
      case "3,4,5":
        return { x1: "6%", y1: "50%", x2: "94%", y2: "50%" };
      case "6,7,8":
        return { x1: "6%", y1: "83.3%", x2: "94%", y2: "83.3%" };
      case "0,3,6":
        return { x1: "16.6%", y1: "6%", x2: "16.6%", y2: "94%" };
      case "1,4,7":
        return { x1: "50%", y1: "6%", x2: "50%", y2: "94%" };
      case "2,5,8":
        return { x1: "83.3%", y1: "6%", x2: "83.3%", y2: "94%" };
      case "0,4,8":
        return { x1: "10%", y1: "10%", x2: "90%", y2: "90%" };
      case "2,4,6":
        return { x1: "90%", y1: "10%", x2: "10%", y2: "90%" };
      default:
        return null;
    }
  };

  const beamCoords = getWinningBeamCoordinates();

  return (
    <div className="relative w-full aspect-square max-w-[min(88vw,calc(100dvh-270px),380px)] sm:max-w-[min(84vw,calc(100dvh-290px),420px)] mx-auto p-1.5 sm:p-3 select-none flex items-center justify-center">
      {/* Outer Holographic Glow Container */}
      <div
        className={`relative w-full h-full rounded-2xl sm:rounded-3xl border-2 transition-colors duration-300 ${theme.gridBorder} ${theme.boardBg} p-2 sm:p-3 flex flex-col justify-between overflow-hidden shadow-2xl`}
      >
        {/* Subtle Cyber Grid Circuit Background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.4) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
          aria-hidden="true"
        />

        {/* 3x3 Interactive Grid */}
        <div className="relative z-10 grid grid-cols-3 grid-rows-3 gap-1.5 sm:gap-2.5 w-full h-full" role="grid">
          {/* `contents` keeps the CSS grid layout intact while giving assistive tech the
              row structure that role="gridcell" requires. */}
          {[0, 1, 2].map((row) => (
            <div key={row} role="row" className="contents">
              {grid.slice(row * 3, row * 3 + 3).map((cell, col) => {
            const idx = row * 3 + col;
            const isWinningCell = winningLine?.includes(idx);
            const isRecentlyEvaporated = lastEvaporatedCell === idx;
            const canInteract = !disabled && isMyTurn && cell === null;

            return (
              <button
                key={idx}
                type="button"
                role="gridcell"
                aria-label={`Cell ${idx + 1}, ${cell ? `occupied by ${cell.mark}` : "empty"}${cell?.isExpiring ? ", expiring next move" : ""}`}
                disabled={!canInteract}
                onClick={() => onCellClick(idx)}
                className={`group relative rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 border cursor-pointer min-h-[56px] min-w-[56px] touch-manipulation ${
                  theme.gridLine
                } ${theme.cellBg} ${canInteract ? `${theme.cellHover} hover:scale-[0.98] active:scale-95` : ""} ${
                  cell?.isExpiring ? theme.warningGlow : ""
                } ${isWinningCell ? "bg-cyan-500/25 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.6)]" : ""} ${
                  !canInteract && cell === null ? "cursor-not-allowed opacity-75" : ""
                } focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
              >
                {/* Expiring Warning Pill in Quantum Mode */}
                {cell?.isExpiring && (
                  <div
                    className={`absolute top-1 right-1 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider border leading-none flex items-center gap-0.5 ${theme.warningBadge}`}
                    title="This mark will evaporate on your next move"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>Expiring</span>
                  </div>
                )}

                {/* Evaporation Pulse Animation Echo */}
                {isRecentlyEvaporated && (
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-rose-500/40 animate-ping pointer-events-none" />
                )}

                {/* Mark Renderer */}
                {cell && (
                  <div className="w-11 h-11 sm:w-16 sm:h-16 flex items-center justify-center">
                    {cell.mark === "X" ? (
                      /* Futuristic Neon Ion Blade (X) */
                      <svg
                        viewBox="0 0 64 64"
                        className={`w-full h-full ${theme.xGlow} transition-transform duration-300 group-hover:scale-105`}
                        aria-hidden="true"
                      >
                        <line
                          x1="14"
                          y1="14"
                          x2="50"
                          y2="50"
                          stroke={theme.xStroke}
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                        <line
                          x1="50"
                          y1="14"
                          x2="14"
                          y2="50"
                          stroke={theme.xStroke}
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                        {/* Core Laser Highlight */}
                        <line
                          x1="14"
                          y1="14"
                          x2="50"
                          y2="50"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <line
                          x1="50"
                          y1="14"
                          x2="14"
                          y2="50"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      /* Futuristic Neon Plasma Singularity (O) */
                      <svg
                        viewBox="0 0 64 64"
                        className={`w-full h-full ${theme.oGlow} transition-transform duration-300 group-hover:scale-105`}
                        aria-hidden="true"
                      >
                        <circle
                          cx="32"
                          cy="32"
                          r="20"
                          fill="none"
                          stroke={theme.oStroke}
                          strokeWidth="7.5"
                        />
                        {/* Core Laser Highlight */}
                        <circle
                          cx="32"
                          cy="32"
                          r="20"
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                        />
                      </svg>
                    )}
                  </div>
                )}

                {/* Empty Hover Preview Hologram for Active Player */}
                {!cell && canInteract && (
                  <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-dashed border-cyan-400/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            );
          })}
            </div>
          ))}
        </div>

        {/* Energetic Laser Strike Beam on Victory */}
        {beamCoords && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
            aria-hidden="true"
          >
            <line
              x1={beamCoords.x1}
              y1={beamCoords.y1}
              x2={beamCoords.x2}
              y2={beamCoords.y2}
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinecap="round"
              className="animate-pulse"
            />
            <line
              x1={beamCoords.x1}
              y1={beamCoords.y1}
              x2={beamCoords.x2}
              y2={beamCoords.y2}
              stroke={theme.xStroke}
              strokeWidth="14"
              strokeLinecap="round"
              opacity="0.8"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
