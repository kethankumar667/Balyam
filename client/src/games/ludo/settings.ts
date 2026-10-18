import { useEffect, useState } from "react";
/**
 * Ludo's display settings, kept on this device. The board's LOOK is no longer one of them: the table's world is chosen
 * by the host and seen by everyone (see `shared/worlds.ts`), so no player can pick a look for themselves, and a world
 * never switches the app between light and dark. A `theme` left in storage by an older version is ignored.
 */

export interface LudoSettings {
  colorBlindMode: boolean;
  highContrast: boolean;
  showHoverPreview: boolean;
  reducedMotion: boolean;
  goldenTokens: boolean;
  woodenDice: boolean;
}

const KEY = "mpg.ludo.settings";
const DEFAULTS: LudoSettings = {
  colorBlindMode: false,
  highContrast: false,
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
