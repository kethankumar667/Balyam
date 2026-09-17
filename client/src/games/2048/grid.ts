export const GRID_SIZE = 4;

export type Direction = "up" | "down" | "left" | "right";

export interface Cell {
  value: number;
  /** One-tick "just landed" flag for the attack-tile pulse animation in Battle mode. Cleared the moment the tile passes through any slide. */
  isGarbage?: boolean;
}

export type Grid = (Cell | null)[];

export function emptyGrid(): Grid {
  return new Array(GRID_SIZE * GRID_SIZE).fill(null);
}

export function emptyCells(grid: Grid): number[] {
  const out: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] == null) out.push(i);
  }
  return out;
}

/**
 * Picks one empty cell at random and drops a tile into it — 90% a "2", 10%
 * a "4", the same odds every 2048 clone uses. This is a genuinely solo,
 * client-only game (see the "2048 is solo-only" product decision), so
 * there is no multiplayer fairness requirement driving a seeded RNG —
 * `rng` defaults to `Math.random` and only exists as a parameter for tests.
 */
export function spawnTile(grid: Grid, rng: () => number = Math.random, opts?: { value?: number; isGarbage?: boolean }): Grid {
  const empties = emptyCells(grid);
  const next = grid.slice();
  if (empties.length === 0) return next;
  const idx = empties[Math.floor(rng() * empties.length)];
  const value = opts?.value ?? (rng() < 0.9 ? 2 : 4);
  next[idx] = opts?.isGarbage ? { value, isGarbage: true } : { value };
  return next;
}

/** True once nothing on the grid can slide or merge — the classic "game over" check. */
export function hasAnyMove(grid: Grid): boolean {
  const N = GRID_SIZE;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] == null) return true;
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = grid[r * N + c]!.value;
      if (c + 1 < N && grid[r * N + c + 1]?.value === v) return true;
      if (r + 1 < N && grid[(r + 1) * N + c]?.value === v) return true;
    }
  }
  return false;
}

/** Highest tile value currently on the board, or 0 on an empty grid. */
export function highestTile(grid: Grid): number {
  let best = 0;
  for (const cell of grid) {
    if (cell && cell.value > best) best = cell.value;
  }
  return best;
}

/** Indices, in slide order (index 0 is where tiles move toward), for one row or column. */
function lineIndices(direction: Direction, lineIdx: number): number[] {
  const N = GRID_SIZE;
  switch (direction) {
    case "left":
      return [0, 1, 2, 3].map((c) => lineIdx * N + c);
    case "right":
      return [3, 2, 1, 0].map((c) => lineIdx * N + c);
    case "up":
      return [0, 1, 2, 3].map((r) => r * N + lineIdx);
    case "down":
      return [3, 2, 1, 0].map((r) => r * N + lineIdx);
  }
}

interface MergeLineResult {
  line: Grid;
  mergeCount: number;
  scoreGained: number;
}

/** Slides and merges ONE row/column, already read in slide order (see `lineIndices`). Standard 2048 rule: each tile merges at most once per move. */
function mergeLine(line: readonly (Cell | null)[]): MergeLineResult {
  const values = line.filter((c): c is Cell => c != null).map((c) => c.value);
  const merged: number[] = [];
  let mergeCount = 0;
  let scoreGained = 0;
  let i = 0;
  while (i < values.length) {
    if (i + 1 < values.length && values[i] === values[i + 1]) {
      const sum = values[i] * 2;
      merged.push(sum);
      mergeCount++;
      scoreGained += sum;
      i += 2;
    } else {
      merged.push(values[i]);
      i += 1;
    }
  }
  while (merged.length < line.length) merged.push(0);
  return {
    line: merged.map((v) => (v === 0 ? null : { value: v })),
    mergeCount,
    scoreGained,
  };
}

/** Drops up to `count` garbage "2" tiles into random empty cells (fewer if the board runs out of room). Battle mode's self-imposed difficulty ramp — extracted as a pure function so it's directly testable without simulating a full game. */
export function insertGarbage(grid: Grid, count: number, rng: () => number = Math.random): Grid {
  let next = grid;
  for (let i = 0; i < count; i++) {
    if (emptyCells(next).length === 0) break;
    next = spawnTile(next, rng, { value: 2, isGarbage: true });
  }
  return next;
}

export interface SlideResult {
  grid: Grid;
  /** False when this move is a legal no-op (nothing slid or merged). */
  moved: boolean;
  mergeCount: number;
  scoreGained: number;
}

/** Slides every tile on the board one direction and resolves merges. Garbage tiles lose their `isGarbage` flag the moment they pass through here. */
export function slideAndMerge(grid: Grid, direction: Direction): SlideResult {
  const next = grid.slice();
  let mergeCount = 0;
  let scoreGained = 0;
  let moved = false;

  for (let lineIdx = 0; lineIdx < GRID_SIZE; lineIdx++) {
    const idxs = lineIndices(direction, lineIdx);
    const line = idxs.map((i) => grid[i]);
    const result = mergeLine(line);
    mergeCount += result.mergeCount;
    scoreGained += result.scoreGained;
    idxs.forEach((gridIdx, pos) => {
      const before = grid[gridIdx]?.value ?? null;
      const after = result.line[pos]?.value ?? null;
      if (before !== after) moved = true;
      next[gridIdx] = result.line[pos];
    });
  }

  return { grid: next, moved, mergeCount, scoreGained };
}
