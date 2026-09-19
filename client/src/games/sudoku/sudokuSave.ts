/**
 * In-progress Sudoku boards, one slot per difficulty, so a phone call, a
 * refresh or a crashed tab does not cost the player their puzzle.
 *
 * Everything read back is untrusted: it is JSON in a user-editable store, and a
 * malformed or hand-edited entry must never crash the page or smuggle in a
 * board that is not a real Sudoku. Anything that fails validation is treated as
 * "no save" and the player simply gets a fresh board.
 */

export const STORAGE_SUDOKU_SAVED = "bhalyam.sudoku.saved.v1";

export interface SavedSudokuCell {
  /** Entered digit, or the clue for a given cell. `null` = empty. */
  v: number | null;
  /** Pencil marks. */
  n: number[];
}

export interface SavedSudokuGame {
  puzzle: string;
  solution: string;
  cells: SavedSudokuCell[];
  elapsedSeconds: number;
  mistakes: number;
  hintsUsed: number;
  boardNumber: number;
  savedAt: number;
}

type SaveStore = Record<string, SavedSudokuGame>;

const MAX_SAVED_SECONDS = 7 * 24 * 60 * 60;
const MAX_SAVED_MISTAKES = 2; // a third mistake ends the game, which is never saved

const PUZZLE_PATTERN = /^[1-9-]{81}$/;
const SOLUTION_PATTERN = /^[1-9]{81}$/;

const isDigit = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 9;
const isCount = (n: unknown, max: number): n is number =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max;

/** Every row, column and 3x3 block of a solved grid holds each digit once. */
function isValidSolutionGrid(solution: string): boolean {
  const units: string[][] = Array.from({ length: 27 }, () => []);
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const block = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const d = solution[i]!;
    units[row]!.push(d);
    units[9 + col]!.push(d);
    units[18 + block]!.push(d);
  }
  return units.every((u) => new Set(u).size === 9);
}

export function isValidSavedGame(g: unknown): g is SavedSudokuGame {
  if (g === null || typeof g !== "object") return false;
  const s = g as Partial<SavedSudokuGame>;
  if (typeof s.puzzle !== "string" || !PUZZLE_PATTERN.test(s.puzzle)) return false;
  if (typeof s.solution !== "string" || !SOLUTION_PATTERN.test(s.solution)) return false;
  if (!isValidSolutionGrid(s.solution)) return false;
  if (!Array.isArray(s.cells) || s.cells.length !== 81) return false;
  if (!isCount(s.elapsedSeconds, MAX_SAVED_SECONDS)) return false;
  if (!isCount(s.mistakes, MAX_SAVED_MISTAKES)) return false;
  if (!isCount(s.hintsUsed, 81)) return false;
  if (!Number.isInteger(s.boardNumber) || (s.boardNumber as number) < 1) return false;

  for (let i = 0; i < 81; i++) {
    const clue = s.puzzle[i]!;
    const c = s.cells[i] as Partial<SavedSudokuCell> | null;
    if (c === null || typeof c !== "object") return false;
    if (c.v !== null && !isDigit(c.v)) return false;
    if (!Array.isArray(c.n) || c.n.length > 9 || !c.n.every(isDigit)) return false;
    if (clue !== "-") {
      // A given clue must match the solution and can carry neither edits nor notes.
      if (clue !== s.solution[i] || c.v !== Number(clue) || c.n.length > 0) return false;
    }
  }
  return true;
}

function readStore(): SaveStore {
  try {
    const raw = localStorage.getItem(STORAGE_SUDOKU_SAVED);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as SaveStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: SaveStore): void {
  try {
    if (Object.keys(store).length === 0) localStorage.removeItem(STORAGE_SUDOKU_SAVED);
    else localStorage.setItem(STORAGE_SUDOKU_SAVED, JSON.stringify(store));
  } catch {
    // Quota or private mode: resuming is a convenience, never a requirement.
  }
}

export function readSavedGame(difficulty: string): SavedSudokuGame | null {
  const slot = readStore()[difficulty];
  return isValidSavedGame(slot) ? slot : null;
}

export function writeSavedGame(difficulty: string, game: SavedSudokuGame): void {
  writeStore({ ...readStore(), [difficulty]: game });
}

export function clearSavedGame(difficulty: string): void {
  const { [difficulty]: dropped, ...rest } = readStore();
  void dropped;
  writeStore(rest);
}
