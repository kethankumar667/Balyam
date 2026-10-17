import { Hourglass, Trophy } from "lucide-react";
import { GOLD, PLANK_BACKGROUND, PLANK_BORDER, TURN_GREEN_BRIGHT } from "./vamanaTheme";

const RING_RADIUS = 17;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CRITICAL_RED = "#fb7185";

export interface VamanaTurnBarProps {
  /** What to say, e.g. "Your turn - tap a pit on your row". */
  text: string;
  /** Seconds left on the turn clock, or null when this table plays without one. */
  secondsLeft: number | null;
  /** The length of a whole turn, so the ring can show how much of it remains. */
  totalSeconds: number;
  isCritical: boolean;
  isCompact?: boolean;
  className?: string;
}

/**
 * The plank under the score cards: whose move it is, in words, plus a ring that drains with the
 * turn clock. The words carry the meaning and the colour only backs them up. This is a visual
 * duplicate of the board's live region, so it is not one itself.
 */
export function VamanaTurnBar({ text, secondsLeft, totalSeconds, isCritical, isCompact = false, className = "" }: VamanaTurnBarProps) {
  const hasClock = secondsLeft !== null && totalSeconds > 0;
  const fraction = hasClock ? Math.min(1, Math.max(0, secondsLeft / totalSeconds)) : 0;
  const ringColor = isCritical ? CRITICAL_RED : TURN_GREEN_BRIGHT;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl ${isCompact ? "min-h-[40px] px-2.5 py-1" : "min-h-[52px] px-3.5 py-2 md:min-h-[60px]"} ${className}`}
      style={{ background: PLANK_BACKGROUND, border: PLANK_BORDER, boxShadow: "0 6px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,226,170,0.18)" }}
    >
      <Hourglass aria-hidden className={`flex-shrink-0 ${isCompact ? "h-4 w-4" : "h-6 w-6 md:h-7 md:w-7"}`} style={{ color: GOLD }} />
      <p className={`min-w-0 flex-1 font-medium leading-snug text-amber-50 ${isCompact ? "text-xs" : "text-sm md:text-base"}`}>{text}</p>
      {hasClock && (
        <div className={`relative flex-shrink-0 ${isCompact ? "h-8 w-8" : "h-11 w-11 md:h-12 md:w-12"}`}>
          <svg aria-hidden viewBox="0 0 40 40" className="h-full w-full -rotate-90">
            <circle cx="20" cy="20" r={RING_RADIUS} fill="rgba(20,10,4,0.55)" stroke="rgba(255,255,255,0.14)" strokeWidth="3.5" />
            <circle
              cx="20"
              cy="20"
              r={RING_RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
              className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-linear"
            />
          </svg>
          <span
            data-testid="vamana-turn-clock"
            className={`absolute inset-0 flex items-center justify-center font-bold tabular-nums ${isCompact ? "text-[10px]" : "text-xs md:text-sm"}`}
            style={{ color: isCritical ? CRITICAL_RED : "#fff8e8" }}
          >
            {secondsLeft}s
          </span>
        </div>
      )}
    </div>
  );
}

/** What replaces the turn bar once the match is over: the result in a line, with a trophy. */
export function VamanaOutcomeBar({ headline, isCompact = false, className = "" }: { headline: string; isCompact?: boolean; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-2.5 rounded-2xl ${isCompact ? "min-h-[40px] px-2.5 py-1" : "min-h-[52px] px-3.5 py-2 md:min-h-[60px]"} ${className}`}
      style={{ background: PLANK_BACKGROUND, border: PLANK_BORDER, boxShadow: "0 6px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,226,170,0.18)" }}
    >
      <Trophy aria-hidden className={`flex-shrink-0 ${isCompact ? "h-4 w-4" : "h-6 w-6"}`} style={{ color: GOLD }} />
      <span className={`min-w-0 text-center font-bold uppercase tracking-wider text-amber-50 ${isCompact ? "text-xs" : "text-sm md:text-base"}`}>{headline}</span>
    </div>
  );
}
