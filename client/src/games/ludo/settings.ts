import { useEffect, useState } from "react";

export interface LudoSettings {
  colorBlindMode: boolean;
  highContrast: boolean;
  theme: "classic" | "neon" | "paper";
  showHoverPreview: boolean;
}

const KEY = "mpg.ludo.settings";
const DEFAULTS: LudoSettings = {
  colorBlindMode: false,
  highContrast: false,
  theme: "classic",
  showHoverPreview: true,
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
