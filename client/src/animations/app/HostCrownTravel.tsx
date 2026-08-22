import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { fireStarSparkleBurst } from "../particles/comicBursts";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";

export interface HostCrownTravelProps {
  fromRect: DOMRect | null;
  toRect: DOMRect | null;
  onComplete?: () => void;
}

/**
 * Host Crown Migration Animation — Crown physically floats from old host avatar to new host avatar.
 */
export default function HostCrownTravel({
  fromRect,
  toRect,
  onComplete,
}: HostCrownTravelProps) {
  const reduce = useReducedMotion();
  const { play } = useAudio();
  const [active, setActive] = useState(true);

  // `onComplete`/`play` are caller-provided and can be a fresh reference
  // every render (same class of bug fixed in `BhalyamMatchCountdown`);
  // `fromRect`/`toRect` are real inputs this effect should legitimately
  // re-run for, so those stay as real dependencies.
  const latestCallbacks = useRef({ onComplete, play });
  useEffect(() => {
    latestCallbacks.current = { onComplete, play };
  });

  useEffect(() => {
    if (!fromRect || !toRect) {
      setActive(false);
      latestCallbacks.current.onComplete?.();
      return;
    }

    latestCallbacks.current.play(AUDIO.SYS_TICK);

    const timer = setTimeout(() => {
      if (!reduce && toRect) {
        fireStarSparkleBurst(
          {
            left: `${toRect.left + toRect.width / 2}px`,
            top: `${toRect.top + toRect.height / 2}px`,
          },
          { intensity: 0.5 }
        );
      }
      latestCallbacks.current.play(AUDIO.SYS_SUCCESS);
      setActive(false);
      latestCallbacks.current.onComplete?.();
    }, 900);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromRect, toRect, reduce]);

  if (!active || !fromRect || !toRect) return null;

  const startX = fromRect.left + fromRect.width / 2 - 20;
  const startY = fromRect.top - 15;
  const endX = toRect.left + toRect.width / 2 - 20;
  const endY = toRect.top - 15;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <motion.div
        initial={{ x: startX, y: startY, scale: 1.2, rotate: 0 }}
        animate={{
          x: endX,
          y: [startY, Math.min(startY, endY) - 50, endY],
          scale: [1.2, 1.6, 1],
          rotate: [0, -15, 10, 0],
        }}
        transition={{ duration: 0.85, ease: "easeInOut" }}
        className="absolute text-3xl drop-shadow-[0_4px_12px_rgba(234,179,8,0.8)] filter"
      >
        👑
      </motion.div>
    </div>
  );
}
