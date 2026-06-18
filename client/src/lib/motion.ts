import type { Variants, Transition } from "framer-motion";

/**
 * Shared Framer Motion variants for BHALYAM.
 *
 * All durations sit inside the ui-ux-pro-max recommended bands:
 *   • Micro-interactions: 120-280 ms
 *   • Entrance reveals:   480-720 ms
 *   • Hero/orchestrated:  900-1400 ms
 *
 * Easings: `bhalyamOut` for entering, `bhalyamIn` for exiting, `bhalyamSpring`
 * for hover/tap (the snappy overshoot used on game tiles and CTAs).
 *
 * Components compose these by passing `variants={...}` instead of duplicating
 * tween config, so the motion language stays consistent across the app.
 */

export const bhalyamOut = [0.2, 0.7, 0.3, 1] as const;
export const bhalyamIn  = [0.65, 0, 0.35, 1] as const;
export const bhalyamSpring: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 22,
  mass: 0.8,
};

export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: bhalyamOut },
  },
};

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: bhalyamOut },
  },
};

export const stagger = (delay = 0.06, initial = 0.08): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: delay,
      delayChildren: initial,
    },
  },
});

/** Tile hover: gentle lift with spring overshoot. */
export const tileHover = {
  rest:  { y: 0, scale: 1, rotateZ: 0 },
  hover: { y: -6, scale: 1.015, rotateZ: 0 },
  tap:   { y: -2, scale: 0.99 },
};

/** Primary CTA — magnetic squeeze on press for tactile feedback. */
export const ctaPress = {
  rest:  { scale: 1 },
  hover: { scale: 1.03 },
  tap:   { scale: 0.97 },
};

/** Card flip variants for cards that reveal info. */
export const flipReveal: Variants = {
  hidden:  { rotateY: 90, opacity: 0 },
  visible: {
    rotateY: 0,
    opacity: 1,
    transition: { duration: 0.55, ease: bhalyamOut },
  },
};
