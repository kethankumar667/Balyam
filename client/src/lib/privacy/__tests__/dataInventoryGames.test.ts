import { describe, expect, it } from "vitest";
import { DATA_INVENTORY } from "../dataInventory";
import { STORAGE_SUDOKU_PROGRESS } from "../../../games/sudoku/useSudoku";
import { STORAGE_SUDOKU_SAVED } from "../../../games/sudoku/sudokuSave";

/**
 * The DPDP notice, the Section 11 export and the Section 12 erasure all read
 * `DATA_INVENTORY`. A key the game writes but the inventory omits is a key the
 * notice under-declares — so every key these two games write is pinned here.
 */
describe("privacy inventory covers the Sudoku and Tic Tac Toe storage keys", () => {
  const declared = new Map(DATA_INVENTORY.map((e) => [e.key, e]));

  const gameKeys = [
    STORAGE_SUDOKU_PROGRESS,
    STORAGE_SUDOKU_SAVED,
    "bhalyam.sudoku.tutorial.seen.v1",
    "bhalyam.tictactoe.muted",
    "bhalyam.connect4.muted",
    "bhalyam.connect4.theme",
  ];

  it.each(gameKeys)("declares %s", (key) => {
    expect(declared.has(key)).toBe(true);
  });

  it.each(gameKeys)("describes %s honestly: on-device, not personal data", (key) => {
    const entry = declared.get(key)!;
    expect(entry.isPersonalData).toBe(false);
    expect(entry.description.length).toBeGreaterThan(24);
    expect(["progress", "preference"]).toContain(entry.purpose);
  });

  it("says what the saved-board key actually holds", () => {
    expect(declared.get(STORAGE_SUDOKU_SAVED)!.description).toMatch(/board|puzzle/i);
  });
});
