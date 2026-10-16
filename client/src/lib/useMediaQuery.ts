import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query. Prefer Tailwind's `sm:` / `md:` prefixes or a plain
 * `@media` rule when only styling changes; reach for this when a *prop* (an
 * avatar diameter, a size token) has to change with the viewport.
 *
 * SSR / test safe: reports `false` where `matchMedia` does not exist.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
