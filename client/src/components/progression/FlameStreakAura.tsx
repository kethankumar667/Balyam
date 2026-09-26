import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";

export interface FlameStreakAuraProps {
  streak: number;
  children: React.ReactNode;
  className?: string;
  showBadge?: boolean;
}

/**
 * Animated "On Fire" Win Streak Flame Aura for Level Badges.
 * Triggered when a player achieves a win streak >= 2 in competitive games.
 * Delivers dynamic pulsating heatwaves, floating embers, and a burning streak pill.
 */
export const FlameStreakAura: React.FC<FlameStreakAuraProps> = ({
  streak,
  children,
  className = "",
  showBadge = true,
}) => {
  const reduceMotion = useReducedMotion();
  const isOnFire = streak >= 2;

  if (!isOnFire) {
    return <div className={`relative inline-flex items-center justify-center ${className}`}>{children}</div>;
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer Heatwave Halo */}
      {!reduceMotion && (
        <motion.div
          animate={{
            scale: [1.05, 1.25, 1.08],
            opacity: [0.5, 0.85, 0.5],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -inset-2 rounded-full blur-md pointer-events-none z-0"
          style={{
            background: "radial-gradient(circle, rgba(249,115,22,0.8) 0%, rgba(239,68,68,0.5) 50%, transparent 75%)",
          }}
        />
      )}

      {/* Floating Embers / Flame Ring */}
      {!reduceMotion && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-2.5 rounded-full border border-amber-500/40 border-dashed pointer-events-none z-0"
        />
      )}

      {/* Badge Content */}
      <div className="relative z-10">{children}</div>

      {/* Burning Streak Pip */}
      {showBadge && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-2 -right-2 z-30 flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-orange-600 via-amber-500 to-red-600 border border-amber-300 text-stone-950 shadow-[0_0_10px_rgba(249,115,22,0.8)]"
          title={`${streak}x Win Streak! On Fire!`}
        >
          <Flame className="w-2.5 h-2.5 fill-stone-950" />
          <span className="text-[9px] font-black font-mono tracking-tighter text-stone-950">
            {streak}x
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default FlameStreakAura;
