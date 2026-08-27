import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Sparkles, UserPlus } from "lucide-react";
import { CoinDelta } from "../CoinDelta";
import { formatCoinString } from "../CoinAmount";
import type { GuestEscrowMotionPayload } from "./types";

export interface EscrowSequenceProps {
  payload: GuestEscrowMotionPayload;
  onClaimVoucher?: () => void;
  className?: string;
}

/**
 * Guest Escrow Motion Sequence (Motion Chapter 5).
 * Channels verified rewards into a sealed escrow vessel for guest players.
 * Strictly avoids animating coins directly into wallet to maintain truthful state.
 */
export const EscrowSequence: React.FC<EscrowSequenceProps> = ({
  payload,
  onClaimVoucher,
  className = "",
}) => {
  const reduceMotion = useReducedMotion();
  const formattedAmount = formatCoinString(payload.voucherAmount);

  return (
    <motion.div
      initial={!reduceMotion ? { scale: 0.92, opacity: 0 } : undefined}
      animate={{ scale: 1, opacity: 1 }}
      className={`p-5 rounded-3xl border border-purple-500/40 bg-gradient-to-b from-purple-500/10 via-purple-950/20 to-black/30 backdrop-blur-md shadow-xl text-center space-y-3.5 ${className}`}
      role="region"
      aria-label={`Match Winnings Escrowed: ${formattedAmount} coins stored in a sealed voucher.`}
    >
      {/* Icon & Title */}
      <div className="flex items-center justify-center gap-2 text-purple-700 dark:text-purple-300">
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-ink-hi dark:text-text-hi">
          Winnings Secured in Escrow
        </h3>
      </div>

      {/* Description */}
      <p className="text-xs text-ink-lo dark:text-text-lo max-w-sm mx-auto leading-relaxed">
        As a guest player, your match prize has been sealed into an authoritative escrow voucher.
        Register a permanent BHALYAM account to claim these coins into your member wallet.
      </p>

      {/* Escrow Value Delta Card */}
      <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-black/30 border border-purple-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-left">
          <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-300 block">
              Sealed Voucher
            </span>
            <span className="text-xs font-semibold text-ink-mid dark:text-text-mid">
              Stored in Safe Escrow
            </span>
          </div>
        </div>

        <CoinDelta delta={payload.voucherAmount} type="ESCROW" size="md" />
      </div>

      {/* Action Button */}
      {onClaimVoucher && (
        <button
          type="button"
          onClick={onClaimVoucher}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 active:scale-98 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Account to Claim Coins</span>
        </button>
      )}
    </motion.div>
  );
};
