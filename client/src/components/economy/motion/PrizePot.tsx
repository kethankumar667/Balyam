import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Landmark, Sparkles, CheckCircle2 } from "lucide-react";
import { formatCoinString, AshthaKonaCoinIcon } from "../CoinAmount";

export interface PrizePotProps {
  /** Server-authoritative total pot amount string (e.g. "400"). Strictly string. */
  amount: string;
  isCommitted?: boolean;
  isForming?: boolean;
  isElevated?: boolean;
  label?: string;
  className?: string;
}

/**
 * The Central Prize Pot Vessel.
 * Renders an antique-gold ceremonial vessel that holds match commitments.
 * Visualizes formation, commitment stamping, and elevation during settlement.
 */
export const PrizePot: React.FC<PrizePotProps> = ({
  amount,
  isCommitted = false,
  isForming = false,
  isElevated = false,
  label = "Prize Pool",
  className = "",
}) => {
  const reduceMotion = useReducedMotion();
  const formattedAmount = formatCoinString(amount);

  return (
    <motion.div
      layout={!reduceMotion}
      initial={isForming ? { scale: 0.8, opacity: 0 } : { scale: 1, opacity: 1 }}
      animate={{
        scale: isElevated ? 1.08 : 1,
        opacity: 1,
        y: isElevated ? -8 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 24,
      }}
      className={`relative flex flex-col items-center justify-center p-4 rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/15 via-amber-950/20 to-black/40 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)] select-none text-center ${className}`}
      role="status"
      aria-label={`${label}: ${formattedAmount} coins${isCommitted ? ", committed" : ""}`}
    >
      {/* Ambient Gold Halo */}
      <div
        className={`absolute w-36 h-36 rounded-full bg-amber-500/20 blur-xl pointer-events-none transition-opacity duration-500 ${
          isElevated ? "opacity-100 scale-125" : "opacity-60 scale-100"
        }`}
        aria-hidden="true"
      />

      {/* Top Vessel Icon with Sparkle */}
      <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-200/50 shadow-md text-stone-950 mb-2">
        <Landmark className="w-6 h-6" aria-hidden="true" />
        {isCommitted && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 border border-white text-white flex items-center justify-center shadow-xs"
            title="Authoritatively Committed"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </motion.div>
        )}
      </div>

      {/* Label */}
      <span className="text-[11px] font-mono uppercase tracking-widest font-black text-amber-600 dark:text-amber-300/90 mb-0.5 flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        {label}
      </span>

      {/* Amount Display */}
      <div className="flex items-center gap-1.5 text-xl sm:text-2xl font-black text-ink-hi dark:text-text-hi tabular-nums">
        <AshthaKonaCoinIcon size={20} className="text-amber-500 drop-shadow-xs" />
        <span>{formattedAmount}</span>
      </div>

      {/* Committed Stamp Pill */}
      {isCommitted && (
        <span className="mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
          Pot Committed
        </span>
      )}
    </motion.div>
  );
};
