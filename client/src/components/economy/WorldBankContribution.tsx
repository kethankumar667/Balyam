import React from "react";
import { Landmark } from "lucide-react";
import { CoinAmount } from "./CoinAmount";

export interface WorldBankContributionProps {
  /**
   * World Bank reserve contribution decimal string (e.g. "50", "100").
   * Strings only — never accepts number primitives.
   */
  amount: string;
  showDescription?: boolean;
  className?: string;
}

/**
 * Transparent World Bank protocol contribution line item.
 * Explicitly displays the house cut and informs players about platform reserve operations.
 * Accepts coin amounts strictly as strings without numerical conversions.
 */
export const WorldBankContribution: React.FC<WorldBankContributionProps> = ({
  amount,
  showDescription = true,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 font-sans text-xs ${className}`}
      aria-label="World bank platform contribution"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
          <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <span>BHALYAM World Bank Reserve</span>
        </div>
        <CoinAmount amount={amount} size="sm" ariaLabel={`World bank contribution: ${amount} coins`} />
      </div>

      {showDescription && (
        <p className="text-[11px] text-ink-lo dark:text-text-lo mt-1.5 leading-relaxed">
          The World Bank reserve funds multiplayer room infrastructure, bot placement sweeps, and platform liquidity.
        </p>
      )}
    </div>
  );
};

export default WorldBankContribution;
