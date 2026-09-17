import { memo } from "react";
import { GRID_SIZE, areAdjacent, type Cell } from "./grid";
import { getTileVisual, WILDCARD_VISUAL, type TableTheme } from "./tileStyles";
import { Crown, Zap, Orbit, Snowflake } from "lucide-react";

export interface Grid2048Props {
  grid: (Cell | null)[];
  /** Smaller, read-only render size — used for the mode-select preview. */
  compact?: boolean;
  label?: string;
  lastScoreGained?: number;
  scoreGainedId?: number;
  isOverclocked?: boolean;
  isChronoRewinding?: boolean;
  theme?: TableTheme;
  isCryoFrozen?: boolean;
  isSwapping?: boolean;
  selectedSwapIdx?: number | null;
  onTileClick?: (index: number) => void;
}

function fontSizeClass(value: number, compact: boolean): string {
  if (compact) return value >= 1024 ? "text-[10px]" : "text-xs";
  if (value >= 1024) return "text-xl sm:text-2xl font-black";
  if (value >= 128) return "text-2xl sm:text-3xl font-black";
  return "text-3xl sm:text-4xl font-black";
}

function Grid2048({
  grid,
  compact = false,
  label = "2048 board",
  lastScoreGained,
  scoreGainedId,
  isOverclocked = false,
  isChronoRewinding = false,
  theme = "cyberpunk",
  isCryoFrozen = false,
  isSwapping = false,
  selectedSwapIdx = null,
  onTileClick,
}: Grid2048Props) {
  return (
    <div className="relative inline-block w-full max-w-full">
      {/* Overclock Status Floating Banner */}
      {isOverclocked && !compact && (
        <div className="absolute -top-7 left-3 z-30 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-400 text-[10px] font-mono font-black uppercase tracking-wider animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.6)]">
          <Zap className="w-3 h-3 text-cyan-300 fill-cyan-300" />
          <span>OVERCLOCK PROTOCOL ACTIVE</span>
        </div>
      )}

      {/* Floating Score Popups */}
      {lastScoreGained != null && lastScoreGained > 0 && scoreGainedId != null && (
        <div
          key={scoreGainedId}
          className="absolute -top-7 right-3 z-30 pointer-events-none animate-bounce text-sm sm:text-base font-black text-amber-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.9)] flex items-center gap-1"
        >
          <span>+{lastScoreGained}</span>
          {isOverclocked && (
            <span className="text-[10px] font-mono px-1 rounded bg-cyan-500 text-stone-950">
              ⚡ OVERCLOCK
            </span>
          )}
        </div>
      )}

      {/* Main Holographic Quantum Reactor Tray */}
      <div
        className={`relative w-full grid grid-cols-4 rounded-3xl bg-[#090D16] dark:bg-[#04060B] border-2 transition-all duration-300 select-none ${
          isOverclocked
            ? "border-cyan-400 ring-4 ring-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.5),inset_0_1px_2px_rgba(255,255,255,0.15)]"
            : "border-stone-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)]"
        } ${compact ? "gap-1.5 p-2 rounded-2xl" : "gap-2.5 p-3 sm:gap-3 sm:p-4"}`}
        role="img"
        aria-label={label}
      >
        {/* Cryo-Freeze Stasis Overlay */}
        {isCryoFrozen && (
          <div className="absolute inset-0 rounded-3xl z-40 pointer-events-none bg-sky-400/20 border-2 border-sky-400 animate-pulse flex items-center justify-center shadow-[inset_0_0_30px_rgba(56,189,248,0.5)]">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/90 border border-sky-400 text-sky-200 text-xs font-mono font-black uppercase tracking-widest shadow-lg">
              <Snowflake className="w-4 h-4 text-sky-300 animate-spin" />
              <span>CRYO-STASIS ACTIVE</span>
            </div>
          </div>
        )}

        {/* Chrono-Rewind Holographic Scanline Ripple Overlay */}
        {isChronoRewinding && (
          <div
            className="absolute inset-0 rounded-3xl z-40 pointer-events-none bg-gradient-to-b from-cyan-400/25 via-emerald-400/35 to-transparent animate-pulse border-2 border-cyan-400"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(6,182,212,0.15) 0px, rgba(6,182,212,0.15) 2px, transparent 2px, transparent 6px)",
            }}
          >
            <div className="absolute top-2 right-3 px-2 py-0.5 rounded bg-cyan-900/90 text-[9px] font-mono font-bold text-cyan-200 uppercase tracking-widest border border-cyan-400">
              CHRONO-REWIND // T-MINUS 1
            </div>
          </div>
        )}

        {/* 16 Grid Sockets */}
        {grid.slice(0, GRID_SIZE * GRID_SIZE).map((cell, i) => {
          const isSwapSelected = selectedSwapIdx === i;
          const isSwapTarget = isSwapping && selectedSwapIdx != null && areAdjacent(selectedSwapIdx, i);

          if (!cell) {
            return (
              <div
                key={i}
                onClick={() => onTileClick?.(i)}
                className={`relative aspect-square rounded-2xl bg-stone-900/40 dark:bg-stone-950/60 border border-stone-800/50 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden transition ${
                  isSwapping ? "cursor-pointer" : ""
                } ${isSwapTarget ? "ring-2 ring-cyan-400 ring-dashed animate-pulse bg-cyan-950/30" : ""}`}
              >
                {/* Subtle Cyber Circuit Corner Etchings */}
                <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-stone-700/40" />
                <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-stone-700/40" />
                <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-stone-700/40" />
                <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-stone-700/40" />
                <div className="w-1 h-1 rounded-full bg-stone-800/40" />
              </div>
            );
          }

          const isGarbage = cell.isGarbage;
          const isWild = cell.isWildcard;
          const meta = isWild ? WILDCARD_VISUAL : getTileVisual(cell.value, theme);
          const isCrown = cell.value === 2048;
          const hasAura = meta.aura != null;

          return (
            <div
              key={i}
              onClick={() => onTileClick?.(i)}
              className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center select-none transition-all duration-150 transform hover:scale-[1.02] overflow-hidden ${
                isSwapping ? "cursor-pointer" : ""
              } ${
                isSwapSelected ? "ring-4 ring-amber-400 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.8)] z-20" : ""
              } ${
                isSwapTarget ? "ring-2 ring-cyan-400 ring-dashed animate-pulse z-10" : ""
              } ${
                isGarbage ? "ring-2 ring-rose-500 bg-stone-950 animate-pulse" : ""
              } ${fontSizeClass(isWild ? 2048 : cell.value, compact)}`}
              style={{
                background: isGarbage
                  ? "linear-gradient(135deg, #2D0B12 0%, #170407 100%)"
                  : meta.bg,
                color: isGarbage ? "#FDA4AF" : meta.text,
                border: `1.5px solid ${isGarbage ? "rgba(244,63,94,0.8)" : meta.border}`,
                boxShadow: isGarbage
                  ? "0 4px 14px rgba(244,63,94,0.4), inset 0 1px 1px rgba(255,255,255,0.2)"
                  : meta.shadow,
              }}
            >
              {/* Micro-Circuit Etched Gridlines */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `radial-gradient(${meta.circuitColor} 1px, transparent 1px)`,
                  backgroundSize: "8px 8px",
                }}
              />

              {/* Radiant back-aura for high-tier quantum tiles */}
              {hasAura && !isGarbage && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none opacity-45 blur-sm"
                  style={{ background: meta.aura }}
                />
              )}

              {/* Crown indicator on 2048 tile */}
              {isCrown && (
                <div className="absolute top-1 right-1.5 opacity-95 text-amber-200 animate-bounce">
                  <Crown className="w-4 h-4 fill-amber-300 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
                </div>
              )}

              {/* Wildcard indicator */}
              {isWild && (
                <div className="absolute top-1 right-1 text-white animate-spin-slow">
                  <Orbit className="w-3.5 h-3.5" />
                </div>
              )}

              {/* Circuit Energy Code in Top-Left */}
              {!compact && !isGarbage && (
                <div className="absolute top-1 left-1.5 text-[8px] font-mono font-black opacity-60 tracking-tighter leading-none">
                  {meta.code}
                </div>
              )}

              {/* Main Number Value / Symbol */}
              <span className="relative z-10 tabular-nums tracking-tight font-black leading-none drop-shadow-sm">
                {isWild ? "★" : cell.value}
              </span>

              {/* Quantum Energy Lore Sub-label */}
              {!compact && (cell.value >= 8 || isWild) && (
                <span className="relative z-10 text-[8px] uppercase tracking-wider font-mono font-bold opacity-85 mt-1 leading-none">
                  {meta.quantumDesignation}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(Grid2048);
