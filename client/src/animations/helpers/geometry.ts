import type { FeltAnchor } from "./types";

/** Converts a `FeltAnchor` (`"72%"` CSS-percentage strings, as used by
 *  every seat-positioning helper on the felt) into the plain 0–100
 *  numeric `{x, y}` pair tsParticles' `position` option expects. Centralised
 *  here so every particle burst and GSAP tween shares one parsing rule
 *  instead of each animation re-deriving it from a template string. */
export function anchorToPercentXY(anchor: FeltAnchor): { x: number; y: number } {
  return { x: parseFloat(anchor.left), y: parseFloat(anchor.top) };
}
