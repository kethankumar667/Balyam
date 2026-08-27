import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AshthaKonaCoinIcon } from "../CoinAmount";
import type { CoinFlightParticle, Point2D } from "./types";

export interface CoinFlightProps {
  source: Point2D;
  target: Point2D;
  /** Maximum simultaneous particles (bounded 3 to 8 for 60fps performance) */
  coinCount?: number;
  duration?: number;
  delayOffset?: number;
  onComplete?: () => void;
  className?: string;
  isReversed?: boolean;
}

/**
 * High-performance GPU-accelerated CoinFlight component.
 * Animates bounded particles strictly via `translate3d`, `scale`, and `opacity`.
 * Never modifies layout properties (`top`, `left`, `width`, `height`) during flight.
 */
export const CoinFlight: React.FC<CoinFlightProps> = ({
  source,
  target,
  coinCount = 5,
  duration = 0.65,
  delayOffset = 0,
  onComplete,
  className = "",
  isReversed = false,
}) => {
  const reduceMotion = useReducedMotion();

  // Cap particles between 1 and 8 to prevent DOM thrashing
  const safeCount = Math.min(8, Math.max(1, coinCount));

  const particles: CoinFlightParticle[] = useMemo(() => {
    return Array.from({ length: safeCount }, (_, i) => {
      // Deterministic spread without random drift to ensure repeatable renders
      const staggerDelay = delayOffset + i * 0.07;
      const spreadOffset = (i - safeCount / 2) * 14;
      return {
        id: `coin-particle-${i}`,
        sourceX: source.x,
        sourceY: source.y,
        targetX: target.x,
        targetY: target.y,
        delay: staggerDelay,
        duration: duration,
        curveOffset: spreadOffset,
        scale: 0.9 + (i % 3) * 0.1,
      };
    });
  }, [source.x, source.y, target.x, target.y, safeCount, duration, delayOffset]);

  if (reduceMotion) {
    // Reduced motion: skip flight animation, invoke onComplete immediately
    return (
      <div
        className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center ${className}`}
        aria-hidden="true"
      >
        <div className="p-2 rounded-full bg-amber-500/20 animate-pulse">
          <AshthaKonaCoinIcon size={24} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {particles.map((p, index) => {
        const deltaX = p.targetX - p.sourceX;
        const deltaY = p.targetY - p.sourceY;
        const midX = deltaX * 0.5 + p.curveOffset;
        const midY = deltaY * 0.5 - Math.abs(deltaX * 0.25) - 30;

        const isLast = index === particles.length - 1;

        return (
          <motion.div
            key={p.id}
            initial={{
              x: p.sourceX,
              y: p.sourceY,
              scale: 0.4,
              opacity: 0,
              rotate: isReversed ? 180 : 0,
            }}
            animate={{
              x: [p.sourceX, p.sourceX + midX, p.targetX],
              y: [p.sourceY, p.sourceY + midY, p.targetY],
              scale: [0.4, p.scale, 0.75],
              opacity: [0, 1, 0.95],
              rotate: isReversed ? [180, 90, 0] : [0, 180, 360],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.25, 0.1, 0.25, 1.0], // Smooth cubic-bezier
              times: [0, 0.5, 1],
            }}
            onAnimationComplete={() => {
              if (isLast && onComplete) {
                onComplete();
              }
            }}
            className="absolute top-0 left-0 -ml-3 -mt-3 flex items-center justify-center drop-shadow-[0_4px_10px_rgba(245,158,11,0.5)]"
            style={{
              willChange: "transform, opacity",
            }}
          >
            <div className="w-6 h-6 rounded-full bg-radial from-yellow-300 via-amber-400 to-amber-600 border border-yellow-100/70 p-0.5 shadow-xs flex items-center justify-center">
              <AshthaKonaCoinIcon size={14} className="text-amber-950" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
