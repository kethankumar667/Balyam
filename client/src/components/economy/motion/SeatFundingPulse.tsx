import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatCoinString, AshthaKonaCoinIcon } from "../CoinAmount";

export interface SeatFundingPulseProps {
  seatNumber: number;
  name: string;
  amount: string;
  isFunded: boolean;
  isHost?: boolean;
  isWinner?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Ceremonial Seat Funding Pulse.
 * Wraps or accompanies a seat avatar. When `isFunded` transitions to true,
 * it emits a celebratory golden ring pulse and displays the exact deducted/credited amount.
 */
export const SeatFundingPulse: React.FC<SeatFundingPulseProps> = ({
  name,
  amount,
  isFunded,
  isWinner = false,
  className = "",
  children,
}) => {
  const reduceMotion = useReducedMotion();
  const formattedAmount = formatCoinString(amount);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer Halo Glow */}
      {isFunded && !reduceMotion && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [1, 1.35, 1.1],
            opacity: [0.8, 0.4, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: isWinner ? Infinity : 0,
            repeatDelay: 1,
            ease: "easeOut",
          }}
          className={`absolute inset-0 -m-2 rounded-full pointer-events-none border-2 ${
            isWinner ? "border-amber-400 bg-amber-400/20" : "border-emerald-400 bg-emerald-400/15"
          }`}
          aria-hidden="true"
        />
      )}

      {/* Main Seat Target Content */}
      <div className="relative z-10">{children}</div>

      {/* Floating Delta Badge */}
      {isFunded && (
        <motion.div
          initial={{ y: 8, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
          className={`absolute -bottom-2.5 z-20 px-1.5 py-0.5 rounded-full text-[10px] font-black tracking-tight border shadow-xs flex items-center gap-0.5 whitespace-nowrap ${
            isWinner
              ? "bg-amber-500 text-stone-950 border-amber-300 shadow-amber-500/30"
              : "bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/30"
          }`}
          aria-label={`${name}: ${isWinner ? "+" : "-"}${formattedAmount} coins`}
        >
          <AshthaKonaCoinIcon size={10} className="shrink-0" />
          <span>{isWinner ? `+${formattedAmount}` : `-${formattedAmount}`}</span>
        </motion.div>
      )}
    </div>
  );
};
