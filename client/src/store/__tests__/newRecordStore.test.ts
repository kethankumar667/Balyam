import { beforeEach, describe, expect, it } from "vitest";
import type { RecordScoreResult } from "@shared/profile/Scorecard";
import { isBeatenRecord, resetNewRecordStore, useNewRecordStore } from "../newRecordStore";

function result(overrides: Partial<RecordScoreResult> = {}, matchId = "m1"): RecordScoreResult {
  return {
    game: "2048",
    isNewPersonalBest: true,
    deltaFromPrevious: 20,
    previousBest: 100,
    totalPersonalBestsBeaten: 1,
    scorecard: { modeId: "daily", modeDisplayName: "Daily", bestScore: 120, bestScoreMatchId: matchId, scoringDirection: "HIGHER_IS_BETTER" },
    ...overrides,
  } as unknown as RecordScoreResult;
}

describe("newRecordStore", () => {
  beforeEach(() => resetNewRecordStore());

  it("queues a score that beat an earlier one", () => {
    useNewRecordStore.getState().announce(result());
    expect(useNewRecordStore.getState().queue).toHaveLength(1);
  });

  it("ignores a first score in a mode: there was nothing to beat", () => {
    useNewRecordStore.getState().announce(result({ previousBest: undefined }));
    expect(useNewRecordStore.getState().queue).toHaveLength(0);
  });

  it("ignores a score that is not a personal best", () => {
    useNewRecordStore.getState().announce(result({ isNewPersonalBest: false }));
    expect(useNewRecordStore.getState().queue).toHaveLength(0);
  });

  it("shows the same record once even when the solo save and the server both report it", () => {
    useNewRecordStore.getState().announce(result());
    useNewRecordStore.getState().announce(result());
    expect(useNewRecordStore.getState().queue).toHaveLength(1);
  });

  it("does not bring a record back after it was dismissed", () => {
    useNewRecordStore.getState().announce(result());
    useNewRecordStore.getState().dismiss();
    useNewRecordStore.getState().announce(result());
    expect(useNewRecordStore.getState().queue).toHaveLength(0);
  });

  it("queues records from different matches and shows them one at a time, oldest first", () => {
    useNewRecordStore.getState().announce(result({}, "m1"));
    useNewRecordStore.getState().announce(result({ game: "rummy" }, "m2"));
    expect(useNewRecordStore.getState().queue.map((r) => r.game)).toEqual(["2048", "rummy"]);

    useNewRecordStore.getState().dismiss();
    expect(useNewRecordStore.getState().queue.map((r) => r.game)).toEqual(["rummy"]);
  });

  it("isBeatenRecord requires an earlier best", () => {
    expect(isBeatenRecord(result())).toBe(true);
    expect(isBeatenRecord(result({ previousBest: undefined }))).toBe(false);
  });
});
