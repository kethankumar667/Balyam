import { cn } from "../../../lib/cn";

/**
 * A compact label/value stat chip used across score headers, player cards and
 * summaries. Value is emphasized; label is a quiet caption above it.
 */
export interface StatPillProps {
  label: string;
  value: string | number;
  tone?: "neutral" | "gold" | "green";
  className?: string;
}

const TONES: Record<NonNullable<StatPillProps["tone"]>, string> = {
  neutral: "text-[#6D4323]",
  gold: "text-[#9A6E1A]",
  green: "text-[#2E7D32]",
};

export function StatPill({ label, value, tone = "neutral", className }: StatPillProps) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl bg-[#FFFBF0] border border-[#E4D3AC] px-3 py-1.5", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6D4323]/60">{label}</span>
      <span className={cn("text-base font-black tabular-nums leading-tight", TONES[tone])}>{value}</span>
    </div>
  );
}
