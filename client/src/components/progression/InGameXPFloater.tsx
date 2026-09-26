import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, Crown, Star } from "lucide-react";
import { AudioManager } from "../../services/AudioManager";
import { HapticsManager } from "../../services/HapticsManager";
import { AUDIO } from "../../constants/audio";

export interface XPFloaterItem {
  id: string;
  amount: number;
  label: string;
  color?: string;
  x?: number;
  y?: number;
}

/**
 * Global or Local In-Game XP Floater Overlay.
 * Renders juicy, spring-animated XP burst pills when thrilling in-game events occur
 * (e.g. "+25 XP KNOCKOUT!", "+30 XP MAXIMUM 6!", "+20 XP PURE RUN!").
 */
export const InGameXPFloater: React.FC<{
  floaters: XPFloaterItem[];
  onDismiss: (id: string) => void;
}> = ({ floaters, onDismiss }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[80] overflow-hidden flex items-center justify-center">
      <AnimatePresence>
        {floaters.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1.2, 1, 0.9],
              y: [-10, -50, -80],
            }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            onAnimationComplete={() => onDismiss(f.id)}
            className="absolute flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-950/90 border-2 shadow-[0_0_20px_rgba(245,158,11,0.6)] backdrop-blur-md"
            style={{
              borderColor: f.color || "#f59e0b",
              left: f.x !== undefined ? `${f.x}px` : "50%",
              top: f.y !== undefined ? `${f.y}px` : "45%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-black font-mono text-white tracking-tight drop-shadow-md">
                +{f.amount} XP
              </span>
              <span
                className="text-[10px] font-black uppercase tracking-wider font-mono"
                style={{ color: f.color || "#fbbf24" }}
              >
                {f.label}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * Convenient Hook to trigger floating in-game XP moments.
 */
export function useXPFloater() {
  const [floaters, setFloaters] = useState<XPFloaterItem[]>([]);

  const triggerFloater = useCallback((item: Omit<XPFloaterItem, "id">) => {
    const id = `floater_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const floater: XPFloaterItem = { ...item, id };

    try {
      AudioManager.getInstance().play(AUDIO.REWARD_COIN);
      HapticsManager.trigger("subtle");
    } catch {
      // Audio optional
    }

    setFloaters((prev) => [...prev, floater]);
  }, []);

  const dismissFloater = useCallback((id: string) => {
    setFloaters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return {
    floaters,
    triggerFloater,
    dismissFloater,
  };
}

export default InGameXPFloater;
