import { confetti } from "@tsparticles/confetti";
import type { UnoColor } from "@shared/types";
import type { FeltAnchor } from "../helpers/types";
import { anchorToPercentXY } from "../helpers/geometry";

/**
 * "Comic dust" burst — the muted grey/brown puff + a couple of pale
 * star-flecks that reads as a cartoon impact cloud, distinct from
 * `uno-confetti.ts`'s bright win/declare bursts. Reused by every
 * animation whose story calls for "dust" or "debris" (+2 Flying
 * Slippers, Skip's banana-peel slide, +4 Meteor Strike's crater).
 *
 * `disableForReducedMotion` is on by default in `@tsparticles/confetti`
 * (same precedent `uno-confetti.ts` already documents), so callers don't
 * need a separate matchMedia gate for the particle burst itself — only
 * for the surrounding GSAP/react-spring motion, which this module has no
 * say over.
 */
const COMIC_DUST_COLORS = ["#C9B79C", "#A98F6B", "#8A7256", "#F5EFE0"];

export interface ComicBurstOptions {
  /** 0..1 — scales `count`/`scalar` together. Wire straight from
   *  `AnimationConfig.particleIntensity`; 0 renders nothing. */
  intensity?: number;
}

/** Puff of dust + star-flecks at a felt anchor — the "something just
 *  landed here" cue. */
export function fireComicDustBurst(anchor: FeltAnchor, opts: ComicBurstOptions = {}): void {
  const intensity = opts.intensity ?? 1;
  if (intensity <= 0) return;
  const { x, y } = anchorToPercentXY(anchor);
  void confetti({
    count: Math.round(26 * intensity),
    spread: 55,
    startVelocity: 18,
    decay: 0.88,
    gravity: 0.6,
    scalar: 0.7,
    position: { x, y },
    colors: COMIC_DUST_COLORS,
    shapes: ["circle"],
  });
  // A handful of brighter star-flecks layered on top for sparkle without
  // diluting the dust cloud's muted palette.
  void confetti({
    count: Math.round(8 * intensity),
    spread: 70,
    startVelocity: 22,
    scalar: 0.55,
    position: { x, y },
    colors: ["#FFF9F0", "#F7B84A"],
    shapes: ["star"],
  });
}

/** Meteor-strike impact: grey smoke that lingers and drifts up (low
 *  decay, negative-ish gravity via a small upward drift), rainbow
 *  sparkles (the Wild Draw Four's colour-choice identity), and dark
 *  angular debris chunks flung outward harder than the dust burst's
 *  gentle puff — a bigger, more violent event than a plain +2. */
const METEOR_SMOKE_COLORS = ["#6B6660", "#8C8680", "#4A453F", "#B5AFA6"];
const METEOR_RAINBOW_COLORS = ["#D22B27", "#3AA03A", "#1C6DD0", "#E8B100", "#B347D6"];
const METEOR_DEBRIS_COLORS = ["#3D2B1F", "#5C4030", "#2B2118"];

export function fireMeteorImpactBurst(anchor: FeltAnchor, opts: ComicBurstOptions = {}): void {
  const intensity = opts.intensity ?? 1;
  if (intensity <= 0) return;
  const { x, y } = anchorToPercentXY(anchor);

  // Smoke — slow, lingering, wide spread.
  void confetti({
    count: Math.round(34 * intensity),
    spread: 100,
    startVelocity: 14,
    decay: 0.94,
    gravity: 0.15,
    scalar: 1.1,
    position: { x, y },
    colors: METEOR_SMOKE_COLORS,
    shapes: ["circle"],
  });
  // Rainbow sparkles — quick, bright, the Wild+4 colour-choice signature.
  void confetti({
    count: Math.round(18 * intensity),
    spread: 130,
    startVelocity: 34,
    scalar: 0.5,
    position: { x, y },
    colors: METEOR_RAINBOW_COLORS,
    shapes: ["star", "circle"],
  });
  // Debris — harder, faster, angular chunks.
  void confetti({
    count: Math.round(14 * intensity),
    spread: 80,
    startVelocity: 40,
    decay: 0.9,
    gravity: 1.1,
    scalar: 0.6,
    position: { x, y },
    colors: METEOR_DEBRIS_COLORS,
    shapes: ["square"],
  });
}

/** Wild card colour reveal: droplets in the just-chosen colour plus a
 *  few white highlights (a "paint splash" reads clearer with a touch of
 *  white mixed in than a single flat hue). Same hex values as
 *  `uno-table.tsx`'s `WILD_COLOR_SWATCH` — kept local rather than
 *  imported since that map is module-private there, matching the
 *  precedent its own comment already sets. */
