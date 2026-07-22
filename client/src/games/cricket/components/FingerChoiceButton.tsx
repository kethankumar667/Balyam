import { cn } from "../../../lib/cn";

/**
 * Large, thumb-friendly run-choice button (1–6) for the gameplay screen. The
 * hand-cricket style "finger" input: value shown big, disabled and selected
 * states clear, min 44px touch target. Selected state is not color-only — it
 * also carries a ring and bolder fill for accessibility.
 */
export interface FingerChoiceButtonProps {
  value: number;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
}

export function FingerChoiceButton({ value, onClick, disabled = false, selected = false, className }: FingerChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Play ${value} ${value === 1 ? "run" : "runs"}`}
      className={cn(
        "flex min-h-[56px] min-w-[56px] items-center justify-center rounded-2xl border-2 text-2xl font-black tabular-nums transition active:scale-95",
        selected
          ? "border-[#2E7D32] bg-[#2E7D32] text-white shadow-md ring-2 ring-[#2E7D32]/40"
          : "border-[#E4B128] bg-[#FFFBF0] text-[#6D4323] shadow-sm",
        disabled && "opacity-40 active:scale-100 cursor-not-allowed",
        className,
      )}
    >
      {value}
    </button>
  );
}
