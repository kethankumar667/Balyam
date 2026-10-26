import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState, gameReducer } from "../engine/gameReducer";
import { DEFAULT_BINDINGS, readArcade, retainRecords, validateRun, writeArcade, type RunRecord } from "../arcade/storage";
import { STORAGE_KEY, loadTetrisData } from "../services/storageService";

afterEach(() => { localStorage.removeItem(STORAGE_KEY); vi.restoreAllMocks(); });

describe("arcade storage migration", () => {
  it("reads old records without changing them", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bestClassicScore: 9000, bestPentixScore: 123, highScores: [] }));
    expect(readArcade().run).toBeNull();
    writeArcade(readArcade());
    expect(loadTetrisData().bestClassicScore).toBe(9000);
    expect(loadTetrisData().bestPentixScore).toBe(123);
  });
  it("round trips a colored run paused with all engine progress intact", () => {
    let state = gameReducer(createInitialState(), { type: "START_GAME", payload: { seed: 42 } });
    state = gameReducer(state, { type: "HARD_DROP" });
    const save = readArcade();
    writeArcade({ ...save, run: state });
    const run = readArcade().run!;
    expect(run.status).toBe("paused");
    expect(run.board).toEqual(state.board);
    expect(run.nextQueue).toEqual(state.nextQueue);
    expect(run.rngSeed).toBe(state.rngSeed);
    expect(run.piecesPlaced).toBe(1);
    expect(gameReducer(run, { type: "PAUSE_TOGGLE" }).status).toBe("playing");
  });
  it("rejects malformed matrices, missing columns, invalid shapes and timed saves", () => {
    const state = gameReducer(createInitialState(), { type: "START_GAME" });
    expect(validateRun({ ...state, activePiece: { ...state.activePiece, matrix: [[0]] } })).toBeNull();
    expect(validateRun({ ...state, board: [[0]] })).toBeNull();
    expect(validateRun({ ...state, heldPiece: "unknown" })).toBeNull();
    expect(validateRun({ ...state, challenge: "sprint" })).toBeNull();
  });
  it("reports corrupt JSON and quota failures instead of pretending to save", () => {
    localStorage.setItem(STORAGE_KEY, "invalid");
    expect(() => readArcade()).toThrow();
    localStorage.removeItem(STORAGE_KEY);
    const saved = readArcade();
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(() => writeArcade(saved)).toThrow("Quota exceeded");
  });
  it("keeps new classic and Pentix bests visible to the existing device-record reader", () => {
    const save = readArcade();
    writeArcade({ ...save, records: [{
      id: "run", mode: "marathon", score: 12345, lines: 3, elapsedMs: 1000,
      pieces: 4, complete: false, date: "2026-10-26", dailyDate: null,
    }] });
    expect(loadTetrisData().bestClassicScore).toBe(12345);
  });
  it("persists unique custom bindings", () => {
    const save = readArcade();
    writeArcade({ ...save, bindings: { ...DEFAULT_BINDINGS, MOVE_LEFT: "KeyA" } });
    expect(readArcade().bindings.MOVE_LEFT).toBe("KeyA");
  });
  it("retains the latest daily best even when an older daily was faster", () => {
    const record: RunRecord = { id: "today", mode: "daily", score: 10, lines: 40, elapsedMs: 90000,
      pieces: 100, complete: true, date: "2026-10-27", dailyDate: "2026-10-27" };
    const recent: RunRecord[] = Array.from({ length: 110 }, (_, i) => ({
      ...record, id: `recent-${i}`, mode: "marathon", complete: false,
    }));
    const kept = retainRecords([...recent, record, { ...record, id: "yesterday", dailyDate: "2026-10-26", elapsedMs: 1000 }]);
    expect(kept.length).toBeLessThanOrEqual(100);
    expect(kept.some(run => run.id === "today")).toBe(true);
  });
});
