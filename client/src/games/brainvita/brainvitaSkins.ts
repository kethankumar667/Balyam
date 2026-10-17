/**
 * The worlds a game can be played in. The classic wood table is where everyone starts and is always available. Five more
 * are earned by playing well, never bought: finishing a game with 5 or fewer marbles left earns the first,
 * 4 or fewer the second, and so on down to a single marble for the fifth. WHICH world sits on which rung is
 * shuffled once for each player, so two people climbing the same ladder meet the worlds in different orders.
 * A world changes how the game looks and sounds: it changes no rule, no score and no control. What each one is
 * made of is in `brainvitaWorlds.ts`.
 */

export type EarnedSkinId = "holo" | "zen" | "reef" | "toy" | "palace";
export type SkinId = "wood" | EarnedSkinId;

export const EARNED_SKINS: readonly EarnedSkinId[] = ["holo", "zen", "reef", "toy", "palace"];
export const SKIN_IDS: readonly SkinId[] = ["wood", ...EARNED_SKINS];

export const SKIN_STORAGE_KEY = "bhalyam.brainvita.skin";
export const UNLOCKED_STORAGE_KEY = "bhalyam.brainvita.unlocked";
export const ORDER_STORAGE_KEY = "bhalyam.brainvita.themeorder";

/** The marbles a clean game may leave, or fewer, to earn each rung of the ladder, easiest first. */
export const TIER_MARBLES: readonly number[] = [5, 4, 3, 2, 1];

export { marbleGradient, rgba } from "./brainvitaSkinKit";
export type { BoardPalette, GlassPalette, MarbleKind, ParticleKind, SignIcon, SkinTokens, Surface, VoiceId } from "./brainvitaSkinKit";
export { SKINS } from "./brainvitaWorlds";

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
