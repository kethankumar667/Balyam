import { useEffect, useState } from "react";

/**
 * Which visual skin the presentational shells render.
 *
 *   "broadcast" — professional sports-broadcast chrome (the default): dark
 *                 stadium surfaces, gold accents, tabular scores, stroke icons.
 *   "nostalgia" — the original ruled-parchment notebook / scrapbook look.
 *   "gully"     — authentic street alley cricket: asphalt, chalk markings, taped tennis balls.
 *   "neon"      — futuristic cyber stadium: pitch black void, electric cyan & laser glows.
 *   "arcade"    — 90s handheld 8-bit LCD & arcade CRT: dot-matrix fonts, chunky pixel buttons.
 *   "heritage"  — vintage pavilion: rich mahogany woodgrain, ivory parchment, polished brass.
 */
export type GameSkin = "broadcast" | "nostalgia" | "gully" | "neon" | "arcade" | "heritage";

export interface SkinMeta {
  id: GameSkin;
  name: string;
  tag: string;
  description: string;
  icon: string;
  previewBg: string;
  accent: string;
  badge: string;
}

export const ALL_SKINS: GameSkin[] = [
  "broadcast",
  "nostalgia",
  "gully",
  "neon",
  "arcade",
  "heritage",
];

export const THEME_CATALOG: Record<GameSkin, SkinMeta> = {
  broadcast: {
    id: "broadcast",
    name: "Broadcast Pro",
    tag: "TV Arena",
    description: "Sleek televised sports graphics with gold highlights, tabular figures & floodlights.",
    icon: "📺",
    previewBg: "linear-gradient(135deg, #050B14 0%, #0D1B2A 100%)",
    accent: "#F5C451",
    badge: "PRO",
  },
  nostalgia: {
    id: "nostalgia",
    name: "Classic Notebook",
    tag: "Sketchbook",
    description: "Hand-drawn pencil sketches, ruled schoolbook paper, washi tape & ink stamps.",
    icon: "📝",
    previewBg: "linear-gradient(135deg, #FAF6EA 0%, #F5E9C4 100%)",
    accent: "#166534",
    badge: "CLASSIC",
  },
  gully: {
    id: "gully",
    name: "Gully Street",
    tag: "Street Alley",
    description: "Chalk score markings on concrete walls, taped tennis balls & asphalt alley vibes.",
    icon: "🏏",
    previewBg: "linear-gradient(135deg, #18181B 0%, #27272A 100%)",
    accent: "#EAB308",
    badge: "STREET",
  },
  neon: {
    id: "neon",
    name: "Midnight Cyber",
    tag: "Neon Arena",
    description: "Deep stadium void with laser glows, holographic HUDs & electric cyan field lines.",
    icon: "⚡",
    previewBg: "linear-gradient(135deg, #060813 0%, #0F172A 100%)",
    accent: "#06B6D4",
    badge: "CYBER",
  },
  arcade: {
    id: "arcade",
    name: "8-Bit Arcade",
    tag: "Retro LCD",
    description: "90s handheld LCD & CRT arcade, dot-matrix scoreboard & chunky tactile buttons.",
    icon: "🕹️",
    previewBg: "linear-gradient(135deg, #1C2412 0%, #2D3A1F 100%)",
    accent: "#8BAC0F",
    badge: "RETRO",
  },
  heritage: {
    id: "heritage",
    name: "Vintage Pavilion",
    tag: "Club House",
    description: "Rich mahogany woodgrain, ivory parchment scorecards, polished brass & turf green.",
    icon: "🏛️",
    previewBg: "linear-gradient(135deg, #2B1810 0%, #3D2216 100%)",
    accent: "#D97706",
    badge: "CLUB",
  },
};

const KEY = "mpg.skin";
const DEFAULT: GameSkin = "broadcast";

function load(): GameSkin {
  try {
    const raw = localStorage.getItem(KEY);
    return ALL_SKINS.includes(raw as GameSkin) ? (raw as GameSkin) : DEFAULT;
  } catch {
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
    /* ignore */
  }
  for (const fn of _listeners) fn(_skin);
}

/** Subscribe a component to the current skin. */
export function useSkin(): [GameSkin, (s: GameSkin) => void] {
  const [s, setS] = useState<GameSkin>(_skin);
  useEffect(() => {
    const fn = (n: GameSkin) => setS(n);
    _listeners.add(fn);
    setS(_skin);
    return () => {
      _listeners.delete(fn);
    };
  }, []);
  return [s, setSkin];
}
