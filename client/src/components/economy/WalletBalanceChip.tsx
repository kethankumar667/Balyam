import React, { useEffect, useRef, useState } from "react";
import { CoinAmount } from "./CoinAmount";

export interface WalletBalanceChipProps {
  /**
   * Canonical decimal string representing wallet coin balance, or `null` when
   * it is not actually known (an `error`/`unavailable` wallet state) — never a
   * fabricated "0" standing in for a failed fetch. Renders as "---" via
   * `CoinAmount`'s own unavailable case.
   */
  balance: string | null;
  isLoading?: boolean;
  syncStatus?: "synced" | "syncing" | "offline" | "error";
  onClick?: () => void;
  isMember?: boolean;
  className?: string;
}

/**
 * Persistent Global Wallet Balance Chip.
 * Anchored in header navigation; touch-ergonomic (44px target),
 * accessible via keyboard (Enter/Space), semantic button, and WCAG 2.1 AA focus-ring compliant.
 */
export const WalletBalanceChip: React.FC<WalletBalanceChipProps> = ({
  balance,
  isLoading = false,
  syncStatus = "synced",
  onClick,
  isMember = false,
  className = "",
}) => {
  const isInteractive = Boolean(onClick);
  const prevBalanceRef = useRef<string | null>(balance);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");

  // Announce verified balance changes via polite live region
  useEffect(() => {
    if (prevBalanceRef.current !== balance && balance !== null && !isLoading) {
      setLiveAnnouncement(`Wallet balance updated: ${balance} coins`);
      prevBalanceRef.current = balance;
    }
  }, [balance, isLoading]);

  const statusIndicator = {
    synced: "bg-emerald-500",
    syncing: "bg-sky-400 animate-pulse motion-reduce:animate-none",
    offline: "bg-amber-500",
    error: "bg-rose-500",
  }[syncStatus];

  const statusText = {
    synced: "Wallet synchronized",
    syncing: "Synchronizing wallet",
    offline: "Offline / Cached wallet",
    error: "Wallet unavailable",
  }[syncStatus];

  const accessibleLabel = isLoading
    ? "Loading coin balance"
    : balance === null
      ? `Coin balance unavailable. ${statusText}.${isInteractive ? " Click to open wallet." : ""}`
      : `Coin balance: ${balance} coins. ${statusText}.${isInteractive ? " Click to open wallet." : ""}`;

  const baseStyles =
    "inline-flex items-center min-h-[44px] px-3.5 py-1.5 rounded-full border border-amber-600/30 dark:border-amber-400/25 " +
    "bg-amber-50/80 dark:bg-[#131824]/90 backdrop-blur-md shadow-xs transition-all duration-200 " +
    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0A0E17] " +
    (isInteractive
      ? "cursor-pointer hover:border-amber-500/50 active:scale-[0.98] hover:shadow-md hover:bg-amber-100/70 dark:hover:bg-[#1C2333] select-none"
      : "");

  const innerContent = (
    <>
      {isLoading ? (
        <div className="flex items-center gap-2" aria-busy="true">
          <div
            className="w-4 h-4 rounded-full border-2 border-amber-600/40 border-t-amber-600 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div
            className="w-12 h-4 bg-amber-200/50 dark:bg-slate-700/50 rounded animate-pulse motion-reduce:animate-none"
            aria-hidden="true"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <CoinAmount amount={balance} size="sm" />
          <span
            className={`w-1.5 h-1.5 rounded-full ${statusIndicator}`}
            title={statusText}
            aria-hidden="true"
          />
          {isMember && (
            <span
              className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-200/40 dark:bg-amber-500/15 px-1.5 py-0.5 rounded-full border border-amber-500/20"
              title="Registered Member"
            >
              VIP
            </span>
          )}
        </div>
      )}
      {/* Screen-reader live region for verified balance updates */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </span>
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseStyles} ${className}`}
        aria-label={accessibleLabel}
      >
        {innerContent}
      </button>
    );
  }

  return (
    <div
      role="status"
      className={`${baseStyles} ${className}`}
      aria-label={accessibleLabel}
    >
      {innerContent}
    </div>
  );
};

export default WalletBalanceChip;
