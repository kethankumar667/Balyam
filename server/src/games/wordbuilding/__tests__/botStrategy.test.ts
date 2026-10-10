import { describe, it, expect, vi, afterEach } from "vitest";
import type { Player } from "@shared/types.js";
import { WordBuildingEngine } from "../WordBuildingEngine.js";

const players = (): Player[] =>
  ["new", "old"].map((id) => ({ id, name: id, isHost: false, isReady: true, isConnected: true, isBot: true }) as unknown as Player);

/** The private members the old bot reached into. Cast through `unknown`, because they are private. */
interface WordInternals {
  hasNeighborLetter(r: number, c: number): boolean;
  dryRunPlacementScore(r: number, c: number, letter: string): number;
  bestReplyScore(r: number, c: number, letter: string): number;
  s: { board: string[][]; scores: Record<string, number>; phase: string; playerOrder: string[]; turnIndex: number };
}

const OPTIONS = { turnTimerSeconds: 30, minWordLength: 3, dictionaryMode: "common", claimToScoreMode: false } as const;

/** The bot as it was: the highest-scoring placement now, else a random common letter next to an existing one. Kept here as the opponent to beat. */
function legacyMove(engine: WordBuildingEngine, id: string): void {
  const e = engine as unknown as WordInternals;
  const size = e.s.board.length;
  let best: { r: number; c: number; letter: string; score: number } | null = null;
  const adjacent: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (e.s.board[r][c] !== "" || !e.hasNeighborLetter(r, c)) continue;
      adjacent.push({ r, c });
      for (let code = 65; code <= 90; code++) {
        const letter = String.fromCharCode(code);
        const score = e.dryRunPlacementScore(r, c, letter);
        if (!best || score > best.score) best = { r, c, letter, score };
      }
    }
  }
  if (best && best.score > 0) {
    engine.applyMove({ playerId: id, type: "place", data: { r: best.r, c: best.c, letter: best.letter } });
    return;
  }
  const common = "EARIOTNSL";
  const cell = adjacent.length > 0 ? adjacent[Math.floor(Math.random() * adjacent.length)] : { r: Math.floor(size / 2), c: Math.floor(size / 2) };
  engine.applyMove({ playerId: id, type: "place", data: { ...cell, letter: common[Math.floor(Math.random() * common.length)] } });
}

describe("Word Building bot", () => {
  it("puts back every letter it tried while looking at replies", () => {
    const engine = new WordBuildingEngine();
    engine.setOptions({ boardSize: 8, ...OPTIONS });
    engine.init(players());
    const e = engine as unknown as WordInternals;
    engine.applyMove({ playerId: "new", type: "place", data: { r: 3, c: 3, letter: "C" } });
    engine.applyMove({ playerId: "old", type: "place", data: { r: 3, c: 4, letter: "A" } });
    const before = JSON.stringify(e.s.board);

    e.bestReplyScore(3, 5, "T");

    expect(JSON.stringify(e.s.board)).toBe(before);
  });

  it("makes a legal move from a position with a word one letter away", () => {
    const engine = new WordBuildingEngine();
    engine.setOptions({ boardSize: 8, ...OPTIONS });
    engine.init(players());
    engine.applyMove({ playerId: "new", type: "place", data: { r: 3, c: 2, letter: "C" } });
    engine.applyMove({ playerId: "old", type: "place", data: { r: 3, c: 3, letter: "A" } });

    const result = engine.applyAutoMove("new");

    expect(result.ok).toBe(true);
  });

  it("stays quick on a crowded board", () => {
    const engine = new WordBuildingEngine();
    engine.setOptions({ boardSize: 10, ...OPTIONS });
    engine.init(players());
    const e = engine as unknown as WordInternals;
    const timings: number[] = [];
    for (let ply = 0; ply < 40; ply++) {
      const actor = e.s.playerOrder[e.s.turnIndex];
      const t = Date.now();
      engine.applyAutoMove(actor);
      timings.push(Date.now() - t);
    }

    console.info(`[wordbuilding time] 40 bot moves, slowest ${Math.max(...timings)} ms, total ${timings.reduce((a, b) => a + b, 0)} ms`);
    // The think budget is 120 ms; allow slack for a busy machine but nowhere near a stalled turn.
    expect(Math.max(...timings)).toBeLessThan(800);
  }, 60_000);
});

/** A small seeded generator, so the tournament gives the same result every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Word Building bot tournament: the new bot against the old greedy bot", () => {
  it("scores more than the old bot over a game, in either seat", () => {
    vi.spyOn(Math, "random").mockImplementation(mulberry32(4242));
    const games = 16;
    const plies = 22;
    let newTotal = 0;
    let oldTotal = 0;
    let newWins = 0;
    let oldWins = 0;
    for (let g = 0; g < games; g++) {
      const engine = new WordBuildingEngine();
      engine.setOptions({ boardSize: 8, ...OPTIONS });
      engine.init(g % 2 === 0 ? players() : players().reverse());
      const e = engine as unknown as WordInternals;
      for (let ply = 0; ply < plies && e.s.phase === "playing"; ply++) {
        const actor = e.s.playerOrder[e.s.turnIndex];
        if (actor === "new") engine.applyAutoMove(actor);
        else legacyMove(engine, actor);
      }
      newTotal += e.s.scores.new;
      oldTotal += e.s.scores.old;
      if (e.s.scores.new > e.s.scores.old) newWins += 1;
      else if (e.s.scores.old > e.s.scores.new) oldWins += 1;
    }

    console.info(`[wordbuilding tournament] new bot won ${newWins}, old bot won ${oldWins} of ${games}; points ${newTotal} to ${oldTotal}`);
    expect(newTotal).toBeGreaterThan(oldTotal);
    expect(newWins).toBeGreaterThan(oldWins);
  }, 240_000);
});
