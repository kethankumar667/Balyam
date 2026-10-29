import { describe, expect, it } from "vitest";
import { parseNewRecord } from "../newRecord";

const valid = () => ({
  game: "rummy",
  isNewPersonalBest: true,
  deltaFromPrevious: 12,
  previousBest: 80,
  totalPersonalBestsBeaten: 3,
  scorecard: {
    modeId: "pool101",
    modeDisplayName: "Pool 101",
    bestScore: 92,
    bestScoreMatchId: "match-1",
    scoringDirection: "HIGHER_IS_BETTER",
  },
});

describe("parseNewRecord", () => {
  it("accepts a well-formed payload", () => {
    expect(parseNewRecord(valid())).toMatchObject({ game: "rummy", previousBest: 80 });
  });

  it.each([null, undefined, "record", 7, [], {}])("rejects %j", (payload) => {
    expect(parseNewRecord(payload)).toBeNull();
  });

  it("rejects a payload that is not a new personal best", () => {
    expect(parseNewRecord({ ...valid(), isNewPersonalBest: false })).toBeNull();
  });

  it("rejects a payload with no earlier best to show", () => {
    const { previousBest: _omitted, ...rest } = valid();
    expect(parseNewRecord(rest)).toBeNull();
  });

  it("rejects a payload with an unknown scoring direction or a non-numeric score", () => {
    expect(parseNewRecord({ ...valid(), scorecard: { ...valid().scorecard, scoringDirection: "SIDEWAYS" } })).toBeNull();
    expect(parseNewRecord({ ...valid(), scorecard: { ...valid().scorecard, bestScore: "92" } })).toBeNull();
    expect(parseNewRecord({ ...valid(), scorecard: { ...valid().scorecard, bestScore: Number.NaN } })).toBeNull();
  });
});
