import React from "react";
import { AlertTriangle } from "lucide-react";
import { CoinAmount } from "./CoinAmount";

export interface BalancePreviewProps {
  /** Current balance decimal string (e.g. "5000", "150"). */
  currentBalance: string;
  /** Total commitment debit decimal string (e.g. "400"). */
  totalCommitment: string;
  /** Projected balance decimal string (e.g. "4600", "-250"). */
  projectedBalance: string;
  hasSufficientFunds?: boolean;
  /** Shortfall amount decimal string if funds are insufficient (e.g. "250"). */
  shortfall?: string;
  className?: string;
}

/**
 * Three-stage visual balance projection strip for match checkout.
 * Clearly demonstrates: Current Balance - Commitment = Balance After Confirmation.
 * Accepts all coin balances and debits strictly as strings with zero numeric conversions.
 */
export const BalancePreview: React.FC<BalancePreviewProps> = ({
  currentBalance,
  totalCommitment,
  projectedBalance,
  hasSufficientFunds = true,
  shortfall,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col p-3.5 rounded-2xl border ${
        hasSufficientFunds
          ? "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5"
          : "border-amber-500/30 bg-amber-500/10"
      } font-sans ${className}`}
      aria-label="Wallet balance projection preview"
    >
      <div className="flex items-center justify-between text-xs font-semibold text-ink-lo dark:text-text-lo mb-2">
        <span>Balance Projection</span>
        <span className="text-[10px] uppercase tracking-wider">Estimated</span>
      </div>

      <div className="grid grid-cols-3 items-center gap-1 sm:gap-2 text-center">
        {/* Step 1: Current Balance */}
        <div className="flex flex-col items-center p-2 rounded-xl bg-white/40 dark:bg-black/20">
          <span className="text-[10px] text-ink-lo dark:text-text-lo mb-0.5">Current</span>
          <CoinAmount amount={currentBalance} size="sm" />
        </div>

        {/* Step 2: Commitment */}
        <div className="flex flex-col items-center p-2 rounded-xl bg-white/40 dark:bg-black/20">
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mb-0.5">Debit</span>
          <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold text-xs sm:text-sm">
            <span>-</span>
            <CoinAmount amount={totalCommitment} size="sm" showIcon={false} />
          </div>
        </div>

        {/* Step 3: Projected Balance */}
        <div
          className={`flex flex-col items-center p-2 rounded-xl ${
            hasSufficientFunds ? "bg-white/60 dark:bg-black/40" : "bg-red-500/15 border border-red-500/30"
          }`}
        >
          <span className="text-[10px] font-bold text-ink-hi dark:text-text-hi mb-0.5">After Confirmation</span>
          <CoinAmount
            amount={projectedBalance}
            size="sm"
            className={hasSufficientFunds ? "font-bold text-emerald-700 dark:text-emerald-400" : "font-bold text-red-600 dark:text-red-400"}
          />
        </div>
      </div>

      {!hasSufficientFunds && Boolean(shortfall) ? (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-amber-500/20 text-xs font-semibold text-amber-900 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span>Shortfall: {shortfall} coins needed to fund this match.</span>
        </div>
      ) : null}
    </div>
  );
};

export default BalancePreview;
