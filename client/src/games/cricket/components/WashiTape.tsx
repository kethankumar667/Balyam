import { cn } from "../../../lib/cn";

/**
 * A strip of decorative washi tape for emphasized cards only. Aria-hidden and
 * absolutely positioned — pin it to a card corner/edge. Used sparingly.
 */
export interface WashiTapeProps {
  className?: string;
  rotate?: number;
  tone?: "gold" | "green" | "blue";
}

const TONES: Record<NonNullable<WashiTapeProps["tone"]>, string> = {
  gold: "bg-[#E4B128]/55",
  green: "bg-[#5BA65B]/50",
  blue: "bg-[#4C93C7]/50",
};

export function WashiTape({ className, rotate = -4, tone = "gold" }: WashiTapeProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute h-6 w-20 border-x border-white/30 shadow-sm",
        TONES[tone],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    />
  );
}
