import { useMemo, type KeyboardEvent } from "react";
import { VamanaPit } from "./VamanaPit";
import { gridSize, pitCells, type VamanaOrientation, type VamanaSeat } from "./vamanaLayout";
import { BOARD_GRAIN, BOARD_WOOD, boardGeometry } from "./vamanaTheme";

/**
 * How an arrow key moves between the viewer's own pits. Their pits are numbered along the direction
 * seeds travel, which reads left to right on a horizontal board and bottom to top on a vertical one.
 */
export function arrowDelta(key: string, orientation: VamanaOrientation): -1 | 0 | 1 {
  if (orientation === "horizontal") return key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
  return key === "ArrowUp" ? 1 : key === "ArrowDown" ? -1 : 0;
}

/**
 * The carved motif at each end of the board: a lotus between two diamonds. It is drawn tall for the
 * flat board's left and right ends and laid on its side (x and y swapped, not rotated, so its size
 * follows the shorter cap) for the upright board's top and bottom.
 */
function Ornament({ isTurned }: { isTurned: boolean }) {
  return (
    <svg aria-hidden viewBox={isTurned ? "0 0 100 40" : "0 0 40 100"} className={isTurned ? "h-auto max-h-full w-[46%]" : "h-[50%] w-auto max-w-full"}>
      {[0.9, 0].map((offset) => (
        <g
          key={offset}
          fill={offset ? "rgba(255,226,170,0.4)" : "rgba(74,36,12,0.62)"}
          transform={`${isTurned ? "matrix(0 1 1 0 0 0) " : ""}translate(${offset} ${offset})`}
        >
          <path d="M20 6 L 29 21 L20 36 L11 21 Z" />
          <path d="M20 94 L 29 79 L20 64 L11 79 Z" />
          <path d="M20 39 C 7 45 7 55 20 61 C 33 55 33 45 20 39 Z" />
          <circle cx="20" cy="50" r="3" />
        </g>
      ))}
    </svg>
  );
}

export interface VamanaBoardGridProps {
  orientation: VamanaOrientation;
  seat: VamanaSeat;
  /** Seeds to draw in each of the 14 pits (mid-animation, or the server's board). */
  pits: readonly number[];
  /** True when the viewer is a seated player, so their row is made of controls. */
  isPlayer: boolean;
  canSow: (pit: number) => boolean;
  onSelect: (pit: number) => void;
  activePit: number | null;
  capturedPit: number | null;
  lastCapturePit: number | null;
  /** Carved ornaments at the two ends. They cost board length, so a short phone turns them off. */
  hasOrnaments?: boolean;
  /** The exact box to draw in (see `useFitBox`). Without it the board fills its width at the right ratio. */
  size?: { width: number; height: number } | null;
  className?: string;
}

export function VamanaBoardGrid({
  orientation,
  seat,
  pits,
  isPlayer,
  canSow,
  onSelect,
  activePit,
  capturedPit,
  lastCapturePit,
  hasOrnaments = true,
  size = null,
  className = "",
}: VamanaBoardGridProps) {
  const cells = useMemo(() => pitCells(seat, orientation), [seat, orientation]);
  const { rows, cols } = gridSize(orientation);
  const geometry = boardGeometry(orientation, hasOrnaments);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const target = event.target as HTMLElement;
    if (!target.matches("[data-own-pit]")) return;
    const delta = arrowDelta(event.key, orientation);
    if (delta === 0) return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-own-pit]"));
    const next = controls[controls.indexOf(target) + delta];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  const isHorizontal = orientation === "horizontal";

  return (
    <div
      role="group"
      aria-label="Vamana Guntalu board"
      onKeyDown={onKeyDown}
      className={`relative rounded-[1.6rem] ${className}`}
      style={{
        backgroundImage: `${BOARD_GRAIN}, ${BOARD_WOOD}`,
        ...(size ? { width: size.width, height: size.height } : { width: "100%", aspectRatio: String(geometry.aspect) }),
        border: "3px solid #5b3414",
        boxShadow: "0 22px 42px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,226,170,0.38), inset 0 -4px 8px rgba(60,28,8,0.4)",
      }}
    >
      {hasOrnaments && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute flex items-center justify-center"
            style={isHorizontal ? { left: 0, top: 0, bottom: 0, width: `${geometry.insetXPercent}%` } : { left: 0, right: 0, top: 0, height: `${geometry.insetYPercent}%` }}
          >
            <Ornament isTurned={!isHorizontal} />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute flex items-center justify-center"
            style={isHorizontal ? { right: 0, top: 0, bottom: 0, width: `${geometry.insetXPercent}%` } : { left: 0, right: 0, bottom: 0, height: `${geometry.insetYPercent}%` }}
          >
            <Ornament isTurned={!isHorizontal} />
          </div>
        </>
      )}
      <div
        className="absolute grid"
        style={{
          left: `${geometry.insetXPercent}%`,
          right: `${geometry.insetXPercent}%`,
          top: `${geometry.insetYPercent}%`,
          bottom: `${geometry.insetYPercent}%`,
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gap: isHorizontal ? "1.8%" : "1.5%",
        }}
      >
        {cells.map((cell) => {
          const count = pits[cell.pit] ?? 0;
          const isControl = isPlayer && cell.isOwn;
          const owner = cell.isOwn ? "Your" : "Opponent's";
          const seedWord = count === 1 ? "seed" : "seeds";
          return (
            <div key={cell.pit} className="flex items-center justify-center" style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1, containerType: "size" }}>
              <VamanaPit
                pit={cell.pit}
                count={count}
                label={`${owner} pit ${cell.indexInRow + 1}, ${count} ${seedWord}`}
                isControl={isControl}
                canSow={isControl && canSow(cell.pit)}
                isActive={activePit === cell.pit}
                isCaptureNow={capturedPit === cell.pit}
                isLastCapture={lastCapturePit === cell.pit && activePit === null && capturedPit === null}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
