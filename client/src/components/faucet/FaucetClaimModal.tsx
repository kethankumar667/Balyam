import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Modal from "../Modal";
import { formatCountdown, useFaucetStore } from "../../store/faucetStore";
import { useFaucetCountdown } from "../../hooks/useFaucetCountdown";
import { useCountTicker } from "../../hooks/useCountTicker";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import { CoinRain, GoldCoin } from "./CoinRain";

type Phase = "ready" | "claiming" | "celebrate" | "pending" | "refused";

/** Above the wallet drawer and the header, below the coin rain. */
const MODAL_Z = 70;

const PRIMARY_BUTTON =
  "min-h-[52px] w-full cursor-pointer rounded-2xl bg-amber-500 px-6 text-base font-black text-amber-950 shadow-lg shadow-amber-900/25 transition-colors hover:bg-amber-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2";

/**
 * The free-coins claim, as a moment instead of a button press.
 *
 * Every claim control (the header chip, the home row, the wallet row) only OPENS this; the
 * claim itself happens here, on one clear button. A paid claim answers with coins pouring down
 * the screen, the amount counting up and the next wait starting, so the player sees it land.
 *
 * ── Honest about what happened ────────────────────────────────────────
 * The celebration is shown only when the coins are in the wallet (`paidNow`). A claim the server
 * accepted but has not credited yet says "on their way" quietly, and a refusal says why. The
 * server still decides everything: nothing here reads a clock or an amount from the device.
 */
export function FaucetClaimModal() {
  const open = useFaucetStore((s) => s.isClaimModalOpen);
  const close = useFaucetStore((s) => s.closeClaimModal);
  const claim = useFaucetStore((s) => s.claim);
  const message = useFaucetStore((s) => s.message);
  const { isWaiting, isReady, remainingSeconds, amount } = useFaucetCountdown();
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const focusRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [paid, setPaid] = useState(0);
  const [raining, setRaining] = useState(false);
  const ticked = useCountTicker(paid, 1_200, phase === "celebrate");

  // Every opening starts fresh: a dialog reopened four hours later must not still say "Coins added!".
  useEffect(() => {
    if (!open) return;
    setPhase("ready");
    setPaid(0);
    setRaining(false);
  }, [open]);

  if (!open) return null;

  const handleClaim = async () => {
    if (phase !== "ready" || !isReady) return;
    setPhase("claiming");
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    const result = await claim();
    if (result?.ok && result.paidNow) {
      setPaid(result.amount);
      setPhase("celebrate");
      setRaining(true);
      HapticsManager.trigger("reward");
      AudioManager.play(AUDIO.REWARD_COINS_RAIN);
    } else if (result?.ok) {
      setPhase("pending");
    } else {
      setPhase("refused");
    }
  };

  const celebrating = phase === "celebrate";
  const waitingView = phase === "ready" && isWaiting;

  const title = celebrating
    ? "Coins added!"
    : phase === "pending"
      ? "Claimed"
      : phase === "refused"
        ? "Not this time"
        : waitingView
          ? "Next free coins in"
          : "Your free coins are ready";

  const body = celebrating
    ? isWaiting
      ? `They're in your wallet. Next free coins in ${formatCountdown(remainingSeconds)}.`
      : "They're in your wallet."
    : phase === "pending"
      ? "Your free coins are on their way."
      : phase === "refused"
        ? (message ?? "Free coins are temporarily unavailable. Try again in a moment.")
        : waitingView
          ? "Come back when the timer reaches zero."
          : `${amount} coins, every 4 hours. They're yours to spend on any table.`;

  return (
    <>
      {raining && <CoinRain onDone={() => setRaining(false)} />}
      <Modal
        open
        onClose={close}
        ariaLabelledBy={titleId}
        initialFocusRef={focusRef}
        mobileSheet
        zIndex={MODAL_Z}
        panelClassName="w-full max-w-sm"
      >
        <div className="overflow-hidden rounded-t-3xl border border-[#EEDBCA] bg-[#FFF9EE] pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-700 dark:bg-[#182234] md:rounded-3xl">
          {/* The stage: a warm pool of light under the coin, with two slow rings while a claim waits to be taken. */}
          <div className="relative flex h-52 items-center justify-center bg-[radial-gradient(closest-side_at_50%_52%,rgba(245,183,46,0.45),rgba(245,183,46,0)_100%)]">
            {phase === "ready" && isReady && !reduceMotion && (
              <>
                <span aria-hidden="true" className="absolute h-36 w-36 rounded-full border-2 border-amber-400/60 motion-safe:animate-ping" />
                <span aria-hidden="true" className="absolute h-44 w-44 rounded-full border border-amber-400/30 motion-safe:animate-ping [animation-delay:600ms]" />
              </>
            )}
            <motion.div
              initial={reduceMotion ? false : { scale: 0.6, opacity: 0, rotate: -12 }}
              animate={
                celebrating && !reduceMotion
                  ? { scale: [1, 1.22, 1], opacity: 1, rotate: 0 }
                  : { scale: 1, opacity: 1, rotate: 0, y: !reduceMotion && phase === "ready" ? [0, -6, 0] : 0 }
              }
              transition={
                celebrating
                  ? { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                  : { duration: phase === "ready" ? 3.2 : 0.5, ease: "easeInOut", repeat: phase === "ready" && !reduceMotion ? Infinity : 0 }
              }
              className="drop-shadow-[0_10px_18px_rgba(120,70,0,0.35)]"
            >
              <GoldCoin size={124} />
            </motion.div>
          </div>

          <div className="px-6 pt-2 text-center">
            <h2 id={titleId} className="text-xl font-black leading-tight text-[#2B3550] dark:text-slate-100">
              {title}
            </h2>

            {(celebrating || phase === "ready") && (
              <p className="mt-2 text-5xl font-black leading-none text-amber-600 tabular-nums dark:text-amber-300" aria-hidden={waitingView}>
                {waitingView ? formatCountdown(remainingSeconds) : celebrating ? `+${ticked}` : `+${amount}`}
              </p>
            )}

            <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-slate-300" role="status" aria-live="polite">
              {body}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 px-6">
            {phase === "ready" && !waitingView && (
              <>
                <button ref={focusRef} type="button" onClick={() => void handleClaim()} className={PRIMARY_BUTTON}>
                  Claim {amount} coins
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="min-h-[44px] w-full cursor-pointer rounded-2xl px-6 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-200/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-slate-300 dark:hover:bg-slate-700/60"
                >
                  Not now
                </button>
              </>
            )}
            {phase === "claiming" && (
              <button ref={focusRef} type="button" aria-disabled="true" className="min-h-[52px] w-full cursor-default rounded-2xl bg-amber-500/60 px-6 text-base font-black text-amber-950">
                Claiming…
              </button>
            )}
            {(celebrating || phase === "pending" || phase === "refused" || waitingView) && (
              <button ref={focusRef} type="button" onClick={close} className={PRIMARY_BUTTON}>
                {celebrating ? "Done" : "Close"}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

export default FaucetClaimModal;
