import { memo, useCallback, useRef, useState, type KeyboardEvent } from "react";
import { Palette } from "lucide-react";
import { useFitBox, type FitSize } from "../vamanaguntalu/useFitBox";
import { HoloProps, HoloSurface } from "./BrainVitaHolo";
import { BrainVitaJumpLayer } from "./BrainVitaJumpLayer";
import { BrainVitaProps } from "./BrainVitaProps";
import { useSkinTokens } from "./BrainVitaSkinContext";
import { CENTRE_HOLE, cellOf, holeAt, type Board, type Move } from "./brainvitaRules";
import { holeCentre } from "./brainvitaDrag";
import { ARM_START, GRID_UNITS, MAX_FRAME, SPRIG_MIN_FRAME, boardFit, crossOutlinePath, grooveInset } from "./brainvitaTheme";
import { useMarbleDrag } from "./useMarbleDrag";
import type { JumpFlight } from "./useJumpFlight";

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

/** A carved sprig of five leaves on a curved stem, drawn about its own centre, one hole wide and a little over. */
function Sprig({ transform, dark, light }: { transform: string; dark: string; light: string }) {
  return (
    <g transform={transform}>
      {[0.8, 0].map((layer) => (
        <g key={layer} transform={`translate(${layer * 0.012} ${layer * 0.012})`} fill={layer ? light : dark} stroke="none">
          <path d="M-0.62 0.06 C -0.3 -0.1 0.22 -0.1 0.62 0.05 L 0.62 0.075 C 0.22 -0.07 -0.3 -0.07 -0.62 0.09 Z" />
          {[-0.42, -0.16, 0.1, 0.34].map((x, index) => (
            <g key={x} transform={`translate(${x} ${0.02 - index * 0.004})`}>
              <path d="M0 0 C 0.02 -0.12 0.14 -0.2 0.26 -0.19 C 0.24 -0.07 0.14 0.01 0 0 Z" />
              <path d="M0.02 0.04 C 0.04 0.14 0.14 0.2 0.24 0.2 C 0.22 0.1 0.14 0.03 0.02 0.04 Z" />
            </g>
          ))}
          <path d="M0.58 0.05 C 0.66 -0.02 0.74 -0.04 0.8 -0.02 C 0.74 0.03 0.66 0.06 0.58 0.05 Z" />
        </g>
      ))}
    </g>
  );
}

