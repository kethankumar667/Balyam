import { describe, it, expect } from "vitest";
import {
  EMPTY_PAIR_STATE,
  IST_OFFSET_MS,
  applyMatch,
  currentStreakDays,
  istDay,
  nextDay,
  orderedPair,
  type MatchForPair,
  type PairState,
} from "../friendshipMath.js";

const at = (iso: string): number => Date.parse(iso);

const match = (over: Partial<MatchForPair> & { playedAt: number }): MatchForPair => ({
  matchId: `m_${over.playedAt}`,
  wonTogether: false,
  isTournament: false,
  ...over,
});

/** Applies matches one after another, as the live server does. */
function play(matches: MatchForPair[], start: PairState | null = null): PairState {
  return matches.reduce<PairState | null>((state, m) => applyMatch(state, m).state, start) ?? EMPTY_PAIR_STATE;
}

describe("istDay — the streak's idea of a day", () => {
  it("is UTC+05:30 all year, with no daylight saving", () => {
    expect(IST_OFFSET_MS).toBe(19_800_000);
  });

  it("puts 18:29:59 UTC on the SAME IST day and 18:30:00 UTC on the NEXT", () => {
    expect(istDay(at("2026-03-10T18:29:59Z"))).toBe("2026-03-10");
    expect(istDay(at("2026-03-10T18:30:00Z"))).toBe("2026-03-11");
  });

  it("leaves UTC midnight on the same IST day (it is 05:30 there)", () => {
    expect(istDay(at("2026-03-10T00:00:00Z"))).toBe("2026-03-10");
    expect(istDay(at("2026-03-09T23:59:59Z"))).toBe("2026-03-10");
  });

  it("agrees across a year end", () => {
    expect(istDay(at("2026-12-31T18:30:00Z"))).toBe("2027-01-01");
  });
});

describe("nextDay", () => {
  it.each([
    ["2026-03-10", "2026-03-11"],
    ["2026-01-31", "2026-02-01"],
    ["2026-12-31", "2027-01-01"],
    ["2028-02-28", "2028-02-29"],
    ["2028-02-29", "2028-03-01"],
  ])("%s → %s", (day, expected) => {
    expect(nextDay(day)).toBe(expected);
  });
});

describe("orderedPair", () => {
  it("is the same pair whichever way round it is asked", () => {
    expect(orderedPair("b", "a")).toEqual({ low: "a", high: "b" });
    expect(orderedPair("a", "b")).toEqual({ low: "a", high: "b" });
  });
});

describe("applyMatch — counts", () => {
  it("starts a pair from nothing", () => {
    const { state } = applyMatch(null, match({ playedAt: at("2026-03-10T10:00:00Z") }));

    expect(state).toMatchObject({ matchesTogether: 1, winsTogether: 0, tournamentsTogether: 0 });
    expect(state.firstMatchAt).toBe(at("2026-03-10T10:00:00Z"));
    expect(state.lastMatchAt).toBe(at("2026-03-10T10:00:00Z"));
  });

  it("counts wins only when both were on the winning side, and tournaments only when flagged", () => {
    const state = play([
      match({ playedAt: at("2026-03-10T10:00:00Z"), wonTogether: true }),
      match({ playedAt: at("2026-03-10T11:00:00Z"), wonTogether: false }),
      match({ playedAt: at("2026-03-10T12:00:00Z"), isTournament: true }),
    ]);

    expect(state).toMatchObject({ matchesTogether: 3, winsTogether: 1, tournamentsTogether: 1 });
  });

  it("does not change the state it was given", () => {
    const before: PairState = { ...EMPTY_PAIR_STATE, matchesTogether: 4 };
    const frozen = JSON.stringify(before);

    applyMatch(before, match({ playedAt: at("2026-03-10T10:00:00Z") }));

    expect(JSON.stringify(before)).toBe(frozen);
  });

  it("keeps the earliest first match and latest last match even if matches arrive out of order", () => {
    const state = play([
      match({ playedAt: at("2026-03-12T10:00:00Z") }),
      match({ playedAt: at("2026-03-10T10:00:00Z") }),
    ]);

    expect(state.firstMatchAt).toBe(at("2026-03-10T10:00:00Z"));
    expect(state.lastMatchAt).toBe(at("2026-03-12T10:00:00Z"));
  });
});

