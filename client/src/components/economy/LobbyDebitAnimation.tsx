import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AshthaKonaCoinIcon } from "./CoinAmount";

export interface DebitAnimationItem {
  id: string;
  playerId: string;
  playerName?: string;
  amount: number | string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  createdAt: number;
}

export interface LobbyDebitAnimationProps {
  items: DebitAnimationItem[];
  onCompleteItem?: (id: string) => void;
}

const SUB_COIN_OFFSETS = [
  { delay: 0, midXFactor: 0.45, peakBoost: 50, scale: 1.25 },
  { delay: 0.07, midXFactor: 0.38, peakBoost: 70, scale: 1.1 },
  { delay: 0.14, midXFactor: 0.52, peakBoost: 40, scale: 1.15 },
];

/**
 * GPU-accelerated coin debit animation layer for the room creation / lobby screen.
 * Triggers when players click "I'm Ready":
 *  1. Emits a staggered cluster of 3D gold coins flying in parabolic arcs towards the prize pool
 *  2. Shows an elegant floating "-🪙 {amount} DEBIT" pill directly above the ready source
 *  3. Seamlessly respects prefers-reduced-motion
 */
export const LobbyDebitAnimation: React.FC<LobbyDebitAnimationProps> = ({
  items,
  onCompleteItem,
}) => {
  const reduceMotion = useReducedMotion();

  if (items.length === 0) {
    return null;
  }

  // Cap visible items at 4 to prevent layout thrashing
  const activeItems = items.slice(-4);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      <AnimatePresence>
        {activeItems.map((item) => {
          const deltaX = item.targetX - item.startX;
          const deltaY = item.targetY - item.startY;

          return (
            <React.Fragment key={item.id}>
              {/* 1. Floating Debit Pill (-🪙 {amount} DEBIT) */}
              <motion.div
                initial={{
                  x: item.startX - 35,
                  y: item.startY - 15,
                  scale: 0.6,
                  opacity: 0,
                }}
                animate={{
                  x: item.startX - 35,
                  y: [item.startY - 15, item.startY - 45],
                  scale: [0.6, 1.12, 1, 0.9],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: reduceMotion ? 0.6 : 1.25,
                  times: [0, 0.15, 0.75, 1],
                  ease: "easeOut",
                }}
                className="absolute left-0 top-0 will-change-transform z-50 select-none"
              >
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFDF8]/95 dark:bg-[#131926]/95 border-2 border-amber-500 shadow-[0_6px_20px_rgba(245,158,11,0.4)] backdrop-blur-md">
                  <span className="font-black text-rose-600 dark:text-rose-400 text-xs">-</span>
                  <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 border border-amber-200 flex items-center justify-center shadow-xs">
                    <AshthaKonaCoinIcon size={11} className="text-amber-950" />
                  </div>
                  <span className="font-black text-xs text-[#2B3550] dark:text-amber-300 tabular-nums">
                    {item.amount}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                    Debit
                  </span>
                </div>
              </motion.div>

              {/* 2. Flying Coin Particles (omitted if reduced motion requested) */}
              {!reduceMotion &&
                SUB_COIN_OFFSETS.map((sub, idx) => {
                  const midX = deltaX * sub.midXFactor + (idx % 2 === 0 ? 10 : -10);
                  const midY = Math.min(-65, deltaY * 0.5 - sub.peakBoost);

                  return (
                    <motion.div
                      key={`${item.id}-coin-${idx}`}
                      initial={{
                        x: item.startX,
                        y: item.startY,
                        scale: 0.6,
                        opacity: 0,
                        rotate: 0,
                      }}
                      animate={{
                        x: [item.startX, item.startX + midX, item.targetX],
                        y: [item.startY, item.startY + midY, item.targetY],
                        scale: [0.7, sub.scale, 0.95],
                        opacity: [0, 1, 0.95, 0],
                        rotate: [0, 180, 360],
                      }}
                      transition={{
                        duration: 0.52,
                        delay: sub.delay,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      onAnimationComplete={() => {
                        if (idx === SUB_COIN_OFFSETS.length - 1) {
                          onCompleteItem?.(item.id);
                        }
                      }}
                      className="absolute left-0 top-0 will-change-transform drop-shadow-[0_4px_14px_rgba(245,158,11,0.65)]"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 border-2 border-amber-100 flex items-center justify-center shadow-lg">
                        <AshthaKonaCoinIcon size={16} className="text-amber-950" />
                      </div>
                    </motion.div>
                  );
                })}
            </React.Fragment>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
