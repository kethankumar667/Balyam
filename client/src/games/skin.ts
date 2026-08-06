import { useEffect, useState } from "react";

/**
 * Which visual skin the presentational shells render.
 *
 *   "broadcast" — professional sports-broadcast chrome (the default): dark
 *                 stadium surfaces, gold accents, tabular scores, stroke icons.
 *   "nostalgia" — the original ruled-parchment notebook / scrapbook look.
 *
 * Deliberately ONE app-wide preference rather than per-game. Both games that
 * carry two skins are the same "school-yard game, grown up" pair, and a player
 * who wants the notebook look wants it everywhere — a per-game setting would
 * mean finding the toggle twice to get a consistent table.
 *
 * Same store shape as ludo/settings.ts (module-level value + listener set)
 * rather than a Context: skin is read deep inside presentational components
 * that are otherwise prop-driven, and threading a provider through both
 * board trees buys nothing when the value changes roughly never.
 */
export type GameSkin = "broadcast" | "nostalgia";

const KEY = "mpg.skin";
const DEFAULT: GameSkin = "broadcast";

function load(): GameSkin {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === "nostalgia" || raw === "broadcast" ? raw : DEFAULT;
  } catch {
    // SSR / private-mode — fall back to the default rather than throwing at
    // module load, which would take the whole board down.
    return DEFAULT;
  }
}

let _skin: GameSkin = load();
const _listeners = new Set<(s: GameSkin) => void>();

export function getSkin(): GameSkin {
  return _skin;
}

export function setSkin(next: GameSkin): void {
  if (next === _skin) return;
  _skin = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore — preference just won't survive the session */
  }
  for (const fn of _listeners) fn(_skin);
}

/** Subscribe a component to the current skin. */
export function useSkin(): [GameSkin, (s: GameSkin) => void] {
  const [s, setS] = useState<GameSkin>(_skin);
  useEffect(() => {
    const fn = (n: GameSkin) => setS(n);
    _listeners.add(fn);
    // Re-sync on mount: another tab (or a toggle rendered before this mounted)
    // may have moved the value since our lazy initializer ran.
    setS(_skin);
    return () => {
      _listeners.delete(fn);
    };
  }, []);
  return [s, setSkin];
}
