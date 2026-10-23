import { memo, useCallback, useRef, useState, type KeyboardEvent } from "react";
import { Palette } from "lucide-react";
import { useFitBox, type FitSize } from "../vamanaguntalu/useFitBox";
import { BrainVitaJumpLayer } from "./BrainVitaJumpLayer";
import { MarbleBody } from "./BrainVitaMarble";
import { useSkinTokens } from "./BrainVitaSkinContext";
import { CENTRE_HOLE, cellOf, holeAt, type Board, type Move } from "./brainvitaRules";
import { holeCentre } from "./brainvitaDrag";
import { GRID_UNITS, MAX_FRAME, boardFit } from "./brainvitaTheme";
import { useMarbleDrag } from "./useMarbleDrag";
import type { JumpFlight } from "./useJumpFlight";
import { BoardArt, PropsArt } from "./worlds";

const HINT_BLUE = "#7DD3FC";
const CELL_PERCENT = 100 / GRID_UNITS;

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
  while (nextRow >= 0 && nextRow < GRID_UNITS && nextCol >= 0 && nextCol < GRID_UNITS) {
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
  /** The marble is mid-air from the jump just made, so only its flight is drawn. */
  isHidden: boolean;
  /** The marble is being carried, so its place shows only a faint outline. */
  isDragSource: boolean;
  /** A carried marble is hovering close enough to drop in here. */
  isSnapTarget: boolean;
  onTap: (hole: number) => void;
  onFocusHole: (hole: number) => void;
  register: (hole: number, element: HTMLButtonElement | null) => void;
}

