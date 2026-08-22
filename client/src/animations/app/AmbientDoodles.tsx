import { motion, useReducedMotion } from "framer-motion";

/**
 * Ambient Nostalgic Doodles — floating gently in the background of Home/Lobby.
 * Low frequency, lightweight GPU-only transforms, disabled on reduced motion.
 */
export default function AmbientDoodles() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-25 dark:opacity-15 select-none">
      {/* Floating Paper Airplane */}
      <motion.div
        animate={{
          x: [0, 80, 0],
          y: [0, -35, 0],
          rotate: [0, 12, -8, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-20 left-[10%] text-4xl"
      >
        ✈️
      </motion.div>

      {/* Floating Sparkle / Star */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.25, 1],
          rotate: [0, 45, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute top-48 right-[12%] text-3xl"
      >
        ✨
      </motion.div>

      {/* Floating Pencil */}
      <motion.div
        animate={{
          x: [0, -40, 0],
          y: [0, 25, 0],
          rotate: [-15, 5, -15],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
        className="absolute bottom-32 left-[8%] text-3xl"
      >
        ✏️
      </motion.div>

      {/* Floating Game Die */}
      <motion.div
        animate={{
          y: [0, -30, 0],
          rotate: [0, 20, 0],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute bottom-24 right-[15%] text-3xl"
      >
        🎲
      </motion.div>
    </div>
  );
}
