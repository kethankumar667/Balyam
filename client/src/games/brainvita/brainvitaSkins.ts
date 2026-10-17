import { GOLD, GOLD_SOFT } from "./brainvitaTheme";

/**
 * The board's looks. The classic wood table is where everyone starts and is always available. Five more
 * are earned by playing well, never bought: finishing a game with 5 or fewer marbles left earns the first,
 * 4 or fewer the second, and so on down to a single marble for the fifth. WHICH theme sits on which rung is
 * shuffled once for each player, so two people climbing the same ladder meet the themes in different orders.
 * A skin is only a bundle of paint: it changes no rule, no score and no control.
 */

export type EarnedSkinId = "holo" | "aurora" | "ebony" | "jade" | "copper";
export type SkinId = "wood" | EarnedSkinId;

export const EARNED_SKINS: readonly EarnedSkinId[] = ["holo", "aurora", "ebony", "jade", "copper"];
export const SKIN_IDS: readonly SkinId[] = ["wood", ...EARNED_SKINS];

export const SKIN_STORAGE_KEY = "bhalyam.brainvita.skin";
export const UNLOCKED_STORAGE_KEY = "bhalyam.brainvita.unlocked";
export const ORDER_STORAGE_KEY = "bhalyam.brainvita.themeorder";

/** The marbles a clean game may leave, or fewer, to earn each rung of the ladder, easiest first. */
export const TIER_MARBLES: readonly number[] = [5, 4, 3, 2, 1];

/** Paint for a wooden-style board: three stops of the top face, the thick edge, the grain, the groove and the carved sprigs. */
export interface BoardPalette {
  stops: readonly [string, string, string];
  side: string;
  edge: string;
  grainDark: string;
  grainLight: string;
  grooveDark: string;
  grooveLight: string;
  sprigDark: string;
  sprigLight: string;
}

/** Paint for a glass-style board: the pane's gradient and a sheen across its top corner. */
export interface GlassPalette {
  top: string;
  mid: string;
  bottom: string;
  sheen: string;
  shadow: string;
}