/** The carved wooden cross: shadow edge, honey top with grain, a groove near the rim, and carved sprigs. */
export function WoodSurface({ frame }: { frame: number }) {
  const palette = useSkinTokens().board as NonNullable<ReturnType<typeof useSkinTokens>["board"]>;
  const span = GRID_UNITS + 2 * frame;
  const outer = crossOutlinePath(frame);
  const groove = crossOutlinePath(frame, grooveInset(frame));
  const sprigScale = Math.min(1, frame / MAX_FRAME);
  const stripCentre = ARM_START - frame / 2;
  const shoulderCentre = (ARM_START - frame) / 2 + 0.05;
  const mirror = GRID_UNITS - shoulderCentre;
  const mirrorY = GRID_UNITS - stripCentre;
  return (
    <svg
      aria-hidden
      viewBox={`${-frame} ${-frame} ${span} ${span}`}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      style={{ filter: "drop-shadow(0 14px 16px rgba(0,0,0,0.5))" }}
    >
      <defs>
        <linearGradient id="bv-wood" x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={palette.stops[0]} />
          <stop offset="48%" stopColor={palette.stops[1]} />
          <stop offset="100%" stopColor={palette.stops[2]} />
        </linearGradient>
        <pattern id="bv-grain" patternUnits="userSpaceOnUse" width="4" height="0.5" patternTransform="rotate(-2)">
          <path d="M0 0.08 C 1 0.02 2 0.14 4 0.07" stroke={palette.grainDark} strokeWidth="0.018" fill="none" />
          <path d="M0 0.27 C 1.2 0.33 2.4 0.2 4 0.3" stroke={palette.grainDark} strokeWidth="0.014" fill="none" opacity="0.8" />
          <path d="M0 0.43 C 1 0.4 3 0.47 4 0.42" stroke={palette.grainLight} strokeWidth="0.016" fill="none" />
        </pattern>
      </defs>
      <path d={outer} fill={palette.side} transform="translate(0 0.17)" />
      <path d={outer} fill="url(#bv-wood)" />
      <path d={outer} fill="url(#bv-grain)" />
      <path d={outer} fill="none" stroke={palette.edge} strokeWidth="0.035" />
      <path d={groove} fill="none" stroke={palette.grooveDark} strokeWidth="0.04" />
      <path d={groove} fill="none" stroke={palette.grooveLight} strokeWidth="0.026" transform="translate(0.018 0.026)" />
      {frame >= SPRIG_MIN_FRAME && (
        <>
          <Sprig transform={`translate(${shoulderCentre} ${stripCentre}) rotate(-8) scale(${sprigScale})`} dark={palette.sprigDark} light={palette.sprigLight} />
          <Sprig transform={`translate(${mirror} ${stripCentre}) scale(-1 1) rotate(-8) scale(${sprigScale})`} dark={palette.sprigDark} light={palette.sprigLight} />
          <Sprig transform={`translate(${shoulderCentre} ${mirrorY}) scale(1 -1) rotate(-8) scale(${sprigScale})`} dark={palette.sprigDark} light={palette.sprigLight} />
          <Sprig transform={`translate(${mirror} ${mirrorY}) scale(-1 -1) rotate(-8) scale(${sprigScale})`} dark={palette.sprigDark} light={palette.sprigLight} />
        </>
      )}
    </svg>
  );
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
  const ring = isSelected ? `0 0 0 3px ${skin.accent}, ${skin.marbleSelectedShadow}` : isHintFrom ? `0 0 0 3px ${HINT_BLUE}, ${skin.marbleShadow}` : skin.marbleShadow;

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
          className="absolute inset-[9%] rounded-full motion-safe:transition-transform motion-safe:duration-150"
          style={{
            background: skin.marbleFill,
            opacity: isHidden ? 0 : isDragSource ? 0.22 : 1,
            transform: isSelected && !isDragSource ? "translateY(-8%) scale(1.06)" : undefined,
            boxShadow: ring,
            outline: isHintFrom ? `2px dashed ${HINT_BLUE}` : undefined,
            outlineOffset: isHintFrom ? "3px" : undefined,
          }}
        >
          <span aria-hidden className="absolute left-[19%] top-[12%] h-[24%] w-[34%] -rotate-[28deg] rounded-full bg-white/85 blur-[1.2px]" />
          <span aria-hidden className="absolute bottom-[10%] right-[16%] h-[10%] w-[20%] rotate-[-28deg] rounded-full bg-sky-100/40 blur-[1.5px]" />
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
  /** When given, a round button sits in the board's empty bottom-right corner to open the look-and-feel dialog. */
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
  const isHolo = skin.surface === "holo";

  return (
    <div
      role="group"
      aria-label="Brain Vita board"
      onKeyDown={onKeyDown}
      className="relative"
      style={{
        ...(size ? { width: size.width, height: size.height } : { width: "100%", aspectRatio: "1 / 1" }),
      }}
    >
      {hasProps && (
        <div className="absolute inset-0">{isHolo ? <HoloProps /> : <BrainVitaProps />}</div>
      )}
      {isHolo ? <HoloSurface frame={frame} /> : <WoodSurface frame={frame} />}
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
            aria-label={hasLookBadge ? "Change board theme, a new theme is ready" : "Change board theme"}
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
            <span className="absolute inset-[9%] rounded-full" style={{ background: skin.marbleFill, boxShadow: `0 0 0 3px ${skin.accent}, ${skin.marbleSelectedShadow}` }} />
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
