import { type ReactNode } from "react";
import { motion } from "framer-motion";

export type MomentumType = "fire" | "electric" | "frost" | "gold" | null;

export interface HcMomentumAuraProps {
  children: ReactNode;
  active: boolean;
  type?: MomentumType;
  streakText?: string | null;
  compact?: boolean;
}

export default function HcMomentumAura({
  children,
  active,
  type = "fire",
  streakText,
  compact = false,
}: HcMomentumAuraProps) {
  if (!active) {
    return <>{children}</>;
  }

  const auraColor =
    type === "electric"
      ? "#06B6D4"
      : type === "frost"
      ? "#38BDF8"
      : type === "gold"
      ? "#F5C451"
      : "#F97316";

  return (
    <div className="relative inline-block w-full">
      {/* Animated Aura Glow Ring */}
      <motion.div
        animate={{
          opacity: [0.4, 0.85, 0.4],
          scale: [0.99, 1.02, 0.99],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -inset-1 rounded-2xl -z-10"
        style={{
          background: `radial-gradient(circle, ${auraColor}55 0%, transparent 75%)`,
          filter: "blur(4px)",
        }}
      />

      {children}

      {/* Floating Streak Multiplier Chip */}
      {streakText && (
        <motion.div
          initial={{ scale: 0, y: 4 }}
          animate={{ scale: 1, y: 0 }}
          className={`absolute -top-2 right-1 z-20 flex items-center gap-1 rounded-full px-2 py-0.5 ${
            compact ? "text-[9px]" : "text-[10px]"
          } font-black uppercase tracking-wider shadow-md`}
          style={{
            background: `linear-gradient(135deg, ${auraColor}, #B45309)`,
            color: "#FFFFFF",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: `0 2px 8px ${auraColor}66`,
          }}
        >
          <span>{type === "electric" ? "⚡" : "🔥"}</span>
          <span>{streakText}</span>
        </motion.div>
      )}
    </div>
  );
}
