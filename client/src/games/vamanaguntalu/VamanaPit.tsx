import { memo } from "react";
import { CAPTURE_ORANGE, GOLD, GOLD_BRIGHT } from "./vamanaTheme";

/** A pit shows at most this many seeds; the count badge always carries the true number. */
const MAX_VISIBLE_SEEDS = 12;
const GOLDEN_ANGLE = 2.399963;
const SEED_SPREAD_PERCENT = 29;

const PIT_HOLE = "radial-gradient(circle at 38% 30%, #5a3519 0%, #2a160a 58%, #170b04 100%)";
const PIT_RIM = "linear-gradient(145deg, #e2a463 0%, #b97a3d 52%, #8a5528 100%)";
const SEED_FILL = "radial-gradient(ellipse at 34% 28%, #fffdf4 0%, #f1dcab 52%, #c9a461 100%)";
const BADGE_BG = "radial-gradient(circle at 35% 30%, #2c1a0d 0%, #0e0703 100%)";

interface SeedPosition {
  left: number;
  top: number;
  tilt: number;
}

/** Seeds for 0..12, laid out on a sunflower spiral so they look scattered, each tilted like a loose bean. */
const SEED_LAYOUTS: readonly (readonly SeedPosition[])[] = Array.from({ length: MAX_VISIBLE_SEEDS + 1 }, (_, count) =>
  Array.from({ length: count }, (__, index) => {
    const radius = SEED_SPREAD_PERCENT * Math.sqrt((index + 0.5) / MAX_VISIBLE_SEEDS);
    const angle = index * GOLDEN_ANGLE;
    return { left: 50 + radius * Math.cos(angle), top: 49 + radius * Math.sin(angle), tilt: (index * 67 + 20) % 180 };
  }),
);

export interface VamanaPitProps {
  pit: number;
  count: number;
  /** The accessible name, e.g. "Your pit 3, 5 seeds". */
  label: string;
  /** True for a pit the viewer could sow: their own row, and they are a seated player. */
  isControl: boolean;
  /** True when that control can be used right now (their turn, seeds in it, nothing in flight). */
  canSow: boolean;
  /** Lit while a seed is being dropped here or the pit was just lifted. */
  isActive: boolean;
  /** Lit on the final frame when this pit is captured. */
  isCaptureNow: boolean;
  /** Marked after the turn settles so the last capture stays visible. */
  isLastCapture: boolean;
  onSelect: (pit: number) => void;
}

function ringFor({ canSow, isActive, isCaptureNow }: Pick<VamanaPitProps, "canSow" | "isActive" | "isCaptureNow">): string {
  if (isCaptureNow) return `0 0 0 3px ${CAPTURE_ORANGE}, 0 0 20px 3px ${CAPTURE_ORANGE}`;
  if (isActive) return `0 0 0 3px #fff1b8, 0 0 16px 2px ${GOLD}`;
  if (canSow) return `0 0 0 3px ${GOLD_BRIGHT}, 0 0 0 6px rgba(255,210,94,0.22), 0 0 18px 4px rgba(255,200,60,0.5)`;
  return "0 3px 5px rgba(40,18,4,0.5)";
}

function VamanaPitView(props: VamanaPitProps) {
  const { pit, count, label, isControl, canSow, isActive, isCaptureNow, isLastCapture, onSelect } = props;
  const seeds = SEED_LAYOUTS[Math.min(count, MAX_VISIBLE_SEEDS)];

  const style = {
    background: PIT_RIM,
    boxShadow: ringFor(props),
    containerType: "inline-size" as const,
    // A pit is a circle: the smaller side of its cell sets its size, so it never spills into a neighbour.
    width: "min(100cqw, 100cqh)",
    outline: isLastCapture ? `2px dashed ${CAPTURE_ORANGE}` : undefined,
    outlineOffset: isLastCapture ? "3px" : undefined,
  };
  const className =
    "relative block aspect-square w-full rounded-full motion-safe:transition-shadow motion-safe:duration-150 " +
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]";

  const content = (
    <>
      <span aria-hidden className="absolute inset-[8%] rounded-full" style={{ background: PIT_HOLE, boxShadow: "inset 0 4px 8px rgba(0,0,0,0.75), inset 0 -2px 3px rgba(255,200,120,0.12)" }} />
      {seeds.map((seed, index) => (
        <span
          aria-hidden
          key={index}
          className="absolute rounded-full"
          style={{
            left: `${seed.left}%`,
            top: `${seed.top}%`,
            width: "21%",
            height: "13.5%",
            transform: `translate(-50%, -50%) rotate(${seed.tilt}deg)`,
            background: SEED_FILL,
            boxShadow: "0 1px 2px rgba(0,0,0,0.65)",
          }}
        />
      ))}
      <span
        aria-hidden
        className="absolute bottom-[1%] right-[1%] flex aspect-square min-w-[20px] items-center justify-center rounded-full text-[11px] font-extrabold leading-none tabular-nums text-white"
        style={{ width: "31%", background: BADGE_BG, border: "1px solid rgba(255,226,170,0.35)", fontSize: "max(11px, 16cqw)", boxShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
      >
        {count}
      </span>
    </>
  );

  if (!isControl) {
    return (
      <div role="img" aria-label={label} className={className} style={style}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={!canSow}
      data-own-pit={pit}
      onClick={() => {
        if (canSow) onSelect(pit);
      }}
      className={`${className} ${canSow ? "cursor-pointer active:scale-95" : "cursor-default"}`}
      style={style}
    >
      {content}
    </button>
  );
}

/** Re-renders only when its own pit changes, so a sowing animation redraws a handful of pits, not 14. */
export const VamanaPit = memo(VamanaPitView);
