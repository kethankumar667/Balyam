import type { BhalyamGameCard } from "../../components/bhalyam/data";

/**
 * "Who's around?" — the two ways a visitor tells the home page how they want
 * to play, before they pick a game.
 *
 *   friends  a table: friends, family, or bots when nobody is free
 *   solo     a one-player game that needs nobody
 *
 * Deliberately two, not four. Pass & Play is a third real option, but it only
 * works for a handful of games and would turn this into a menu; it stays inside
 * each game's own sheet.
 *
 * ── Why bots are not their own way ────────────────────────────────────
 * Practising against bots was the first thing considered as a third choice, and
 * measuring showed it cannot be one. Every multiplayer game in the catalogue
 * can seat bots, so "against bots" lists exactly the games "with friends" does:
 * a filter that narrows nothing. The two game sets that really differ are
 * "needs a table" (bots can fill it) and "plays alone". Bots are added in the
 * lobby, and the panel under the cards says so.
 */
export type PlayWay = "friends" | "solo";

/** Declared in `lib/privacy/dataInventory.ts`; keep the two in step. */
export const PLAY_WAY_STORAGE_KEY = "bhalyam.playway";

/** URL parameter that makes a way linkable and survives a refresh. */
export const PLAY_WAY_QUERY_PARAM = "way";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

export function isPlayWay(value: unknown): value is PlayWay {
  return value === "friends" || value === "solo";
}

/**
 * A game with both tags (Snake seats one to four) fits both ways, which is
 * right: you can play it alone or with a table.
 */
export function gameFitsWay(game: Pick<BhalyamGameCard, "tags">, way: PlayWay): boolean {
  return game.tags.includes(way === "friends" ? "multiplayer" : "solo");
}

/** Games for a way, or all of them when no way is chosen. Never mutates `games`. */
export function gamesForWay(
  games: readonly BhalyamGameCard[],
  way: PlayWay | null,
): BhalyamGameCard[] {
  return way === null ? [...games] : games.filter((g) => gameFitsWay(g, way));
}

/** A valid link parameter is an explicit request and beats the remembered choice. */
export function resolveInitialWay(param: string | null, stored: PlayWay | null): PlayWay | null {
  return isPlayWay(param) ? param : stored;
}

/** Storage can be blocked (private window, site data cleared), so every access is guarded. */
export function readStoredWay(storage?: ReadableStorage): PlayWay | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(PLAY_WAY_STORAGE_KEY);
    return isPlayWay(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function storeWay(way: PlayWay | null, storage?: WritableStorage): void {
  try {
    const target = storage ?? window.localStorage;
    if (way === null) target.removeItem(PLAY_WAY_STORAGE_KEY);
    else target.setItem(PLAY_WAY_STORAGE_KEY, way);
  } catch {
    // Remembering the choice is a convenience; the page works without it.
  }
}
