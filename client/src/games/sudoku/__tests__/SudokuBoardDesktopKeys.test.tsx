import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SudokuBoardDesktop from "../SudokuBoardDesktop";
import { type UseSudokuReturn } from "../useSudoku";

// The victory modal fires a canvas burst; happy-dom has no canvas context.
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

/**
 * A held key auto-repeats `keydown`. Left unguarded, holding a wrong digit
 * alternated "mistake / erase / mistake" and burned all three lives in about a
 * fifth of a second, and holding H spent every hint and solved the board.
 */
describe("SudokuBoardDesktop keyboard", () => {
  function makeGame(overrides: Partial<UseSudokuReturn> = {}): UseSudokuReturn {
    return {
      cells: Array.from({ length: 81 }, (_, i) => ({
        index: i,
        row: Math.floor(i / 9),
        col: i % 9,
        block: Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3),
        value: null,
        solution: 1,
        isGiven: false,
        isError: false,
        notes: [],
      })),
      selectedCellIndex: 40,
      selectedDigit: null,
      difficulty: "medium",
      boardNumber: 1,
      progress: { easy: 0, medium: 0, hard: 0, expert: 0 },
      notesMode: false,
      inputMode: "cell-first",
      themeId: "paper",
      mistakes: 0,
      maxMistakes: 3,
      elapsedSeconds: 0,
      isPaused: false,
      isComplete: false,
      isGameOver: false,
      hintText: null,
      canUndo: false,
      digitCounts: {},
      ghostDelta: null,
      ghostDeltaFormatted: null,
      zenMode: false,
      hintsUsed: 0,
      isAssisted: false,
      newPersonalBest: false,
      recentlyCompletedUnits: [],
      selectCell: vi.fn(),
      selectDigit: vi.fn(),
      inputDigit: vi.fn(),
      eraseCell: vi.fn(),
      toggleNotesMode: vi.fn(),
      toggleInputMode: vi.fn(),
      undo: vi.fn(),
      useHint: vi.fn(),
      autoFillNotes: vi.fn(),
      togglePause: vi.fn(),
      startNewGame: vi.fn(),
      startNextBoard: vi.fn(),
      restartCurrentGame: vi.fn(),
      setThemeId: vi.fn(),
      toggleZenMode: vi.fn(),
      ...overrides,
    };
  }

  function mount(game: UseSudokuReturn) {
    return render(
      <MemoryRouter>
        <SudokuBoardDesktop game={game} />
      </MemoryRouter>
    );
  }

  const press = (key: string, repeat = false) =>
    fireEvent.keyDown(window, { key, repeat });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enters a digit on the first keypress", () => {
    const game = makeGame();
    mount(game);
    press("5");
    expect(game.inputDigit).toHaveBeenCalledTimes(1);
    expect(game.inputDigit).toHaveBeenCalledWith(5);
  });

  it("ignores auto-repeated digit keys", () => {
    const game = makeGame();
    mount(game);
    press("5");
    for (let i = 0; i < 8; i++) press("5", true);
    expect(game.inputDigit).toHaveBeenCalledTimes(1);
  });

  it("ignores auto-repeated hint, erase, undo, notes and zen keys", () => {
    const game = makeGame();
    mount(game);
    for (const key of ["h", "Backspace", "u", "n", "z"]) press(key, true);
    expect(game.useHint).not.toHaveBeenCalled();
    expect(game.eraseCell).not.toHaveBeenCalled();
    expect(game.undo).not.toHaveBeenCalled();
    expect(game.toggleNotesMode).not.toHaveBeenCalled();
    expect(game.toggleZenMode).not.toHaveBeenCalled();
  });

  it("still fires each of those keys on a deliberate press", () => {
    const game = makeGame();
    mount(game);
    for (const key of ["h", "Backspace", "u", "n", "z"]) press(key);
    expect(game.useHint).toHaveBeenCalledTimes(1);
    expect(game.eraseCell).toHaveBeenCalledTimes(1);
    expect(game.undo).toHaveBeenCalledTimes(1);
    expect(game.toggleNotesMode).toHaveBeenCalledTimes(1);
    expect(game.toggleZenMode).toHaveBeenCalledTimes(1);
  });

  it("keeps arrow-key navigation repeating, so holding an arrow still glides across the grid", () => {
    const game = makeGame();
    mount(game);
    press("ArrowRight");
    press("ArrowRight", true);
    press("ArrowRight", true);
    expect(game.selectCell).toHaveBeenCalledTimes(3);
  });

  it("does nothing while paused, complete or game over", () => {
    for (const state of [{ isPaused: true }, { isComplete: true }, { isGameOver: true }] as const) {
      const game = makeGame(state);
      const { unmount } = mount(game);
      press("5");
      press("h");
      expect(game.inputDigit).not.toHaveBeenCalled();
      expect(game.useHint).not.toHaveBeenCalled();
      unmount();
    }
  });
});