export interface SkinTokens {
  id: SkinId;
  name: string;
  /** Which board surface to draw, and which props to lay in its corners. */
  surface: "wood" | "holo";
  board: BoardPalette | null;
  glass: GlassPalette | null;
  accent: string;
  accentSoft: string;
  /** The second colour: the selected marble's glow in the glass skins. */
  accentAlt: string;
  /** The five stops of a marble's glass gradient, highlight first. */
  marbleStops: readonly [string, string, string, string, string];
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

/** "#rrggbb" and an alpha as an rgba() colour. */
export function rgba(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export const marbleGradient = (stops: readonly string[]): string =>
  `radial-gradient(circle at 34% 27%, ${stops[0]} 0%, ${stops[1]} 17%, ${stops[2]} 46%, ${stops[3]} 74%, ${stops[4]} 100%)`;

interface SolidSpec {
  id: SkinId;
  name: string;
  accent: string;
  accentSoft: string;
  table: readonly [string, string, string];
  plankTop: string;
  plankBottom: string;
  signTop: string;
  signBottom: string;
  signEdge: string;
  titleStroke: string;
  board: BoardPalette;
  marbleStops: SkinTokens["marbleStops"];
  well: readonly [string, string, string];
  rimLight: string;
}

/** A skin whose board is a carved solid: wood, ebony, jade, copper. */
function solidSkin(spec: SolidSpec): SkinTokens {
  const { accent, accentSoft, marbleStops } = spec;
  return {
    id: spec.id,
    name: spec.name,
    surface: "wood",
    board: spec.board,
    glass: null,
    accent,
    accentSoft,
    accentAlt: accent,
    marbleStops,
    tableBackground: `radial-gradient(ellipse at 50% 0%, ${spec.table[0]} 0%, ${spec.table[1]} 46%, ${spec.table[2]} 100%)`,
    plankBackground: `linear-gradient(180deg, ${rgba(spec.plankTop, 0.93)} 0%, ${rgba(spec.plankBottom, 0.95)} 100%)`,
    plankBorder: `1px solid ${rgba(accent, 0.38)}`,
    plankShadow: `0 6px 14px rgba(0,0,0,0.42), inset 0 1px 0 ${rgba(accentSoft, 0.16)}`,
    chipBackground: rgba(spec.plankBottom, 0.85),
    chipBorder: `1px solid ${rgba(accent, 0.4)}`,
    panelBackground: rgba(spec.table[2], 0.6),
    panelBorder: `1px solid ${rgba(accent, 0.2)}`,
    signBackground: `linear-gradient(180deg, ${spec.signTop} 0%, ${spec.signBottom} 100%)`,
    signBorder: `2px solid ${spec.signEdge}`,
    signShadow: `0 6px 14px rgba(0,0,0,0.5), inset 0 1px 0 ${rgba(accentSoft, 0.35)}`,
    titleColor: accentSoft,
    titleShadow: `0 2px 0 ${spec.signBottom}, 0 3px 8px rgba(0,0,0,0.55)`,
    titleStroke: `0.6px ${spec.titleStroke}`,
    holeWell: `radial-gradient(circle at 38% 30%, ${spec.well[0]} 0%, ${spec.well[1]} 62%, ${spec.well[2]} 100%)`,
    holeRim: `inset 0 4px 7px rgba(0,0,0,0.8), 0 1px 0 ${spec.rimLight}, 0 -1px 0 rgba(0,0,0,0.35)`,
    marbleFill: marbleGradient(marbleStops),
    marbleShadow: `0 4px 6px rgba(0,0,0,0.55), inset 0 -5px 9px ${rgba(marbleStops[4], 0.5)}`,
    marbleSelectedShadow: `0 10px 12px rgba(0,0,0,0.5), inset 0 -5px 9px ${rgba(marbleStops[4], 0.5)}`,
  };
}

interface GlassSpec {
  id: SkinId;
  name: string;
  accent: string;
  accentSoft: string;
  accentAlt: string;
  table: readonly [string, string, string];
  plankTop: string;
  plankBottom: string;
  signTop: string;
  signBottom: string;
  glass: GlassPalette;
  marbleStops: SkinTokens["marbleStops"];
  well: readonly [string, string, string];
}

/** A skin whose board is a pane of glowing glass: holo, aurora. */
function glassSkin(spec: GlassSpec): SkinTokens {
  const { accent, accentSoft, accentAlt, marbleStops } = spec;
  return {
    id: spec.id,
    name: spec.name,
    surface: "holo",
    board: null,
    glass: spec.glass,
    accent,
    accentSoft,
    accentAlt,
    marbleStops,
    tableBackground: `radial-gradient(ellipse at 50% 24%, ${spec.table[0]} 0%, ${spec.table[1]} 46%, ${spec.table[2]} 100%)`,
    plankBackground: `linear-gradient(180deg, ${rgba(spec.plankTop, 0.8)} 0%, ${rgba(spec.plankBottom, 0.88)} 100%)`,
    plankBorder: `1px solid ${rgba(accent, 0.5)}`,
    plankShadow: `0 0 18px ${rgba(accent, 0.16)}, 0 6px 14px rgba(0,0,0,0.45), inset 0 1px 0 ${rgba(accentSoft, 0.2)}`,
    chipBackground: rgba(spec.plankBottom, 0.82),
    chipBorder: `1px solid ${rgba(accent, 0.5)}`,
    panelBackground: rgba(spec.table[2], 0.62),
    panelBorder: `1px solid ${rgba(accent, 0.22)}`,
    signBackground: `linear-gradient(180deg, ${rgba(spec.signTop, 0.92)} 0%, ${rgba(spec.signBottom, 0.94)} 100%)`,
    signBorder: `2px solid ${accent}`,
    signShadow: `0 0 22px ${rgba(accent, 0.4)}, inset 0 0 14px ${rgba(accent, 0.14)}`,
    titleColor: accentSoft,
    titleShadow: `0 0 10px ${rgba(accent, 0.9)}, 0 0 24px ${rgba(accent, 0.5)}`,
    titleStroke: "0px transparent",
    holeWell: `radial-gradient(circle at 50% 50%, ${spec.well[0]} 0%, ${spec.well[1]} 72%, ${spec.well[2]} 100%)`,
    holeRim: `inset 0 0 0 2px ${rgba(accent, 0.6)}, 0 0 10px ${rgba(accent, 0.35)}, inset 0 3px 6px rgba(0,0,0,0.7)`,
    marbleFill: marbleGradient(marbleStops),
    marbleShadow: `0 0 14px ${rgba(accent, 0.75)}, 0 3px 5px rgba(0,0,0,0.5), inset 0 -4px 8px ${rgba(marbleStops[4], 0.55)}`,
    marbleSelectedShadow: `0 0 18px ${rgba(accentAlt, 0.85)}, 0 10px 12px rgba(0,0,0,0.5), inset 0 -4px 8px ${rgba(marbleStops[4], 0.55)}`,
  };
}

const WOOD = solidSkin({
  id: "wood",
  name: "Classic wood",
  accent: GOLD,
  accentSoft: GOLD_SOFT,
  table: ["#6b3f1d", "#4a2a13", "#2b160a"],
  plankTop: "#563218",
  plankBottom: "#301b0c",
  signTop: "#8a5629",
  signBottom: "#5f3615",
  signEdge: "#c99a4a",
  titleStroke: "#5a3210",
  board: {
    stops: ["#e6a965", "#cb8745", "#a96629"],
    side: "#74401a",
    edge: "rgba(255,238,196,0.55)",
    grainDark: "rgba(92,46,12,0.17)",
    grainLight: "rgba(255,228,175,0.12)",
    grooveDark: "rgba(84,42,12,0.6)",
    grooveLight: "rgba(255,232,184,0.5)",
    sprigDark: "rgba(86,44,14,0.6)",
    sprigLight: "rgba(255,230,180,0.42)",
  },
  marbleStops: ["#f4feff", "#7fd9ef", "#2aa0dd", "#146cb4", "#0a3f78"],
  well: ["#4a2a12", "#24120a", "#130a04"],
  rimLight: "rgba(255,222,165,0.5)",
});

const EBONY = solidSkin({
  id: "ebony",
  name: "Ebony and gold",
  accent: "#E4B128",
  accentSoft: "#F6D57A",
  table: ["#3a2f32", "#221a1c", "#0f0b0c"],
  plankTop: "#2b2224",
  plankBottom: "#151011",
  signTop: "#3d3033",
  signBottom: "#1d1517",
  signEdge: "#d4a82e",
  titleStroke: "#0f0b0c",
  board: {
    stops: ["#5b4a47", "#3a2d2b", "#231a19"],
    side: "#0c0808",
    edge: "rgba(240,205,130,0.45)",
    grainDark: "rgba(0,0,0,0.3)",
    grainLight: "rgba(255,225,180,0.08)",
    grooveDark: "rgba(0,0,0,0.65)",
    grooveLight: "rgba(228,177,40,0.6)",
    sprigDark: "rgba(228,177,40,0.62)",
    sprigLight: "rgba(0,0,0,0.5)",
  },
  marbleStops: ["#fff1f1", "#ffb4b4", "#e11d48", "#9f1239", "#4c0519"],
  well: ["#1a1213", "#0b0707", "#050303"],
  rimLight: "rgba(228,177,40,0.45)",
});

const JADE = solidSkin({
  id: "jade",
  name: "Jade",
  accent: "#F0D58A",
  accentSoft: "#FBEBC0",
  table: ["#1c4a37", "#10301f", "#07170f"],
  plankTop: "#1d4733",
  plankBottom: "#0d261a",
  signTop: "#2f7456",
  signBottom: "#17402f",
  signEdge: "#d9c070",
  titleStroke: "#0d261a",
  board: {
    stops: ["#8ccaa6", "#58a583", "#34765e"],
    side: "#1c4637",
    edge: "rgba(225,255,238,0.55)",
    grainDark: "rgba(20,70,50,0.24)",
    grainLight: "rgba(235,255,244,0.16)",
    grooveDark: "rgba(18,64,46,0.6)",
    grooveLight: "rgba(235,255,244,0.5)",
    sprigDark: "rgba(20,70,50,0.55)",
    sprigLight: "rgba(240,255,248,0.4)",
  },
  marbleStops: ["#ffffff", "#fff7e6", "#f1dfba", "#cdb68a", "#8f7a52"],
  well: ["#12362a", "#0a2219", "#04120c"],
  rimLight: "rgba(220,255,235,0.45)",
});

const COPPER = solidSkin({
  id: "copper",
  name: "Copper",
  accent: "#FBBF77",
  accentSoft: "#FFE0B8",
  table: ["#5c3020", "#3a1d12", "#1c0d07"],
  plankTop: "#4d2616",
  plankBottom: "#26110a",
  signTop: "#a8602f",
  signBottom: "#6e3519",
  signEdge: "#f0b57a",
  titleStroke: "#3a1b0d",
  board: {
    stops: ["#e8a778", "#c4703d", "#8f4724"],
    side: "#5a2a12",
    edge: "rgba(255,228,196,0.6)",
    grainDark: "rgba(90,40,15,0.2)",
    grainLight: "rgba(255,222,184,0.18)",
    grooveDark: "rgba(80,35,12,0.6)",
    grooveLight: "rgba(255,222,184,0.5)",
    sprigDark: "rgba(80,35,12,0.55)",
    sprigLight: "rgba(255,228,196,0.45)",
  },
  marbleStops: ["#f0fffb", "#99f6e4", "#14b8a6", "#0f766e", "#134e4a"],
  well: ["#3a1c10", "#1d0d07", "#0e0603"],
  rimLight: "rgba(255,210,170,0.5)",
});

const HOLO = glassSkin({
  id: "holo",
  name: "Holo",
  accent: "#22D3EE",
  accentSoft: "#A5F3FC",
  accentAlt: "#E879F9",
  table: ["#10305a", "#081a36", "#030814"],
  plankTop: "#0e2a4a",
  plankBottom: "#051126",
  signTop: "#0c2442",
  signBottom: "#040e20",
  glass: { top: "rgba(40,110,170,0.5)", mid: "rgba(10,40,78,0.62)", bottom: "rgba(5,20,44,0.74)", sheen: "rgba(190,245,255,0.22)", shadow: "rgba(2,10,24,0.7)" },
  marbleStops: ["#ffffff", "#c4f8ff", "#22D3EE", "#0e7490", "#083344"],
  well: ["#020a18", "#06182f", "#0a2447"],
});

const AURORA = glassSkin({
  id: "aurora",
  name: "Aurora",
  accent: "#C084FC",
  accentSoft: "#E9D5FF",
  accentAlt: "#F472B6",
  table: ["#2c1c5e", "#150c3a", "#06031a"],
  plankTop: "#241552",
  plankBottom: "#0e0828",
  signTop: "#221250",
  signBottom: "#0b0624",
  glass: { top: "rgba(110,60,190,0.5)", mid: "rgba(40,20,90,0.62)", bottom: "rgba(16,8,48,0.76)", sheen: "rgba(233,213,255,0.22)", shadow: "rgba(6,3,20,0.72)" },
  marbleStops: ["#ffffff", "#f3d4ff", "#c084fc", "#7e22ce", "#3b0764"],
  well: ["#08031a", "#140a36", "#1d1048"],
});

export const SKINS: Readonly<Record<SkinId, SkinTokens>> = { wood: WOOD, holo: HOLO, aurora: AURORA, ebony: EBONY, jade: JADE, copper: COPPER };

export const isSkinId = (value: unknown): value is SkinId => typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value);
const isEarnedSkin = (value: unknown): value is EarnedSkinId => typeof value === "string" && (EARNED_SKINS as readonly string[]).includes(value);

/** A fair shuffle of the five earned themes. `random` returns [0, 1) and is only replaced in tests. */
export function shuffleThemes(random: () => number = secureRandom): EarnedSkinId[] {
  const order = [...EARNED_SKINS];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** A random number from the browser's own source where there is one, which a shuffled ladder deserves more than `Math.random`. */
function secureRandom(): number {
  try {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] / 4294967296;
  } catch {
    return Math.random();
  }
}

/** The stored ladder, or null unless it names each of the five themes exactly once. */
export function parseOrder(raw: string | null): EarnedSkinId[] | null {
  if (!raw) return null;
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.length !== EARNED_SKINS.length || !parts.every(isEarnedSkin)) return null;
  const ids = parts as EarnedSkinId[];
  return new Set(ids).size === EARNED_SKINS.length ? ids : null;
}

