import { useEffect, useState } from "react";

export type AppTheme = "light" | "dark";

const STORAGE_KEY = "bhalyam.theme";
const EVENT_NAME = "bhalyam.theme.changed";

/**
 * What a first-time visitor sees.
 *
 * This used to be `prefers-color-scheme`, which meant anyone whose laptop was
 * set to dark met BHALYAM dark — and BHALYAM's identity is warm cream paper
 * and gold. First impressions are the one moment the app does not get to
 * explain itself, so it opens in the palette it was designed in.
 *
 * Nothing is taken away by this: the toggle is still there and a choice is
 * still remembered forever, so someone who wants dark flips it once.
 */
const DEFAULT_THEME: AppTheme = "light";

/**
 * Resolve the theme from, in order: the attribute already on the page, a
 * stored choice, then the default.
 *
 * Exported because `main.tsx` has to stamp the attribute before React mounts
 * to avoid a flash of the wrong palette, and it previously re-implemented this
 * chain by hand — two copies of a rule that has to agree, which is exactly how
 * a default drifts in one place and not the other.
 */
export function resolveTheme(): AppTheme {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return DEFAULT_THEME;
  }
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Ignore localStorage access errors
  }
  return DEFAULT_THEME;
}

const readTheme = resolveTheme;

export function setTheme(next: AppTheme): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  document.documentElement.setAttribute("data-theme", next);
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Ignore localStorage access errors
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useTheme(): readonly [AppTheme, () => void] {
  const [theme, setLocal] = useState<AppTheme>(readTheme);

  useEffect(() => {
    const sync = () => setLocal(readTheme());
    window.addEventListener(EVENT_NAME, sync);
    return () => window.removeEventListener(EVENT_NAME, sync);
  }, []);

  const toggle = () => setTheme(theme === "light" ? "dark" : "light");
  return [theme, toggle] as const;
}
