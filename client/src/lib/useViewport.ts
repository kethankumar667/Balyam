import { useEffect, useState } from "react";

/**
 * Viewport size classifier for layout routing.
 *
 *   - "mobile"  — viewport width < 768px (Tailwind's `md` breakpoint)
 *   - "desktop" — viewport width >= 768px
 *
 * Use this when a feature wants ENTIRELY independent DOM trees for mobile vs
 * desktop rather than overlaying responsive classes on a shared component.
 * For pure styling differences, prefer Tailwind responsive prefixes (`sm:`,
 * `md:`, …) — the indirection of a JS check isn't free.
 *
 * SSR-safe: returns "desktop" before `window` is available so the first
 * server-rendered pass doesn't crash. The first real client-side render will
 * correct that immediately via the matchMedia subscription below.
 */

export const MOBILE_BREAKPOINT_PX = 768;

export type Viewport = "mobile" | "desktop";

const QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`;

function classify(): Viewport {
  if (typeof window === "undefined" || !window.matchMedia) return "desktop";
  return window.matchMedia(QUERY).matches ? "mobile" : "desktop";
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(classify);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      setViewport(e.matches ? "mobile" : "desktop");
    };
    // Sync once on mount in case the initial classify() saw a stale value
    // (e.g. window resized between render and effect).
    setViewport(mql.matches ? "mobile" : "desktop");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return viewport;
}
