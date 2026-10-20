import { motion, useReducedMotion } from "framer-motion";

/**
 * The player's piece. One gold pawn, rendered in exactly one place at a time:
 * the caption's home base while nothing is chosen, then the empty seat in the
 * chosen box. `layoutId` makes it travel between them, and the inner hop gives
 * the move an arc, the way a pawn is lifted and set down instead of slid.
 *
 * Its presence in a seat is the signal, so the choice never rests on colour
 * alone. Reduced motion keeps the pawn and drops the travel and the hop.
 */
export function Pawn() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      layoutId="way-pawn"
      data-way-pawn=""
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 26 }}
      className="inline-flex"
    >
      <motion.span
        initial={{ y: 0 }}
        animate={reduceMotion ? { y: 0 } : { y: [0, -18, 0] }}
        transition={{ duration: 0.55, times: [0, 0.42, 1], ease: "easeOut" }}
        className="inline-flex"
      >
        <svg viewBox="0 0 28 36" className="h-9 w-7 drop-shadow-[0_3px_3px_rgba(74,44,22,0.35)]" aria-hidden="true">
          <defs>
            <radialGradient id="way-pawn-head" cx="0.35" cy="0.3" r="0.85">
              <stop offset="0" stopColor="#FFE08A" />
              <stop offset="1" stopColor="#E4B128" />
            </radialGradient>
            <linearGradient id="way-pawn-body" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#F2C94C" />
              <stop offset="1" stopColor="#B7791F" />
            </linearGradient>
          </defs>
          <ellipse cx="14" cy="31.5" rx="11" ry="4" fill="#8A5A12" />
          <path d="M5.5 31.5c0-7.5 4.2-9.6 5.4-15h6.2c1.2 5.4 5.4 7.5 5.4 15z" fill="url(#way-pawn-body)" />
          <circle cx="14" cy="9.5" r="7" fill="url(#way-pawn-head)" />
          <ellipse cx="11.5" cy="7" rx="2.3" ry="1.6" fill="#ffffff" opacity="0.45" />
        </svg>
      </motion.span>
    </motion.span>
  );
}
