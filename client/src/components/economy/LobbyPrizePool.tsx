import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Trophy,
  Lock,
  ChevronRight,
  ChevronUp,
  ShieldCheck,
  Landmark,
  PieChart,
  Coins,
  HelpCircle,
} from "lucide-react";
import { deriveLobbyEconomyPreview, type LobbyLockPhase } from "../../lib/lobbyEconomy";
import type { MatchCheckoutQuote } from "../../lib/economyApi";
import { AshthaKonaCoinIcon, CoinAmount } from "./CoinAmount";

export interface LobbyPrizePoolProps {
  seatCount: number;
  readyCount: number;
  allReady: boolean;
  quote: MatchCheckoutQuote | null;
  isQuoteLoading?: boolean;
  lockPhase?: LobbyLockPhase;
  isHost?: boolean;
  entryStakeCoins?: number;
  canChangeStake?: boolean;
  onChangeStake?: () => void;
  stakeLockedReason?: string | null;
  className?: string;
}

export const LobbyPrizePool: React.FC<LobbyPrizePoolProps> = ({
  seatCount,
  readyCount,
  allReady,
  quote,
  isQuoteLoading = false,
  lockPhase = "idle",
  isHost = false,
  entryStakeCoins,
  canChangeStake = false,
  onChangeStake,
  stakeLockedReason = null,
  className = "",
}) => {
  const reduceMotion = useReducedMotion();
  const [showDetails, setShowDetails] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const preview = useMemo(() => deriveLobbyEconomyPreview(quote, isQuoteLoading), [quote, isQuoteLoading]);

  const isFreePractice = preview.totalPot === "0" || quote?.totalCommitment === "0" || quote?.costPerSeat === "0";
  const isLocked = lockPhase === "locked";
  const isSecuring = lockPhase === "securing";
  const isUnavailable = !isFreePractice && preview.status === "unavailable";
  const isLoading = !isFreePractice && preview.status === "loading";

  const hasSecond = preview.secondPlace !== null && preview.secondPlace !== "0";
  const hasThird = preview.thirdPlace !== null && preview.thirdPlace !== "0";

  const currentStake = entryStakeCoins ?? (quote?.costPerSeat ? Number(quote.costPerSeat) : 100);

  // Accessible live announcement text for screen readers
  const liveAnnouncement = useMemo(() => {
    if (isFreePractice) {
      return `Bot practice table. Free practice against AI bots with no coins charged. ${readyCount} of ${seatCount} ready.`;
    }
    if (isLocked) {
      return `Match prize pool locked at ${preview.totalPot} coins. Starting game.`;
    }
    if (isSecuring) {
      return "Securing table commitment. Please wait.";
    }
    if (isUnavailable) {
      return "Match prize pool is currently unavailable for this table size.";
    }
    if (isLoading) {
      return "Calculating match prize pool.";
    }
    if (allReady) {
      return `All ${seatCount} players are ready. Projected match prize pool is ${preview.totalPot} coins.`;
    }
    return `Table prize pool is currently ${preview.totalPot} coins for ${seatCount} seats. ${readyCount} of ${seatCount} players ready.`;
  }, [isFreePractice, isLocked, isSecuring, isUnavailable, isLoading, allReady, preview.totalPot, seatCount, readyCount]);

  const regionLabel = isFreePractice
    ? "Bot practice table: free practice match"
    : isUnavailable
    ? "Match prize pool: unavailable"
    : preview.totalPot !== null
    ? `Match prize pool: ${preview.totalPot} coins`
    : "Match prize pool: calculating";

  return (
    <div
      id="lobby-prize-pool-card"
      data-pot-target="true"
      className={`bg-white dark:bg-[#131926] border border-stone-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4.5 lg:p-4 shadow-xs select-none space-y-2.5 sm:space-y-3 ${className}`}
      role="region"
      aria-label={regionLabel}
    >
      {/* Invisible live region for screen readers */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </span>

      {/* Header Row */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
            <Trophy className="w-5 h-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#2B3550] dark:text-slate-200 flex items-center gap-1.5">
              <span>{isFreePractice ? "BOT PRACTICE TABLE" : "MATCH ENTRY & PRIZE POOL"}</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400 font-medium truncate">
              {isFreePractice
                ? "Free practice against AI bots • No coins charged"
                : `Each player contributes ${currentStake} coins • Stakes collected on game start`}
            </p>
          </div>
        </div>

        {/* How It Works Button */}
        <button
          type="button"
          onClick={() => setShowHowItWorks((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200/90 dark:border-slate-700 text-xs font-bold text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer shadow-2xs"
          aria-expanded={showHowItWorks}
        >
          <HelpCircle size={14} className="text-stone-400" />
          <span>How it works?</span>
        </button>
      </div>

      {/* How it works collapsible notice */}
      {showHowItWorks && (
        <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-700/50 text-xs text-amber-900 dark:text-amber-200 space-y-1 animate-in fade-in">
          <p className="font-bold">How table entry stakes work:</p>
          <p className="text-stone-600 dark:text-stone-300">
            When the host starts the match, each player contributes {currentStake} coins to the pool.
            The total pool is awarded to the top players according to the prize schedule. Bot practice matches are 100% free.
          </p>
        </div>
      )}

      {/* 3-Column Subcard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Col 1: Entry Stake */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-stone-50/80 dark:bg-slate-900/60 border border-stone-200/70 dark:border-slate-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 shrink-0">
              <Coins size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-black text-[#2B3550] dark:text-slate-100 truncate">
                {isFreePractice ? "Free" : `${currentStake} coins`}
              </div>
              <div className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                per player (entry)
              </div>
            </div>
          </div>

          {/* Host Change Stake Action */}
          {isHost && !isLocked && !isSecuring && !isFreePractice && (
            canChangeStake ? (
              <button
                type="button"
                onClick={onChangeStake}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 border border-amber-300/70 dark:border-amber-700/60 rounded-full px-2.5 py-1 transition cursor-pointer active:scale-95 shrink-0"
                title="Change table entry stake"
              >
                <span>✏️ Change</span>
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/60 rounded-full px-2 py-0.5 shrink-0"
                title={stakeLockedReason ?? "Bet cannot be changed right now"}
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Locked</span>
              </span>
            )
          )}
        </div>

        {/* Col 2: Current Prize Pool */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-stone-50/80 dark:bg-slate-900/60 border border-stone-200/70 dark:border-slate-800 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
            <AshthaKonaCoinIcon size={22} className="text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-black text-[#2B3550] dark:text-slate-100 truncate flex items-center gap-1">
              {isFreePractice ? (
                <span>0 coins</span>
              ) : preview.totalPot !== null ? (
                <motion.span
                  key={`pot-val-${preview.totalPot}`}
                  initial={reduceMotion ? false : { scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="tabular-nums"
                >
                  {preview.totalPot} coins
                </motion.span>
              ) : (
                <span className="h-5 w-14 bg-stone-200 dark:bg-slate-700 rounded animate-pulse inline-block" />
              )}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
              current prize pool • {seatCount} joined
            </div>
          </div>
        </div>

        {/* Col 3: Payouts */}
        <div
          onClick={() => setShowDetails((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowDetails((prev) => !prev);
            }
          }}
          aria-expanded={showDetails}
          className="p-3 sm:p-3.5 rounded-2xl bg-stone-50/80 dark:bg-slate-900/60 border border-stone-200/70 dark:border-slate-800 hover:border-amber-300 dark:hover:border-slate-700 transition flex items-center justify-between gap-2.5 cursor-pointer active:scale-98 group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-100/70 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center shrink-0">
              <PieChart size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-black text-[#2B3550] dark:text-slate-100 flex items-center gap-1">
                <span>Payouts</span>
                <ChevronRight size={15} className={`text-stone-400 transition-transform ${showDetails ? "rotate-90" : ""}`} />
              </div>
              <div className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                View prize distribution
              </div>
            </div>
          </div>

          <div className="text-stone-400 group-hover:text-amber-600 transition-colors">
            {showDetails ? <ChevronUp size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>
      </div>

      {/* Payout Schedule Breakdown Grid — expanded when toggled */}
      {!isUnavailable && !isFreePractice && preview.totalPot !== null && (
        <div
          id="prize-schedule-breakdown"
          className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs transition-all duration-200 pt-1 ${
            showDetails ? "block" : "hidden"
          }`}
        >
          {/* 1st Place */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center font-black text-[10px]">
                1st
              </span>
              <span className="font-bold text-ink-hi dark:text-text-hi">1st Place</span>
            </div>
            <CoinAmount amount={preview.firstPlace ?? "0"} size="sm" ariaLabel={`First place prize: ${preview.firstPlace} coins`} />
          </div>

          {/* 2nd Place */}
          {hasSecond && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-500/10 border border-slate-500/20">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-500/20 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black text-[10px]">
                  2nd
                </span>
                <span className="font-medium text-ink-hi dark:text-text-hi">2nd Place</span>
              </div>
              <CoinAmount amount={preview.secondPlace ?? "0"} size="sm" ariaLabel={`Second place prize: ${preview.secondPlace} coins`} />
            </div>
          )}

          {/* 3rd Place */}
          {hasThird && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 flex items-center justify-center font-black text-[10px]">
                  3rd
                </span>
                <span className="font-medium text-ink-hi dark:text-text-hi">3rd Place</span>
              </div>
              <CoinAmount amount={preview.thirdPlace ?? "0"} size="sm" ariaLabel={`Third place prize: ${preview.thirdPlace} coins`} />
            </div>
          )}

          {/* World Bank Reserve Cut */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span className="font-medium text-ink-hi dark:text-text-hi">Platform Reserve</span>
            </div>
            <CoinAmount amount={preview.worldBankCut ?? "0"} size="sm" ariaLabel={`Platform reserve cut: ${preview.worldBankCut} coins`} />
          </div>
        </div>
      )}

      {/* Host Stake Notice */}
      {isHost && !isLocked && !isSecuring && (!isUnavailable || isFreePractice) && (preview.totalPot !== null || isFreePractice) && (
        <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-stone-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          {isFreePractice ? (
            <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
              Playing with bots is free — no coins will be deducted.
            </span>
          ) : (
            <span>
              Host sponsors table commitment (<span className="font-bold text-amber-700 dark:text-amber-300">🪙 {preview.totalPot}</span>) upon starting the match.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
