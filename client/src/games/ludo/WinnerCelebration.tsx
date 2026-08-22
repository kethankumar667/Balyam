import { useEffect } from "react";
import { motion } from "framer-motion";
import type { LudoColor, Player } from "@shared/types";
import { COLOR_HEX, COLOR_HEX_DARK } from "./board-layout";
import ComicBurstText from "../../animations/comic/ComicBurstText";
import { fireFireworksBurst } from "../../animations/particles/comicBursts";

/**
 * LUDO CHAMPION — L4 Cinematic Victory Ceremony.
 * Synchronized bounce of winner tokens, radiant sunburst rays,
 * winner avatar punch-in, gold crown, and comic victory badge.
 */
export default function WinnerCelebration({
  winner,
  color,
}: {
  winner: Player;
  color: LudoColor;
}) {
  const hex = COLOR_HEX[color] || "#E4572E";
  const dark = COLOR_HEX_DARK[color] || "#8A2A0C";

  useEffect(() => {
    fireFireworksBurst({ intensity: 1 });
    const interval = setInterval(() => {
      fireFireworksBurst({ intensity: 0.7 });
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {/* Dim backdrop pulse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black"
      />

      {/* Radiating rays */}
      <svg
        viewBox="-100 -100 200 200"
        className="absolute w-[140vmin] h-[140vmin] winner-rays-spin"
        style={{ filter: `drop-shadow(0 0 28px ${hex})` }}
      >
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * 360;
          return (
            <polygon
              key={i}
              points="-3,-90 3,-90 0,-25"
              fill={hex}
              opacity="0.8"
              transform={`rotate(${angle})`}
            />
          );
        })}
      </svg>

      {/* Center stack */}
      <motion.div
        initial={{ scale: 0, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "backOut" }}
        className="relative flex flex-col items-center gap-3"
      >
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, -3, 3, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="text-8xl drop-shadow-2xl"
        >
          👑
        </motion.div>

        <ComicBurstText text="CHAMPION!" accent="#2B2118" fill="#FDE047" seed={15} />

        <div
          className="rounded-2xl px-8 py-3 text-center shadow-2xl mt-1"
          style={{
            background: `linear-gradient(135deg, ${dark}, ${hex})`,
            outline: "3px solid rgba(255,255,255,0.75)",
            boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${hex}88`,
          }}
        >
          <div className="text-xs uppercase tracking-[0.35em] text-white/90 font-bold">
            Ludo Champion
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg leading-tight mt-0.5">
            {winner.name}
          </div>
        </div>

        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-2xl mt-1 flex gap-2"
        >
          <span>🏆</span>
          <span>✨</span>
          <span>🎲</span>
          <span>✨</span>
          <span>🏆</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
