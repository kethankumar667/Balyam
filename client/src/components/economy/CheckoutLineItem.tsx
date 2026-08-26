import React from "react";
import { CoinAmount } from "./CoinAmount";

export interface CheckoutLineItemProps {
  label: string;
  sublabel?: string;
  /**
   * Decimal string coin amount (e.g. "400", "0").
   * Strings only — never accepts number primitives.
   */
  amount: string;
  isTotal?: boolean;
  isDeduction?: boolean;
  highlight?: boolean;
  className?: string;
}

/**
 * Key-value line item for match checkout sheets and calculation summaries.
 */
export const CheckoutLineItem: React.FC<CheckoutLineItemProps> = ({
  label,
  sublabel,
  amount,
  isTotal = false,
  isDeduction = false,
  highlight = false,
  className = "",
}) => {
  return (
    <div
      className={`flex items-center justify-between py-2 sm:py-2.5 gap-3 border-b border-black/5 dark:border-white/5 last:border-b-0 ${
        isTotal ? "font-bold text-base sm:text-lg pt-3 border-t border-black/15 dark:border-white/15" : "text-sm"
      } ${highlight ? "text-amber-700 dark:text-amber-400" : "text-ink-hi dark:text-text-hi"} ${className}`}
    >
      <div className="flex flex-col min-w-0 pr-2">
        <span className={`font-medium ${isTotal ? "text-base sm:text-lg font-bold" : "text-xs sm:text-sm"}`}>
          {label}
        </span>
        {sublabel && (
          <span className="text-[11px] text-ink-lo dark:text-text-lo font-normal leading-tight mt-0.5">
            {sublabel}
          </span>
        )}
      </div>

      <div className="flex-shrink-0 tabular-nums">
        <CoinAmount
          amount={amount}
          size={isTotal ? "lg" : "md"}
          className={isDeduction ? "text-amber-600 dark:text-amber-400 font-bold" : ""}
          ariaLabel={`${label}: ${amount} coins`}
        />
      </div>
    </div>
  );
};

export default CheckoutLineItem;
