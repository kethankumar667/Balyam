import { describe, it, expect } from "vitest";
import type { CarromPiece, Player } from "@shared/types.js";
import { CarromEngine } from "../CarromEngine.js";
import { chooseCarromShot } from "../carromStrategy.js";

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

const seat = (id: string): Player => ({ id, name: id, isHost: false, isReady: true, isConnected: true, isBot: true }) as unknown as Player;

interface CarromInternals {
  phase: string;
  seats: { playerId: string; score: number; color: string; remaining: number }[];
  pieces: CarromPiece[];
  turnIndex: number;
  simpleShot(playerId: string): { ok: boolean };
}

const piece = (id: string, kind: CarromPiece["kind"], x: number, y: number): CarromPiece => ({ id, kind, x, y, vx: 0, vy: 0, pocketed: false });

describe("Carrom shot search", () => {
  // One white coin sitting in clear space, nothing else to get in the way.
  const lone = [piece("w1", "white", 30, 40), piece("s", "striker", 50, 82)];

  it("finds a shot for a coin it can line up", () => {
    const shot = chooseCarromShot({ pieces: lone, color: "white", mode: "classic", turnIndex: 0, candidates: 12, aimNoise: 0, rng: mulberry32(1) });

    expect(shot).not.toBeNull();
    expect(shot!.value).toBeGreaterThan(0);
    expect(shot!.pos).toBeGreaterThanOrEqual(0);
    expect(shot!.pos).toBeLessThanOrEqual(1);
  });

  it("returns null when it has no coin to play", () => {
    const onlyBlack = [piece("b1", "black", 30, 40), piece("s", "striker", 50, 82)];

    expect(chooseCarromShot({ pieces: onlyBlack, color: "white", mode: "classic", turnIndex: 0, candidates: 12, aimNoise: 0, rng: mulberry32(1) })).toBeNull();
  });

  it("is deterministic for a fixed random source", () => {
    const query = { pieces: lone, color: "white" as const, mode: "classic" as const, turnIndex: 0, candidates: 12, aimNoise: 0.02 };
    const a = chooseCarromShot({ ...query, rng: mulberry32(7) });
    const b = chooseCarromShot({ ...query, rng: mulberry32(7) });

    expect(a).toEqual(b);
  });

  it("the shot it picks really pots the coin when the engine plays it", () => {
    const engine = new CarromEngine();
    engine.setRng(mulberry32(3));
    engine.setOptions({ mode: "classic", botDifficulty: "pro" });
    engine.init([seat("a"), seat("b")]);
    const e = engine as unknown as CarromInternals;
    e.pieces = [piece("w1", "white", 30, 40), piece("b1", "black", 70, 30), piece("s", "striker", 50, 82)];
    const before = e.seats[0].score;

    engine.applyAutoMove("a");
    for (let i = 0; i < 600 && e.phase === "resolving"; i++) engine.simulateTick();

    expect(e.seats[0].score).toBeGreaterThan(before);
  });

  it("does not run long enough to stall a turn", () => {
    const engine = new CarromEngine();
    engine.setRng(mulberry32(5));
    engine.setOptions({ mode: "classic", botDifficulty: "pro" });
    engine.init([seat("a"), seat("b")]);

    const started = Date.now();
    engine.applyAutoMove("a");

    const elapsed = Date.now() - started;
    console.info(`[carrom time] pro bot's opening shot took ${elapsed} ms`);
    expect(elapsed).toBeLessThan(2_000);
  });
});

/** Plays one board; "smart" takes the engine's bot shot, the other seat takes the old plain shot. Returns the final scores. */
function playBoard(seed: number, smartFirst: boolean, level: "medium" | "pro"): { smart: number; plain: number } {
  const engine = new CarromEngine();
  engine.setRng(mulberry32(seed));
  engine.setOptions({ mode: "classic", botDifficulty: level });
  const ids = smartFirst ? ["smart", "plain"] : ["plain", "smart"];
  engine.init(ids.map(seat));
  const e = engine as unknown as CarromInternals;

  for (let shots = 0; shots < 90 && e.phase !== "finished"; shots++) {
    const actor = e.seats[e.turnIndex].playerId;
    if (actor === "smart") engine.applyAutoMove(actor);
    else e.simpleShot(actor);
    for (let tick = 0; tick < 900 && e.phase === "resolving"; tick++) engine.simulateTick();
  }
  const score = (id: string) => e.seats.find((s) => s.playerId === id)!.score;
  return { smart: score("smart"), plain: score("plain") };
}

describe("Carrom bot tournament: the physics search against the old nearest-coin shot", () => {
  it.each(["medium", "pro"] as const)("%s out-scores the old shot over a board, in either seat", (level) => {
    const boards = 10;
    let smart = 0;
    let plain = 0;
    let wins = 0;
    let losses = 0;
    for (let i = 0; i < boards; i++) {
      const r = playBoard(400 + i, i % 2 === 0, level);
      smart += r.smart;
      plain += r.plain;
      if (r.smart > r.plain) wins += 1;
      else if (r.plain > r.smart) losses += 1;
    }

    console.info(`[carrom tournament] ${level}: scored ${smart} to ${plain}; won ${wins}, lost ${losses} of ${boards} boards`);
    expect(smart).toBeGreaterThan(plain);
    expect(wins).toBeGreaterThan(losses);
  }, 280_000);
});
