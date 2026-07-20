/**
 * Shared configuration surface for every UNO animation module. A single
 * `AnimationConfig` flows into every animation component so intensity,
 * sound, and motion preferences stay consistent across the whole
 * animation system instead of each animation inventing its own ad-hoc
 * props (see `UNO_Animation_Implementation_Guide.md`'s "Animations
 * should be configurable" requirement).
 */
export interface AnimationConfig {
  /** Global speed multiplier — 1 = designed speed, <1 slower, >1 faster.
   *  Timelines divide their base durations by this (2 = twice as fast). */
  speed: number;
  /** 0..1 — scales particle counts. 0 fully disables particle systems. */
  particleIntensity: number;
  /** Master on/off for Howler playback from animation modules. */
  soundEnabled: boolean;
  /** When true every module collapses to its reduced-motion fallback: a
   *  single quick fade/scale, no camera shake, no GSAP flight path, no
   *  particles. Sound is still allowed — audio is not motion, and Howler
   *  layers carry the "something happened" signal for players who can't
   *  see the motion. Never blocks gameplay either way. */
  reducedMotion: boolean;
  /** Smaller/cheaper variants for phones — fewer particles, shorter
   *  camera-shake distance, no hit-stop gap. Mid-range Android must hold
   *  60fps per AGENTS.md §6.1. */
  mobileMode: boolean;
}

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  speed: 1,
  particleIntensity: 1,
  soundEnabled: true,
  reducedMotion: false,
  mobileMode: false,
};

/** A single 2D anchor on the felt, expressed the same way the rest of the
 *  UNO board already positions seats (`uno-table.tsx`'s `SeatPosition`) —
 *  CSS percentage strings so every animation composes with the existing
 *  `left`/`top` seat-resolution helpers without a unit-conversion step. */
export interface FeltAnchor {
  left: string;
  top: string;
}
