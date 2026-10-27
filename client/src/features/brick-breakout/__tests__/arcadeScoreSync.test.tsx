import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useArcade } from "../arcade/useArcade";
import { createRun, type Mode } from "../arcade/rules";

const recordSoloScore = vi.hoisted(() => vi.fn());
vi.mock("../../../store/scorecardStore", () => ({ recordSoloScore }));
vi.mock("../services/audioService", () => ({ breakoutAudio: {
  setMuted: vi.fn(), playBallLaunch: vi.fn(), playBrickDestroy: vi.fn(), playPaddleBounce: vi.fn(),
  playLifeLost: vi.fn(), playLevelComplete: vi.fn(), playGameOver: vi.fn(),
} }));
let frame: FrameRequestCallback;
beforeEach(() => {
  localStorage.clear();
  recordSoloScore.mockReset().mockResolvedValue({ isNewPersonalBest: true });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Neon Breakout automatic account saving", () => {
  it.each([
    ["campaign", "neon_campaign"], ["score-attack", "neon_score_attack"], ["daily", "neon_daily"],
  ] as const)("saves a finished %s once, not once per animation frame", async (mode: Mode, modeId) => {
    const { result } = renderHook(() => useArcade());
    act(() => result.current.start(mode));
    result.current.stateRef.current = { ...createRun(mode, "2026-10-28"), status: "finished", score: 5100, result: "time" };
    await act(async () => { frame(100); frame(116); });
    expect(recordSoloScore).toHaveBeenCalledTimes(1);
    expect(recordSoloScore).toHaveBeenCalledWith("breakout", modeId, 5100, expect.objectContaining({ date: "2026-10-28" }));
    expect(result.current.syncStatus).toBe("Saved to your account.");
  });

  it("does not submit an abandoned or paused run", () => {
    const { result } = renderHook(() => useArcade());
    act(() => { result.current.start("campaign"); result.current.pause(); });
    act(() => frame(100));
    act(() => result.current.returnToMenu());
    act(() => frame(116));
    expect(recordSoloScore).not.toHaveBeenCalled();
  });

  it("shows an unconfirmed save instead of claiming success when the shared saver queues a result", async () => {
    recordSoloScore.mockResolvedValue(null);
    const { result } = renderHook(() => useArcade());
    act(() => result.current.start("daily"));
    result.current.stateRef.current = { ...createRun("daily"), status: "finished", score: 100, result: "lives" };
    await act(async () => frame(100));
    expect(result.current.syncStatus).toMatch(/not confirmed/i);
  });

  it("does not let an earlier run's delayed save overwrite a new run's status", async () => {
    let resolve!: (value: { isNewPersonalBest: boolean }) => void;
    recordSoloScore.mockReturnValue(new Promise(done => { resolve = done; }));
    const { result } = renderHook(() => useArcade());
    act(() => result.current.start("daily"));
    result.current.stateRef.current = { ...createRun("daily"), status: "finished", score: 100, result: "lives" };
    act(() => frame(100));
    act(() => result.current.start("campaign"));
    await act(async () => resolve({ isNewPersonalBest: true }));
    expect(result.current.syncStatus).toBe("");
  });

  it("surfaces credential or saver failures instead of claiming the score reached the account", async () => {
    recordSoloScore.mockRejectedValue(new Error("Identity unavailable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { result } = renderHook(() => useArcade());
      act(() => result.current.start("campaign"));
      result.current.stateRef.current = { ...createRun("campaign"), status: "finished", score: 100, result: "lives" };
      await act(async () => frame(100));
      expect(result.current.syncStatus).toMatch(/save failed/i);
      expect(warn).toHaveBeenCalled();
    } finally { warn.mockRestore(); }
  });
});
