import type { BhalyamGameCard } from "../../components/bhalyam/data";
import type { PlayWay } from "./playWay";

/**
 * The table builder: "how many of you, and how long have you got?"
 *
 * Two answers narrow the game grid to what can actually be played that way.
 * Both are optional (`null` means "any"), nothing is stored, and nothing is
 * guessed: the numbers come from the same "2–6 Players" and "10–20 min" text the
 * card already shows, so the filter can never disagree with what a player reads.
 *
 * ── Why "within N minutes" compares the LONGEST length ────────────────
 * The first idea was "its shortest length fits". Every game here can be over in
 * ten minutes or less, so that kept all of them and the control did nothing.
 * "It will be finished within N minutes" is also the honest promise to someone
 * with a bus to catch.
 */
export interface TableFit {
  /** Headcount at the table, or null for any. */
  people: number | null;
  /** Minutes available, or null for any. */
  minutes: number | null;
}

export const NO_FIT: TableFit = { people: null, minutes: null };

export const PEOPLE_MIN = 2;
export const PEOPLE_MAX = 12;

/** The time choices offered. Anything longer is "Any", since the longest game runs 30 minutes. */
export const MINUTE_CHOICES = [10, 20] as const;

export interface Range {
  min: number;
  max: number;
}

/** "2–6 Players" -> {2, 6}; "1 Player" -> {1, 1}; "10–20 min" -> {10, 20}. Null when unreadable. */
export function parseRange(text: string | undefined): Range | null {
  if (!text) return null;
  const span = /(\d+)\s*[–-]\s*(\d+)/.exec(text);
  if (span) return { min: Number(span[1]), max: Number(span[2]) };
  const single = /(\d+)/.exec(text);
  if (single) return { min: Number(single[1]), max: Number(single[1]) };
  return null;
}

/**
 * A game whose text cannot be read is kept rather than hidden: dropping a game
 * because of a typo in its blurb would be a worse failure than showing one that
 * does not quite fit. `tableFit.test.ts` pins every real card as readable.
 */
export function gameFitsTable(
  game: Pick<BhalyamGameCard, "playerRange" | "duration">,
  fit: TableFit,
): boolean {
  if (fit.people !== null) {
    const seats = parseRange(game.playerRange);
    if (seats && (fit.people < seats.min || fit.people > seats.max)) return false;
  }
  if (fit.minutes !== null) {
    const length = parseRange(game.duration);
    if (length && length.max > fit.minutes) return false;
  }
  return true;
}

/** Games that fit, in catalogue order. Never mutates `games`. */
export function gamesFittingTable(
  games: readonly BhalyamGameCard[],
  fit: TableFit,
): BhalyamGameCard[] {
  return games.filter((g) => gameFitsTable(g, fit));
}

/**
 * The answers that apply to a way. A one-player game has no headcount, so the
 * "how many of you" answer is ignored for "solo". The panel's count and the
 * grid both go through this, so they cannot disagree about what is shown.
 */
export function fitForWay(way: PlayWay | null, fit: TableFit): TableFit {
  return way === "solo" ? { ...fit, people: null } : fit;
}

export function isFiltering(fit: TableFit): boolean {
  return fit.people !== null || fit.minutes !== null;
}

/** One step on the headcount control. Below the smallest table is "Any", and "Any" up is the smallest table. */
export function stepPeople(current: number | null, direction: 1 | -1): number | null {
  if (current === null) return direction === 1 ? PEOPLE_MIN : null;
  const next = current + direction;
  if (next < PEOPLE_MIN) return null;
  return Math.min(next, PEOPLE_MAX);
}
