import React from "react";

export type EconomySkeletonVariant = "wallet" | "checkout" | "prize" | "voucher" | "coin" | "generic";

export interface EconomySkeletonProps {
  variant?: EconomySkeletonVariant;
  className?: string;
  count?: number;
  ariaLabel?: string;
}

/**
 * Reusable Economy Skeleton Loader.
 * Provides accessible, dark/light theme-aligned shimmer placeholders
 * for wallet balances, checkout cards, prize schedules, vouchers, and coin chips.
 */
export const EconomySkeleton: React.FC<EconomySkeletonProps> = ({
  variant = "generic",
  className = "",
  count = 1,
  ariaLabel = "Loading economy data",
}) => {
  const renderSingle = (key: number) => {
    switch (variant) {
      case "wallet":
        return (
          <div
            key={key}
            className={`inline-flex items-center min-h-[44px] px-3.5 py-1.5 rounded-full border border-amber-600/20 dark:border-amber-400/15 bg-amber-50/50 dark:bg-[#131824]/60 animate-pulse gap-2.5 ${className}`}
            aria-busy="true"
            aria-label={ariaLabel}
          >
            <div className="w-4 h-4 rounded-full bg-amber-500/30" />
            <div className="w-14 h-4 bg-amber-500/20 rounded-md" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/30" />
          </div>
        );

      case "coin":
        return (
          <div
            key={key}
            className={`inline-flex items-center gap-1.5 animate-pulse ${className}`}
            aria-busy="true"
            aria-label={ariaLabel}
          >
            <div className="w-4 h-4 rounded-full bg-amber-500/30" />
            <div className="w-12 h-4 bg-amber-500/20 rounded" />
          </div>
        );

      case "checkout":
        return (
          <div
            key={key}
            className={`p-4 rounded-2xl border border-amber-600/20 dark:border-amber-400/15 bg-black/5 dark:bg-white/5 space-y-3 animate-pulse ${className}`}
            aria-busy="true"
            aria-label={ariaLabel}
          >
            <div className="flex justify-between items-center pb-2 border-b border-black/10 dark:border-white/10">
              <div className="h-4 w-28 bg-black/15 dark:bg-white/15 rounded" />
              <div className="h-4 w-16 bg-black/15 dark:bg-white/15 rounded" />
            </div>
            <div className="space-y-2 py-1">
              <div className="flex justify-between">
                <div className="h-3 w-32 bg-black/10 dark:bg-white/10 rounded" />
                <div className="h-3 w-12 bg-black/10 dark:bg-white/10 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-24 bg-black/10 dark:bg-white/10 rounded" />
                <div className="h-3 w-10 bg-black/10 dark:bg-white/10 rounded" />
              </div>
            </div>
            <div className="pt-2 border-t border-black/10 dark:border-white/10 flex justify-between items-center">
              <div className="h-5 w-36 bg-amber-500/25 rounded" />
              <div className="h-5 w-20 bg-amber-500/25 rounded" />
            </div>
            <div className="h-11 w-full bg-amber-500/30 rounded-xl mt-3" />
          </div>
        );

      case "prize":
        return (
          <div
            key={key}
            className={`p-4 rounded-2xl border border-amber-600/20 dark:border-amber-400/15 bg-amber-500/5 space-y-3 animate-pulse ${className}`}
            aria-busy="true"
            aria-label={ariaLabel}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="h-3 w-32 bg-amber-500/25 rounded" />
              <div className="h-3 w-20 bg-amber-500/15 rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="h-9 rounded-xl bg-amber-500/20" />
              <div className="h-9 rounded-xl bg-slate-500/20" />
              <div className="h-9 rounded-xl bg-orange-500/20" />
              <div className="h-9 rounded-xl bg-indigo-500/20" />
            </div>
          </div>
        );

      case "voucher":
        return (
          <div
            key={key}
            className={`relative p-4 rounded-2xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 space-y-3 animate-pulse ${className}`}
            aria-busy="true"
            aria-label={ariaLabel}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-amber-500/25 rounded" />
                <div className="h-3 w-20 bg-amber-500/15 rounded" />
              </div>
              <div className="h-7 w-20 bg-amber-500/30 rounded-lg" />
            </div>
            <div className="h-px w-full bg-amber-500/20 my-2" />
            <div className="flex justify-between items-center">
              <div className="h-3 w-28 bg-black/10 dark:bg-white/10 rounded" />
              <div className="h-4 w-16 bg-amber-500/25 rounded" />
            </div>
          </div>
        );

      case "generic":
      default:
        return (
          <div
            key={key}
            className={`h-6 w-full rounded-lg bg-black/10 dark:bg-white/10 animate-pulse ${className}`}
            aria-busy="true"
            aria-label={ariaLabel}
          />
        );
    }
  };

  if (count === 1) return renderSingle(0);

  return (
    <div className="space-y-2" aria-busy="true" aria-label={ariaLabel}>
      {Array.from({ length: count }, (_, i) => renderSingle(i))}
    </div>
  );
};

export default EconomySkeleton;
