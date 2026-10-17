import { memo, useCallback, useRef, useState, type KeyboardEvent } from "react";
import { useFitBox, type FitSize } from "../vamanaguntalu/useFitBox";
import { CENTRE_HOLE, GRID_SIZE, cellOf, holeAt, type Board, type Move } from "./brainvitaRules";

const BOARD_WOOD = "linear-gradient(145deg, #9a6531 0%, #6d4323 48%, #4a2c15 100%)";
const HOLE_WELL = "radial-gradient(circle at 36% 30%, #3a2210 0%, #1b0e05 65%, #0f0702 100%)";
const MARBLE_FILL = "radial-gradient(circle at 32% 28%, #f2fdff 0%, #6fd0ea 20%, #2285b3 60%, #0b3b5c 100%)";
const GOLD = "#E4B128";
const HINT_BLUE = "#7DD3FC";

/** How an arrow key moves between holes: [rows, columns]. */
const ARROW_STEP: Readonly<Record<string, readonly [number, number]>> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** The next hole in a direction, skipping the cut-away corners; null at the edge of the board. */
export function neighbourHole(from: number, step: readonly [number, number]): number | null {
  const { row, col } = cellOf(from);
  let nextRow = row + step[0];
  let nextCol = col + step[1];
  while (nextRow >= 0 && nextRow < GRID_SIZE && nextCol >= 0 && nextCol < GRID_SIZE) {
    const hole = holeAt(nextRow, nextCol);
    if (hole !== null) return hole;
    nextRow += step[0];
    nextCol += step[1];
  }
  return null;
}

export function describeHole(
  hole: number,
  state: { hasMarble: boolean; isSelected: boolean; isTarget: boolean; isHintFrom: boolean; isHintTo: boolean },
): string {
  const { row, col } = cellOf(hole);
  const parts = [`Row ${row + 1}, column ${col + 1}`, state.hasMarble ? "marble" : "empty hole"];
  if (state.isSelected) parts.push("selected");
  if (state.isTarget) parts.push("can land here");
  if (state.isHintFrom) parts.push("hint: move this marble");
  if (state.isHintTo) parts.push("hint: land here");
  return parts.join(", ");
}

interface HoleButtonProps {
  hole: number;
  hasMarble: boolean;
  isSelected: boolean;
  isTarget: boolean;
  isHintFrom: boolean;
  isHintTo: boolean;
  isActionable: boolean;
  isTabStop: boolean;
  onTap: (hole: number) => void;
  onFocusHole: (hole: number) => void;
  register: (hole: number, element: HTMLButtonElement | null) => void;
}

const HoleButton = memo(function HoleButton(props: HoleButtonProps) {
  const { hole, hasMarble, isSelected, isTarget, isHintFrom, isHintTo, isActionable, isTabStop, onTap, onFocusHole, register } = props;
  const label = describeHole(hole, { hasMarble, isSelected, isTarget, isHintFrom, isHintTo });

  return (
    <button
      type="button"
      ref={(element) => register(hole, element)}
      data-hole={hole}
      aria-label={label}
      aria-disabled={!isActionable}
      tabIndex={isTabStop ? 0 : -1}
      onClick={() => {
        if (isActionable) onTap(hole);
      }}
      onFocus={() => onFocusHole(hole)}
      className="relative block aspect-square w-full cursor-pointer rounded-full focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-[#E4B128]"
    >
      <span aria-hidden className="absolute inset-[8%] rounded-full" style={{ background: HOLE_WELL, boxShadow: "inset 0 3px 6px rgba(0,0,0,0.75)" }} />
      {isTarget && (
        <span
          aria-hidden
          className="absolute inset-[24%] rounded-full motion-safe:animate-pulse"
          style={{ border: `3px solid ${GOLD}`, background: "rgba(228,177,40,0.25)" }}
        />
      )}
      {isHintTo && (
        <span aria-hidden className="absolute inset-[14%] rounded-full" style={{ border: `3px dashed ${HINT_BLUE}` }} />
      )}
      {hasMarble && (
        <span
          aria-hidden
          className="absolute inset-[13%] rounded-full motion-safe:transition-transform motion-safe:duration-150"
          style={{
            background: MARBLE_FILL,
            transform: isSelected ? "translateY(-8%) scale(1.06)" : undefined,
            boxShadow: isSelected
              ? `0 0 0 3px ${GOLD}, 0 8px 10px rgba(0,0,0,0.5)`
              : isHintFrom
                ? `0 0 0 3px ${HINT_BLUE}, 0 3px 5px rgba(0,0,0,0.5)`
                : "0 3px 5px rgba(0,0,0,0.55)",
            outline: isHintFrom ? `2px dashed ${HINT_BLUE}` : undefined,
            outlineOffset: isHintFrom ? "3px" : undefined,
          }}
        />
      )}
    </button>
  );
});

export interface BrainVitaGridProps {
  board: Board;
  selected: number | null;
  /** Holes the selected marble can land in. */
  targets: readonly number[];
  hint: Move | null;
  /** When the game is over nothing can be tapped. */
  disabled: boolean;
  onTap: (hole: number) => void;
  /** The exact box to draw in (see `useFitBox`). Without it the board fills its width. */
  size?: FitSize | null;
}

export function BrainVitaGrid({ board, selected, targets, hint, disabled, onTap, size = null }: BrainVitaGridProps) {
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const [tabStop, setTabStop] = useState<number>(CENTRE_HOLE);

  const register = useCallback((hole: number, element: HTMLButtonElement | null) => {
    if (element) buttons.current.set(hole, element);
    else buttons.current.delete(hole);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = ARROW_STEP[event.key];
    const current = Number((event.target as HTMLElement).dataset.hole);
    if (!step || Number.isNaN(current)) return;
    const next = neighbourHole(current, step);
    if (next !== null) {
      event.preventDefault();
      buttons.current.get(next)?.focus();
    }
  };

  const cells = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const hole = holeAt(row, col);
      if (hole === null) {
        cells.push(<div key={`${row}-${col}`} aria-hidden />);
        continue;
      }
      const hasMarble = board[hole];
      const isTarget = !disabled && targets.includes(hole);
      cells.push(
        <HoleButton
          key={hole}
          hole={hole}
          hasMarble={hasMarble}
          isSelected={selected === hole}
          isTarget={isTarget}
          isHintFrom={hint?.from === hole}
          isHintTo={hint?.to === hole}
          isActionable={!disabled && (hasMarble || isTarget)}
          isTabStop={tabStop === hole}
          onTap={onTap}
          onFocusHole={setTabStop}
          register={register}
        />,
      );
    }
  }

  return (
    <div
      role="group"
      aria-label="Brain Vita board"
      onKeyDown={onKeyDown}
      className="rounded-[1.5rem] p-[1.5%] shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
      style={{
        background: BOARD_WOOD,
        ...(size ? { width: size.width, height: size.height } : { width: "100%", aspectRatio: "1 / 1" }),
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        gap: "0.5%",
        border: "2px solid rgba(228, 177, 40, 0.35)",
      }}
    >
      {cells}
    </div>
  );
}

/** The board, drawn as large as the space around it allows while staying square. */
export function BrainVitaFitGrid(props: Omit<BrainVitaGridProps, "size">) {
  const { ref, size } = useFitBox(1);
  return (
    <div ref={ref} className="flex h-full min-h-0 w-full min-w-0 items-center justify-center">
      <BrainVitaGrid {...props} size={size} />
    </div>
  );
}
