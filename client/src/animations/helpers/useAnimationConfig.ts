import { useViewport } from "../../lib/useViewport";
import { useReducedMotion } from "./useReducedMotion";
import { DEFAULT_ANIMATION_CONFIG, type AnimationConfig } from "./types";

/**
 * Resolves the live `AnimationConfig` every animation module reads:
 * device `prefers-reduced-motion` + viewport tier folded onto the
 * system defaults, with room for a caller (e.g. a future graphics-
 * quality toggle in GlobalSettings) to override individual fields.
 *
 * Cheap plain-object work — deliberately not `useMemo`'d, since memoising
 * a five-key spread buys nothing and would need `overrides` to be a
 * stable reference to pay off, which callers can't easily guarantee for
 * an inline object literal.
 */
export function useAnimationConfig(overrides?: Partial<AnimationConfig>): AnimationConfig {
  const reducedMotion = useReducedMotion();
  const viewport = useViewport();
  return {
    ...DEFAULT_ANIMATION_CONFIG,
    reducedMotion,
    mobileMode: viewport === "mobile",
    ...overrides,
  };
}