const HoleButton = memo(function HoleButton(props: HoleButtonProps) {
  const { hole, hasMarble, isSelected, isTarget, isHintFrom, isHintTo, isActionable, isTabStop, isHidden, isDragSource, isSnapTarget, onTap, onFocusHole, register } = props;
  const skin = useSkinTokens();
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
      <span aria-hidden className="absolute inset-[5%] rounded-full" style={{ background: skin.holeWell, boxShadow: skin.holeRim }} />
      {isTarget && (
        <span
          aria-hidden
          className={`absolute rounded-full ${isSnapTarget ? "inset-[14%]" : "inset-[22%] motion-safe:animate-pulse"}`}
          style={{ border: `3px solid ${skin.accent}`, background: `${skin.accent}${isSnapTarget ? "66" : "47"}`, boxShadow: `0 0 ${isSnapTarget ? 22 : 14}px ${skin.accent}99` }}
        />
      )}
      {isHintTo && <span aria-hidden className="absolute inset-[12%] rounded-full" style={{ border: `3px dashed ${HINT_BLUE}` }} />}
      {hasMarble && (
        <span
          aria-hidden
          className="absolute inset-[9%] motion-safe:transition-transform motion-safe:duration-150"
          style={{
            opacity: isHidden ? 0 : isDragSource ? 0.22 : 1,
            transform: isSelected && !isDragSource ? "translateY(-8%) scale(1.06)" : undefined,
          }}
        >
          <MarbleBody isLifted={isSelected && !isDragSource} seed={hole} />
          {(isSelected || isHintFrom) && (
            <span
              className="absolute -inset-[3px] rounded-full"
              style={{
                border: `3px ${isSelected ? "solid" : "dashed"} ${isSelected ? skin.accent : HINT_BLUE}`,
                boxShadow: isSelected ? `0 0 14px ${skin.accent}99` : undefined,
              }}
            />
          )}
        </span>
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
  /** The rim of wood round the holes, in hole widths. */
  frame?: number;
  /** The props lying in the board's empty corners. A cramped screen leaves them out. */
  hasProps?: boolean;
  /** The jump just made: the marble in the air, and the captured one dissolving. Both null when motion is off. */
  flight?: JumpFlight | null;
  burst?: JumpFlight | null;
  /** When given, a round button sits in the board's empty bottom-right corner to open the world picker. */
  onOpenLook?: () => void;
  /** Marks that button when there is a new theme to try. */
  hasLookBadge?: boolean;
}

export function BrainVitaGrid({
  board,
  selected,
  targets,
  hint,
  disabled,
  onTap,
  size = null,
  frame = MAX_FRAME,
  hasProps = true,
  flight = null,
  burst = null,
  onOpenLook,
  hasLookBadge = false,
}: BrainVitaGridProps) {
  const skin = useSkinTokens();
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const gridRef = useRef<HTMLDivElement>(null);
  const [tabStop, setTabStop] = useState<number>(CENTRE_HOLE);
  const { drag, handlers } = useMarbleDrag({ board, selected, isDisabled: disabled, onTap, gridRef });

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

  const hiddenHole = flight?.move.to ?? null;
  const cells = [];
  for (let row = 0; row < GRID_UNITS; row++) {
    for (let col = 0; col < GRID_UNITS; col++) {
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
          isHidden={hiddenHole === hole}
          isDragSource={drag?.hole === hole}
          isSnapTarget={drag?.snap === hole}
          onTap={onTap}
          onFocusHole={setTabStop}
          register={register}
        />,
      );
    }
  }

  const insetPercent = (frame / (GRID_UNITS + 2 * frame)) * 100;
  const held = drag ? (drag.snap !== null ? holeCentre(drag.snap) : drag.point) : null;

  return (
    <div
      role="group"
      aria-label="Goli Jump board"
      onKeyDown={onKeyDown}
      className="relative"
      style={{
        ...(size ? { width: size.width, height: size.height } : { width: "100%", aspectRatio: "1 / 1" }),
      }}
    >
      {hasProps && (
        <div className="absolute inset-0">
          <PropsArt />
        </div>
      )}
      <BoardArt frame={frame} />
      <div
        ref={gridRef}
        className="absolute grid"
        {...handlers}
        style={{
          inset: `${insetPercent}%`,
          gridTemplateColumns: `repeat(${GRID_UNITS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${GRID_UNITS}, minmax(0, 1fr))`,
          touchAction: "none",
        }}
      >
        {cells}
        <BrainVitaJumpLayer flight={flight} burst={burst} />
        {onOpenLook && (
          <button
            type="button"
            onClick={onOpenLook}
            aria-label={hasLookBadge ? "Choose a world, a new world is ready" : "Choose a world"}
            className="absolute z-[9] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-amber-50 shadow-[0_4px_10px_rgba(0,0,0,0.45)] transition-[filter] hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128] md:h-12 md:w-12"
            style={{ left: "85.7%", top: "85.7%", transform: "translate(-50%, -50%)", background: skin.chipBackground, border: skin.chipBorder }}
          >
            <Palette className="h-5 w-5" style={{ color: skin.accentSoft }} />
            {hasLookBadge && <span aria-hidden className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#2a160a]" style={{ background: skin.accentAlt }} />}
          </button>
        )}
        {held && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 rounded-full"
            style={{
              width: `${CELL_PERCENT}%`,
              height: `${CELL_PERCENT}%`,
              zIndex: 8,
              transform: `translate(${(held.x - 0.5) * 100}%, ${(held.y - 0.5) * 100}%) scale(1.14)`,
              transition: drag?.snap !== null ? "transform 90ms ease-out" : "none",
            }}
          >
            <span className="absolute inset-[9%]">
              <MarbleBody isLifted />
              <span className="absolute -inset-[3px] rounded-full" style={{ border: `3px solid ${skin.accent}`, boxShadow: `0 0 14px ${skin.accent}99` }} />
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The board, drawn as large as the space around it allows while staying square. The rim of wood thins
 * on a narrow or short screen so a hole never drops under the 44px a thumb needs.
 */
export function BrainVitaFitGrid(props: Omit<BrainVitaGridProps, "size" | "frame">) {
  const { ref, size } = useFitBox(1);
  const fit = size ? boardFit(Math.min(size.width, size.height)) : null;
  return (
    <div ref={ref} className="flex h-full min-h-0 w-full min-w-0 items-center justify-center">
      <BrainVitaGrid {...props} size={fit ? { width: fit.side, height: fit.side } : null} frame={fit?.frame ?? MAX_FRAME} />
    </div>
  );
}
