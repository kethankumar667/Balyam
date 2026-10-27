import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { SCHOOL_SLATE_ID, resolveEffectiveLoadout } from "@shared/cosmetics";
import { useCosmeticsStore } from "../../../store/cosmeticsStore";
import { useSlatedSudoku } from "../sudokuSlate";
import { THEME_CYCLE, themeCycle } from "../sudokuThemes";
import type { UseSudokuReturn } from "../useSudoku";

vi.mock("../sudokuAudio", () => ({ sudokuAudio: { setSoundProfile: vi.fn() } }));

const unequipItem = vi.fn();
const equipItem = vi.fn();

function wear(isOn: boolean, isOwned: boolean): void {
  useCosmeticsStore.setState({
    ownedIds: new Set(isOwned ? [SCHOOL_SLATE_ID] : []),
    resolved: resolveEffectiveLoadout({ tableThemes: isOn ? { sudoku: SCHOOL_SLATE_ID } : {} }),
    equipItem,
    unequipItem,
  });
}

function baseGame(setThemeId = vi.fn()): UseSudokuReturn {
  return { themeId: "chronicle", setThemeId } as unknown as UseSudokuReturn;
}

beforeEach(() => {
  unequipItem.mockReset().mockResolvedValue(true);
  equipItem.mockReset().mockResolvedValue(true);
});
afterEach(() => wear(false, false));

describe("themeCycle", () => {
  it("keeps the three saved themes for an account without the slate", () => {
    expect(themeCycle(false)).toEqual(THEME_CYCLE);
  });

  it("adds the slate last for an account that owns it", () => {
    expect(themeCycle(true)).toEqual([...THEME_CYCLE, "slate"]);
  });
});

describe("useSlatedSudoku", () => {
  it("leaves the player's own theme alone while the slate is off", () => {
    wear(false, true);
    const { result } = renderHook(() => useSlatedSudoku(baseGame()));
    expect(result.current.themeId).toBe("chronicle");
    expect(result.current.themeCycle).toEqual([...THEME_CYCLE, "slate"]);
  });

  it("reads as the slate while it is equipped", () => {
    wear(true, true);
    const { result } = renderHook(() => useSlatedSudoku(baseGame()));
    expect(result.current.themeId).toBe("slate");
  });

  it("hides the slate from the ring of an account that does not own it", () => {
    wear(false, false);
    const { result } = renderHook(() => useSlatedSudoku(baseGame()));
    expect(result.current.themeCycle).toEqual(THEME_CYCLE);
  });

  it("equips the slate when it is chosen, without touching the saved theme", async () => {
    wear(false, true);
    const setThemeId = vi.fn();
    const { result } = renderHook(() => useSlatedSudoku(baseGame(setThemeId)));
    await act(async () => result.current.setThemeId("slate"));
    expect(equipItem).toHaveBeenCalledWith("TABLE_THEME", "sudoku", SCHOOL_SLATE_ID);
    expect(setThemeId).not.toHaveBeenCalled();
  });

  it("takes the slate off before moving to another theme", async () => {
    wear(true, true);
    const setThemeId = vi.fn();
    const { result } = renderHook(() => useSlatedSudoku(baseGame(setThemeId)));
    await act(async () => result.current.setThemeId("cyber"));
    expect(unequipItem).toHaveBeenCalledWith("TABLE_THEME", "sudoku");
    expect(setThemeId).toHaveBeenCalledWith("cyber");
  });

  it("does not touch the cosmetic when the slate is off and another theme is chosen", async () => {
    wear(false, true);
    const { result } = renderHook(() => useSlatedSudoku(baseGame()));
    await act(async () => result.current.setThemeId("arcade"));
    expect(unequipItem).not.toHaveBeenCalled();
    expect(equipItem).not.toHaveBeenCalled();
  });
});
