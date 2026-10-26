import { describe, expect, it } from "vitest";
import {
  parseSoakOptions, evaluateSoakRun, evaluateBrowserJourney,
} from "../../../scripts/quality-gates/releaseWorkload.mjs";

describe("release workload configuration", () => {
  it("defaults to at least an hour of active work", () => {
    expect(parseSoakOptions([])).toEqual({ durationSeconds: 3600, pauseMs: 2500 });
  });
  it("allows an explicitly shorter development run, not a certification shortcut", () => {
    expect(parseSoakOptions(["--duration-seconds=20"]).durationSeconds).toBe(20);
  });
  it.each(["--duration-seconds=0", "--duration-seconds=-1", "--duration-seconds=NaN",
    "--duration-seconds=1.5", "--duration-seconds=999999", "--duration=30", "--unknown"])(
    "rejects invalid arguments %s", (argument) => {
      expect(() => parseSoakOptions([argument])).toThrow();
    },
  );
});

const measured = {
  durationSeconds: 3601, requestedDurationSeconds: 3600, completedCycles: 20,
  totalEventsProcessed: 300, totalRoomsCreated: 20, totalSocketsConnected: 60,
  duplicateEventsDetected: 0, residualRooms: 0, residualSockets: 0,
  heapGrowthMb: 5, maxWorkGapSeconds: 2, settlementChecks: 20,
  recoveryChecks: 20, observedMoves: 100, errors: [],
};

describe("measured soak verdict", () => {
  it("accepts observed sustained work and distinguishes a short development run", () => {
    expect(evaluateSoakRun(measured)).toEqual({ status: "PASS", releaseEligible: true, failures: [] });
    expect(evaluateSoakRun({ ...measured, durationSeconds: 20, requestedDurationSeconds: 20 }).releaseEligible).toBe(false);
  });
  it.each([
    { completedCycles: 0 }, { totalEventsProcessed: 0 }, { observedMoves: 0 },
    { residualRooms: 1 }, { residualSockets: 1 }, { duplicateEventsDetected: 1 },
    { settlementChecks: 19 }, { recoveryChecks: 0 }, { heapGrowthMb: 51 },
    { durationSeconds: 3599 }, { errors: ["ACK timeout"] }, { maxWorkGapSeconds: 90 },
    { heapGrowthMb: Number.NaN },
    { requestedDurationSeconds: Number.NaN }, { totalSocketsConnected: 2 },
    { totalRoomsCreated: 21 }, { observedMoves: 5 }, { totalEventsProcessed: 10 },
  ])("fails incomplete/incorrect observed work %j", (patch) => {
    expect(evaluateSoakRun({ ...measured, ...patch }).status).toBe("FAIL");
  });
});

const journey = {
  identity: true, roomCreation: true, roomJoin: true, chat: true, modal: true,
  gameArena: true, gameFinished: true, recovery: true, cleanup: true,
};

describe("browser journey verdict", () => {
  it("requires every actual journey, including completion and recovery", () => {
    expect(evaluateBrowserJourney(journey, [])).toBe(true);
    for (const name of Object.keys(journey)) {
      expect(evaluateBrowserJourney({ ...journey, [name]: false }, [])).toBe(false);
    }
  });
  it("rejects arbitrary shell flags, missing steps, and runtime errors", () => {
    expect(evaluateBrowserJourney({ hasHeader: true, hasMain: true }, [])).toBe(false);
    expect(evaluateBrowserJourney(journey, ["Uncaught page error"])).toBe(false);
  });
});
