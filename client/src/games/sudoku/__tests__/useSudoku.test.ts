import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSudoku, STORAGE_SUDOKU_PROGRESS, saveSudokuProgress } from "../useSudoku";
import * as scorecardStore from "../../../store/scorecardStore";

// Mock scorecard store recordSoloScore
vi.spyOn(scorecardStore, "recordSoloScore").mockResolvedValue(null as unknown as never);

describe("useSudoku", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes an 81-cell matrix with given clues, solution, and starts at Board 1", () => {
    const { result } = renderHook(() => useSudoku("easy"));

    expect(result.current.cells).toHaveLength(81);
    expect(result.current.difficulty).toBe("easy");
    expect(result.current.boardNumber).toBe(1);
    expect(result.current.progress.easy).toBe(0);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.mistakes).toBe(0);

    // Verify given clues have isGiven: true and matching value
    const givens = result.current.cells.filter((c) => c.isGiven);
    expect(givens.length).toBeGreaterThan(20);
    for (const g of givens) {
      expect(g.value).toBe(g.solution);
      expect(g.isGiven).toBe(true);
    }
  });

  it("loads existing progress correctly: if 12 boards completed in hard, starts Board 13", () => {
    saveSudokuProgress({
      easy: 25,
      medium: 12,
      hard: 12,
      expert: 5,
    });

    const { result } = renderHook(() => useSudoku("hard"));

    expect(result.current.difficulty).toBe("hard");
    expect(result.current.boardNumber).toBe(13);
    expect(result.current.progress.hard).toBe(12);
  });

  it("selects cells and inputs confirmed digits", () => {
    const { result } = renderHook(() => useSudoku("medium"));

    // Find first non-given cell
    const emptyCell = result.current.cells.find((c) => !c.isGiven);
    expect(emptyCell).toBeDefined();
    const cellIdx = emptyCell!.index;

    // Select the cell
    act(() => {
      result.current.selectCell(cellIdx);
    });
    expect(result.current.selectedCellIndex).toBe(cellIdx);

    // Input the correct solution digit
    act(() => {
      result.current.inputDigit(emptyCell!.solution);
    });

    const updatedCell = result.current.cells[cellIdx]!;
    expect(updatedCell.value).toBe(emptyCell!.solution);
    expect(updatedCell.isError).toBe(false);
    expect(result.current.mistakes).toBe(0);
  });

  it("flags mistakes and increments mistake counter on wrong digit entry", () => {
    const { result } = renderHook(() => useSudoku("easy"));

    const emptyCell = result.current.cells.find((c) => !c.isGiven)!;
    const wrongDigit = emptyCell.solution === 9 ? 1 : emptyCell.solution + 1;

    act(() => {
      result.current.selectCell(emptyCell.index);
      result.current.inputDigit(wrongDigit);
    });

    expect(result.current.cells[emptyCell.index]!.value).toBe(wrongDigit);
    expect(result.current.cells[emptyCell.index]!.isError).toBe(true);
    expect(result.current.mistakes).toBe(1);
  });

  it("supports Quantum Pencil / Notes mode with toggle and candidate sorting", () => {
    const { result } = renderHook(() => useSudoku("medium"));

    const emptyCell = result.current.cells.find((c) => !c.isGiven)!;

    // Enable notes mode
    act(() => {
      result.current.toggleNotesMode();
      result.current.selectCell(emptyCell.index);
      result.current.inputDigit(3);
      result.current.inputDigit(7);
    });

    expect(result.current.notesMode).toBe(true);
    expect(result.current.cells[emptyCell.index]!.value).toBeNull();
    expect(result.current.cells[emptyCell.index]!.notes).toEqual([3, 7]);

    // Tapping 3 again removes candidate 3
    act(() => {
      result.current.inputDigit(3);
    });
    expect(result.current.cells[emptyCell.index]!.notes).toEqual([7]);
  });

  it("automatically purges conflicting pencil notes across row, col, and block upon confirmed placement", () => {
    const { result } = renderHook(() => useSudoku("easy"));

    // Find two empty cells in the same row
    const emptyCells = result.current.cells.filter((c) => !c.isGiven);
    const cellA = emptyCells[0]!;
    const cellB = emptyCells.find((c) => c.row === cellA.row && c.index !== cellA.index);

    if (cellB) {
      // Put note of cellA.solution on cellB
      act(() => {
        result.current.toggleNotesMode();
        result.current.selectCell(cellB.index);
        result.current.inputDigit(cellA.solution);
      });
      expect(result.current.cells[cellB.index]!.notes).toContain(cellA.solution);

      // Now place correct digit in cellA with notes mode OFF
      act(() => {
        result.current.toggleNotesMode(); // Turn off notes mode
        result.current.selectCell(cellA.index);
        result.current.inputDigit(cellA.solution);
      });

      // cellB should have candidate cellA.solution auto-cleaned
      expect(result.current.cells[cellB.index]!.notes).not.toContain(cellA.solution);
    }
  });

  it("reverts moves cleanly using Undo stack", () => {
    const { result } = renderHook(() => useSudoku("hard"));

    const emptyCell = result.current.cells.find((c) => !c.isGiven)!;

    act(() => {
      result.current.selectCell(emptyCell.index);
      result.current.inputDigit(emptyCell.solution);
    });
    expect(result.current.cells[emptyCell.index]!.value).toBe(emptyCell.solution);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.cells[emptyCell.index]!.value).toBeNull();
    expect(result.current.canUndo).toBe(false);
  });

  it("provides Neural Laser Hint scanner which fills and highlights correct candidate", () => {
    const { result } = renderHook(() => useSudoku("medium"));

    const emptyCountBefore = result.current.cells.filter((c) => c.value === null).length;

    act(() => {
      result.current.useHint();
    });

    const emptyCountAfter = result.current.cells.filter((c) => c.value === null).length;
    expect(emptyCountAfter).toBe(emptyCountBefore - 1);
    expect(result.current.hintText).toContain("Neural Scanner");
  });

  it("auto-populates valid candidate notes across the entire matrix", () => {
    const { result } = renderHook(() => useSudoku("medium"));

    act(() => {
      result.current.autoFillNotes();
    });

    const emptyCells = result.current.cells.filter((c) => c.value === null);
    for (const cell of emptyCells) {
      expect(cell.notes.length).toBeGreaterThan(0);
      // Valid candidate notes must include the cell's actual solution
      expect(cell.notes).toContain(cell.solution);
    }
  });

  it("toggles Zen Focus mode", () => {
    const { result } = renderHook(() => useSudoku("medium"));

    expect(result.current.zenMode).toBe(false);

    act(() => {
      result.current.toggleZenMode();
    });

    expect(result.current.zenMode).toBe(true);
  });

  it("triggers victory when all cells match the solution and increments completed board count", () => {
    const recordScoreSpy = vi.spyOn(scorecardStore, "recordSoloScore");
    const { result } = renderHook(() => useSudoku("easy"));

    expect(result.current.progress.easy).toBe(0);
    expect(result.current.boardNumber).toBe(1);

    // Fill all remaining empty cells with their solutions
    act(() => {
      for (const cell of result.current.cells) {
        if (!cell.isGiven) {
          result.current.selectCell(cell.index);
          result.current.inputDigit(cell.solution);
        }
      }
    });

    expect(result.current.isComplete).toBe(true);
    // "New PB" is now claimed only when the scorecard confirms it (see useSudokuIntegrity.test.ts).
    expect(result.current.newPersonalBest).toBe(false);
    expect(result.current.progress.easy).toBe(1);
    expect(recordScoreSpy).toHaveBeenCalledWith(
      "sudoku",
      "easy",
      expect.any(Number),
    );

    // Starting next board should advance to Board 2
    act(() => {
      result.current.startNextBoard();
    });

    expect(result.current.boardNumber).toBe(2);
    expect(result.current.isComplete).toBe(false);
  });

  it("does not count abandoned incomplete boards as completed", () => {
    const { result } = renderHook(() => useSudoku("easy"));

    expect(result.current.boardNumber).toBe(1);
    expect(result.current.progress.easy).toBe(0);

    // Enter one digit, then start a new game without completing
    const emptyCell = result.current.cells.find((c) => !c.isGiven)!;
    act(() => {
      result.current.selectCell(emptyCell.index);
      result.current.inputDigit(emptyCell.solution);
      result.current.startNewGame("easy");
    });

    // Still Board 1, progress still 0
    expect(result.current.boardNumber).toBe(1);
    expect(result.current.progress.easy).toBe(0);
  });

  it("does not penalize player for toggling off or erasing an incorrect digit", () => {
    const { result } = renderHook(() => useSudoku("easy"));
    const emptyCell = result.current.cells.find((c) => !c.isGiven)!;
    const wrongDigit = emptyCell.solution === 9 ? 1 : emptyCell.solution + 1;

    // Place wrong digit -> docks 1 mistake
    act(() => {
      result.current.selectCell(emptyCell.index);
      result.current.inputDigit(wrongDigit);
    });
    expect(result.current.mistakes).toBe(1);
    expect(result.current.cells[emptyCell.index]!.value).toBe(wrongDigit);

    // Tapping the same wrong digit again to toggle it off should NOT dock a second mistake
    act(() => {
      result.current.inputDigit(wrongDigit);
    });
    expect(result.current.mistakes).toBe(1);
    expect(result.current.cells[emptyCell.index]!.value).toBeNull();
  });

  it("supports rapid sequential undos and synchronizes state on restartCurrentGame", () => {
    const { result } = renderHook(() => useSudoku("medium"));
    const emptyCells = result.current.cells.filter((c) => !c.isGiven);
    const cell1 = emptyCells[0]!;
    const cell2 = emptyCells[1]!;

    act(() => {
      result.current.selectCell(cell1.index);
      result.current.inputDigit(cell1.solution);
      result.current.selectCell(cell2.index);
      result.current.inputDigit(cell2.solution);
    });

    expect(result.current.cells[cell1.index]!.value).toBe(cell1.solution);
    expect(result.current.cells[cell2.index]!.value).toBe(cell2.solution);

    // Rapid double undo
    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.cells[cell1.index]!.value).toBeNull();
    expect(result.current.cells[cell2.index]!.value).toBeNull();

    // Restart game resets state immediately
    act(() => {
      result.current.restartCurrentGame();
    });
    expect(result.current.cells[cell1.index]!.value).toBeNull();
    expect(result.current.mistakes).toBe(0);
  });
});
