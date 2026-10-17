import { memo } from "react";

/** A pit shows at most this many seed dots; the count badge always carries the true number. */
const MAX_VISIBLE_SEEDS = 12;
const GOLDEN_ANGLE = 2.399963;
const SEED_SPREAD_PERCENT = 31;

const PIT_HOLE = "radial-gradient(circle at 36% 30%, #3a2210 0%, #1b0e05 62%, #0f0702 100%)";
const PIT_RIM = "linear-gradient(145deg, #a9743f 0%, #6d4323 55%, #4a2c15 100%)";
const SEED_FILL = "radial-gradient(circle at 35% 30%, #fff1d0 0%, #e8c98e 55%, #b98f4b 100%)";
const BADGE_BG = "rgba(18, 9, 3, 0.86)";
const BADGE_INK = "#F7E8C4";
const GOLD = "#E4B128";
const CAPTURE_ORANGE = "#F97316";

interface SeedPosition {
  left: number;
  top: number;
}

/** Seed dots for 0..12 seeds, laid out on a sunflower spiral so they look scattered, not gridded. */
const SEED_LAYOUTS: readonly (readonly SeedPosition[])[] = Array.from({ length: MAX_VISIBLE_SEEDS + 1 }, (_, count) =>
  Array.from({ length: count }, (__, index) => {
    const radius = SEED_SPREAD_PERCENT * Math.sqrt((index + 0.5) / MAX_VISIBLE_SEEDS);
    const angle = index * GOLDEN_ANGLE;
    return { left: 50 + radius * Math.cos(angle), top: 50 + radius * Math.sin(angle) };
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
  if (isCaptureNow) return `0 0 0 3px ${CAPTURE_ORANGE}, 0 0 18px ${CAPTURE_ORANGE}`;
  if (isActive) return `0 0 0 3px #fff1b8, 0 0 14px ${GOLD}`;
  if (canSow) return `0 0 0 2px ${GOLD}`;
  return "0 2px 4px rgba(0, 0, 0, 0.45)";
}

function VamanaPitView(props: VamanaPitProps) {
  const { pit, count, label, isControl, canSow, isActive, isCaptureNow, isLastCapture, onSelect } = props;
  const seeds = SEED_LAYOUTS[Math.min(count, MAX_VISIBLE_SEEDS)];

  const style = {
    background: PIT_RIM,
    boxShadow: ringFor(props),
    outline: isLastCapture ? `2px dashed ${CAPTURE_ORANGE}` : undefined,
    outlineOffset: isLastCapture ? "2px" : undefined,
  };
  const className =
    "relative block aspect-square w-full rounded-full motion-safe:transition-shadow motion-safe:duration-150 " +
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]";

  const content = (
    <>
      <span aria-hidden className="absolute inset-[9%] rounded-full" style={{ background: PIT_HOLE, boxShadow: "inset 0 3px 6px rgba(0,0,0,0.7)" }} />
      {seeds.map((seed, index) => (
        <span
          aria-hidden
          key={index}
          className="absolute rounded-full"
          style={{
            left: `${seed.left}%`,
            top: `${seed.top}%`,
            width: "17%",
            height: "17%",
            transform: "translate(-50%, -50%)",
            background: SEED_FILL,
            boxShadow: "0 1px 2px rgba(0,0,0,0.6)",
          }}
        />
      ))}
      <span
        aria-hidden
        className="absolute bottom-[4%] right-[6%] min-w-[1.4rem] rounded-full px-1 text-center text-[11px] font-bold leading-5 tabular-nums"
        style={{ background: BADGE_BG, color: BADGE_INK }}
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