/** How many marbles a clean game must leave, or fewer, to earn this theme on this player's ladder. */
export const marblesNeeded = (order: readonly EarnedSkinId[], skin: EarnedSkinId): number => TIER_MARBLES[order.indexOf(skin)];

/** Every theme a finished game earns on this player's ladder. Help forfeits all of them. */
export function skinsEarnedBy(result: { marblesLeft: number; usedHelp: boolean }, order: readonly EarnedSkinId[]): EarnedSkinId[] {
  if (result.usedHelp) return [];
  return order.filter((_, tier) => result.marblesLeft <= TIER_MARBLES[tier]);
}

/** What a locked theme asks for, in words. */
export function requirementText(order: readonly EarnedSkinId[], skin: EarnedSkinId): string {
  const needed = marblesNeeded(order, skin);
  return needed === 1
    ? "Finish a game with one marble left, without a hint or undo."
    : `Finish a game with ${needed} or fewer marbles left, without a hint or undo.`;
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
export const saveOrder = (order: readonly EarnedSkinId[]): void => write(ORDER_STORAGE_KEY, order.join(","));

/** This player's ladder: the stored one, or a fresh shuffle that is stored straight away so it never changes. */
export function loadThemeOrder(random?: () => number): EarnedSkinId[] {
  const stored = parseOrder(read(ORDER_STORAGE_KEY));
  if (stored) return stored;
  const fresh = shuffleThemes(random);
  saveOrder(fresh);
  return fresh;
}
