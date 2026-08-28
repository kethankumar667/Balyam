import React, { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { AshthaKonaCoinIcon } from "./CoinAmount";

export interface CoinParticle {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  createdAt: number;
}

export interface LobbyCoinFlightProps {
  particles: CoinParticle[];
  onCompleteParticle?: (id: string) => void;
}

/**
 * Lightweight GPU-accelerated coin flight layer for room lobby seat joins.
 * Emits gold coin tokens along a smooth parabolic bezier trajectory towards the prize pool.
 * Automatically respects `prefers-reduced-motion` and caps concurrency at 4 items.
 */
export const LobbyCoinFlight: React.FC<LobbyCoinFlightProps> = ({
  particles,
  onCompleteParticle,
}) => {
  const reduceMotion = useReducedMotion();

  // If reduced motion is requested, do not render flying particles
  if (reduceMotion || particles.length === 0) {
    return null;
  }

  // Cap visible particles at maximum 4 to prevent any layout thrashing or frame drops
  const activeParticles = particles.slice(-4);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      <AnimatePresence>
        {activeParticles.map((p) => {
          const deltaX = p.targetX - p.startX;
          const deltaY = p.targetY - p.startY;
          const midX = deltaX * 0.45;
          const midY = Math.min(-60, deltaY * 0.5 - 40); // parabolic arc peak

          return (
            <motion.div
              key={p.id}
              initial={{
                x: p.startX,
                y: p.startY,
                scale: 0.6,
                opacity: 0,
                rotate: 0,
              }}
              animate={{
                x: [p.startX, p.startX + midX, p.targetX],
                y: [p.startY, p.startY + midY, p.targetY],
                scale: [0.7, 1.25, 0.95],
                opacity: [0, 1, 0.9, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1], // snappy ease-out curve
              }}
              onAnimationComplete={() => onCompleteParticle?.(p.id)}
              className="absolute left-0 top-0 will-change-transform drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)]"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 border border-amber-200 flex items-center justify-center shadow-md">
                <AshthaKonaCoinIcon size={16} className="text-amber-950" />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
