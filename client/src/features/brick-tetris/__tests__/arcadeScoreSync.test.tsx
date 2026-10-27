import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BrickTetrisGame from "../BrickTetrisGame";

const mocks = vi.hoisted(() => ({ recordSoloScore: vi.fn(), complete: true }));
vi.mock("../../../store/scorecardStore", () => ({ recordSoloScore: mocks.recordSoloScore }));
vi.mock("../engine/gameReducer", async original => {
  const actual = await original<typeof import("../engine/gameReducer")>();
  return { ...actual, gameReducer: (...args: Parameters<typeof actual.gameReducer>) => {
    const state = actual.gameReducer(...args);
    return args[1].type === "START_GAME" ? {
      ...state, status: "game-over", outcome: mocks.complete ? "complete" : "top-out",
      score: 2300, elapsedMs: 125000, linesCleared: mocks.complete ? 40 : 10,
    } : state;
  } };
});
vi.mock("../services/audioService", () => ({ tetrisAudio: {
  setMuted: vi.fn(), setVolume: vi.fn(), playHardDrop: vi.fn(), playRotate: vi.fn(),
  playHold: vi.fn(), playLineClear: vi.fn(), playGameOver: vi.fn(),
} }));
beforeEach(() => { localStorage.clear(); mocks.complete = true; mocks.recordSoloScore.mockReset().mockResolvedValue({ isNewPersonalBest: true }); });
afterEach(cleanup);

describe("Brick Blocks automatic account saving", () => {
  it.each([
    ["Marathon", "arcade_marathon", 2300], ["Pentix", "arcade_pentix", 2300],
    ["40-line Sprint", "arcade_sprint", 125], ["Score Attack", "arcade_attack", 2300],
    ["Daily Circuit", "arcade_daily", 125], ["Free Play", "arcade_practice", 2300],
  ])("saves %s in its own mode with the correct metric", async (label, modeId, score) => {
    render(<MemoryRouter><BrickTetrisGame /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: `Play ${label}` }));
    expect(mocks.recordSoloScore).toHaveBeenCalledTimes(1);
    expect(mocks.recordSoloScore).toHaveBeenCalledWith("brickblocks", modeId, score, expect.objectContaining({ elapsedMs: 125000 }));
    expect(await screen.findByText("Saved to your account.")).toBeDefined();
  });

  it.each(["40-line Sprint", "Daily Circuit"])("does not turn a failed %s into a fastest completion", label => {
    mocks.complete = false;
    render(<MemoryRouter><BrickTetrisGame /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: `Play ${label}` }));
    expect(mocks.recordSoloScore).not.toHaveBeenCalled();
  });
});
