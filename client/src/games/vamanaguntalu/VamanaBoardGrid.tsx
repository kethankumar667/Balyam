import { useMemo, type KeyboardEvent } from "react";
import { VamanaPit } from "./VamanaPit";
import { gridSize, pitCells, type VamanaOrientation, type VamanaSeat } from "./vamanaLayout";

const BOARD_WOOD = "linear-gradient(145deg, #8b5a2b 0%, #6d4323 48%, #4a2c15 100%)";

/**
 * How an arrow key moves between the viewer's own pits. Their pits are numbered along the direction
 * seeds travel, which reads left to right on a horizontal board and bottom to top on a vertical one.
 */
export function arrowDelta(key: string, orientation: VamanaOrientation): -1 | 0 | 1 {
  if (orientation === "horizontal") return key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
  return key === "ArrowUp" ? 1 : key === "ArrowDown" ? -1 : 0;
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
  size = null,
  className = "",
}: VamanaBoardGridProps) {
  const cells = useMemo(() => pitCells(seat, orientation), [seat, orientation]);
  const { rows, cols } = gridSize(orientation);

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

  return (
    <div
      role="group"
      aria-label="Vamana Guntalu board"
      onKeyDown={onKeyDown}
      className={`rounded-[2rem] p-[2%] shadow-[0_18px_40px_rgba(0,0,0,0.55)] ${className}`}
      style={{
        background: BOARD_WOOD,
        ...(size
          ? { width: size.width, height: size.height }
          : { width: "100%", aspectRatio: orientation === "horizontal" ? "7 / 2" : "2 / 7" }),
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        gap: orientation === "horizontal" ? "1.8%" : "1.5%",
        border: "2px solid rgba(228, 177, 40, 0.35)",
      }}
    >
      {cells.map((cell) => {
        const count = pits[cell.pit] ?? 0;
        const isControl = isPlayer && cell.isOwn;
        const owner = cell.isOwn ? "Your" : "Opponent's";
        const seedWord = count === 1 ? "seed" : "seeds";
        return (
          <div key={cell.pit} className="flex items-center justify-center" style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}>
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
  );
}
