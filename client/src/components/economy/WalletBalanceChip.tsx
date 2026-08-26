import React from "react";
import { CoinAmount } from "./CoinAmount";

export interface WalletBalanceChipProps {
  /**
   * Canonical decimal string representing wallet coin balance.
   * Strings only — never accepts numbers or floating-point primitives.
   */
  balance: string;
  isLoading?: boolean;
  syncStatus?: "synced" | "syncing" | "offline";
  onClick?: () => void;
  isMember?: boolean;
  className?: string;
}

/**
 * Persistent Global Wallet Balance Chip.
 * Anchored in header navigation; touch-ergonomic (44px target),
 * accessible via keyboard (Enter/Space), and WCAG 2.1 AA focus-ring compliant.
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const statusIndicator = {
    synced: "bg-emerald-500",
    syncing: "bg-sky-400 animate-pulse",
    offline: "bg-amber-500",
  }[syncStatus];

  const statusText = {
    synced: "Wallet synchronized",
    syncing: "Synchronizing wallet",
    offline: "Offline / Cached wallet",
  }[syncStatus];

  const content = (
    <div
      className={`inline-flex items-center min-h-[44px] px-3.5 py-1.5 rounded-full border border-amber-600/30 dark:border-amber-400/25 bg-amber-50/80 dark:bg-[#131824]/90 backdrop-blur-md shadow-sm transition-all duration-200 ${
        isInteractive
          ? "cursor-pointer hover:border-amber-500/50 active:scale-[0.98] hover:shadow-md hover:bg-amber-100/70 dark:hover:bg-[#1C2333]"
          : ""
      } ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "button" : "status"}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={
        isLoading
          ? "Loading coin balance"
          : `Coin balance: ${balance} coins. ${statusText}.${isInteractive ? " Click to open wallet." : ""}`
      }
    >
      {isLoading ? (
        <div className="flex items-center gap-2" aria-busy="true">
          <div className="w-4 h-4 rounded-full border-2 border-amber-600/40 border-t-amber-600 animate-spin" />
          <div className="w-12 h-4 bg-amber-200/50 dark:bg-slate-700/50 rounded animate-pulse" />
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
              className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-200/40 dark:bg-amber-500/15 px-1.5 py-0.5 rounded-full"
              title="Registered Member"
            >
              VIP
            </span>
          )}
        </div>
      )}
    </div>
  );

  return content;
};

export default WalletBalanceChip;
