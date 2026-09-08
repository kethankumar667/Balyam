import { CoinAmount, type CoinAmountSize } from "./CoinAmount";

export interface PrizeWonChipProps {
  /** Decimal-string coin amount actually paid for this placement. */
  amount: string;
  size?: CoinAmountSize;
  className?: string;
}

/**
 * A small "won X coins" pill for a result-screen standings row — one
 * consistent look for the prize amount every game's scorecard shows,
 * instead of each modal inventing its own badge. Callers gate rendering
 * (only for paid placements on a SETTLED match) via `winnerPrizesFor` from
 * `useMatchSettlement` — this component trusts the amount it's given.
 */
export default function PrizeWonChip({ amount, size = "sm", className = "" }: PrizeWonChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 ${className}`}
    >
      <CoinAmount amount={amount} size={size} className="text-emerald-700 dark:text-emerald-400" />
    </span>
  );
}
