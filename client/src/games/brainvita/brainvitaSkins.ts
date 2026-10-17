import { GOLD, GOLD_SOFT, PLANK_BACKGROUND, PLANK_BORDER, PLANK_SHADOW, TABLE_BACKGROUND } from "./brainvitaTheme";

/**
 * The board's looks. The classic wood table is the default and always available; the holo table is earned
 * by playing well, never bought. A skin is only a bundle of paint: it changes no rule, no score and no
 * control, so a game played on either is the same game and posts the same result.
 */

export type SkinId = "wood" | "holo";

export const SKIN_STORAGE_KEY = "bhalyam.brainvita.skin";
export const UNLOCKED_STORAGE_KEY = "bhalyam.brainvita.unlocked";
export const TILT_STORAGE_KEY = "bhalyam.brainvita.tilt";

/** Finish an unassisted game with this many marbles left, or fewer, to earn the holo table. */
export const HOLO_UNLOCK_MAX_MARBLES = 4;

export interface SkinTokens {
  id: SkinId;
  name: string;
  /** What a player does to earn it, or null for a skin everyone has. */
  unlockHint: string | null;
  /** Which board surface to draw. */
  surface: "wood" | "holo";
  accent: string;
  accentSoft: string;
  /** The second colour: the selected marble's glow in the holo skin. */
  accentAlt: string;
  tableBackground: string;
  plankBackground: string;
  plankBorder: string;
  plankShadow: string;
  /** Round and pill buttons in the header. */
  chipBackground: string;
  chipBorder: string;
  /** The side panel on a wide screen. */
  panelBackground: string;
  panelBorder: string;
  signBackground: string;
  signBorder: string;
  signShadow: string;
  titleColor: string;
  titleShadow: string;
  titleStroke: string;
  holeWell: string;
  holeRim: string;
  marbleFill: string;
  marbleShadow: string;
  marbleSelectedShadow: string;
}

const WOOD: SkinTokens = {
  id: "wood",
  name: "Classic wood",
  unlockHint: null,
  surface: "wood",
  accent: GOLD,
  accentSoft: GOLD_SOFT,
  accentAlt: GOLD,
  tableBackground: TABLE_BACKGROUND,
  plankBackground: PLANK_BACKGROUND,
  plankBorder: PLANK_BORDER,
  plankShadow: PLANK_SHADOW,
  chipBackground: "rgba(42,22,10,0.85)",
  chipBorder: "1px solid rgba(228,177,40,0.4)",
  panelBackground: "rgba(27,14,5,0.6)",
  panelBorder: "1px solid rgba(228,177,40,0.2)",
  signBackground: "linear-gradient(180deg, #8a5629 0%, #5f3615 100%)",
  signBorder: "2px solid #c99a4a",
  signShadow: "0 6px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,226,170,0.35)",
  titleColor: GOLD_SOFT,
  titleShadow: "0 2px 0 #4a2608, 0 3px 8px rgba(0,0,0,0.55)",
  titleStroke: "0.6px #5a3210",
  holeWell: "radial-gradient(circle at 38% 30%, #4a2a12 0%, #24120a 62%, #130a04 100%)",
  holeRim: "inset 0 4px 7px rgba(0,0,0,0.8), 0 1px 0 rgba(255,222,165,0.5), 0 -1px 0 rgba(60,28,8,0.45)",
  marbleFill: "radial-gradient(circle at 34% 27%, #f4feff 0%, #7fd9ef 17%, #2aa0dd 46%, #146cb4 74%, #0a3f78 100%)",
  marbleShadow: "0 4px 6px rgba(0,0,0,0.55), inset 0 -5px 9px rgba(0,50,110,0.5)",
  marbleSelectedShadow: "0 10px 12px rgba(0,0,0,0.5), inset 0 -5px 9px rgba(0,50,110,0.5)",
};

