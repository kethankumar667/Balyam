import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Trophy, Lock, Sparkles, CheckCircle2, ChevronDown, ChevronUp, ShieldCheck, Landmark, Loader2, HelpCircle } from "lucide-react";
import { deriveLobbyEconomyPreview, type LobbyLockPhase } from "../../lib/lobbyEconomy";
import type { MatchCheckoutQuote } from "../../lib/economyApi";
import { AshthaKonaCoinIcon, CoinAmount } from "./CoinAmount";

export interface LobbyPrizePoolProps {
  seatCount: number;
  readyCount: number;
  allReady: boolean;
  /**
   * The authoritative, server-quoted checkout figures for the current seat
   * count — the SAME quote `CheckoutSheet.tsx` uses (`POST
   * /api/economy/checkout/quote`). `null` while loading, or when the
   * server has no schedule for this seat count; this component never
   * computes a substitute for either case.
   */
  quote: MatchCheckoutQuote | null;
  isQuoteLoading?: boolean;
  /**
   * `"idle"` — no commitment attempted yet. `"securing"` — a commit is in
   * flight but NOT yet confirmed by the server. `"locked"` — the server
   * has confirmed the wallet debit actually succeeded. See
   * `deriveLobbyLockPhase` in `lib/lobbyEconomy.ts`; this component never
   * infers "locked" on its own, it only renders what it's told.
   */
  lockPhase?: LobbyLockPhase;
  isHost?: boolean;
  className?: string;
}

/**
 * LobbyPrizePool Component (Phase 7F).
 *
 * Renders the live, reactive table stakes and prize distribution preview in
 * the room lobby, using ONLY the authoritative server quote passed in via
 * `quote` — no local seat-cost constant, no local prize-schedule table, no
 * formula for any seat count. When no quote is available yet or ever (an
 * unsupported seat count), this renders an honest "UNAVAILABLE" state and
 * omits the prize breakdown entirely, rather than guessing.
 *
 * `lockPhase` is driven by the caller from `RoomPublicState.currentMatchId`
 * (populated only once `commitMatchEntry` has actually succeeded), never
 * from "Start Game was clicked" alone — see `deriveLobbyLockPhase`.
 */
