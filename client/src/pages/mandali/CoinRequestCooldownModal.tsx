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
      panelClassName="relative w-full max-w-sm rounded-3xl bg-album-raised border border-album-foil/40 shadow-2xl overflow-hidden p-6 sm:p-7 text-center"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close dialog"
        className="absolute top-4 right-4 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-album-ink3 hover:text-album-ink hover:bg-album-field transition-colors focus-visible:ring-2 focus-visible:ring-album-focus focus-visible:outline-none"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mx-auto w-16 h-16 rounded-2xl bg-album-foilfill/15 border border-album-foil/40 flex items-center justify-center text-album-foil mb-4 shadow-inner">
        {isCoolingDown ? <Clock className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8 text-album-success" />}
      </div>

      <h3 id="cooldown-modal-title" className="text-lg sm:text-xl font-semibold text-album-ink mb-2">
        {isCoolingDown ? "Coin Request Cooldown" : "Cooldown Ended!"}
      </h3>

      <div id="cooldown-modal-desc" className="text-[13px] sm:text-[15px] text-album-ink2 leading-relaxed mb-5">
        {isCoolingDown ? (
          <p>
            You already requested coins. You need to wait for another{" "}
            <strong className="text-album-foil font-bold">{formattedTime}</strong> to make
            another request.
          </p>
        ) : (
          <p className="text-album-success font-semibold">
            Your cooldown has ended! You are now eligible to request {MANDALI_COIN_AMOUNT} coins.
          </p>
        )}
      </div>

      {isCoolingDown ? (
        // role="timer", not a live region: this text changes every second and
        // would otherwise be read out to a screen-reader user every second.
        <div role="timer" className="p-4 rounded-2xl bg-album-foilfill/10 border border-album-foil/40 mb-5">
          <p className="text-[13px] font-bold text-album-foil mb-1">
            Time Remaining
          </p>
          <p className="text-2xl sm:text-3xl font-semibold tabular-nums text-album-foil">
            {formattedTime}
          </p>
          <p className="text-[13px] text-album-ink3 font-medium mt-1">
            {COOLDOWN_HOURS}-Hour Clan Interval
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-album-success/10 border border-album-success/40 mb-5">
          <p className="text-[13px] font-bold text-album-success flex items-center justify-center gap-1.5">
            <Coins className="w-4 h-4" />
            Eligible for {MANDALI_COIN_AMOUNT} coins request
          </p>
        </div>
      )}

      <div className="text-[13px] text-album-ink3 text-left flex items-start gap-2 p-3 rounded-xl bg-album-page border border-album-line mb-6 leading-relaxed">
        <Info className="w-4 h-4 text-album-foil flex-shrink-0 mt-0.5" />
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
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-album-field hover:bg-album-line text-album-ink font-semibold text-[15px] transition-colors focus-visible:ring-2 focus-visible:ring-album-focus focus-visible:outline-none"
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
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-album-foilfill hover:brightness-105 text-album-onfoil font-semibold text-[15px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-album-focus focus-visible:outline-none"
        >
          <Coins className="w-4 h-4" />
          Request {MANDALI_COIN_AMOUNT} Coins Now
        </button>
      )}
    </Modal>
  );
};
