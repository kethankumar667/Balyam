import type { Connect4Disc } from "@shared/types.js";

export interface Connect4Threat {
  playerDisc: Connect4Disc;
  type: "horizontal" | "vertical" | "diagonal";
}

/**
 * Detects if any player has an active 3-in-a-row threat with an immediately playable open slot.
 */
export function detectConnect4Threat(grid: (Connect4Disc | null)[][]): Connect4Threat | null {
  const ROWS = 6;
  const COLS = 7;

  // Helper to check if a specific (r, c) is immediately playable (i.e. is empty and either at row 5 or has disc below it)
  const isImmediatelyPlayable = (r: number, c: number): boolean => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    if (grid[r][c] !== null) return false;
    return r === ROWS - 1 || grid[r + 1][c] !== null;
  };

  // Horizontal threats: 3 in a row
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [grid[r][c], grid[r][c + 1], grid[r][c + 2], grid[r][c + 3]];
      for (const disc of ["R", "Y"] as const) {
        const discCount = window.filter((cell) => cell === disc).length;
        const nullCount = window.filter((cell) => cell === null).length;
        if (discCount === 3 && nullCount === 1) {
          const emptyColOffset = window.indexOf(null);
          const emptyCol = c + emptyColOffset;
          if (isImmediatelyPlayable(r, emptyCol)) {
            return { playerDisc: disc, type: "horizontal" };
          }
        }
      }
    }
  }

  // Vertical threats: 3 stacked with the 4th top slot immediately playable
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      const d1 = grid[r + 1][c];
      const d2 = grid[r + 2][c];
      const d3 = grid[r + 3][c];
      if (d1 !== null && d1 === d2 && d2 === d3) {
        if (grid[r][c] === null) {
          return { playerDisc: d1, type: "vertical" };
        }
      }
    }
  }

  return null;
}
