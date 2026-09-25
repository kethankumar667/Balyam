import React from "react";
import { Compass, X } from "lucide-react";

export interface WelcomeTourPromptProps {
  onStart: () => void;
  onDismiss: () => void;
  className?: string;
}

/**
 * The quiet way into the welcome tour: one line on the page, two honest
 * choices, and it goes away for the rest of the visit with "Not now". It sits
 * in the flow (above the first thing a new person sees) instead of over it.
 *
 * Requirements: light and dark themes, 44x44px targets, no Sparkles icon.
 */
export const WelcomeTourPrompt: React.FC<WelcomeTourPromptProps> = ({ onStart, onDismiss, className = "" }) => (
  <section
    aria-label="Welcome tour"
    className={`mb-3 flex flex-col gap-3 rounded-2xl border border-[#DFC98A] bg-[#FDF5E4] p-4 dark:border-slate-800 dark:bg-[#0E1526] sm:flex-row sm:items-center sm:justify-between ${className}`}
  >
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
        <Compass className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[15px] font-semibold leading-snug text-[#1D2C4A] dark:text-zinc-100">New to BHALYAM?</p>
        <p className="m-0 mt-0.5 text-sm leading-snug text-stone-700 dark:text-slate-300">
          A one-minute tour shows how rooms, bots and playing with friends work.
        </p>
      </div>
    </div>
    <div className="flex flex-shrink-0 items-center gap-2 self-end sm:self-auto">
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-stone-700 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" aria-hidden="true" />
        Not now
      </button>
      <button
        type="button"
        onClick={onStart}
        className="inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-amber-500 px-5 text-sm font-bold text-[#1C1408] hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
      >
        Take the tour
      </button>
    </div>
  </section>
);

export default WelcomeTourPrompt;
