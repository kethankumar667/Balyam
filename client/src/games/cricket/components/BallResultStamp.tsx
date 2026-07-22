import { cn } from "../../../lib/cn";
import type { BallOutcome } from "../types";

/**
 * The big notebook "stamp" shown on the ball-result overlay: a large number
 * for runs, or OUT for a wicket. Boundaries and wicket get accent colors; the
 * meaning is always in the text, never color alone.
 */
export interface BallResultStampProps {
  outcome: BallOutcome;
  className?: string;
}

export function BallResultStamp({ outcome, className }: BallResultStampProps) {
  const wicket = outcome === "W";
  const boundary = outcome === "4" || outcome === "6";
  const color = wicket ? "#C0392B" : boundary ? "#2E7D32" : "#3A2210";
  const caption =
    wicket ? "WICKET!" : outcome === "6" ? "SIX RUNS!" : outcome === "4" ? "FOUR!" : outcome === "0" ? "DOT BALL" : `${outcome} RUNS`;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <span className="font-display leading-none" style={{ color, fontSize: "5.5rem" }}>
        {wicket ? "OUT" : outcome}
      </span>
      <span className="mt-1 text-sm font-black uppercase tracking-[0.2em]" style={{ color }}>
        {caption}
      </span>
    </div>
  );
}
