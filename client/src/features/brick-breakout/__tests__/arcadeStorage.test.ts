import { beforeEach, describe, expect, it } from "vitest";
import { createRun } from "../arcade/rules";
import { loadArcade, saveArcade, recordRun, defaultSave, SAVE_KEY } from "../arcade/storage";
beforeEach(() => localStorage.clear());
describe("breakout arcade record compatibility", () => {
  it("preserves old classic scores instead of assigning them to new modes", () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ highScore: 9876, maxLevel: 12, soundEnabled: false }));
    const saved = loadArcade();
    expect(saved.records).toEqual([]);
    expect(saved.sound).toBe(false);
    saveArcade(saved);
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(raw.highScore).toBe(9876);
    expect(raw.maxLevel).toBe(12);
  });
  it("keeps personal bests per mode and daily date", () => {
    let data = defaultSave();
    for (const [mode, score, date] of [
      ["campaign", 1200, "2026-10-27"], ["score-attack", 500, "2026-10-27"],
      ["daily", 600, "2026-10-27"], ["daily", 300, "2026-10-28"], ["campaign", 100, "2026-10-27"],
    ] as const) data = recordRun(data, { ...createRun(mode, date), status: "finished", score });
    expect(data.records).toHaveLength(4);
    expect(data.records.find(r => r.mode === "campaign")?.score).toBe(1200);
    saveArcade(data);
    expect(loadArcade().records).toEqual(data.records);
  });
  it("surfaces malformed saves instead of silently replacing them", () => {
    localStorage.setItem(SAVE_KEY, "{bad");
    expect(() => loadArcade()).toThrow();
    expect(localStorage.getItem(SAVE_KEY)).toBe("{bad");
  });
  it("does not record abandoned runs or non-finite scores", () => {
    const save = defaultSave();
    expect(recordRun(save, createRun("campaign"))).toBe(save);
    expect(recordRun(save, { ...createRun("campaign"), status: "finished", score: Infinity })).toBe(save);
  });
  it("never ages out campaign or score attack bests while retaining sixty daily dates", () => {
    let data = recordRun(defaultSave(), { ...createRun("campaign"), status: "finished", score: 5000 });
    data = recordRun(data, { ...createRun("score-attack"), status: "finished", score: 2000 });
    for (let i = 0; i < 80; i++) {
      const date = new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10);
      data = recordRun(data, { ...createRun("daily", date), status: "finished", score: 100 });
    }
    expect(data.records).toHaveLength(62);
    expect(data.records.filter(r => r.mode === "daily")).toHaveLength(60);
    expect(data.records.find(r => r.mode === "campaign")?.score).toBe(5000);
    expect(data.records.find(r => r.mode === "score-attack")?.score).toBe(2000);
  });
  it("preserves the all-time daily best even after its date leaves recent history", () => {
    let data = recordRun(defaultSave(), { ...createRun("daily", "2025-01-01"), status: "finished", score: 9000 });
    for (let i = 0; i < 80; i++) {
      const date = new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10);
      data = recordRun(data, { ...createRun("daily", date), status: "finished", score: 100 });
    }
    saveArcade(data);
    const restored = loadArcade();
    expect(restored.records.find(r => r.date === "2025-01-01")?.score).toBe(9000);
    expect(restored.records.filter(r => r.mode === "daily")).toHaveLength(61);
  });
});
