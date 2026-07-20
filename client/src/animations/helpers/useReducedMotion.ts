import { useEffect, useState } from "react";

/**
 * `prefers-reduced-motion` as a live boolean, for animation modules that
 * need the value in JS (GSAP timelines, react-spring physics, tsParticles
 * bursts) rather than CSS — none of which are reached by `index.css`'s
 * global `@media (prefers-reduced-motion: reduce)` catch-all, since that
 * rule only neutralises CSS animations/transitions.
 *
 * Mirrors `lib/useViewport.ts`'s matchMedia-subscription shape exactly so
 * the two hooks read as one family. SSR-safe: defaults to `false` before
 * `window` exists.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
