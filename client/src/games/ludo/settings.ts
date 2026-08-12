import { useEffect, useState } from "react";

/**
 * Board themes.
 *
 * Surface only — paper, cells, grid ink, stars, hub. Seat colours are player
 * identity and never change with the theme (see the Ludo theme block in
 * index.css for why). Each id must have a matching `.theme-<id>` variable
 * block there; `LUDO_THEME_LABELS` below is what the picker renders.
 */
export const LUDO_THEMES = [
  "classic",
  "paper",
  "neon",
  "emerald",
  "midnight",
  "sunset",
] as const;

export type LudoTheme = (typeof LUDO_THEMES)[number];

export const LUDO_THEME_LABELS: Record<LudoTheme, string> = {
  classic: "Classic",
  paper: "Paper",
  neon: "Neon",
  emerald: "Emerald",
  midnight: "Midnight",
  sunset: "Sunset",
};

/** Two-stop swatch for the picker: board field over grid ink. */
export const LUDO_THEME_SWATCH: Record<LudoTheme, [string, string]> = {
  classic: ["#ffffff", "#23201E"],
  paper: ["#F6EFE0", "#6B563C"],
  neon: ["#1B1650", "#6D28D9"],
  emerald: ["#14624A", "#08301F"],
  midnight: ["#253044", "#0B0F18"],
  sunset: ["#FFE3C4", "#9A4B23"],
};

export interface LudoSettings {
  colorBlindMode: boolean;
  highContrast: boolean;
  theme: LudoTheme;
  showHoverPreview: boolean;
  reducedMotion: boolean;
  goldenTokens: boolean;
  woodenDice: boolean;
}

const KEY = "mpg.ludo.settings";
const DEFAULTS: LudoSettings = {
  colorBlindMode: false,
  highContrast: false,
  theme: "classic",
  showHoverPreview: true,
  reducedMotion: false,
  goldenTokens: false,
  woodenDice: false,
};

function load(): LudoSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

let _settings = load();
const _listeners = new Set<(s: LudoSettings) => void>();

export function useLudoSettings(): [
  LudoSettings,
  (patch: Partial<LudoSettings>) => void
] {
  const [s, setS] = useState<LudoSettings>(_settings);
  useEffect(() => {
    const fn = (n: LudoSettings) => setS(n);
    _listeners.add(fn);
    return () => {
      _listeners.delete(fn);
    };
  }, []);
  function update(patch: Partial<LudoSettings>): void {
    _settings = { ..._settings, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(_settings));
    } catch {
      /* ignore */
    }
    for (const fn of _listeners) fn(_settings);
  }
  return [s, update];
}

/** OS preference OR the in-app override — calms confetti, emoji rain, and
 * the step-by-step token walk. Not reactive to a live OS-pref change
 * mid-session (Ludo settings aren't reactive to that either); fine for one match. */
export function prefersReducedMotion(s: LudoSettings): boolean {
  return s.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
