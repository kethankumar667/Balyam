import { cn } from "../../../lib/cn";
import type { BallOutcome } from "../types";

/**
 * A Cricbuzz-style per-ball strip: one pill per ball outcome, color-coded
 * (wicket red, boundary green, other cream). Read-only display used in the
 * over card and the over summary.
 */
export interface OverStripProps {
  balls: BallOutcome[];
  className?: string;
  emptyLabel?: string;
}

function pillClass(o: BallOutcome): string {
  if (o === "W") return "bg-[#C0392B] text-white";
  if (o === "6" || o === "4") return "bg-[#2E7D32] text-white";
  return "bg-[#F7E8C4] text-[#6D4323] border border-[#E4B128]";
}

export function OverStrip({ balls, className, emptyLabel = "No balls yet" }: OverStripProps) {
  if (balls.length === 0) {
    return <span className={cn("text-sm text-[#6D4323]/50", className)}>{emptyLabel}</span>;
  }
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} aria-label="Over ball outcomes">
      {balls.map((o, i) => (
        <span
          key={i}
          className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-black tabular-nums", pillClass(o))}
        >
          {o}
        </span>
      ))}
    </div>
  );
}
