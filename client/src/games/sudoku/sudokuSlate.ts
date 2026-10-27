import { useCallback, useEffect } from "react";
import { useSchoolSlate } from "../../lib/schoolSlate";
import { sudokuAudio } from "./sudokuAudio";
import { SUDOKU_THEMES, themeCycle, type SudokuThemeId } from "./sudokuThemes";
import type { UseSudokuReturn } from "./useSudoku";

/** The game a Sudoku screen draws: the hook's state with the account's School Slate laid over its theme choice. */
export type SudokuGame = UseSudokuReturn & {
  /** The themes the theme button steps through, in order. The slate is in the ring only for an account that owns it. */
  themeCycle: readonly SudokuThemeId[];
};

/**
 * The slate is an equipped cosmetic, not one of the player's three saved themes, so it is laid over the hook here
 * and not stored in it. While it is on, `themeId` reads "slate". Choosing the slate equips it; choosing anything else
 * takes it off first, so the cosmetic and the screen never disagree about which look is showing.
 */
export function useSlatedSudoku(game: UseSudokuReturn): SudokuGame {
  const slate = useSchoolSlate("sudoku");
  const { isOn, isOwned, setOn } = slate;
  const { setThemeId } = game;
  const themeId: SudokuThemeId = isOn ? "slate" : game.themeId;

  // The hook sets the sound when its own theme changes; the slate has its own voice to put back or take away.
  useEffect(() => {
    sudokuAudio.setSoundProfile(SUDOKU_THEMES[themeId].soundProfile);
  }, [themeId]);

  const chooseTheme = useCallback(
    (next: SudokuThemeId) => {
      if (next === "slate") {
        void setOn(true);
        return;
      }
      if (isOn) void setOn(false);
      setThemeId(next);
    },
    [isOn, setOn, setThemeId],
  );

  return { ...game, themeId, setThemeId: chooseTheme, themeCycle: themeCycle(isOn || isOwned) };
}
