import { useEffect, useState } from "react";

/**
 * Which visual theme the Hand Cricket board renders.
 *
 * Hand-Cricket-only, unlike ../skin.ts (which RPS also reads) — "doordarshan"
 * is built from cricket-specific iconography with no RPS equivalent, so
 * sharing one app-wide toggle would force RPS to either grow a matching skin
 * it doesn't need or silently ignore a value meant for this game.
 * "nostalgia" mirrors ../skin.ts's notebook look (Hand Cricket kept it after
 * user feedback that a "Gully Cricket" street theme didn't land — see git
 * history — while "doordarshan" was well received and stayed).
 *
 * Same store shape as ../skin.ts (module-level value + listener set) rather
 * than a Context: read deep inside prop-driven presentational trees, and the
 * value changes roughly never, so a provider buys nothing.
 */
export type HcSkin = "broadcast" | "doordarshan" | "nostalgia";

export const HC_SKINS: readonly { id: HcSkin; label: string }[] = [
  { id: "broadcast", label: "Broadcast" },
  { id: "doordarshan", label: "Rerun" },
  { id: "nostalgia", label: "Classic" },
];

const KEY = "mpg.hc.skin";
const DEFAULT: HcSkin = "broadcast";

function isHcSkin(v: unknown): v is HcSkin {
  return v === "broadcast" || v === "doordarshan" || v === "nostalgia";
}

function load(): HcSkin {
  try {
    const raw = localStorage.getItem(KEY);
    return isHcSkin(raw) ? raw : DEFAULT;
  } catch {
    // SSR / private-mode — fall back rather than throwing at module load,
    // which would take the whole board down.
    return DEFAULT;
  }
}

let _skin: HcSkin = load();
const _listeners = new Set<(s: HcSkin) => void>();

export function getHcSkin(): HcSkin {
  return _skin;
}

export function setHcSkin(next: HcSkin): void {
  if (next === _skin) return;
  _skin = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore — preference just won't survive the session */
  }
  for (const fn of _listeners) fn(_skin);
}

/** Subscribe a component to the current Hand Cricket theme. */
export function useHcSkin(): [HcSkin, (s: HcSkin) => void] {
  const [s, setS] = useState<HcSkin>(_skin);
  useEffect(() => {
    const fn = (n: HcSkin) => setS(n);
    _listeners.add(fn);
    // Re-sync on mount: another tab (or a toggle rendered before this
    // mounted) may have moved the value since our lazy initializer ran.
    setS(_skin);
    return () => {
      _listeners.delete(fn);
    };
  }, []);
  return [s, setHcSkin];
}
