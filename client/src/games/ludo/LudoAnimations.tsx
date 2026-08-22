import { useEffect } from "react";
import { motion } from "framer-motion";
import ComicBurstText from "../../animations/comic/ComicBurstText";
import { fireComicDustBurst, fireStarSparkleBurst, fireFireworksBurst } from "../../animations/particles/comicBursts";
import { COLOR_HEX } from "./board-layout";
import type { LudoColor } from "@shared/types";

/**
 * GOTCHA! — Signature Ludo Capture Animation.
 * Displays hand-drawn RoughJS "GOTCHA!" badge, comic dust clouds,
 * and playful comic impact styling.
 */
export function GotchaCaptureOverlay({
  victimName,
  attackerName,
  attackerColor,
  left,
  top,
  onComplete,
}: {
  victimName: string;
  attackerName: string;
  attackerColor: LudoColor;
  left: number;
  top: number;
  onComplete?: () => void;
}) {
  const hex = COLOR_HEX[attackerColor] || "#E4572E";

  useEffect(() => {
    // Fire comic dust particles at impact point
    fireComicDustBurst({ left: `${left}%`, top: `${top}%` });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, [left, top, onComplete]);

  return (
    <div
      className="pointer-events-none absolute z-40 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -25 }}
        animate={{
          scale: [0, 1.25, 1],
          rotate: [-25, 6, -3],
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.38, ease: "backOut" }}
        className="flex flex-col items-center"
      >
        <ComicBurstText text="GOTCHA!" accent="#2B2118" fill="#FFE066" seed={9} />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-1 px-3 py-1 rounded-full text-xs font-black tracking-wider text-white shadow-lg uppercase"
          style={{ background: hex, border: "2px solid #2B2118" }}
        >
          {attackerName} cut {victimName}!
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Safe Square — Shield Pop.
 * Ring expands from safe square with star sparkles and gentle shine.
 */
export function SafeShieldPop({
  left,
  top,
  color,
  onComplete,
}: {
  left: number;
  top: number;
  color?: LudoColor;
  onComplete?: () => void;
}) {
  const hex = color ? COLOR_HEX[color] : "#3B82F6";

  useEffect(() => {
    fireStarSparkleBurst({ left: `${left}%`, top: `${top}%` }, { intensity: 0.4 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 900);
    return () => clearTimeout(timer);
  }, [left, top, onComplete]);

  return (
    <div
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${left}%`, top: `${top}%`, width: "8%", aspectRatio: "1 / 1" }}
    >
      <motion.div
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="absolute inset-0 rounded-full border-4"
        style={{ borderColor: hex, filter: `drop-shadow(0 0 8px ${hex})` }}
      />
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: [0, 1.2, 0.9, 0], rotate: 0 }}
        transition={{ duration: 0.85, times: [0, 0.3, 0.7, 1] }}
        className="absolute inset-0 flex items-center justify-center text-xl font-bold"
      >
        🛡️
      </motion.div>
    </div>
  );
}

/**
 * Out of Gate — Token Entry Burst.
 * Fires when rolling a 6 and moving a pawn from yard to starting track square.
 */
export function OutOfGateBurst({
  left,
  top,
  color,
  onComplete,
}: {
  left: number;
  top: number;
  color: LudoColor;
  onComplete?: () => void;
}) {
  useEffect(() => {
    fireComicDustBurst({ left: `${left}%`, top: `${top}%` }, { intensity: 0.7 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 800);
    return () => clearTimeout(timer);
  }, [left, top, onComplete]);

  return (
    <div
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 1.4, 0], opacity: [1, 0.8, 0] }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="px-2.5 py-0.5 rounded-full text-xs font-black text-white shadow-md bg-amber-500 border border-amber-700"
      >
        🚀 OUT!
      </motion.div>
    </div>
  );
}

/**
 * Home Entry — "HOME!" Comic Badge.
 * Fires when token reaches home triangle.
 */
export function HomeEntryBurst({
  left,
  top,
  color,
  onComplete,
}: {
  left: number;
  top: number;
  color: LudoColor;
  onComplete?: () => void;
}) {
  useEffect(() => {
    fireStarSparkleBurst({ left: `${left}%`, top: `${top}%` }, { intensity: 0.8 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1100);
    return () => clearTimeout(timer);
  }, [left, top, onComplete]);

  return (
    <div
      className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <motion.div
        initial={{ scale: 0, y: 15 }}
        animate={{ scale: [0, 1.3, 1], y: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="flex flex-col items-center"
      >
        <ComicBurstText text="HOME!" accent="#1A4329" fill="#A7F3D0" seed={3} />
      </motion.div>
    </div>
  );
}

/**
 * Lucky Six Banner & Rays.
 */
export function LuckySixBurst({ onComplete }: { onComplete?: () => void }) {
  useEffect(() => {
    fireFireworksBurst({ intensity: 0.6 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: [0, 1.2, 1], rotate: [-15, 5, 0] }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: "backOut" }}
        className="flex flex-col items-center gap-1"
      >
        <ComicBurstText text="LUCKY 6!" accent="#5B21B6" fill="#FDE047" seed={12} />
      </motion.div>
    </div>
  );
}
