import type { GameKind, Player } from "@shared/types";
import { worldsFor } from "@shared/worlds";

/**
 * How many matches this player has won in each game that has worlds. Winning is how a world is earned (the ladder
 * is in `shared/worlds.ts`), so this is the one number the unlock rests on.
 *
 * It is counted on this device, from the result the table already shows, because the server keeps no history of
 * matches. Two rules keep it from being farmed. A win counts only if at least two real people were at the table
 * (bots and Pass & Play seats are not people), and a room counts once: the code of every counted room is kept, so
 * a redraw of the finished screen or a reload of the page cannot count it again.
 */

export const WORLD_WINS_STORAGE_KEY = "bhalyam.worlds.wins";
/** Told to the page, in this window, whenever the count changes, so a screen showing it can update at once. */
export const WORLD_WINS_CHANGED_EVENT = "bhalyam:world-wins-changed";

export interface WinCounts {
  ludo: number;
  rummy: number;
}

interface Stored {
  wins: WinCounts;
  counted: string[];
}

/** Room codes remembered, newest last. A room is one match, so this is far more than a reload could ever repeat. */
const MAX_COUNTED_ROOMS = 40;
/** No honest count is this high; a damaged value is held to something that still adds and compares sensibly. */
const MAX_WINS = 100_000;

const clean = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(MAX_WINS, Math.floor(value)) : 0);

function read(): Stored {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(WORLD_WINS_STORAGE_KEY) ?? "null");
    if (parsed && typeof parsed === "object") {
      const { wins, counted } = parsed as { wins?: Partial<Record<keyof WinCounts, unknown>>; counted?: unknown };
      return {
        wins: { ludo: clean(wins?.ludo), rummy: clean(wins?.rummy) },
        counted: Array.isArray(counted) ? counted.filter((code): code is string => typeof code === "string").slice(-MAX_COUNTED_ROOMS) : [],
      };
    }
  } catch {
    // Unreadable storage or a damaged value: start again from nothing.
  }
  return { wins: { ludo: 0, rummy: 0 }, counted: [] };
}

export function loadWinCounts(): WinCounts {
  return read().wins;
}

const isCountedGame = (game: GameKind): game is "ludo" | "rummy" => worldsFor(game).length > 0 && (game === "ludo" || game === "rummy");

export interface WinCheck {
  game: GameKind;
  phase: string;
  winnerId: string | null;
  selfId: string | null;
  /** Everyone who sat at the table, as the screen knows them. */
  players: readonly Player[];
}

/**
 * Whether this finished match is a win that earns toward a world: my own seat won it, and at least two real people
 * took part. A Pass & Play seat on my device is not a second person, and a win on one is not mine.
 */
export function countsAsWorldWin({ game, phase, winnerId, selfId, players }: WinCheck): boolean {
  if (!isCountedGame(game) || phase !== "finished" || !winnerId || !selfId || winnerId !== selfId) return false;
  const people = players.filter((player) => !player.isBot && !player.isLocal);
  return people.some((player) => player.id === selfId) && people.length >= 2;
}

/**
 * Notes a win in this room, once. Returns the new counts, or null when nothing changed (a game with no worlds, no
 * room code, or a room already counted). Never throws: not being able to remember a win must not break a match.
 */
export function recordWorldWin(game: GameKind, roomCode: string): WinCounts | null {
  const code = roomCode.trim().toUpperCase();
  if (!isCountedGame(game) || code === "") return null;
  const stored = read();
  if (stored.counted.includes(code)) return null;
  const next: Stored = {
    wins: { ...stored.wins, [game]: Math.min(MAX_WINS, stored.wins[game] + 1) },
    counted: [...stored.counted, code].slice(-MAX_COUNTED_ROOMS),
  };
  try {
    localStorage.setItem(WORLD_WINS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The win stands for this session's screens even if it cannot be kept.
  }
  try {
    window.dispatchEvent(new Event(WORLD_WINS_CHANGED_EVENT));
  } catch {
    // No window to tell: nothing is listening.
  }
  return next.wins;
}
