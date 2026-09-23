import React, { useEffect, useMemo } from "react";
import type { Connect4Cell as Connect4CellPos, Connect4Disc } from "@shared/types.js";
import type { Connect4ThemeConfig } from "./connect4Themes";
import { connect4Audio } from "./connect4Audio";

interface Connect4GridProps {
  grid: (Connect4Disc | null)[][];
  winningCells: Connect4CellPos[] | null;
  lastMove: { row: number; col: number; playerId: string } | null;
  theme: Connect4ThemeConfig;
  isMyTurn: boolean;
  disabled: boolean;
  onDrop: (col: number) => void;
  hoveredCol?: number | null;
  onHoverCol?: (col: number | null) => void;
  myDisc?: "R" | "Y";
}

export function Connect4Grid({
  grid,
  winningCells,
  lastMove,
  theme,
  isMyTurn,
  disabled,
  onDrop,
  hoveredCol,
  onHoverCol,
  myDisc = "R",
}: Connect4GridProps) {
  const isWinning = (row: number, col: number) =>
    winningCells?.some((cell) => cell.row === row && cell.col === col) ?? false;

  const isFull = (col: number) => grid[0]?.[col] !== null;

  const countFree = (col: number) => {
    let free = 0;
    for (let r = 0; r < 6; r++) {
      if (grid[r][col] === null) free++;
    }
    return free;
  };

  // Find target landing row for the currently hovered column
  const targetLandingRow = useMemo(() => {
    if (hoveredCol == null || hoveredCol < 0 || hoveredCol > 6) return null;
    for (let r = 5; r >= 0; r--) {
      if (grid[r]?.[hoveredCol] === null) {
        return r;
      }
    }
    return null;
  }, [grid, hoveredCol]);

  // Keyboard navigation: 1-7 numeric keys, Left/Right arrows, Enter/Space
  useEffect(() => {
    if (!isMyTurn || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes typed into chat or any other text field — otherwise
      // typing a digit 1-7 while it's your turn silently drops a disc instead
      // of (or in addition to) being typed into the input.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Direct numeric drop: 1-7
      if (e.key >= "1" && e.key <= "7") {
        const colIdx = parseInt(e.key, 10) - 1;
        if (!isFull(colIdx)) {
          e.preventDefault();
          onDrop(colIdx);
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const current = hoveredCol ?? 3;
        const next = Math.max(0, current - 1);
        onHoverCol?.(next);
        connect4Audio.playHoverTick(theme.soundProfile);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const current = hoveredCol ?? 3;
        const next = Math.min(6, current + 1);
        onHoverCol?.(next);
        connect4Audio.playHoverTick(theme.soundProfile);
      } else if ((e.key === "Enter" || e.key === " ") && hoveredCol != null) {
        e.preventDefault();
        if (!isFull(hoveredCol)) {
          onDrop(hoveredCol);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMyTurn, disabled, hoveredCol, onHoverCol, onDrop, grid]);

  // Winning laser vector coordinates (endpoints connecting cell 0 to cell 3)
  const winningLineCoords = useMemo(() => {
    if (!winningCells || winningCells.length < 4) return null;
    const start = winningCells[0];
    const end = winningCells[winningCells.length - 1];

    // SVG viewBox: 700 width (cols 0-6), 600 height (rows 0-5)
    return {
      x1: start.col * 100 + 50,
      y1: start.row * 100 + 50,
      x2: end.col * 100 + 50,
      y2: end.row * 100 + 50,
    };
  }, [winningCells]);

  const ghostDiscGradient = myDisc === "R" ? theme.rGradient : theme.yGradient;
  const ghostDiscSymbol = myDisc === "R" ? theme.rSymbol : theme.ySymbol;
  const ghostDiscBorder = myDisc === "R" ? theme.rBorder : theme.yBorder;

  return (
    <div className="flex flex-col items-center w-full max-w-[min(94vw,480px,calc((100vh-230px)*1.16))] mx-auto select-none">
      {/* Inline Keyframe Styles for Gravity Drop Physics & Specular Shine */}
      <style>{`
        @keyframes c4DropIn {
          0% {
            transform: translateY(-300px) scaleY(1.18);
            opacity: 0.85;
          }
          68% {
            transform: translateY(0) scaleY(0.90);
          }
          84% {
            transform: translateY(-14px) scaleY(1.05);
          }
          100% {
            transform: translateY(0) scaleY(1);
            opacity: 1;
          }
        }
        .animate-c4-drop {
          animation: c4DropIn 0.34s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .token-specular {
          background: radial-gradient(ellipse at 32% 26%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.12) 50%, rgba(0,0,0,0.35) 100%);
        }
      `}</style>

      {/* Floating Ghost Disc & Column Guide Funnel */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full mb-1.5 px-3 h-9 sm:h-10 items-end">
        {[0, 1, 2, 3, 4, 5, 6].map((col) => {
          const full = isFull(col);
          const free = countFree(col);
          const canDrop = isMyTurn && !disabled && !full;
          const isHovered = hoveredCol === col;

          return (
            <button
              key={col}
              type="button"
              onClick={() => onDrop(col)}
              onMouseEnter={() => {
                if (hoveredCol !== col) {
                  onHoverCol?.(col);
                  connect4Audio.playHoverTick(theme.soundProfile);
                }
              }}
              onMouseLeave={() => onHoverCol?.(null)}
              onFocus={() => {
                onHoverCol?.(col);
                connect4Audio.playHoverTick(theme.soundProfile);
              }}
              onBlur={() => onHoverCol?.(null)}
              disabled={!canDrop}
              aria-disabled={!canDrop}
              aria-label={`Drop disc in column ${col + 1}, ${free} of 6 slots open. Press Enter or Space to drop.`}
              className={`relative h-full rounded-xl flex flex-col items-center justify-center transition-all duration-150 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none cursor-pointer ${
                canDrop
                  ? isHovered
                    ? "bg-white/10 text-white scale-102"
                    : "hover:bg-white/5 text-white/30 hover:text-white/70"
                  : "opacity-15 cursor-not-allowed"
              }`}
            >
              {/* Ghost Disc hanging over the column when targeted */}
              {canDrop && isHovered ? (
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.6)] border border-white/30 ${ghostDiscGradient} transition-transform duration-150`}
                >
                  <div className="w-[68%] h-[68%] rounded-full border border-black/20 bg-black/10 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  </div>
                </div>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-white/25 transition-colors group-hover:bg-white/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main 3D Beveled Tournament Chassis */}
      <div className="relative w-full">
        {/* Left & Right Physical Support Pillars */}
        <div className={`absolute -left-2 sm:-left-3 top-3 bottom-10 w-2.5 sm:w-3.5 rounded-l-md border-l-2 border-y-2 ${theme.pillarBorder} bg-black/70 shadow-lg z-0`} />
        <div className={`absolute -right-2 sm:-right-3 top-3 bottom-10 w-2.5 sm:w-3.5 rounded-r-md border-r-2 border-y-2 ${theme.pillarBorder} bg-black/70 shadow-lg z-0`} />

        {/* Board Main Face */}
        <div
          role="grid"
          aria-label="Connect 4 board, 7 columns by 6 rows"
          className={`relative z-10 w-full rounded-2xl sm:rounded-3xl border-2 sm:border-4 transition-all duration-300 p-2 sm:p-3.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-6px_12px_rgba(0,0,0,0.85)] ${theme.gridBorder} ${theme.boardBg}`}
        >
          {/* Theme-Specific Corner Hardware (Antique Brass Screws / Optic Cyan Hex / 24K Gold Pyramids) */}
          {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, idx) => (
            <div
              key={idx}
              className={`absolute ${pos} z-20 pointer-events-none flex items-center justify-center`}
            >
              {theme.chassisRivets === "cyan_hex" ? (
                /* Optic Cyber Conduit with Hex Bolt Aperture */
                <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm bg-slate-950 border border-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_4px_#00F2FE]" />
                </div>
              ) : theme.chassisRivets === "gold_pyramids" ? (
                /* Monaco 24K Mirrored Gold Pyramid Stud */
                <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rotate-45 bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 border border-yellow-100 shadow-[0_0_8px_rgba(250,204,21,0.6)] flex items-center justify-center">
                  <div className="w-1 h-1 bg-yellow-100/90 rounded-xs" />
                </div>
              ) : (
                /* Victorian Brushed Brass Screw Plate with Slotted Head */
                <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-800 border border-amber-950 shadow-sm flex items-center justify-center">
                  <div className="w-2 h-[1.5px] bg-amber-950/90 rotate-45" />
                </div>
              )}
            </div>
          ))}

          {/* Luminous Column Beam (Vertical light shaft inside slot channel) */}
          {isMyTurn && !disabled && hoveredCol != null && !isFull(hoveredCol) && (
            <div
              className="absolute top-2 bottom-2 pointer-events-none rounded-xl bg-amber-400/10 border-x border-amber-400/25 transition-all duration-150 z-0"
              style={{
                left: `calc((${hoveredCol} * 100% / 7) + 8px)`,
                width: `calc((100% / 7) - 16px)`,
              }}
            />
          )}

          {/* 7x6 Aperture Grid */}
          <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2.5">
            {grid.map((rowArr, rIdx) => (
              <div key={rIdx} role="row" className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
                {rowArr.map((disc, cIdx) => {
                  const winning = isWinning(rIdx, cIdx);
                  const isLast = lastMove?.row === rIdx && lastMove?.col === cIdx;
                  const isColHovered = isMyTurn && !disabled && hoveredCol === cIdx;
                  const isTargetCell = isColHovered && targetLandingRow === rIdx;

                  const isRed = disc === "R";
                  const discSymbol = isRed ? theme.rSymbol : theme.ySymbol;
                  const discGradient = isRed ? theme.rGradient : theme.yGradient;
                  const discBorder = isRed ? theme.rBorder : theme.yBorder;
                  const discGlow = isRed ? theme.rGlow : theme.yGlow;
                  const discFill = isRed ? theme.rFill : theme.yFill;

                  const cellDesc = disc
                    ? `${isRed ? theme.rName : theme.yName} disc with insignia ${discSymbol}`
                    : isTargetCell
                    ? "Target landing slot"
                    : "Empty slot";

                  // Dim non-winning discs when victory state exists
                  const hasWinner = winningCells && winningCells.length > 0;
                  const shouldDim = hasWinner && !winning;

                  return (
                    <div
                      key={cIdx}
                      role="gridcell"
                      aria-colindex={cIdx + 1}
                      aria-rowindex={rIdx + 1}
                      aria-label={`Row ${rIdx + 1}, Column ${cIdx + 1}: ${cellDesc}`}
                      onClick={() => {
                        if (isMyTurn && !disabled && !isFull(cIdx)) {
                          onDrop(cIdx);
                        }
                      }}
                      onMouseEnter={() => {
                        if (hoveredCol !== cIdx) {
                          onHoverCol?.(cIdx);
                          connect4Audio.playHoverTick(theme.soundProfile);
                        }
                      }}
                      onMouseLeave={() => onHoverCol?.(null)}
                      className={`relative aspect-square rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 ${
                        theme.slotBg
                      } ${theme.slotRim} ${theme.slotInset} ${
                        isTargetCell
                          ? "ring-2 ring-amber-400/90 shadow-[0_0_14px_rgba(245,158,11,0.5)]"
                          : ""
                      }`}
                    >
                      {/* Dropped Tactile Sculptural Stone / Bullion Coin */}
                      {disc ? (
                        <div
                          className={`relative w-[91%] h-[91%] rounded-full flex items-center justify-center select-none shadow-[0_6px_14px_rgba(0,0,0,0.8)] transition-all duration-300 ${discGradient} ${
                            isLast ? "animate-c4-drop" : ""
                          } ${
                            winning
                              ? `${theme.winningHighlight} scale-105 z-20`
                              : shouldDim
                              ? "opacity-35 scale-95"
                              : "scale-100"
                          }`}
                          style={{ backgroundColor: discFill }}
                        >
                          {/* Outer Precision Chamfer Bevel Ring */}
                          <div className="absolute inset-0 rounded-full border border-white/30 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.4)] pointer-events-none" />

                          {/* Inner Specular Dynamic Curved Glaze */}
                          <div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                              background: isRed ? theme.rSpecular : theme.ySpecular,
                            }}
                          />

                          {/* Recessed Tactile Thumb Dish (Smooth Concave Well) */}
                          <div className="w-[74%] h-[74%] rounded-full border border-black/25 shadow-[inset_0_2.5px_4px_rgba(0,0,0,0.6),0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center bg-black/10">
                            {/* Precision Micro Core Ring */}
                            <div className="w-[38%] h-[38%] rounded-full border border-white/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            </div>
                          </div>
                        </div>
                      ) : isTargetCell ? (
                        /* Target Landing Slot Indicator */
                        <div className="w-[80%] h-[80%] rounded-full border-2 border-dashed border-white/30 flex items-center justify-center animate-pulse">
                          <div
                            className={`w-3.5 h-3.5 rounded-full opacity-60 shadow-sm ${ghostDiscGradient}`}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Winning Vector Laser Beam Overlay */}
          {winningLineCoords && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-30 p-2 sm:p-3.5"
              viewBox="0 0 700 600"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="c4MasterLaserGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Glowing Aura Line */}
              <line
                x1={winningLineCoords.x1}
                y1={winningLineCoords.y1}
                x2={winningLineCoords.x2}
                y2={winningLineCoords.y2}
                stroke={theme.laserColor}
                strokeWidth="18"
                strokeLinecap="round"
                filter="url(#c4MasterLaserGlow)"
                className="animate-pulse opacity-95"
              />
              {/* Bright Core Laser */}
              <line
                x1={winningLineCoords.x1}
                y1={winningLineCoords.y1}
                x2={winningLineCoords.x2}
                y2={winningLineCoords.y2}
                stroke="#FFFFFF"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Physical Weighted Base Stand & Coin Catch Lip */}
        <div
          className={`w-[96%] mx-auto h-5 sm:h-6 rounded-b-2xl border-x-2 border-b-2 shadow-2xl flex items-center justify-between px-4 sm:px-6 z-0 ${theme.pedestalBg}`}
        >
          <div className="w-8 sm:w-16 h-1 sm:h-1.5 bg-black/60 rounded-full border-b border-white/15" />
          <div className="text-[9px] sm:text-[10px] font-mono tracking-widest uppercase font-black text-amber-200/90 flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/40 border border-white/10 shadow-inner">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                theme.chassisRivets === "cyan_hex"
                  ? "bg-cyan-400 shadow-[0_0_6px_#00F2FE]"
                  : theme.chassisRivets === "gold_pyramids"
                  ? "bg-yellow-400 shadow-[0_0_6px_#FFD700]"
                  : "bg-amber-400 shadow-[0_0_6px_#F59E0B]"
              }`}
            />
            <span>{theme.pedestalHallmark}</span>
          </div>
          <div className="w-8 sm:w-16 h-1 sm:h-1.5 bg-black/60 rounded-full border-b border-white/15" />
        </div>
      </div>
    </div>
  );
}
export default Connect4Grid;
