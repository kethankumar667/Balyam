import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Trophy, Award, Landmark, CheckCircle } from "lucide-react";
import { CoinDelta } from "../CoinDelta";
import { formatCoinString, AshthaKonaCoinIcon } from "../CoinAmount";
import type { MatchSettlementMotionPayload } from "./types";

export interface SettlementSequenceProps {
  payload: MatchSettlementMotionPayload;
  onComplete?: () => void;
  className?: string;
}

/**
 * Successful Settlement Motion Sequence (Motion Chapter 3).
 * Visualizes server-authoritative pot distribution to verified match winners.
 * Preserves BigInt strings, color independence, and WCAG AA contrast.
 */
export const SettlementSequence: React.FC<SettlementSequenceProps> = ({
  payload,
  onComplete,
  className = "",
}) => {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<"elevate" | "distribute" | "settled">("elevate");

  useEffect(() => {
    if (reduceMotion) {
      setStage("settled");
      onComplete?.();
      return;
    }

    const t1 = window.setTimeout(() => setStage("distribute"), 600);
    const t2 = window.setTimeout(() => {
      setStage("settled");
      onComplete?.();
    }, 1800);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduceMotion, onComplete]);

  const formattedPot = formatCoinString(payload.totalPotAmount);

  return (
    <div
      className={`p-5 rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-amber-950/20 to-black/30 backdrop-blur-md shadow-xl text-center space-y-4 ${className}`}
      role="region"
      aria-label="Match Economy Settlement"
    >
      {/* Top Header */}
      <div className="flex items-center justify-center gap-2 text-amber-500">
        <Trophy className="w-5 h-5" aria-hidden="true" />
        <h3 className="text-base sm:text-lg font-black text-ink-hi dark:text-text-hi">
          Prize Distribution Complete
        </h3>
      </div>

      {/* Pot Banner */}
      <motion.div
        animate={{
          scale: stage === "elevate" ? 1.05 : 1,
          y: stage === "elevate" ? -4 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-left">
          <Landmark className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300 block">
              Total Prize Pot
            </span>
            <span className="text-lg font-extrabold text-ink-hi dark:text-text-hi tabular-nums">
              {formattedPot} Coins
            </span>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Verified
        </span>
      </motion.div>

      {/* Winners List */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-mid dark:text-text-mid block text-left">
          Authoritative Payouts
        </span>

        {payload.winners.map((w, idx) => (
          <motion.div
            key={w.playerId}
            initial={!reduceMotion ? { opacity: 0, x: -10 } : undefined}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            className={`p-3 rounded-2xl border flex items-center justify-between ${
              w.isSelf
                ? "bg-amber-500/20 border-amber-500/50 shadow-xs"
                : "bg-white/40 dark:bg-black/20 border-amber-600/15 dark:border-amber-400/10"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-left">
                <span className="text-sm font-black text-ink-hi dark:text-text-hi truncate block">
                  {w.name} {w.isSelf && "(You)"}
                </span>
                <span className="text-[10px] text-ink-lo dark:text-text-lo">
                  {w.subtitle ?? `Winner Rank #${idx + 1}`}
                </span>
              </div>
            </div>

            <CoinDelta delta={w.payoutAmount} type="CREDIT" size="md" />
          </motion.div>
        ))}
      </div>

      {payload.worldBankFeeAmount && (
        <div className="text-[11px] text-ink-lo dark:text-text-lo flex items-center justify-between px-2 pt-1 border-t border-amber-600/15 dark:border-amber-400/10">
          <span>World Bank Community Reserve Contribution:</span>
          <span className="font-mono font-bold">
            {formatCoinString(payload.worldBankFeeAmount)} coins
          </span>
        </div>
      )}
    </div>
  );
};
