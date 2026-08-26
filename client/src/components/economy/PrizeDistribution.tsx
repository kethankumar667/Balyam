import React from "react";
import { Trophy, Landmark } from "lucide-react";
import { CoinAmount } from "./CoinAmount";

export interface PrizeDistributionProps {
  /**
   * First place prize decimal string (e.g. "175", "200").
   * Strings only — never accepts number primitives.
   */
  firstPlace: string;
  secondPlace?: string;
  thirdPlace?: string;
  worldBankCut?: string;
  seatCount?: number;
  className?: string;
}

/**
 * Visual tiered breakdown of prize pool distribution per placement rank.
 * Always transparently discloses the World Bank protocol reserve contribution.
 * Accepts coin amounts exclusively as decimal strings with zero numeric conversions.
 */
export const PrizeDistribution: React.FC<PrizeDistributionProps> = ({
  firstPlace,
  secondPlace,
  thirdPlace,
  worldBankCut,
  seatCount,
  className = "",
}) => {
  const hasSecond = secondPlace !== undefined && secondPlace.trim() !== "0" && secondPlace.trim() !== "";
  const hasThird = thirdPlace !== undefined && thirdPlace.trim() !== "0" && thirdPlace.trim() !== "";
  const hasWorldBank = worldBankCut !== undefined && worldBankCut.trim() !== "";

  return (
    <div
      className={`rounded-2xl border border-amber-600/20 dark:border-amber-400/15 bg-amber-500/5 dark:bg-[#0E131F]/90 p-3 sm:p-4 font-sans ${className}`}
      aria-label="Prize pool distribution schedule"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          Prize Distribution {seatCount ? `(${seatCount} Seats)` : ""}
        </h4>
        <span className="text-[11px] text-ink-lo dark:text-text-lo">Authoritative Payout</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
        {/* 1st Place (Gold) */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
              1st
            </span>
            <span className="font-semibold text-ink-hi dark:text-text-hi">Champion</span>
          </div>
          <CoinAmount amount={firstPlace} size="sm" ariaLabel={`First place prize: ${firstPlace} coins`} />
        </div>

        {/* 2nd Place (Silver) */}
        {hasSecond && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-500/10 border border-slate-500/20">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-500/20 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                2nd
              </span>
              <span className="font-medium text-ink-hi dark:text-text-hi">Runner Up</span>
            </div>
            <CoinAmount amount={secondPlace!} size="sm" ariaLabel={`Second place prize: ${secondPlace} coins`} />
          </div>
        )}

        {/* 3rd Place (Bronze) */}
        {hasThird && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 flex items-center justify-center font-bold text-xs">
                3rd
              </span>
              <span className="font-medium text-ink-hi dark:text-text-hi">Third Place</span>
            </div>
            <CoinAmount amount={thirdPlace!} size="sm" ariaLabel={`Third place prize: ${thirdPlace} coins`} />
          </div>
        )}

        {/* World Bank Reserve Cut */}
        {hasWorldBank && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span className="font-medium text-ink-hi dark:text-text-hi">World Bank Reserve</span>
            </div>
            <CoinAmount amount={worldBankCut!} size="sm" ariaLabel={`World bank cut: ${worldBankCut} coins`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PrizeDistribution;
