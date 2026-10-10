import { describe, it, expect } from "vitest";
import type { BingoBoard, Player } from "@shared/types.js";
import { BingoEngine } from "../BingoEngine.js";
import { chooseBingoCall } from "../bingoStrategy.js";
import { evaluateBoardLines } from "../win.js";

/** A small seeded generator, so a tournament gives the same result every run. */
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

/** A board where cell i holds value `values[i]`. */
const boardOf = (values: number[]): BingoBoard => values.map((value, index) => ({ index, value, marked: false })) as unknown as BingoBoard;

const IDENTITY = boardOf(Array.from({ length: 25 }, (_, i) => i + 1));
const REVERSED = boardOf(Array.from({ length: 25 }, (_, i) => 25 - i));

/** A shuffled 1..25 board. */
function shuffledBoard(random: () => number): BingoBoard {
  const values = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return boardOf(values);
}

const lines = (board: BingoBoard, called: Set<number>): number => evaluateBoardLines(board, called).completedLinesCount;

describe("Bingo call strategy", () => {
  it("returns null when every number is called", () => {
    const called = new Set(Array.from({ length: 25 }, (_, i) => i + 1));

    expect(chooseBingoCall({ mine: IDENTITY, rivals: [], called })).toBeNull();
  });

  it("calls the last number when only one is left", () => {
    const called = new Set(Array.from({ length: 24 }, (_, i) => i + 1));

    expect(chooseBingoCall({ mine: IDENTITY, rivals: [], called })).toBe(25);
  });

  it("builds on a line it has already started", () => {
    // Top row 1..4 called: 5 completes it.
    const called = new Set([1, 2, 3, 4]);

    expect(chooseBingoCall({ mine: IDENTITY, rivals: [], called, random: () => 0 })).toBe(5);
  });

  it("is deterministic for a fixed random source", () => {
    const called = new Set([3, 9, 14]);

    const a = chooseBingoCall({ mine: IDENTITY, rivals: [REVERSED], called, random: mulberry32(5) });
    const b = chooseBingoCall({ mine: IDENTITY, rivals: [REVERSED], called, random: mulberry32(5) });

    expect(a).toBe(b);
  });

  it("never hands a rival the win when it has another choice, and always takes its own win", () => {
    const random = mulberry32(2026);
    let rivalWinSpotted = 0;
    let ownWinSpotted = 0;

    for (let trial = 0; trial < 4_000; trial++) {
      const mine = shuffledBoard(random);
      const rival = shuffledBoard(random);
      const order = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => random() - 0.5);
      const called = new Set(order.slice(0, 12 + Math.floor(random() * 11)));
      if (lines(mine, called) >= 5 || lines(rival, called) >= 5) continue;

      const uncalled = order.filter((v) => !called.has(v));
      const wins = (board: BingoBoard, v: number) => lines(board, new Set([...called, v])) >= 5;
      const myWinners = uncalled.filter((v) => wins(mine, v));
      const safe = uncalled.filter((v) => !wins(rival, v));

      const pick = chooseBingoCall({ mine, rivals: [rival], called, random })!;

      if (myWinners.length > 0) {
        ownWinSpotted += 1;
        expect(myWinners).toContain(pick);
      } else if (safe.length > 0 && safe.length < uncalled.length) {
        rivalWinSpotted += 1;
        expect(wins(rival, pick)).toBe(false);
      }
    }

    // The property must have been exercised, not vacuously true.
    expect(rivalWinSpotted + ownWinSpotted).toBeGreaterThan(0);
  });
});

const seat = (id: string): Player => ({ id, name: id, isHost: false, isReady: true, isConnected: true, isBot: true }) as unknown as Player;

/** Who reached five lines first in a two-seat game where `smart` uses the engine's bot and `rival` calls at random. */
function playGame(seed: number, smartFirst: boolean): "smart" | "rival" | "tie" {
  const engine = new BingoEngine();
  engine.setRng(mulberry32(seed));
  const random = mulberry32(seed ^ 0x9e3779b9);
  const ids = smartFirst ? ["smart", "rival"] : ["rival", "smart"];
  engine.init(ids.map(seat));
  engine.applyMove({ playerId: ids[0], type: "lockBoard" });

  for (let step = 0; step < 80; step++) {
    const state = engine.getPublicState();
    const done = ids.filter((id) => state.players.find((p) => p.id === id)!.completedLinesCount >= 5);
    if (done.length === 2) return "tie";
    if (done.length === 1) return done[0] === "smart" ? "smart" : "rival";
    if (engine.isOver()) return "tie";

    const turn = state.currentTurnPlayerId!;
    if (turn === "smart") engine.applyAutoMove(turn);
    else {
      const uncalled = Array.from({ length: 25 }, (_, i) => i + 1).filter((v) => !state.calledNumbers.some((c) => c.value === v));
      engine.applyMove({ playerId: turn, type: "callNumber", data: { number: uncalled[Math.floor(random() * uncalled.length)] } });
    }
  }
  return "tie";
}

describe("Bingo bot tournament: the new caller against a random caller", () => {
  it("wins clearly more often than it loses, in either seat", () => {
    const games = 400;
    let smart = 0;
    let rival = 0;
    for (let i = 0; i < games; i++) {
      const winner = playGame(7_000 + i, i % 2 === 0);
      if (winner === "smart") smart += 1;
      else if (winner === "rival") rival += 1;
    }

    console.info(`[bingo tournament] new caller won ${smart}, random caller won ${rival}, ties ${games - smart - rival} of ${games}`);
    expect(smart).toBeGreaterThan(rival);
  }, 120_000);
});
