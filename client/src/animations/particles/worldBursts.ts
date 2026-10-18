import { confetti, type ConfettiOptions } from "@tsparticles/confetti";
import type { WorldId } from "@shared/worlds";
import type { FeltAnchor } from "../helpers/types";
import { anchorToPercentXY } from "../helpers/geometry";
import { getPrefersReducedMotion } from "../helpers/useReducedMotion";
import { fireComicDustBurst, fireFireworksBurst, fireStarSparkleBurst, type ComicBurstOptions } from "./comicBursts";

/**
 * What a burst on a table is made of in each WORLD: sparks of light on the neon deck, confetti in the playroom, grains of
 * dust in the garden, bubbles that float up on the reef, marigold petals in the palace. The classic table keeps the
 * comic dust and star sparkle it always had. Two moments use these: an IMPACT (a token cut in Ludo) and a CHEER (a token
 * home, a sequence or a declare), which is the same material thrown wider and higher.
 */

export type BurstKind = "impact" | "cheer";

interface WorldBurstLook {
  colors: readonly string[];
  shapes: readonly ("circle" | "square" | "star" | "emoji")[];
  count: number;
  spread: number;
  startVelocity: number;
  decay: number;
  /** Positive falls, negative rises. */
  gravity: number;
  scalar: number;
  /** Set only for petals: the emoji each piece is drawn as. */
  emoji?: readonly string[];
}

export const WORLD_BURSTS: Readonly<Record<Exclude<WorldId, "classic">, WorldBurstLook>> = {
  neon: { colors: ["#A5F3FC", "#22D3EE", "#E879F9"], shapes: ["square"], count: 26, spread: 360, startVelocity: 30, decay: 0.9, gravity: 0, scalar: 0.8 },
  toy: { colors: ["#E11D48", "#2563EB", "#15803D", "#7C3AED", "#F59E0B"], shapes: ["square", "circle"], count: 30, spread: 90, startVelocity: 26, decay: 0.9, gravity: 0.9, scalar: 1 },
  zen: { colors: ["#8F8566", "#A89D7C", "#6F664B"], shapes: ["circle"], count: 24, spread: 60, startVelocity: 14, decay: 0.88, gravity: 0.7, scalar: 0.95 },
  reef: { colors: ["#5EEAD4", "#22B8C8", "#B8F5EC"], shapes: ["circle"], count: 22, spread: 70, startVelocity: 12, decay: 0.93, gravity: -0.55, scalar: 1.7 },
  palace: { colors: ["#F59E0B", "#FBBF24", "#E8B84A"], shapes: ["emoji"], emoji: ["🌼"], count: 18, spread: 70, startVelocity: 20, decay: 0.9, gravity: 0.5, scalar: 1.9 },
};

/** The confetti options for a burst, or null for the classic table (which has its own). Pure, so it can be tested. */
export function worldBurstOptions(world: WorldId, kind: BurstKind, anchor: FeltAnchor, intensity: number): ConfettiOptions | null {
  if (world === "classic" || !(world in WORLD_BURSTS)) return null;
  const look = WORLD_BURSTS[world];
  const cheer = kind === "cheer";
  const { x, y } = anchorToPercentXY(anchor);
  return {
    count: Math.round(look.count * (cheer ? 1.4 : 1) * intensity),
    spread: look.spread * (cheer ? 1.2 : 1),
    startVelocity: look.startVelocity * (cheer ? 1.2 : 1),
    decay: look.decay,
    gravity: look.gravity,
    scalar: look.scalar,
    position: { x, y },
    colors: [...look.colors],
    shapes: [...look.shapes],
    ...(look.emoji ? { shapeOptions: { emoji: { value: [...look.emoji] } } } : {}),
  };
}

function fire(world: WorldId, kind: BurstKind, anchor: FeltAnchor, opts: ComicBurstOptions): boolean {
  const intensity = opts.intensity ?? 1;
  if (intensity <= 0 || getPrefersReducedMotion()) return true;
  const options = worldBurstOptions(world, kind, anchor, intensity);
  if (!options) return false;
  void confetti(options);
  return true;
}

/** A token cut: the world's own material at the spot, or the comic dust on the classic table. */
export function fireWorldImpact(world: WorldId, anchor: FeltAnchor, opts: ComicBurstOptions = {}): void {
  if (!fire(world, "impact", anchor, opts)) fireComicDustBurst(anchor, opts);
}

/** A winner's finale: a burst somewhere in the upper table, in the world's own material or the classic fireworks. */
export function fireWorldFireworks(world: WorldId, opts: ComicBurstOptions = {}): void {
  const anchor: FeltAnchor = { left: `${20 + Math.random() * 60}%`, top: `${15 + Math.random() * 25}%` };
  if (!fire(world, "cheer", anchor, opts)) fireFireworksBurst(opts);
}

/** Something to cheer: the world's own material, or the star sparkle on the classic table. */
export function fireWorldCheer(world: WorldId, anchor: FeltAnchor, opts: ComicBurstOptions = {}): void {
  if (!fire(world, "cheer", anchor, opts)) fireStarSparkleBurst(anchor, opts);
}
