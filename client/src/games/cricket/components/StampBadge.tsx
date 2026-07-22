import { cn } from "../../../lib/cn";

/**
 * A rotated rubber-stamp badge for verdicts and highlights ("NICE SHOT!",
 * "OUT", "WON"). Decorative framing; the label text carries the meaning.
 */
export interface StampBadgeProps {
  label: string;
  className?: string;
  tone?: "green" | "red" | "gold";
  rotate?: number;
}

const TONES: Record<NonNullable<StampBadgeProps["tone"]>, string> = {
  green: "text-[#2E7D32] border-[#2E7D32]",
  red: "text-[#C0392B] border-[#C0392B]",
  gold: "text-[#9A6E1A] border-[#9A6E1A]",
};

export function StampBadge({ label, className, tone = "green", rotate = -8 }: StampBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 border-dashed px-3 py-1 text-xs font-black uppercase tracking-widest",
        TONES[tone],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {label}
    </span>
  );
}
