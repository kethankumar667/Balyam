import { describe, it, expect } from "vitest";
import type { Player } from "@shared/types.js";
import { DotsBoxesEngine } from "../DotsBoxesEngine.js";
import { chooseDotsBoxesLine, SOLVE_LIMIT, type DotsBoxesPosition } from "../dotsBoxesStrategy.js";

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

type Line = { kind: "h" | "v"; r: number; c: number };

/** Builds a position from a list of drawn lines on a board with `size` dots per edge. */
function position(size: number, drawn: Line[], playerCount = 2): DotsBoxesPosition {
  const h = Array.from({ length: size }, () => Array<boolean>(size - 1).fill(false));
  const v = Array.from({ length: size - 1 }, () => Array<boolean>(size).fill(false));
  for (const l of drawn) (l.kind === "h" ? h : v)[l.r][l.c] = true;
  return { size, h, v, playerCount, random: mulberry32(1) };
}

/** Three sides of the box at (0,0): top, left, bottom. */
const THREE_SIDES: Line[] = [
  { kind: "h", r: 0, c: 0 },
  { kind: "v", r: 0, c: 0 },
  { kind: "h", r: 1, c: 0 },
];

describe("Dots & Boxes strategy", () => {
  it("takes a box that is there to be taken", () => {
    const pick = chooseDotsBoxesLine(position(5, THREE_SIDES));

    expect(pick).toEqual({ kind: "v", r: 0, c: 1 });
  });

  it("returns null when every line is drawn", () => {
    const all: Line[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) all.push({ kind: "h", r, c });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) all.push({ kind: "v", r, c });

    expect(chooseDotsBoxesLine(position(3, all))).toBeNull();
  });

  it("draws a safe line instead of handing over a box while one exists", () => {
    // Two sides of the corner box are drawn: a third would give it away.
    const drawn: Line[] = [{ kind: "h", r: 0, c: 0 }, { kind: "v", r: 0, c: 0 }];

    const pick = chooseDotsBoxesLine(position(5, drawn))!;
    const unsafe: Line[] = [{ kind: "h", r: 1, c: 0 }, { kind: "v", r: 0, c: 1 }];

    expect(unsafe.some((l) => l.kind === pick.kind && l.r === pick.r && l.c === pick.c)).toBe(false);
  });

  it("never mutates the position it is given", () => {
    const p = position(4, THREE_SIDES);
    const before = JSON.stringify({ h: p.h, v: p.v });

    chooseDotsBoxesLine(p);

    expect(JSON.stringify({ h: p.h, v: p.v })).toBe(before);
  });

  it("answers an endgame inside the exact-solve range with an undrawn line", () => {
    // Outer ring of a 4x4-dot board drawn: 12 lines left, inside SOLVE_LIMIT.
    const size = 4;
    const drawn: Line[] = [];
    for (let c = 0; c < size - 1; c++) { drawn.push({ kind: "h", r: 0, c }); drawn.push({ kind: "h", r: size - 1, c }); }
    for (let r = 0; r < size - 1; r++) { drawn.push({ kind: "v", r, c: 0 }); drawn.push({ kind: "v", r, c: size - 1 }); }
    const p = position(size, drawn);
    expect(2 * size * (size - 1) - drawn.length).toBeLessThanOrEqual(SOLVE_LIMIT);

    const pick = chooseDotsBoxesLine(p)!;

    expect((pick.kind === "h" ? p.h : p.v)[pick.r][pick.c]).toBe(false);
  });

  it("in a two-box chain with one box takeable, takes it rather than declining (value is exact)", () => {
    // 3x3 dots, 4 boxes. Everything drawn except the two lines around box (0,0)'s right side and one more.
    const all: Line[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) all.push({ kind: "h", r, c });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) all.push({ kind: "v", r, c });
    const left = all.filter((l) => !(l.kind === "v" && l.r === 0 && l.c === 1));

    const pick = chooseDotsBoxesLine(position(3, left))!;

    expect(pick).toEqual({ kind: "v", r: 0, c: 1 });
  });
});

const makePlayer = (id: string): Player => ({ id, name: id, isReady: true, isConnected: true }) as unknown as Player;

/** The private members the old bot reached into. Cast through `unknown`, because they are private. */
interface DotsInternals {
  allRemainingLines(): Line[];
  countClosuresFor(line: Line): number;
  givesOpponentABox(line: Line): boolean;
  s: { phase: string; playerOrder: string[]; turnIndex: number; scores: Record<string, number> };
}

/** The bot as it was: take any box, else a line that gives none away, else any line at random. Kept here as the opponent to beat. */
function legacyMove(engine: DotsBoxesEngine, playerId: string, random: () => number): void {
  const internals = engine as unknown as DotsInternals;
  const all = internals.allRemainingLines();
  const capture = all.find((l) => internals.countClosuresFor(l) >= 1);
  const safe = all.filter((l) => !internals.givesOpponentABox(l));
  const pool = capture ? [capture] : safe.length > 0 ? safe : all;
  engine.applyMove({ playerId, type: "draw", data: pool[Math.floor(random() * pool.length)] });
}

function playGame(boardSize: 5 | 7, smartFirst: boolean, seed: number): "smart" | "legacy" | "tie" {
  const engine = new DotsBoxesEngine();
  engine.setOptions({ boardSize, turnTimerSeconds: 30 });
  const ids = smartFirst ? ["smart", "legacy"] : ["legacy", "smart"];
  engine.init(ids.map(makePlayer));
  const random = mulberry32(seed);
  const s = (engine as unknown as DotsInternals).s;

  for (let step = 0; step < 500 && s.phase === "playing"; step++) {
    const actor = s.playerOrder[s.turnIndex];
    if (actor === "smart") engine.applyAutoMove(actor);
    else legacyMove(engine, actor, random);
  }
  if (s.scores.smart === s.scores.legacy) return "tie";
  return s.scores.smart > s.scores.legacy ? "smart" : "legacy";
}

describe("Dots & Boxes bot tournament: the new strategy against the old greedy-and-safe bot", () => {
  it("wins clearly more often than it loses, in either seat", () => {
    const games = 60;
    let smart = 0;
    let legacy = 0;
    for (let i = 0; i < games; i++) {
      const outcome = playGame(5, i % 2 === 0, 300 + i);
      if (outcome === "smart") smart += 1;
      else if (outcome === "legacy") legacy += 1;
    }

    console.info(`[dots tournament] new bot won ${smart}, lost ${legacy}, drew ${games - smart - legacy} of ${games} (5x5 dots)`);
    expect(smart).toBeGreaterThan(legacy);
    expect(smart / (smart + legacy)).toBeGreaterThan(0.6);
  }, 120_000);
});
