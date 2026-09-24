/**
 * BHALYAM Mandali — Coin Request Cooldown Modal
 *
 * Shown when a member taps "Request Coins" while still inside the 4-hour
 * request window. Explains the wait with a live countdown. (When they ARE
 * eligible the request is sent instantly and this never opens.)
 *
 * Built on the shared `Modal`, which provides the focus trap, focus
 * restoration, Escape and backdrop handling.
 *
 * Requirements:
 * - Strictly NO Sparkles icon from lucide-react.
 * - Dual theme support (light and dark).
 * - 44x44px touch targets.
 */

import React, { useRef } from "react";
import { Clock, Coins, Info, X, CheckCircle2 } from "lucide-react";
import Modal from "../../components/Modal";
import { useCountdown } from "../../hooks/useCountdown";
import { formatCountdown } from "../../lib/formatCountdown";
import { MANDALI_COIN_AMOUNT, MANDALI_COIN_REQUEST_COOLDOWN_MS } from "@shared/mandali/coinRules.js";

export interface CoinRequestCooldownModalProps {
  cooldownEndsAt: number | null;
  onClose: () => void;
  onRequestCoins?: () => void;
}

const COOLDOWN_HOURS = MANDALI_COIN_REQUEST_COOLDOWN_MS / (60 * 60 * 1000);

export const CoinRequestCooldownModal: React.FC<CoinRequestCooldownModalProps> = ({
  cooldownEndsAt,
  onClose,
  onRequestCoins,
}) => {
  const cooldownRemainingMs = useCountdown(cooldownEndsAt);
  const isCoolingDown = cooldownRemainingMs > 0;
  const formattedTime = formatCountdown(cooldownRemainingMs);
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabelledBy="cooldown-modal-title"
      ariaDescribedBy="cooldown-modal-desc"
      initialFocusRef={primaryActionRef}
      panelClassName="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-2xl overflow-hidden p-6 sm:p-7 text-center"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close dialog"
        className="absolute top-4 right-4 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
        {isCoolingDown ? <Clock className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
      </div>

      <h3 id="cooldown-modal-title" className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-2">
        {isCoolingDown ? "Coin Request Cooldown" : "Cooldown Ended!"}
      </h3>

      <div id="cooldown-modal-desc" className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
        {isCoolingDown ? (
          <p>
            You already requested coins. You need to wait for another{" "}
            <strong className="text-amber-600 dark:text-amber-400 font-bold font-mono">{formattedTime}</strong> to make
            another request.
          </p>
        ) : (
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Your cooldown has ended! You are now eligible to request {MANDALI_COIN_AMOUNT} coins.
          </p>
        )}
      </div>

      {isCoolingDown ? (
        // role="timer", not a live region: this text changes every second and
        // would otherwise be read out to a screen-reader user every second.
        <div role="timer" className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 mb-5">
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
            Time Remaining
          </p>
          <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-300">
            {formattedTime}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {COOLDOWN_HOURS}-Hour Clan Interval
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-5">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5">
            <Coins className="w-4 h-4" />
            Eligible for {MANDALI_COIN_AMOUNT} coins request
          </p>
        </div>
      )}

      <div className="text-[11px] text-slate-500 dark:text-slate-400 text-left flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 mb-6 leading-relaxed">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <span>
          Coin requests are fixed at {MANDALI_COIN_AMOUNT} coins once every {COOLDOWN_HOURS} hours to keep the clan
          economy balanced and fair for all members.
        </span>
      </div>

      {isCoolingDown ? (
        <button
          ref={primaryActionRef}
          type="button"
          onClick={onClose}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-sm transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          Got it
        </button>
      ) : (
        <button
          ref={primaryActionRef}
          type="button"
          onClick={() => {
            onRequestCoins?.();
            onClose();
          }}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <Coins className="w-4 h-4" />
          Request {MANDALI_COIN_AMOUNT} Coins Now
        </button>
      )}
    </Modal>
  );
};