const HOLO: SkinTokens = {
  id: "holo",
  name: "Holo",
  unlockHint: `Finish a game with ${HOLO_UNLOCK_MAX_MARBLES} or fewer marbles left, without a hint or undo.`,
  surface: "holo",
  accent: "#22D3EE",
  accentSoft: "#A5F3FC",
  accentAlt: "#E879F9",
  tableBackground: "radial-gradient(ellipse at 50% 24%, #10305a 0%, #081a36 46%, #030814 100%)",
  plankBackground: "linear-gradient(180deg, rgba(14,42,74,0.8) 0%, rgba(5,17,38,0.88) 100%)",
  plankBorder: "1px solid rgba(34,211,238,0.5)",
  plankShadow: "0 0 18px rgba(34,211,238,0.16), 0 6px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(165,243,252,0.2)",
  chipBackground: "rgba(8,26,54,0.82)",
  chipBorder: "1px solid rgba(34,211,238,0.5)",
  panelBackground: "rgba(4,14,32,0.62)",
  panelBorder: "1px solid rgba(34,211,238,0.22)",
  signBackground: "linear-gradient(180deg, rgba(12,36,66,0.92) 0%, rgba(4,14,32,0.94) 100%)",
  signBorder: "2px solid #22D3EE",
  signShadow: "0 0 22px rgba(34,211,238,0.4), inset 0 0 14px rgba(34,211,238,0.14)",
  titleColor: "#BFF6FF",
  titleShadow: "0 0 10px rgba(34,211,238,0.9), 0 0 24px rgba(34,211,238,0.5)",
  titleStroke: "0px transparent",
  holeWell: "radial-gradient(circle at 50% 50%, #020a18 0%, #06182f 72%, #0a2447 100%)",
  holeRim: "inset 0 0 0 2px rgba(34,211,238,0.6), 0 0 10px rgba(34,211,238,0.35), inset 0 3px 6px rgba(0,0,0,0.7)",
  marbleFill: "radial-gradient(circle at 36% 30%, #ffffff 0%, #c4f8ff 13%, #22D3EE 40%, #0e7490 74%, #083344 100%)",
  marbleShadow: "0 0 14px rgba(34,211,238,0.75), 0 3px 5px rgba(0,0,0,0.5), inset 0 -4px 8px rgba(3,40,70,0.55)",
  marbleSelectedShadow: "0 0 18px rgba(232,121,249,0.85), 0 10px 12px rgba(0,0,0,0.5), inset 0 -4px 8px rgba(3,40,70,0.55)",
};

export const SKINS: Readonly<Record<SkinId, SkinTokens>> = { wood: WOOD, holo: HOLO };
export const SKIN_IDS: readonly SkinId[] = ["wood", "holo"];

export const isSkinId = (value: unknown): value is SkinId => value === "wood" || value === "holo";

/** True when a finished game earns the holo table: unassisted, and few enough marbles left. */
export function earnsHolo(result: { marblesLeft: number; usedHelp: boolean }): boolean {
  return !result.usedHelp && result.marblesLeft <= HOLO_UNLOCK_MAX_MARBLES;
}

/** Which skins a stored list names. Wood is always there, and anything unrecognised is ignored. */
export function parseUnlocked(raw: string | null): readonly SkinId[] {
  if (!raw) return ["wood"];
  const named = raw.split(",").map((part) => part.trim()).filter(isSkinId);
  return Array.from(new Set<SkinId>(["wood", ...named]));
}

/** The skin to show: the stored choice, but only if it is one this player has actually earned. */
export function resolveSkin(stored: string | null, unlocked: readonly SkinId[]): SkinId {
  return isSkinId(stored) && unlocked.includes(stored) ? stored : "wood";
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not being able to remember a choice must never break playing.
  }
}

export const loadUnlocked = (): readonly SkinId[] => parseUnlocked(read(UNLOCKED_STORAGE_KEY));
export const loadSkin = (): SkinId => resolveSkin(read(SKIN_STORAGE_KEY), loadUnlocked());
export const saveSkin = (skin: SkinId): void => write(SKIN_STORAGE_KEY, skin);
export const saveUnlocked = (unlocked: readonly SkinId[]): void => write(UNLOCKED_STORAGE_KEY, unlocked.join(","));
export const loadTilt = (): boolean => read(TILT_STORAGE_KEY) === "true";
export const saveTilt = (isOn: boolean): void => write(TILT_STORAGE_KEY, String(isOn));
