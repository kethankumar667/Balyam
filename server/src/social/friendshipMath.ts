import type { FriendshipMilestoneKind } from "@shared/social/Friendship.js";

/**
 * The arithmetic of a friendship: counts, daily streaks, and milestones.
 *
 * Pure functions, no clock and no storage, so the awkward parts — a day
 * boundary at half past six in the evening UTC, a streak that has lapsed, a
 * count that skips over a threshold — can each be pinned by a test with the
 * exact instant that matters.
 */

const MS_PER_DAY = 86_400_000;

/**
 * India Standard Time is UTC+05:30 all year — there is no daylight saving — so
 * a fixed offset is exact, not an approximation. A "day" for a streak is an IST
 * calendar day, because the players are here: a match at 11 pm and another at
 * 1 am are two days to them, whatever the UTC date says.
 */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The IST calendar day of an instant, as `YYYY-MM-DD`. */
export function istDay(epochMs: number): string {
  return new Date(epochMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The calendar day after `day` (`YYYY-MM-DD`). Handles month and year ends. */
export function nextDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * A pair is stored once, with the smaller id first, so (a, b) and (b, a) are
 * the same row and the database can insist on `player_low < player_high`.
 */
export function orderedPair(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

/** Everything the server remembers about one pair of players. */
export interface PairState {
  matchesTogether: number;
  winsTogether: number;
  tournamentsTogether: number;
  firstMatchAt: number | null;
  lastMatchAt: number | null;
  currentDailyStreak: number;
  bestDailyStreak: number;
  /** The IST day (`YYYY-MM-DD`) the current streak last advanced on. */
  streakLastDay: string | null;
}

export const EMPTY_PAIR_STATE: PairState = {
  matchesTogether: 0,
  winsTogether: 0,
  tournamentsTogether: 0,
  firstMatchAt: null,
  lastMatchAt: null,
  currentDailyStreak: 0,
  bestDailyStreak: 0,
  streakLastDay: null,
};

/** One match, seen from the pair's point of view. */
export interface MatchForPair {
  matchId: string;
  playedAt: number;
  /** Both players were on the winning side. */
  wonTogether: boolean;
  isTournament: boolean;
}

export interface PairMilestone {
  kind: FriendshipMilestoneKind;
  reachedAt: number;
  matchId: string;
}

const MATCH_COUNT_MILESTONES: ReadonlyArray<readonly [number, FriendshipMilestoneKind]> = [
  [10, "MATCHES_10"],
  [50, "MATCHES_50"],
  [100, "MATCHES_100"],
  [500, "MATCHES_500"],
  [1000, "MATCHES_1000"],
];

type StreakFields = Pick<PairState, "currentDailyStreak" | "bestDailyStreak" | "streakLastDay">;

/**
 * Moves the streak forward for a match on `day`.
 *
 * Same day: nothing changes. The next day: it grows. A gap: it starts again at
 * one (the best is kept). An EARLIER day than the streak has reached — a match
 * that arrives late, as a backfill's might — leaves the streak alone rather
 * than corrupting it.
 */
function advanceStreak(before: PairState, day: string): StreakFields {
  const last = before.streakLastDay;
  if (last === null) {
    return { currentDailyStreak: 1, bestDailyStreak: Math.max(before.bestDailyStreak, 1), streakLastDay: day };
  }
  if (day <= last) {
    return {
      currentDailyStreak: before.currentDailyStreak,
      bestDailyStreak: before.bestDailyStreak,
      streakLastDay: before.streakLastDay,
    };
  }
  const current = day === nextDay(last) ? before.currentDailyStreak + 1 : 1;
  return {
    currentDailyStreak: current,
    bestDailyStreak: Math.max(before.bestDailyStreak, current),
    streakLastDay: day,
  };
}

/** The pair's state after one more match, and the milestones that match reached. */
export function applyMatch(
  previous: PairState | null,
  match: MatchForPair,
): { state: PairState; milestones: PairMilestone[] } {
  const before = previous ?? EMPTY_PAIR_STATE;
  const matches = before.matchesTogether + 1;
  const wins = before.winsTogether + (match.wonTogether ? 1 : 0);
  const tournaments = before.tournamentsTogether + (match.isTournament ? 1 : 0);

  const state: PairState = {
    matchesTogether: matches,
    winsTogether: wins,
    tournamentsTogether: tournaments,
    firstMatchAt: before.firstMatchAt === null ? match.playedAt : Math.min(before.firstMatchAt, match.playedAt),
    lastMatchAt: before.lastMatchAt === null ? match.playedAt : Math.max(before.lastMatchAt, match.playedAt),
    ...advanceStreak(before, istDay(match.playedAt)),
  };

  const reached = (kind: FriendshipMilestoneKind): PairMilestone => ({
    kind,
    reachedAt: match.playedAt,
    matchId: match.matchId,
  });
  const milestones: PairMilestone[] = [];
  if (before.matchesTogether === 0) milestones.push(reached("FIRST_MATCH"));
  if (before.winsTogether === 0 && wins >= 1) milestones.push(reached("FIRST_WIN"));
  if (before.tournamentsTogether === 0 && tournaments >= 1) milestones.push(reached("FIRST_TOURNAMENT"));
  for (const [threshold, kind] of MATCH_COUNT_MILESTONES) {
    if (before.matchesTogether < threshold && matches >= threshold) milestones.push(reached(kind));
  }

  return { state, milestones };
}

/**
 * The streak as it stands NOW.
 *
 * A stored streak only says where it last advanced. If that was today it is
 * live; if it was yesterday it is still alive (they may yet play today); any
 * earlier and it has lapsed, so it reads as zero rather than a stale number.
 */
export function currentStreakDays(state: PairState, nowMs: number): number {
  if (state.streakLastDay === null) return 0;
  const today = istDay(nowMs);
  return state.streakLastDay === today || nextDay(state.streakLastDay) === today ? state.currentDailyStreak : 0;
}