describe("applyMatch — daily streaks (IST)", () => {
  it("two matches on the same IST day are one day of streak", () => {
    const state = play([
      match({ playedAt: at("2026-03-10T04:00:00Z") }),
      match({ playedAt: at("2026-03-10T15:00:00Z") }),
    ]);

    expect(state.currentDailyStreak).toBe(1);
    expect(state.streakLastDay).toBe("2026-03-10");
  });

  it("consecutive IST days grow it", () => {
    const state = play([
      match({ playedAt: at("2026-03-10T10:00:00Z") }),
      match({ playedAt: at("2026-03-11T10:00:00Z") }),
      match({ playedAt: at("2026-03-12T10:00:00Z") }),
    ]);

    expect(state.currentDailyStreak).toBe(3);
    expect(state.bestDailyStreak).toBe(3);
  });

  it("counts an 11 pm and a 1 am match as two days when they straddle IST midnight", () => {
    // 17:30Z = 23:00 IST on the 10th; 19:30Z = 01:00 IST on the 11th.
    const state = play([
      match({ playedAt: at("2026-03-10T17:30:00Z") }),
      match({ playedAt: at("2026-03-10T19:30:00Z") }),
    ]);

    expect(state.currentDailyStreak).toBe(2);
    expect(state.streakLastDay).toBe("2026-03-11");
  });

  it("treats 18:29:59Z and 18:30:00Z as the last second of one day and the first of the next", () => {
    const sameDay = play([
      match({ playedAt: at("2026-03-10T10:00:00Z") }),
      match({ playedAt: at("2026-03-10T18:29:59Z") }),
    ]);
    const nextDayStreak = play([
      match({ playedAt: at("2026-03-10T10:00:00Z") }),
      match({ playedAt: at("2026-03-10T18:30:00Z") }),
    ]);

    expect(sameDay.currentDailyStreak).toBe(1);
    expect(nextDayStreak.currentDailyStreak).toBe(2);
  });

  it("a missed day restarts the streak at one but keeps the best", () => {
    const state = play([
      match({ playedAt: at("2026-03-10T10:00:00Z") }),
      match({ playedAt: at("2026-03-11T10:00:00Z") }),
      match({ playedAt: at("2026-03-12T10:00:00Z") }),
      match({ playedAt: at("2026-03-15T10:00:00Z") }),
    ]);

    expect(state.currentDailyStreak).toBe(1);
    expect(state.bestDailyStreak).toBe(3);
  });

  it("carries a streak across a month and a year end", () => {
    const state = play([
      match({ playedAt: at("2026-12-30T10:00:00Z") }),
      match({ playedAt: at("2026-12-31T10:00:00Z") }),
      match({ playedAt: at("2027-01-01T10:00:00Z") }),
    ]);

    expect(state.currentDailyStreak).toBe(3);
  });

  it("leaves the streak alone for a match that arrives late from an earlier day", () => {
    const state = play([
      match({ playedAt: at("2026-03-10T10:00:00Z") }),
      match({ playedAt: at("2026-03-11T10:00:00Z") }),
      match({ playedAt: at("2026-03-05T10:00:00Z") }),
    ]);

    expect(state.currentDailyStreak).toBe(2);
    expect(state.streakLastDay).toBe("2026-03-11");
    expect(state.matchesTogether).toBe(3);
  });
});

describe("currentStreakDays — a streak read at a given moment", () => {
  const state = play([
    match({ playedAt: at("2026-03-10T10:00:00Z") }),
    match({ playedAt: at("2026-03-11T10:00:00Z") }),
  ]);

  it("is live on the day it last advanced", () => {
    expect(currentStreakDays(state, at("2026-03-11T20:00:00Z"))).toBe(2);
  });

  it("is still alive the next day, when they may yet play", () => {
    expect(currentStreakDays(state, at("2026-03-12T10:00:00Z"))).toBe(2);
  });

  it("has lapsed once a whole day is missed, and reads as zero", () => {
    expect(currentStreakDays(state, at("2026-03-13T10:00:00Z"))).toBe(0);
  });

  it("is zero for a pair that has never played", () => {
    expect(currentStreakDays(EMPTY_PAIR_STATE, at("2026-03-13T10:00:00Z"))).toBe(0);
  });
});

describe("applyMatch — milestones", () => {
  const kinds = (previous: PairState | null, m: MatchForPair): string[] =>
    applyMatch(previous, m).milestones.map((x) => x.kind);

  it("marks the first match, with the match that reached it", () => {
    const first = match({ playedAt: at("2026-03-10T10:00:00Z"), matchId: "m_first" });

    const { milestones } = applyMatch(null, first);

    expect(milestones).toEqual([{ kind: "FIRST_MATCH", reachedAt: first.playedAt, matchId: "m_first" }]);
  });

  it("marks the first win once, not on later wins", () => {
    const afterFirstWin = play([match({ playedAt: 1, wonTogether: true })]);

    expect(kinds(null, match({ playedAt: 1, wonTogether: true }))).toContain("FIRST_WIN");
    expect(kinds(afterFirstWin, match({ playedAt: 2, wonTogether: true }))).not.toContain("FIRST_WIN");
  });

  it("does not mark a win for a match won by only one of them", () => {
    expect(kinds(null, match({ playedAt: 1, wonTogether: false }))).not.toContain("FIRST_WIN");
  });

  it("marks the first tournament together", () => {
    expect(kinds(null, match({ playedAt: 1, isTournament: true }))).toContain("FIRST_TOURNAMENT");
  });

  it.each([
    [9, "MATCHES_10"],
    [49, "MATCHES_50"],
    [99, "MATCHES_100"],
    [499, "MATCHES_500"],
    [999, "MATCHES_1000"],
  ])("marks the match that takes them from %i to the next milestone", (count, kind) => {
    const before: PairState = { ...EMPTY_PAIR_STATE, matchesTogether: count, streakLastDay: "2026-01-01" };

    expect(kinds(before, match({ playedAt: at("2026-03-10T10:00:00Z") }))).toEqual([kind]);
  });

  it("marks a count milestone only once, not on the matches after it", () => {
    const before: PairState = { ...EMPTY_PAIR_STATE, matchesTogether: 10, streakLastDay: "2026-01-01" };

    expect(kinds(before, match({ playedAt: at("2026-03-10T10:00:00Z") }))).toEqual([]);
  });

  it("marks nothing for an ordinary match in the middle of the range", () => {
    const before: PairState = { ...EMPTY_PAIR_STATE, matchesTogether: 20, streakLastDay: "2026-01-01" };

    expect(kinds(before, match({ playedAt: at("2026-03-10T10:00:00Z") }))).toEqual([]);
  });
});
