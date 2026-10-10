import { describe, it, expect } from "vitest";
import type { TicTacToeMark } from "@shared/types.js";
import { chooseTicTacToeCell, type Cell, type TicTacToePosition } from "../tictactoeSearch.js";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
] as const;

const other = (m: TicTacToeMark): TicTacToeMark => (m === "X" ? "O" : "X");

interface Game {
  cells: Cell[];
  queues: { X: number[]; O: number[] };
  mode: "classic" | "quantum";
  turn: TicTacToeMark;
  moves: number;
  winner: TicTacToeMark | null;
}

const fresh = (mode: "classic" | "quantum", first: TicTacToeMark = "X"): Game => ({
  cells: Array(9).fill(null),
  queues: { X: [], O: [] },
  mode,
  turn: first,
  moves: 0,
  winner: null,
});

const position = (g: Game): TicTacToePosition => ({ cells: g.cells, queues: g.queues, mode: g.mode, mark: g.turn });

/** Plays a move exactly as the engine does. Returns false for an illegal move. */
function play(g: Game, cell: number): boolean {
  if (g.winner || g.cells[cell] !== null) return false;
  if (g.mode === "quantum") {
    const q = g.queues[g.turn];
    if (q.length >= 3) {
      const old = q.shift()!;
      g.cells[old] = null;
    }
    q.push(cell);
  }
  g.cells[cell] = g.turn;
  g.moves += 1;
  if (LINES.some(([a, b, c]) => g.cells[a] !== null && g.cells[a] === g.cells[b] && g.cells[a] === g.cells[c])) g.winner = g.turn;
  g.turn = other(g.turn);
  return true;
}

const clone = (g: Game): Game => ({ ...g, cells: [...g.cells], queues: { X: [...g.queues.X], O: [...g.queues.O] } });

function from(cells: string, mark: TicTacToeMark, mode: "classic" | "quantum" = "classic"): TicTacToePosition {
  const c = [...cells].map((ch) => (ch === "X" || ch === "O" ? (ch as TicTacToeMark) : null));
  return { cells: c, queues: { X: [], O: [] }, mode, mark };
}

describe("tic-tac-toe search", () => {
  it("takes a win when it has one", () => {
    // X to move, X X . across the top.
    expect(chooseTicTacToeCell(from("XX.OO....", "X"))).toBe(2);
  });

  it("blocks a win it would otherwise lose to", () => {
    // O to move; X threatens the top row and O has no win of its own.
    expect(chooseTicTacToeCell(from("XX..O....", "O"))).toBe(2);
  });

  it("plays the centre first when it is free", () => {
    expect(chooseTicTacToeCell(from(".........", "X"))).toBe(4);
  });

  it("avoids the fork the old bot walked into", () => {
    // X has two opposite corners and O has the centre. O must play an EDGE (not a corner), or X forks.
    const move = chooseTicTacToeCell(from("X...O...X", "O"));

    expect([1, 3, 5, 7]).toContain(move);
  });

  it("returns null when the board is full", () => {
    expect(chooseTicTacToeCell(from("XOXXOOOXX", "X"))).toBeNull();
  });

  it("never mutates the position it is given", () => {
    const p = from("X...O...X", "O");
    const before = JSON.stringify(p);

    chooseTicTacToeCell(p);

    expect(JSON.stringify(p)).toBe(before);
  });
});

describe("classic mode is played perfectly: it cannot be beaten", () => {
  /** Plays EVERY possible line for the opponent against the bot, from `g`, and counts the games the bot lost. */
  function countBotLosses(g: Game, bot: TicTacToeMark): number {
    if (g.winner) return g.winner === bot ? 0 : 1;
    if (g.cells.every((c) => c !== null)) return 0;
    if (g.turn === bot) {
      const g2 = clone(g);
      play(g2, chooseTicTacToeCell(position(g2))!);
      return countBotLosses(g2, bot);
    }
    let losses = 0;
    for (let i = 0; i < 9; i++) {
      if (g.cells[i] !== null) continue;
      const g2 = clone(g);
      play(g2, i);
      losses += countBotLosses(g2, bot);
    }
    return losses;
  }

  it("never loses as the first player, against every possible opponent line", () => {
    expect(countBotLosses(fresh("classic", "X"), "X")).toBe(0);
  });

  it("never loses as the second player, against every possible opponent line", () => {
    expect(countBotLosses(fresh("classic", "X"), "O")).toBe(0);
  });
});

describe("quantum mode: the bot against the old win-block-priority bot", () => {
  /** The old bot: win now, block now (understanding that a vanishing mark cannot complete a line), then centre, corners, edges. */
  function legacyChoose(g: Game): number {
    const mark = g.turn;
    const wouldVanish = (m: TicTacToeMark): number | null => (g.mode === "quantum" && g.queues[m].length >= 3 ? g.queues[m][0] : null);
    const winning = (m: TicTacToeMark): number | null => {
      const gone = wouldVanish(m);
      for (let i = 0; i < 9; i++) {
        if (g.cells[i] !== null) continue;
        for (const line of LINES) {
          if (!(line as readonly number[]).includes(i)) continue;
          const others = line.filter((x) => x !== i);
          if (gone !== null && others.some((x) => x === gone)) continue;
          if (g.cells[others[0]] === m && g.cells[others[1]] === m) return i;
        }
      }
      return null;
    };
    const win = winning(mark);
    if (win !== null) return win;
    const block = winning(other(mark));
    if (block !== null) return block;
    return [4, 0, 2, 6, 8, 1, 3, 5, 7].find((c) => g.cells[c] === null)!;
  }

  function playGame(newBot: TicTacToeMark): "new" | "old" | "none" {
    const g = fresh("quantum", "X");
    for (let i = 0; i < 60 && !g.winner; i++) {
      const cell = g.turn === newBot ? chooseTicTacToeCell(position(g))! : legacyChoose(g);
      if (!play(g, cell)) return "none";
    }
    if (!g.winner) return "none";
    return g.winner === newBot ? "new" : "old";
  }

  it("never loses to it, in either seat", () => {
    const results = (["X", "O"] as const).map((m) => playGame(m));

    console.info(`[tictactoe quantum] new bot as X: ${results[0]}, as O: ${results[1]}`);
    expect(results).not.toContain("old");
  });
});

describe("quantum mode: the bot against random play", () => {
  function randomGame(newBot: TicTacToeMark, seed: number): "new" | "old" | "none" {
    let a = seed >>> 0;
    const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
    const g = fresh("quantum", "X");
    for (let i = 0; i < 200 && !g.winner; i++) {
      let cell: number;
      if (g.turn === newBot) cell = chooseTicTacToeCell(position(g))!;
      else {
        const empty = g.cells.map((c, idx) => (c === null ? idx : -1)).filter((x) => x >= 0);
        cell = empty[Math.floor(rnd() * empty.length)];
      }
      if (!play(g, cell)) return "none";
    }
    if (!g.winner) return "none";
    return g.winner === newBot ? "new" : "old";
  }

  it("beats a random player essentially every time", () => {
    let wins = 0;
    let losses = 0;
    const games = 200;
    for (let i = 0; i < games; i++) {
      const r = randomGame(i % 2 === 0 ? "X" : "O", 77 + i);
      if (r === "new") wins += 1;
      if (r === "old") losses += 1;
    }

    console.info(`[tictactoe quantum] against random play: ${wins} wins, ${losses} losses in ${games}`);
    expect(losses).toBe(0);
    expect(wins).toBeGreaterThan(games * 0.95);
  });
});
