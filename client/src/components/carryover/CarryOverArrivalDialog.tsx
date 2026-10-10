import { useId, useRef } from "react";
import { UserRound, Wallet } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { GUEST_UPGRADE_BONUS_COINS } from "@shared/carryover";
import Modal from "../Modal";
import { GoldCoin } from "../faucet/CoinRain";
import { useCountTicker } from "../../hooks/useCountTicker";
import { useCarryOverStore } from "../../store/carryOverStore";

const MODAL_Z = 70;
const COINS_IN_TRANSIT = 5;

/**
 * "Your coins came with you": the one-time moment after a guest signs up and their coins move to
 * the new account.
 *
 * ── Calm on purpose, and honest ───────────────────────────────────────
 * No coin rain here. The coins are held for the standard day before they reach the wallet, so
 * celebrating them as arrived would be untrue; a rain is for coins that have landed. Instead a few
 * coins travel from the guest to the account along a quiet arc, and the words say plainly when they
 * will be in the wallet and what the welcome bonus asks for.
 *
 * Nothing is read from the device: the amount and the hold come from the server's answer.
 */
export function CarryOverArrivalDialog() {
  const arrival = useCarryOverStore((s) => s.arrival);
  const dismiss = useCarryOverStore((s) => s.dismissArrival);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const okRef = useRef<HTMLButtonElement>(null);
  const shown = useCountTicker(arrival?.amount ?? 0, 1_400, Boolean(arrival));

  if (!arrival) return null;

  const held = arrival.vestingUntil !== null;
  const when = held
    ? `They'll be in your wallet by ${new Date(arrival.vestingUntil as number).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}. New coins wait a day first, a short safety check.`
    : "They're already in your wallet.";

  return (
    <Modal open onClose={dismiss} ariaLabelledBy={titleId} initialFocusRef={okRef} mobileSheet zIndex={MODAL_Z} panelClassName="w-full max-w-sm">
      <style>{`
        @keyframes carry-hop {
          0% { transform: translate3d(0, 0, 0) scale(0.7); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translate3d(calc(50% - 10px), -26px, 0) scale(1); }
          85% { opacity: 1; }
          100% { transform: translate3d(calc(100% - 20px), 0, 0) scale(0.7); opacity: 0; }
        }
      `}</style>
      <div className="overflow-hidden rounded-t-3xl border border-[#EEDBCA] bg-[#FFF9EE] pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-700 dark:bg-[#182234] md:rounded-3xl">
        <div className="relative flex h-40 items-center justify-between px-8">
          <span className="flex flex-col items-center gap-1.5">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-200 text-stone-600 dark:bg-slate-700 dark:text-slate-200">
              <UserRound className="h-7 w-7" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold text-stone-600 dark:text-slate-300">Guest</span>
          </span>

          {/* The path the coins take: a few at a time, one after another, never a burst. */}
          <span aria-hidden="true" className="pointer-events-none absolute left-[84px] right-[84px] top-[58px] h-8">
            {!reduceMotion &&
              Array.from({ length: COINS_IN_TRANSIT }, (_, i) => (
                <span
                  key={i}
                  className="absolute left-0 top-0 block w-full will-change-transform"
                  style={{ animation: `carry-hop 2.6s cubic-bezier(0.45, 0, 0.25, 1) ${i * 0.5}s infinite` }}
                >
                  <GoldCoin size={20} />
                </span>
              ))}
          </span>

          <span className="flex flex-col items-center gap-1.5">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/25 text-amber-700 ring-2 ring-amber-500/40 dark:text-amber-300">
              <Wallet className="h-7 w-7" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold text-stone-600 dark:text-slate-300">Your account</span>
          </span>
        </div>

        <div className="px-6 text-center">
          <h2 id={titleId} className="text-xl font-black leading-tight text-[#2B3550] dark:text-slate-100">
            Your coins came with you
          </h2>
          <p className="mt-2 text-5xl font-black leading-none text-amber-600 tabular-nums dark:text-amber-300" aria-label={`${arrival.amount} coins`}>
            {shown.toLocaleString()}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-slate-300" role="status" aria-live="polite">
            {when}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-slate-300">
            Finish one match with friends and a {GUEST_UPGRADE_BONUS_COINS.toLocaleString()}-coin welcome bonus is yours too.
          </p>
        </div>

        <div className="mt-5 px-6">
          <button
            ref={okRef}
            type="button"
            onClick={dismiss}
            className="min-h-[52px] w-full cursor-pointer rounded-2xl bg-amber-500 px-6 text-base font-black text-amber-950 shadow-lg shadow-amber-900/25 transition-colors hover:bg-amber-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default CarryOverArrivalDialog;
