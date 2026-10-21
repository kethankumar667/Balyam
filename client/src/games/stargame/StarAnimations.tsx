import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ComicBurstText from "../../animations/comic/ComicBurstText";
import { fireStarSparkleBurst, fireFireworksBurst } from "../../animations/particles/comicBursts";

/**
 * Both overlays are decoration and must sit BELOW the room-rail sheets
 * (InlineRoomRail's backdrop is z-40, its panel z-50). At z-40/z-50 they
 * painted straight over an open Chat / Players / Room sheet.
 */
const OVERLAY_Z = "z-[35]";

/** How long the burst stays up before it clears itself. */
const BURST_VISIBLE_MS = 1600;

/**
 * Star Completed / Claimed Animation.
 *
 * Clears itself after BURST_VISIBLE_MS. The board shells mount it for the
 * whole of the star/handstack phase and pass no `onComplete`, so before this
 * it stayed on screen — over the table and over every sheet — until the phase
 * changed. `onComplete` is still called for hosts (the TV arena) that unmount
 * it themselves.
 */
export function StarBurstOverlay({
  playerName,
  onComplete,
}: {
  playerName: string;
  onComplete?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fireStarSparkleBurst({ left: "50%", top: "40%" }, { intensity: 1 });
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, BURST_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="star-burst"
          className={`pointer-events-none fixed inset-0 ${OVERLAY_Z} flex items-center justify-center`}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{
              scale: [0, 1.4, 1],
              rotate: [-25, 10, 0],
            }}
            transition={{ duration: 0.4, ease: "backOut" }}
            className="flex flex-col items-center gap-2"
          >
            <div className="text-6xl">⭐ ✨ ⭐</div>
            <ComicBurstText text="STAR COMPLETED!" accent="#854D0E" fill="#FEF08A" seed={53} />
            <div className="px-4 py-1.5 rounded-full text-xs font-black text-white bg-amber-600 border-2 border-amber-950 shadow-xl tracking-wider uppercase">
              {playerName} got 4 matching slips!
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Star Game Winner Celebration — L4 Galactic Star Champion.
 */
export function StarWinnerCelebration({
  winnerName,
}: {
  winnerName: string;
}) {
  useEffect(() => {
    fireFireworksBurst({ intensity: 0.95 });
    // Bounded — an unbounded interval kept firing bursts (and the idle
    // bounce/pulse below kept looping) for as long as this stayed mounted.
    // Six more bursts (~5s) reads as a proper fireworks finale, not a
    // stuck animation.
    let burstCount = 0;
    const maxBursts = 6;
    const interval = setInterval(() => {
      fireFireworksBurst({ intensity: 0.8 });
      burstCount += 1;
      if (burstCount >= maxBursts) clearInterval(interval);
    }, 850);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`pointer-events-none fixed inset-0 ${OVERLAY_Z} flex items-center justify-center`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.65 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black"
      />

      <motion.div
        initial={{ scale: 0, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "backOut" }}
        className="relative flex flex-col items-center gap-3"
      >
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, -4, 4, 0] }}
          transition={{ duration: 1.6, repeat: 5, ease: "easeInOut" }}
          className="text-8xl drop-shadow-2xl"
        >
          ⭐
        </motion.div>

        <ComicBurstText text="STAR CHAMPION!" accent="#78350F" fill="#FDE047" seed={57} />

        <div
          className="rounded-2xl px-8 py-3.5 text-center shadow-2xl mt-1"
          style={{
            background: "linear-gradient(135deg, #ca8a04, #a16207)",
            outline: "3px solid rgba(255,255,255,0.75)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 24px rgba(250,204,21,0.5)",
          }}
        >
          <div className="text-xs uppercase tracking-[0.35em] text-yellow-100 font-bold">
            Match Winner
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg leading-tight mt-0.5">
            {winnerName}
          </div>
        </div>

        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.1, repeat: 7 }}
          className="text-2xl mt-1 flex gap-2"
        >
          <span>⭐</span>
          <span>✨</span>
          <span>🏆</span>
          <span>✨</span>
          <span>🌟</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
