import React, { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw, ShieldCheck, ArrowRight } from "lucide-react";
import { CoinDelta } from "../CoinDelta";
import { formatCoinString } from "../CoinAmount";
import type { MatchRefundMotionPayload } from "./types";

export interface RefundSequenceProps {
  payload: MatchRefundMotionPayload;
  onComplete?: () => void;
  className?: string;
}

/**
 * Refund Reversal Motion Sequence (Motion Chapter 4).
 * Employs calm sky/blue-gold styling to clearly distinguish refunds from victory celebrations.
 * Reverses coin path back to host wallet and announces the exact restored balance.
 */
export const RefundSequence: React.FC<RefundSequenceProps> = ({
  payload,
  onComplete,
  className = "",
}) => {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onComplete?.();
    }, reduceMotion ? 400 : 1500);

    return () => window.clearTimeout(timer);
  }, [reduceMotion, onComplete]);

  const formattedAmount = formatCoinString(payload.refundAmount);

  return (
    <motion.div
      initial={!reduceMotion ? { scale: 0.9, opacity: 0 } : undefined}
      animate={{ scale: 1, opacity: 1 }}
      className={`p-5 rounded-3xl border border-sky-500/30 bg-gradient-to-b from-sky-500/10 via-sky-950/20 to-black/30 backdrop-blur-md shadow-xl text-center space-y-3.5 ${className}`}
      role="alert"
      aria-live="polite"
      aria-label={`Match entry refunded: ${formattedAmount} coins restored to wallet. Reason: ${payload.reason}`}
    >
      {/* Icon & Title */}
      <div className="flex items-center justify-center gap-2 text-sky-700 dark:text-sky-400">
        <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center">
          <RotateCcw className="w-5 h-5 animate-spin-reverse" aria-hidden="true" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-ink-hi dark:text-text-hi">
          Match Entry Refunded
        </h3>
      </div>

      {/* Reason Description */}
      <p className="text-xs text-ink-lo dark:text-text-lo max-w-sm mx-auto leading-relaxed">
        {payload.reason || "The match was aborted and all seat commitments were returned."}
      </p>

      {/* Restored Delta Card */}
      <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-black/30 border border-sky-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-left">
          <ShieldCheck className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-300 block">
              Wallet Restored
            </span>
            <span className="text-xs font-semibold text-ink-mid dark:text-text-mid">
              Host Balance Recredited
            </span>
          </div>
        </div>

        <CoinDelta delta={payload.refundAmount} type="REFUND" size="md" />
      </div>
    </motion.div>
  );
};