const PAINT_COLOR_HEX: Record<UnoColor, string> = {
  R: "#D22B27",
  G: "#3AA03A",
  B: "#1C6DD0",
  Y: "#E8B100",
};

export function firePaintSplash(anchor: FeltAnchor, color: UnoColor, opts: ComicBurstOptions = {}): void {
  const intensity = opts.intensity ?? 1;
  if (intensity <= 0) return;
  const { x, y } = anchorToPercentXY(anchor);
  void confetti({
    count: Math.round(30 * intensity),
    spread: 140,
    startVelocity: 26,
    decay: 0.9,
    gravity: 0.5,
    scalar: 0.65,
    position: { x, y },
    colors: [PAINT_COLOR_HEX[color], "#FFFFFF"],
    shapes: ["circle"],
  });
}

/** UNO Call celebration: bright gold stars + white sparkles — a
 *  brighter, more triumphant palette than the comic-dust star-flecks,
 *  matching a "crowd cheering" moment rather than an impact. */
const CELEBRATION_STAR_COLORS = ["#FFD966", "#FFF9F0", "#F7B84A"];

export function fireStarSparkleBurst(anchor: FeltAnchor, opts: ComicBurstOptions = {}): void {
  const intensity = opts.intensity ?? 1;
  if (intensity <= 0) return;
  const { x, y } = anchorToPercentXY(anchor);
  void confetti({
    count: Math.round(36 * intensity),
    spread: 160,
    startVelocity: 30,
    decay: 0.9,
    gravity: 0.35,
    scalar: 0.6,
    position: { x, y },
    colors: CELEBRATION_STAR_COLORS,
    shapes: ["star", "circle"],
  });
}

/** UNO's own card colours (matching `uno-confetti.ts`'s
 *  `UNO_CONFETTI_COLORS`) as small square "card" chips — used for both
 *  Forgot UNO's falling-cards gag and Stacking +2's collapse scatter,
 *  which only differ in trajectory (gravity/velocity), not palette. */
const CARD_CHIP_COLORS = ["#D22B27", "#3AA03A", "#1C6DD0", "#E8B100", "#FFF9F0"];

/** Falling cards — Forgot UNO's punishment gag: a light shower straight
 *  down, low velocity, longer hang time (low gravity) so it reads as
 *  "raining cards on you" rather than an explosion. */
export function fireFallingCardsBurst(anchor: FeltAnchor, opts: ComicBurstOptions = {}): void {
  const intensity = opts.intensity ?? 1;
  if (intensity <= 0) return;
  const { x, y } = anchorToPercentXY(anchor);
  void confetti({
    count: Math.round(22 * intensity),
    spread: 50,
    startVelocity: 8,
    decay: 0.92,
    gravity: 0.4,
    scalar: 0.7,
    position: { x: x - 10 + Math.random() * 20, y: 0 },
    colors: CARD_CHIP_COLORS,
    shapes: ["square"],
  });
}

/** Flying cards — Stacking +2's collapse: a hard, wide scatter outward
 *  from the toppled tower, the opposite trajectory from falling cards
 *  (high velocity, standard gravity, so they arc away and drop). */
export function fireFlyingCardsBurst(anchor: FeltAnchor, opts: ComicBurstOptions = {}): void {
  const intensity = opts.intensity ?? 1;
  if (intensity <= 0) return;
  const { x, y } = anchorToPercentXY(anchor);
  void confetti({
    count: Math.round(28 * intensity),
    spread: 150,
    startVelocity: 32,
    decay: 0.88,
    gravity: 0.9,
    scalar: 0.65,
    position: { x, y },
    colors: CARD_CHIP_COLORS,
    shapes: ["square"],
  });
}

/** Fireworks — Winner Celebration: several staggered, wide, high-velocity
 *  bursts across random x positions near the top of the felt, distinct
 *  from `uno-confetti.ts`'s single centred `fireUnoWinConfetti()` burst
 *  (kept firing as-is; this is an ADDITIONAL layered sequence, not a
 *  replacement — see WinnerCelebration.tsx). */
export function fireFireworksBurst(opts: ComicBurstOptions = {}): void {
  const intensity = opts.intensity ?? 1;
  if (intensity <= 0) return;
  const x = 20 + Math.random() * 60;
  const y = 15 + Math.random() * 25;
  void confetti({
    count: Math.round(50 * intensity),
    spread: 360,
    startVelocity: 38,
    decay: 0.9,
    gravity: 0.7,
    scalar: 0.7,
    position: { x, y },
    colors: CELEBRATION_STAR_COLORS,
    shapes: ["star", "circle", "square"],
  });
}
