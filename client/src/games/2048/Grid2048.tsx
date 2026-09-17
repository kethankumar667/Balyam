import { memo } from "react";
import { GRID_SIZE, type Cell } from "./grid";
import { getTileVisual } from "./tileStyles";
import { Crown } from "lucide-react";

export interface Grid2048Props {
  grid: (Cell | null)[];
  /** Smaller, read-only render size — used for the mode-select preview. */
  compact?: boolean;
  label?: string;
  lastScoreGained?: number;
  scoreGainedId?: number;
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
}: Grid2048Props) {
  return (
    <div className="relative inline-block w-full max-w-full">
      {/* Floating score indicator */}
      {lastScoreGained != null && lastScoreGained > 0 && scoreGainedId != null && (
        <div
          key={scoreGainedId}
          className="absolute -top-7 right-3 z-30 pointer-events-none animate-bounce text-sm sm:text-base font-black text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]"
        >
          +{lastScoreGained}
        </div>
      )}

      {/* Main Board Tray */}
      <div
        className={`w-full grid grid-cols-4 rounded-3xl bg-[#181512] dark:bg-[#070B14] border border-stone-800/80 shadow-[0_20px_45px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)] ${
          compact ? "gap-1.5 p-2 rounded-2xl" : "gap-2.5 p-3 sm:gap-3 sm:p-4"
        }`}
        role="img"
        aria-label={label}
      >
        {grid.slice(0, GRID_SIZE * GRID_SIZE).map((cell, i) => {
          if (!cell) {
            return (
              <div
                key={i}
                className="aspect-square rounded-2xl bg-stone-900/50 dark:bg-stone-900/30 border border-stone-800/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
              />
            );
          }

          const isGarbage = cell.isGarbage;
          const meta = getTileVisual(cell.value);
          const isCrown = cell.value === 2048;
          const hasAura = meta.aura != null;

          return (
            <div
              key={i}
              className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center select-none transition-all duration-150 transform hover:scale-[1.02] ${
                isGarbage
                  ? "ring-2 ring-rose-500 bg-stone-900 animate-pulse"
                  : ""
              } ${fontSizeClass(cell.value, compact)}`}
              style={{
                background: isGarbage
                  ? "linear-gradient(135deg, #2A1215 0%, #170A0C 100%)"
                  : meta.bg,
                color: isGarbage ? "#FDA4AF" : meta.text,
                border: `1px solid ${isGarbage ? "rgba(244,63,94,0.7)" : meta.border}`,
                boxShadow: isGarbage
                  ? "0 4px 12px rgba(244,63,94,0.3), inset 0 1px 1px rgba(255,255,255,0.2)"
                  : meta.shadow,
              }}
            >
              {/* Radiant back-aura for high-tier tiles */}
              {hasAura && !isGarbage && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none opacity-40 blur-sm"
                  style={{ background: meta.aura }}
                />
              )}

              {/* Crown indicator on 2048 tile */}
              {isCrown && (
                <div className="absolute top-1 right-1.5 opacity-90 text-amber-200">
                  <Crown className="w-3.5 h-3.5 fill-amber-300 drop-shadow" />
                </div>
              )}

              {/* Number display */}
              <span className="relative z-10 tabular-nums tracking-tight font-black leading-none drop-shadow-sm">
                {cell.value}
              </span>

              {/* Sub-label for rich emotional lore */}
              {!compact && cell.value >= 128 && (
                <span className="relative z-10 text-[9px] uppercase tracking-wider font-extrabold opacity-85 mt-1 leading-none">
                  {meta.title}
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
