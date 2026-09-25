import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw, Trophy, X } from "lucide-react";
import { CoinAmount } from "./CoinAmount";
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

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, PAYOUT_BANNER_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [payout.matchId, onDismiss]);

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-1.5rem)] pointer-events-none">
      <motion.div
        role="status"
        aria-live="polite"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.97 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.35, ease: "easeOut" }}
        className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-2xl backdrop-blur-md ${
          isPrize
            ? "border-emerald-500/50 bg-emerald-50/95 dark:bg-emerald-950/90"
            : "border-amber-500/50 bg-amber-50/95 dark:bg-amber-950/90"
        }`}
      >
        <span
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
            isPrize ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-lo dark:text-text-lo">{title}</p>
          <CoinAmount
            amount={payout.amount}
            size="xl"
            className={isPrize ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}
          />
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
  );
}
