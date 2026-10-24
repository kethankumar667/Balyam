import { describe, expect, it } from "vitest";
import { cricketRecordScore, rummyRecordScore } from "../matchRecordScores.js";
import { rummyRoundPoints } from "@shared/rummyScoring.js";

describe("match record score extraction", () => {
  it("records the seat's entire cricket innings, not an individual squad batter", () => {
    expect(cricketRecordScore({
      innings1: { battingPlayerId: "seat", runs: 140, balls: 60, batterStats: { batterA: { runs: 80, fours: 10, sixes: 1 }, batterB: { runs: 60, fours: 5, sixes: 2 } } },
      innings2: { battingPlayerId: "opponent", runs: 145, balls: 59, batterStats: {} },
    }, "seat")).toMatchObject({ score: 140, secondaryMetrics: { balls: 60, fours: 15, sixes: 3 } });
  });

  describe("the shared Rummy score-sheet calculation", () => {
    it("matches the displayed winner's sum and each loser's negative penalty", () => {
      const round = { winnerId: "a", playerOrder: ["a", "b", "c"], scores: { a: 0, b: 35, c: 80 } };
      expect(rummyRoundPoints(round, "a")).toBe(115);
      expect(rummyRoundPoints(round, "b")).toBe(-35);
      expect(rummyRoundPoints(round, "c")).toBe(-80);
      expect(rummyRecordScore({ ...round, phase: "finished" }, "a").score).toBe(rummyRoundPoints(round, "a"));
    });

    it("preserves wrong-show rounding without treating it as a winning record", () => {
      const round = { invalidDeclareBy: "a", playerOrder: ["a", "b", "c", "d"] };
      expect(rummyRoundPoints(round, "a")).toBe(-80);
      expect(rummyRoundPoints(round, "b")).toBe(27);
      expect(rummyRoundPoints({ ...round, playerOrder: ["a"] }, "b")).toBe(0);
      expect(rummyRecordScore({ ...round, phase: "finished" }, "b")).toEqual({});
    });

    it("does not invent positive points for a missing score", () => {
      expect(rummyRoundPoints({ winnerId: "a", playerOrder: ["a", "b"] }, "a")).toBe(0);
      expect(rummyRoundPoints({ winnerId: "a", playerOrder: ["a", "b"] }, "b")).toBe(-0);
    });
  });

  it("does not invent a cricket innings for a seat that has not batted", () => {
    expect(cricketRecordScore({ innings1: { battingPlayerId: "other", runs: 100 } }, "seat")).toEqual({});
  });

  it.each(["single", "pool101", "pool201"])("records only positive final-round winnings in %s", (matchMode) => {
    const state = { phase: "finished", matchMode, matchOver: true, matchWinnerId: "winner", winnerId: "winner",
      playerOrder: ["winner", "loser", "earlier-eliminated"], scores: { winner: 0, loser: 75 },
      cumulativeScores: { winner: 80, loser: 200, "earlier-eliminated": 250 } };
    expect(rummyRecordScore(state, "winner").score).toBe(75);
    expect(rummyRecordScore(state, "loser")).toEqual({});
    expect(rummyRecordScore(state, "earlier-eliminated")).toEqual({});
  });

  it("ignores interim pools, wrong shows, unplayed walkovers and zero-point wins", () => {
    const state = { phase: "finished", matchMode: "pool101", matchOver: true, matchWinnerId: "winner", winnerId: "winner",
      playerOrder: ["winner", "loser"], scores: { winner: 0, loser: 80 } };
    expect(rummyRecordScore({ ...state, matchOver: false }, "winner")).toEqual({});
    expect(rummyRecordScore({ ...state, invalidDeclareBy: "loser", winnerId: null }, "winner")).toEqual({});
    expect(rummyRecordScore({ ...state, endedByDisconnect: "loser" }, "winner")).toEqual({});
    expect(rummyRecordScore({ ...state, scores: { winner: 0, loser: 0 } }, "winner")).toEqual({});
  });
});
