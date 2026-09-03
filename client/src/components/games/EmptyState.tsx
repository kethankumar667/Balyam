import { Sparkles, RotateCcw } from "lucide-react";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
  resetLabel?: string;
}

export default function EmptyState({
  title = "No Nostalgic Games Found",
  description = "Try adjusting your search query or switching to another category to find games.",
  onReset,
  resetLabel = "Reset Filters",
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="p-8 sm:p-12 text-center rounded-3xl bg-surface-0 border border-surface-rim shadow-sm space-y-4 max-w-lg mx-auto my-8 flex flex-col items-center justify-center"
    >
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-inner">
        <Sparkles className="w-8 h-8" />
      </div>

      <div className="space-y-1.5">
        <h3 className="font-display font-black text-xl text-ink-hi">
          {title}
        </h3>
        <p className="text-sm text-ink-mid max-w-sm mx-auto">
          {description}
        </p>
      </div>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-2xl
                     bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-sm shadow-md
                     transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>{resetLabel}</span>
        </button>
      )}
    </div>
  );
}
