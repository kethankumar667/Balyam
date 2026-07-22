import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

/**
 * A tilted sticky note for special callouts only (toss, rewards, milestones).
 * Used sparingly per the design language — never as a general container.
 */
export interface StickyNoteProps {
  children: ReactNode;
  className?: string;
  tone?: "amber" | "mint" | "sky" | "rose";
  /** Degrees of tilt; small values keep it tasteful. */
  rotate?: number;
}

const TONES: Record<NonNullable<StickyNoteProps["tone"]>, string> = {
  amber: "bg-[#FBE7A2] border-[#E4B128]",
  mint: "bg-[#CDEBC5] border-[#5BA65B]",
  sky: "bg-[#C7E3F5] border-[#4C93C7]",
  rose: "bg-[#F6CFD1] border-[#D6707A]",
};

export function StickyNote({ children, className, tone = "amber", rotate = -2 }: StickyNoteProps) {
  return (
    <div
      className={cn(
        "relative rounded-md border px-4 py-3 shadow-[0_10px_20px_-12px_rgba(0,0,0,0.5)]",
        TONES[tone],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span
        aria-hidden
        className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 rounded-sm bg-[#E4B128]/40 border border-[#9A6E1A]/40"
      />
      {children}
    </div>
  );
}