export const LobbyPrizePool: React.FC<LobbyPrizePoolProps> = ({
  seatCount,
  readyCount,
  allReady,
  quote,
  isQuoteLoading = false,
  lockPhase = "idle",
  isHost = false,
  className = "",
}) => {
  const reduceMotion = useReducedMotion();
  const [showDetails, setShowDetails] = useState(false);

  const preview = useMemo(() => deriveLobbyEconomyPreview(quote, isQuoteLoading), [quote, isQuoteLoading]);

  const isFreePractice = preview.totalPot === "0" || quote?.totalCommitment === "0" || quote?.costPerSeat === "0";
  const isLocked = lockPhase === "locked";
  const isSecuring = lockPhase === "securing";
  const isUnavailable = !isFreePractice && preview.status === "unavailable";
  const isLoading = !isFreePractice && preview.status === "loading";

  const hasSecond = preview.secondPlace !== null && preview.secondPlace !== "0";
  const hasThird = preview.thirdPlace !== null && preview.thirdPlace !== "0";

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
      className={`relative rounded-3xl border transition-all duration-300 overflow-hidden shadow-md select-none ${
        isLocked
          ? "bg-gradient-to-b from-amber-500/20 via-stone-900/90 to-stone-950 border-amber-400 ring-2 ring-amber-400/40"
          : isSecuring
          ? "bg-gradient-to-b from-amber-500/15 via-[#FFFDF8] to-[#FFF8EE] dark:from-amber-900/30 dark:via-[#131926] dark:to-[#0F1420] border-amber-400/70 dark:border-amber-500/50 ring-2 ring-amber-400/20 animate-pulse"
          : allReady
          ? "bg-gradient-to-b from-emerald-500/10 via-[#FFFDF8] to-[#FFF8EE] dark:from-emerald-950/40 dark:via-[#131926] dark:to-[#0F1420] border-emerald-500/70 dark:border-emerald-500/50 ring-2 ring-emerald-500/20"
          : "bg-gradient-to-b from-amber-500/10 via-[#FFFDF8] to-[#FFF8EE] dark:from-amber-950/30 dark:via-[#131926] dark:to-[#0F1420] border-[#EEDBCA] dark:border-slate-800"
      } p-4 sm:p-5 ${className}`}
      role="region"
      aria-label={regionLabel}
    >
      {/* Invisible live region for screen readers */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </span>

      {/* Ambient background aura */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-opacity duration-500 ${
          isLocked
            ? "bg-amber-400/30 opacity-100"
            : isSecuring
            ? "bg-amber-400/25 opacity-90"
            : allReady
            ? "bg-emerald-500/20 opacity-80"
            : "bg-amber-500/15 opacity-60"
        }`}
        aria-hidden="true"
      />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-xs ${
              isFreePractice
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : isLocked
                ? "bg-amber-400 text-stone-950"
                : isSecuring
                ? "bg-amber-400/80 text-stone-950"
                : allReady
                ? "bg-emerald-500 text-white"
                : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
            }`}
          >
            {isFreePractice ? (
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : isLocked ? (
              <Lock className="w-4 h-4" aria-hidden="true" />
            ) : isSecuring ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : isUnavailable ? (
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
            ) : allReady ? (
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Trophy className="w-4 h-4" aria-hidden="true" />
            )}
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200/90 flex items-center gap-1.5">
              <span>{isFreePractice ? "Bot Practice Table" : "Match Prize Pool"}</span>
              {!isLocked && !isSecuring && (
                <span className="text-[10px] font-bold text-ink-lo dark:text-text-lo lowercase">
                  ({seatCount} seat{seatCount > 1 ? "s" : ""})
                </span>
              )}
            </h2>
            <p className="text-[10px] text-ink-lo dark:text-text-lo">
              {isFreePractice
                ? "Free practice against AI bots · No coins charged"
                : isLocked
                ? "Authoritative table stakes secured"
                : isSecuring
                ? "Confirming table commitment…"
                : isUnavailable
                ? "No approved payout schedule for this table size"
                : allReady
                ? "All players ready for launch"
                : "Stakes accumulate as seats fill"}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isFreePractice ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300/60 dark:border-emerald-700/50 rounded-full px-2.5 py-0.5">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Free Play · {readyCount}/{seatCount} Ready</span>
            </span>
          ) : isLocked ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 dark:text-amber-200 bg-amber-400/20 dark:bg-amber-400/15 border border-amber-400/50 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
              <Lock className="w-3 h-3" />
              <span>Locked In Play</span>
            </span>
          ) : isSecuring ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-400/15 dark:bg-amber-400/10 border border-amber-400/40 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Securing Table</span>
            </span>
          ) : allReady ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 rounded-full px-2.5 py-0.5 uppercase tracking-wider animate-pulse">
              <CheckCircle2 className="w-3 h-3" />
              <span>All Ready</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300/60 dark:border-amber-700/50 rounded-full px-2.5 py-0.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{readyCount}/{seatCount} Ready</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Prize Pool Number Plate */}
      <div className="flex items-baseline justify-between p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-[#EEDBCA]/80 dark:border-slate-800 shadow-inner mb-3">
        <div className="flex items-center gap-2">
          <AshthaKonaCoinIcon size={26} className="text-amber-500 drop-shadow-xs shrink-0" />
          {isFreePractice ? (
            <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
              Free (0 Coins)
            </span>
          ) : isUnavailable ? (
            <span className="text-base sm:text-lg font-black text-ink-lo dark:text-text-lo tracking-tight uppercase">
              Unavailable
            </span>
          ) : preview.totalPot !== null ? (
            <motion.span
              key={`pool-amt-${preview.totalPot}`}
              initial={reduceMotion ? false : { scale: 0.85, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className="text-2xl sm:text-3xl font-black text-ink-hi dark:text-text-hi tabular-nums tracking-tight"
            >
              {preview.totalPot}
            </motion.span>
          ) : (
            <span
              className="h-7 w-20 rounded-lg bg-[#EEDBCA]/60 dark:bg-slate-700/50 animate-pulse"
              aria-hidden="true"
            />
          )}
          {!isUnavailable && !isFreePractice && preview.totalPot !== null && (
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Coins</span>
          )}
        </div>

        {!isUnavailable && !isFreePractice && (
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            disabled={preview.totalPot === null}
            aria-label="Toggle prize schedule breakdown"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 bg-amber-100/60 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300/50 dark:border-amber-700/40 rounded-xl px-2.5 py-1.5 transition active:scale-95 cursor-pointer min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-expanded={showDetails}
            aria-controls="prize-schedule-breakdown"
            title="Toggle prize schedule breakdown"
          >
            <span>Payouts</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Payout Schedule Breakdown Grid — only ever rendered from a real quote */}
      {!isUnavailable && !isFreePractice && preview.totalPot !== null && (
        <div
          id="prize-schedule-breakdown"
          className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs transition-all duration-200 ${
            showDetails ? "block" : "hidden sm:grid"
          }`}
        >
          {/* 1st Place */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center font-extrabold text-[10px]">
                1st
              </span>
              <span className="font-semibold text-ink-hi dark:text-text-hi">1st Place</span>
            </div>
            <CoinAmount amount={preview.firstPlace ?? "0"} size="sm" ariaLabel={`First place prize: ${preview.firstPlace} coins`} />
          </div>

          {/* 2nd Place */}
          {hasSecond && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-500/10 border border-slate-500/20">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-500/20 text-slate-700 dark:text-slate-300 flex items-center justify-center font-extrabold text-[10px]">
                  2nd
                </span>
                <span className="font-medium text-ink-hi dark:text-text-hi">2nd Place</span>
              </div>
              <CoinAmount amount={preview.secondPlace ?? "0"} size="sm" ariaLabel={`Second place prize: ${preview.secondPlace} coins`} />
            </div>
          )}

          {/* 3rd Place */}
          {hasThird && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 flex items-center justify-center font-extrabold text-[10px]">
                  3rd
                </span>
                <span className="font-medium text-ink-hi dark:text-text-hi">3rd Place</span>
              </div>
              <CoinAmount amount={preview.thirdPlace ?? "0"} size="sm" ariaLabel={`Third place prize: ${preview.thirdPlace} coins`} />
            </div>
          )}

          {/* World Bank Reserve Cut */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span className="font-medium text-ink-hi dark:text-text-hi">Platform Reserve</span>
            </div>
            <CoinAmount amount={preview.worldBankCut ?? "0"} size="sm" ariaLabel={`Platform reserve cut: ${preview.worldBankCut} coins`} />
          </div>
        </div>
      )}

      {isUnavailable && (
        <p className="text-[11px] text-ink-lo dark:text-text-lo">
          This table size doesn't have an approved prize schedule yet. Reduce the seat count to see live stakes.
        </p>
      )}

      {/* Footer Host Note */}
      {isHost && !isLocked && !isSecuring && (!isUnavailable || isFreePractice) && (preview.totalPot !== null || isFreePractice) && (
        <div className="mt-3 pt-2.5 border-t border-[#EEDBCA]/60 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-[#8A6D4B] dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          {isFreePractice ? (
            <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
              Playing with bots is free — no coins will be deducted from your wallet.
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
