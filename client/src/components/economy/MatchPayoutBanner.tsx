import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw, Trophy, X } from "lucide-react";
import { CoinAmount } from "./CoinAmount";
import { CoinRain, GoldCoin } from "../faucet/CoinRain";
import { useCountTicker } from "../../hooks/useCountTicker";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import type { MatchPayout } from "../../hooks/useMatchPayout";

/** Long enough to read a number and glance at the wallet chip, short enough not to nag. */
export const PAYOUT_BANNER_VISIBLE_MS = 8000;

export interface MatchPayoutBannerProps {
  payout: MatchPayout;
  onDismiss: () => void;
}

const COPY: Record<MatchPayout["kind"], { title: string; detail: string }> = {
  prize: { title: "You won", detail: "Added to your wallet" },
  refund: { title: "Entry fee refunded", detail: "Returned to your wallet" },
};

/**
 * The one place a player is told, in words, that coins just landed in their wallet.
 *
 * Every game ends differently — its own scorecard, the generic result modal, a Ludo end
 * card — and each of those only shows the prize if it is open and can rank the seats. This
 * banner does not depend on any of them: it is fed by the wallet ledger and floats above
 * whatever is on screen (z-[60], over the z-50 modals), so a payout is never silent.
 * Non-blocking by design — it never takes focus and clears itself.
 */
export default function MatchPayoutBanner({ payout, onDismiss }: MatchPayoutBannerProps) {
  const reduceMotion = useReducedMotion();
  const { title, detail } = COPY[payout.kind];
  const isPrize = payout.kind === "prize";
  const Icon = isPrize ? Trophy : RotateCcw;

  // The count-up is for a real prize only, and only while the number is exactly representable;
  // a larger one is shown as the server wrote it rather than rounded on the way up.
  const numeric = Number(payout.amount);
  const canCount = isPrize && Number.isSafeInteger(numeric);
  const ticked = useCountTicker(numeric, 1_300, canCount);
  const shown = canCount ? String(ticked) : payout.amount;

  // Coins pour once per payout, and only when coins really arrived: a refund is returned money, not a win.
  const [raining, setRaining] = useState(isPrize);
  useEffect(() => {
    setRaining(isPrize);
    if (!isPrize) return;
    HapticsManager.trigger("reward");
    AudioManager.play(AUDIO.REWARD_COINS_RAIN);
  }, [payout.matchId, isPrize]);

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, PAYOUT_BANNER_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [payout.matchId, onDismiss]);

  return (
    <>
      {raining && <CoinRain key={payout.matchId} onDone={() => setRaining(false)} />}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-1.5rem)] pointer-events-none">
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -22, scale: 0.94 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-2xl backdrop-blur-md ${
            isPrize
              ? "border-amber-500/60 bg-amber-50/95 shadow-amber-900/30 dark:bg-amber-950/90"
              : "border-amber-500/40 bg-amber-50/95 dark:bg-amber-950/90"
          }`}
        >
          {isPrize ? (
            <motion.span
              aria-hidden="true"
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center drop-shadow-[0_4px_8px_rgba(120,70,0,0.35)]"
              animate={reduceMotion ? undefined : { rotate: [-8, 8, -8], y: [0, -2, 0] }}
              transition={reduceMotion ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <GoldCoin size={44} />
            </motion.span>
          ) : (
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black leading-tight text-ink-hi dark:text-text-hi">{title}</p>
            <CoinAmount amount={shown} size="xl" showIcon={!isPrize} className="tabular-nums text-amber-700 dark:text-amber-300" ariaLabel={`${payout.amount} coins`} />
            <p className="text-xs text-ink-mid dark:text-text-mid">{detail}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss payout notice"
            className="-m-1 flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-lo hover:bg-black/5 dark:text-text-lo dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      </div>
    </>
  );
}
