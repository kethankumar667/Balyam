import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSudoku, STORAGE_SUDOKU_SAVED } from "../useSudoku";
import * as scorecardStore from "../../../store/scorecardStore";

/**
 * Scoring integrity, edge cases and save/resume — the behaviour that decides
 * whether a Sudoku result can be trusted, and whether a phone call or a tab
 * switch costs the player their board.
 */
describe("useSudoku — scoring integrity, edge cases and resume", () => {
  type Hook = { current: ReturnType<typeof useSudoku> };

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  const solveAll = (result: Hook) => {
    act(() => {
      for (const cell of result.current.cells) {
        if (!cell.isGiven && cell.value !== cell.solution) {
          result.current.selectCell(cell.index);
          result.current.inputDigit(cell.solution);
        }
      }
    });
  };
  const firstEmpty = (result: Hook) => result.current.cells.find((c) => !c.isGiven)!;
  const wrongDigit = (solution: number) => (solution % 9) + 1;
  const flush = () =>
    act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

  describe("victory modal facts", () => {
    it("keeps the number of the board just cleared, then advances on the next board", () => {
      vi.spyOn(scorecardStore, "recordSoloScore").mockResolvedValue(null as never);
      const { result } = renderHook(() => useSudoku("easy"));
      expect(result.current.boardNumber).toBe(1);
      solveAll(result);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.progress.easy).toBe(1);
      expect(result.current.boardNumber).toBe(1); // not 2 — the modal says "Board N cleared"
      act(() => result.current.startNextBoard());
      expect(result.current.boardNumber).toBe(2);
    });

    it("claims a personal best only when the scorecard says so", async () => {
      const spy = vi.spyOn(scorecardStore, "recordSoloScore");

      spy.mockResolvedValue({ isNewPersonalBest: true } as never);
      const a = renderHook(() => useSudoku("easy"));
      expect(a.result.current.newPersonalBest).toBe(false);
      solveAll(a.result);
      await flush();
      expect(a.result.current.newPersonalBest).toBe(true);

      window.localStorage.clear();
      spy.mockResolvedValue({ isNewPersonalBest: false } as never);
      const b = renderHook(() => useSudoku("easy"));
      solveAll(b.result);
      await flush();
      expect(b.result.current.newPersonalBest).toBe(false);

      window.localStorage.clear();
      spy.mockResolvedValue(null as never); // offline / rejected
      const c = renderHook(() => useSudoku("easy"));
      solveAll(c.result);
      await flush();
      expect(c.result.current.newPersonalBest).toBe(false);
    });

    it("does not let a late answer for a finished board flag the next one", async () => {
      let resolveScore: (v: unknown) => void = () => {};
      vi.spyOn(scorecardStore, "recordSoloScore").mockReturnValue(
        new Promise((r) => {
          resolveScore = r;
        }) as never
      );
      const { result } = renderHook(() => useSudoku("easy"));
      solveAll(result);
      act(() => result.current.startNextBoard());
      resolveScore({ isNewPersonalBest: true });
      await flush();
      expect(result.current.newPersonalBest).toBe(false);
    });
  });

  describe("hint-assisted solves", () => {
    it("counts hints and exposes an assisted flag", () => {
      const { result } = renderHook(() => useSudoku("easy"));
      expect(result.current.hintsUsed).toBe(0);
      expect(result.current.isAssisted).toBe(false);
      act(() => result.current.useHint());
      act(() => result.current.useHint());
      expect(result.current.hintsUsed).toBe(2);
      expect(result.current.isAssisted).toBe(true);
    });

    it("never submits a hint-assisted solve to the leaderboard, but still counts the board", () => {
      const spy = vi.spyOn(scorecardStore, "recordSoloScore").mockResolvedValue(null as never);
      const { result } = renderHook(() => useSudoku("expert"));
      let taps = 0;
      while (!result.current.isComplete && taps < 100) {
        act(() => result.current.useHint());
        taps++;
      }
      expect(result.current.isComplete).toBe(true);
      expect(spy).not.toHaveBeenCalled();
      expect(result.current.newPersonalBest).toBe(false);
      expect(result.current.progress.expert).toBe(1);
    });

    it("a single hint is enough to make a solve unranked", () => {
      const spy = vi.spyOn(scorecardStore, "recordSoloScore").mockResolvedValue(null as never);
      const { result } = renderHook(() => useSudoku("easy"));
      act(() => result.current.useHint());
      solveAll(result);
      expect(result.current.isComplete).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    });

    it("an unassisted solve is submitted exactly once", () => {
      const spy = vi.spyOn(scorecardStore, "recordSoloScore").mockResolvedValue(null as never);
      const { result } = renderHook(() => useSudoku("easy"));
      solveAll(result);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("a fresh board resets the hint count", () => {
      const { result } = renderHook(() => useSudoku("easy"));
      act(() => result.current.useHint());
      act(() => result.current.startNewGame("easy"));
      expect(result.current.hintsUsed).toBe(0);
    });
  });

  describe("lives", () => {
    it("ends the game on the third mistake and freezes input and the clock", () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useSudoku("easy"));
      const empties = result.current.cells.filter((c) => !c.isGiven);
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.selectCell(empties[i]!.index);
          result.current.inputDigit(wrongDigit(empties[i]!.solution));
        });
      }
      expect(result.current.isGameOver).toBe(true);
      const filled = result.current.cells.filter((c) => c.value !== null).length;
      act(() => {
        result.current.selectCell(empties[5]!.index);
        result.current.inputDigit(empties[5]!.solution);
      });
      expect(result.current.cells.filter((c) => c.value !== null).length).toBe(filled);
      const t = result.current.elapsedSeconds;
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.elapsedSeconds).toBe(t);
    });
  });

  describe("notes and candidates", () => {
    it("auto-fill ignores wrong entries so the true candidate is never removed from a peer", () => {
      const { result } = renderHook(() => useSudoku("medium"));
      const a = firstEmpty(result);
      const b = result.current.cells.find(
        (c) => !c.isGiven && c.row === a.row && c.index !== a.index && c.solution !== a.solution
      )!;
      act(() => {
        result.current.selectCell(a.index);
        result.current.inputDigit(b.solution); // wrong for `a`, flagged as an error
      });
      expect(result.current.cells[a.index]!.isError).toBe(true);
      act(() => result.current.autoFillNotes());
      expect(result.current.cells[b.index]!.notes).toContain(b.solution);
    });

    it("does not put pencil notes on a cell that already holds a value", () => {
      const { result } = renderHook(() => useSudoku("easy"));
      const c = firstEmpty(result);
      act(() => {
        result.current.selectCell(c.index);
        result.current.inputDigit(c.solution);
      });
      act(() => result.current.toggleNotesMode());
      act(() => result.current.inputDigit(3, c.index));
      expect(result.current.cells[c.index]!.notes).toEqual([]);
    });
  });

  describe("completed-unit celebration", () => {
    it("celebrates the unit a hint completes, and not again on a later unrelated move", () => {
      vi.useFakeTimers();
      vi.spyOn(scorecardStore, "recordSoloScore").mockResolvedValue(null as never);
      const { result } = renderHook(() => useSudoku("easy"));
      const rowDone = () =>
        result.current.cells.filter((c) => c.row === 0).every((c) => c.value !== null && !c.isError);
      let taps = 0;
      let celebratedAtHint = false;
      while (!rowDone() && taps < 30) {
        act(() => result.current.useHint());
        if (result.current.recentlyCompletedUnits.includes("row-0")) celebratedAtHint = true;
        taps++;
      }
      expect(rowDone()).toBe(true);
      expect(celebratedAtHint).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000); // let the 850 ms sweep expire
      });
      const far = [...result.current.cells].reverse().find((c) => !c.isGiven && c.value === null)!;
      act(() => {
        result.current.selectCell(far.index);
        result.current.inputDigit(far.solution);
      });
      expect(result.current.recentlyCompletedUnits).not.toContain("row-0");
    });
  });

  describe("tab visibility", () => {
    it("pauses (and shields the grid) when the tab is hidden, so time is neither gained nor lost", () => {
      const { result } = renderHook(() => useSudoku("easy"));
      expect(result.current.isPaused).toBe(false);
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(result.current.isPaused).toBe(true);
    });

    it("does not resume by itself when the tab comes back", () => {
      const { result } = renderHook(() => useSudoku("easy"));
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(result.current.isPaused).toBe(true);
    });
  });

  describe("save and resume", () => {
    it("restores an in-progress board after a reload — paused, with time, lives and hints intact", () => {
      vi.useFakeTimers();
      const first = renderHook(() => useSudoku("medium"));
      const cell = firstEmpty(first.result);
      const other = first.result.current.cells.filter((c) => !c.isGiven)[1]!;
      act(() => {
        first.result.current.selectCell(cell.index);
        first.result.current.inputDigit(cell.solution);
        first.result.current.selectCell(other.index);
        first.result.current.inputDigit(wrongDigit(other.solution)); // 1 mistake
      });
      act(() => first.result.current.useHint());
      act(() => {
        vi.advanceTimersByTime(7000);
      });
      const puzzle = first.result.current.cells.map((c) => (c.isGiven ? c.value : null));
      first.unmount();

      const second = renderHook(() => useSudoku("medium"));
      expect(second.result.current.cells.map((c) => (c.isGiven ? c.value : null))).toEqual(puzzle);
      expect(second.result.current.cells[cell.index]!.value).toBe(cell.solution);
      expect(second.result.current.mistakes).toBe(1);
      expect(second.result.current.hintsUsed).toBe(1);
      expect(second.result.current.elapsedSeconds).toBe(7);
      expect(second.result.current.isPaused).toBe(true);
    });

    it("keeps one saved board per difficulty", () => {
      const a = renderHook(() => useSudoku("easy"));
      const c = firstEmpty(a.result);
      act(() => {
        a.result.current.selectCell(c.index);
        a.result.current.inputDigit(c.solution);
      });
      a.unmount();
      const hard = renderHook(() => useSudoku("hard"));
      expect(hard.result.current.cells.filter((x) => !x.isGiven && x.value !== null)).toHaveLength(0);
      const easyAgain = renderHook(() => useSudoku("easy"));
      expect(easyAgain.result.current.cells[c.index]!.value).toBe(c.solution);
    });

    it("forgets the save once the board is solved", () => {
      vi.spyOn(scorecardStore, "recordSoloScore").mockResolvedValue(null as never);
      const first = renderHook(() => useSudoku("easy"));
      solveAll(first.result);
      first.unmount();
      const second = renderHook(() => useSudoku("easy"));
      expect(second.result.current.isComplete).toBe(false);
      expect(second.result.current.cells.filter((c) => !c.isGiven && c.value !== null)).toHaveLength(0);
    });

    it("forgets the save once the game is lost", () => {
      const first = renderHook(() => useSudoku("easy"));
      const empties = first.result.current.cells.filter((c) => !c.isGiven);
      for (let i = 0; i < 3; i++) {
        act(() => {
          first.result.current.selectCell(empties[i]!.index);
          first.result.current.inputDigit(wrongDigit(empties[i]!.solution));
        });
      }
      expect(first.result.current.isGameOver).toBe(true);
      first.unmount();
      const second = renderHook(() => useSudoku("easy"));
      expect(second.result.current.isGameOver).toBe(false);
      expect(second.result.current.mistakes).toBe(0);
    });

    it("ignores a corrupt or tampered save and starts a fresh board", () => {
      window.localStorage.setItem(STORAGE_SUDOKU_SAVED, "{not json");
      expect(renderHook(() => useSudoku("easy")).result.current.cells).toHaveLength(81);

      window.localStorage.clear();
      const good = renderHook(() => useSudoku("easy"));
      const c = firstEmpty(good.result);
      act(() => {
        good.result.current.selectCell(c.index);
        good.result.current.inputDigit(c.solution);
      });
      good.unmount();
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_SUDOKU_SAVED)!);
      saved.easy.puzzle = "x".repeat(81); // no longer a valid board
      window.localStorage.setItem(STORAGE_SUDOKU_SAVED, JSON.stringify(saved));
      const again = renderHook(() => useSudoku("easy"));
      expect(again.result.current.cells.filter((x) => !x.isGiven && x.value !== null)).toHaveLength(0);
    });

    it("rejects a save whose entered values overwrite the given clues", () => {
      const good = renderHook(() => useSudoku("easy"));
      const c = firstEmpty(good.result);
      act(() => {
        good.result.current.selectCell(c.index);
        good.result.current.inputDigit(c.solution);
      });
      const givenIdx = good.result.current.cells.findIndex((x) => x.isGiven);
      good.unmount();
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_SUDOKU_SAVED)!);
      saved.easy.cells[givenIdx].v = ((saved.easy.cells[givenIdx].v ?? 1) % 9) + 1;
      window.localStorage.setItem(STORAGE_SUDOKU_SAVED, JSON.stringify(saved));
      const again = renderHook(() => useSudoku("easy"));
      expect(again.result.current.cells.filter((x) => !x.isGiven && x.value !== null)).toHaveLength(0);
    });

    it("startNextBoard discards the old save", () => {
      const a = renderHook(() => useSudoku("easy"));
      const c = firstEmpty(a.result);
      act(() => {
        a.result.current.selectCell(c.index);
        a.result.current.inputDigit(c.solution);
      });
      act(() => a.result.current.startNextBoard());
      a.unmount();
      const b = renderHook(() => useSudoku("easy"));
      expect(b.result.current.cells.filter((x) => !x.isGiven && x.value !== null)).toHaveLength(0);
    });

    it("survives storage that throws", () => {
      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      const { result } = renderHook(() => useSudoku("easy"));
      const c = firstEmpty(result);
      expect(() =>
        act(() => {
          result.current.selectCell(c.index);
          result.current.inputDigit(c.solution);
        })
      ).not.toThrow();
      spy.mockRestore();
    });
  });
});
