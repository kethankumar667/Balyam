import { Lock } from "lucide-react";
import { AshthaKonaCoinIcon } from "./CoinAmount";
import {
  RUMMY_POINT_RATES,
  RUMMY_STAKE_BASE_POINTS,
  rummyRateForStakeCoins,
  rummyStakeCoinsForRate,
} from "@shared/rummy-economy";

export interface RummyRatePickerProps {
  /** The current per-seat stake in coins — one of the Rummy tiers (80 … 1280). */
  value: number;
  onChange: (stakeCoins: number) => void;
  /** A guest hosts only the 1-point table; the higher rates show locked. */
  isGuest?: boolean;
  className?: string;
}

const coinsLabel = (rate: number): string => `${rate} coin${rate === 1 ? "" : "s"}`;

/**
 * Rummy's stake is not a free coin amount: the host picks a POINT RATE and every seat pays
 * `80 × rate`. This is the one control for that, used both when creating a table and when
 * the host changes it in the lobby, so the two can never disagree about what a tier means.
 *
 * The value it reads and writes is still a plain per-seat coin count, so the rest of the
 * economy (quote, debit, settle) needs to know nothing about rates.
 */
export default function RummyRatePicker({ value, onChange, isGuest = false, className = "" }: RummyRatePickerProps) {
  const selectedRate = rummyRateForStakeCoins(value);

  return (
    <div className={`space-y-2 ${className}`}>
      <div role="radiogroup" aria-label="Rummy point rate" className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {RUMMY_POINT_RATES.map((rate) => {
          const stake = rummyStakeCoinsForRate(rate);
          const isSelected = selectedRate === rate;
          const isLocked = isGuest && rate > 1;
          return (
            <button
              key={rate}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isLocked}
              onClick={() => onChange(stake)}
              className={`relative p-2.5 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer active:scale-[0.97] flex flex-col justify-between min-h-[64px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isSelected
                  ? "bg-gradient-to-b from-chest-600 to-chest-700 border-chest-700 text-white shadow-[0_6px_16px_-4px_rgba(199,78,2,0.55)] dark:shadow-[0_6px_18px_-4px_rgba(251,191,36,0.35)]"
                  : isLocked
                  ? "bg-sand-100/70 dark:bg-slate-800/40 border-sand-200 dark:border-slate-800 text-sand-400 dark:text-slate-600 opacity-70 cursor-not-allowed"
                  : "bg-sand-100 dark:bg-[#161D2B] border-sand-300 dark:border-slate-700/70 text-sand-800 dark:text-slate-200 hover:border-chest-500/60 hover:bg-sand-200/60"
              }`}
            >
              <span className="flex items-center justify-between w-full">
                <span className={`font-black text-sm ${isSelected ? "text-white" : "text-sand-800 dark:text-slate-100"}`}>
                  1 pt = {coinsLabel(rate)}
                </span>
                {isLocked ? <Lock className="w-3 h-3 text-sand-400" aria-label="Sign in to unlock higher rates" /> : null}
              </span>
              <span
                className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${
                  isSelected ? "text-amber-100" : "text-sand-600 dark:text-slate-400"
                }`}
              >
                <AshthaKonaCoinIcon size={12} />
                <span className="tabular-nums">{stake.toLocaleString()} / seat</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] leading-snug text-sand-600 dark:text-slate-400 font-medium">
        Every seat puts in {RUMMY_STAKE_BASE_POINTS} points at this rate. The winner takes the whole pot — no platform fee, in
        every Rummy mode.
        {isGuest ? " Guest hosts can play the 1-point table; sign in to unlock higher rates." : ""}
      </p>
    </div>
  );
}
