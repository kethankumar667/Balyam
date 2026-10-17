import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { GOLD, PLANK_BACKGROUND, PLANK_BORDER } from "./vamanaTheme";

export interface VamanaDockButtonProps {
  /** The short caption under the round button. */
  label: string;
  /** Spoken name when it needs to be longer than the caption. */
  ariaLabel?: string;
  icon: ReactNode;
  onClick: () => void;
  /** A red marker for something unread. */
  hasBadge?: boolean;
  isDanger?: boolean;
}

/** One round control with its caption underneath, as in the reference. The circle alone is the 48px tap target. */
export function VamanaDockButton({ label, ariaLabel, icon, onClick, hasBadge = false, isDanger = false }: VamanaDockButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="group flex min-w-[64px] cursor-pointer flex-col items-center gap-1 rounded-2xl px-1 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128]"
    >
      <span
        className="relative flex h-11 w-11 items-center justify-center rounded-full transition-transform group-active:scale-95 group-hover:brightness-125 md:h-14 md:w-14"
        style={{
          background: "radial-gradient(circle at 35% 28%, #4a2d17 0%, #2a160a 100%)",
          border: `1.5px solid ${isDanger ? "rgba(251,113,133,0.55)" : "rgba(228,177,40,0.45)"}`,
          boxShadow: "0 5px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,226,170,0.18)",
          color: isDanger ? "#fda4af" : GOLD,
        }}
      >
        {icon}
        {hasBadge && <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#2a160a]" />}
      </span>
      <span className="text-[11px] font-semibold leading-none text-amber-50 md:text-xs">{label}</span>
    </button>
  );
}

/** The round controls: a row along the bottom of a phone, or a column down the side of a wide screen. */
export function VamanaDock({ children, isVertical = false, className = "" }: { children: ReactNode; isVertical?: boolean; className?: string }) {
  return <div className={`flex justify-center ${isVertical ? "flex-col items-center gap-5" : "items-start gap-5 md:gap-9"} ${className}`}>{children}</div>;
}

/** The one-line recap of the last turn, in a dark pill with an info mark. Words only; the live region speaks it. */
export function VamanaMoveNote({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-full px-4 py-2 ${className}`}
      style={{ background: PLANK_BACKGROUND, border: PLANK_BORDER, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
    >
      <Info aria-hidden className="h-5 w-5 flex-shrink-0 text-amber-100/90" />
      <p className="min-w-0 text-xs leading-snug text-amber-50 md:text-sm">{text}</p>
    </div>
  );
}
