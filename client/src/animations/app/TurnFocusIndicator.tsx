import { motion } from "framer-motion";

export interface TurnFocusIndicatorProps {
  isMyTurn: boolean;
  active: boolean;
}

/**
 * Universal Turn Focus Ring & Indicator.
 *
 * Sequence:
 * 1. Active player's avatar receives glowing focus ring.
 * 2. Subtle pulse and breathing wave.
 * 3. "YOUR TURN" mini badge when on self.
 */
export function TurnFocusRing({ isMyTurn, active }: TurnFocusIndicatorProps) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute -inset-1 rounded-full z-10">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-full h-full rounded-full border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.7)]"
      />
      {isMyTurn && (
        <motion.div
          initial={{ scale: 0, y: 5 }}
          animate={{ scale: 1, y: 0 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-[10px] font-black uppercase text-amber-950 shadow-md border border-amber-300 whitespace-nowrap"
        >
          Your Turn
        </motion.div>
      )}
    </div>
  );
}
