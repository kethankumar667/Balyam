import { describe, expect, it } from "vitest";
import type { CarromPiece, Player } from "@shared/types.js";
import { CARROM_BOARD } from "@shared/types.js";
import { CarromEngine } from "../CarromEngine.js";
import { allAtRest, launchVelocity, MAX_SPEED, radiusOf, speedOf, step } from "../physics.js";
import { isRealtimeEngine } from "../../GameEngine.js";

/**
 * Carrom — physics and rules.
 *
 * The physics half is tested through invariants rather than exact positions:
 * a float simulation's precise output is not a useful contract, but "nothing
 * ever leaves the board", "energy never increases" and "every strike comes to
 * rest" are, and those are what break when someone retunes a constant.
 */

function makePlayers(n = 2): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  })) as Player[];
}

function newGame(rng = () => 0.5): CarromEngine {
  const e = new CarromEngine();
  e.setRng(rng);
  e.init(makePlayers());
  return e;
}

/** Tick until the shot resolves, with a hard cap so a hang fails loudly. */
function settle(e: CarromEngine, cap = 2000): number {
  let n = 0;
  while (e.getPublicState().phase === "resolving" && n < cap) {
    e.simulateTick();
    n++;
  }
  return n;
}

const inBounds = (p: CarromPiece): boolean => {
  const r = radiusOf(p);
  const lo = CARROM_BOARD.cushion + r - 0.01;
  const hi = CARROM_BOARD.size - CARROM_BOARD.cushion - r + 0.01;
  return p.x >= lo && p.x <= hi && p.y >= lo && p.y <= hi;
};

describe("physics invariants", () => {
  it("clamps launch speed however much power is requested", () => {
    const sane = launchVelocity(0, 1);
    const absurd = launchVelocity(0, 1e9);
    expect(Math.hypot(absurd.vx, absurd.vy)).toBeCloseTo(Math.hypot(sane.vx, sane.vy), 5);
    expect(Math.hypot(absurd.vx, absurd.vy)).toBeLessThanOrEqual(MAX_SPEED + 1e-6);
  });

  it("never lets a piece leave the board, even at maximum power", () => {
    const e = newGame();
    for (let shot = 0; shot < 6; shot++) {
      const st = e.getPublicState();
      if (st.phase !== "aiming" || !st.turnPlayerId) break;
      e.applyMove({
        playerId: st.turnPlayerId,
        type: "shoot",
        data: { angle: 1.1 + shot, power: 1 },
      });
      settle(e);
      for (const p of e.getPublicState().pieces) {
        if (p.pocketed) continue;
        expect(inBounds(p), `${p.kind} escaped at ${p.x.toFixed(2)},${p.y.toFixed(2)}`).toBe(true);
      }
    }
  });

  it("always comes to rest", () => {
    const e = newGame();
    const st = e.getPublicState();
    e.applyMove({ playerId: st.turnPlayerId!, type: "shoot", data: { angle: -Math.PI / 2, power: 1 } });
    const ticks = settle(e);
    expect(ticks).toBeGreaterThan(0);
    expect(e.getPublicState().phase).not.toBe("resolving");
  });

  it("loses energy — friction and restitution never add any", () => {
    const pieces: CarromPiece[] = [
      { id: "a", kind: "white", x: 30, y: 50, vx: 60, vy: 12, pocketed: false },
      { id: "b", kind: "black", x: 45, y: 52, vx: 0, vy: 0, pocketed: false },
    ];
    const energy = () =>
      pieces.filter((p) => !p.pocketed).reduce((sum, p) => sum + speedOf(p) ** 2, 0);
    let prev = energy();
    for (let i = 0; i < 300; i++) {
      step(pieces, 1 / 60);
      const now = energy();
      // A collision solver with a restitution bug shows up here immediately.
      expect(now).toBeLessThanOrEqual(prev + 1e-6);
      prev = now;
    }
  });

  it("separates overlapping pieces instead of dividing by zero", () => {
    const pieces: CarromPiece[] = [
      { id: "a", kind: "white", x: 50, y: 50, vx: 0, vy: 0, pocketed: false },
      { id: "b", kind: "black", x: 50, y: 50, vx: 0, vy: 0, pocketed: false },
    ];
    step(pieces, 1 / 60);
    for (const p of pieces) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
    expect(Math.hypot(pieces[0].x - pieces[1].x, pieces[0].y - pieces[1].y)).toBeGreaterThan(0);
  });

  it("pockets a coin dropped into a corner", () => {
    const pieces: CarromPiece[] = [
      { id: "a", kind: "white", x: CARROM_BOARD.cushion, y: CARROM_BOARD.cushion, vx: 0, vy: 0, pocketed: false },
    ];
    const potted = step(pieces, 1 / 60);
    expect(potted.map((p) => p.id)).toEqual(["a"]);
    expect(allAtRest(pieces)).toBe(true);
  });
});

describe("engine contract", () => {
  it("is a real-time engine (ADR-007)", () => {
    const e = newGame();
    expect(isRealtimeEngine(e)).toBe(true);
  });

  it("deals nine coins a side plus a queen and a striker", () => {
    const pieces = newGame().getPublicState().pieces;
    expect(pieces.filter((p) => p.kind === "white")).toHaveLength(9);
    expect(pieces.filter((p) => p.kind === "black")).toHaveLength(9);
    expect(pieces.filter((p) => p.kind === "queen")).toHaveLength(1);
    expect(pieces.filter((p) => p.kind === "striker")).toHaveLength(1);
  });

  it("starts with no piece overlapping another", () => {
    const pieces = newGame().getPublicState().pieces.filter((p) => !p.pocketed);
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const d = Math.hypot(pieces[i].x - pieces[j].x, pieces[i].y - pieces[j].y);
        expect(d).toBeGreaterThanOrEqual(radiusOf(pieces[i]) + radiusOf(pieces[j]) - 1e-9);
      }
    }
  });
});

describe("turn and input rules", () => {
  it("refuses a shot from the player whose turn it is not", () => {
    const e = newGame();
    expect(e.applyMove({ playerId: "p1", type: "shoot", data: { angle: 0, power: 0.5 } }).ok).toBe(false);
  });

  it("refuses a second shot while the first is still resolving", () => {
    const e = newGame();
    e.applyMove({ playerId: "p0", type: "shoot", data: { angle: -Math.PI / 2, power: 0.9 } });
    expect(e.getPublicState().phase).toBe("resolving");
    // The double-shot exploit: firing again mid-resolution.
    expect(e.applyMove({ playerId: "p0", type: "shoot", data: { angle: 0, power: 1 } }).ok).toBe(false);
  });

  it("rejects malformed shots", () => {
    const e = newGame();
    for (const data of [
      { angle: NaN, power: 0.5 },
      { angle: 0, power: NaN },
      { angle: 0, power: 0 },
      { angle: 0, power: -3 },
      {},
    ]) {
      expect(e.applyMove({ playerId: "p0", type: "shoot", data }).ok).toBe(false);
    }
  });

  it("clamps striker placement to the baseline", () => {
    const e = newGame();
    e.applyMove({ playerId: "p0", type: "place", data: { pos: 9e9 } });
    expect(e.getPublicState().strikerPos).toBe(1);
    e.applyMove({ playerId: "p0", type: "place", data: { pos: -9e9 } });
    expect(e.getPublicState().strikerPos).toBe(0);
    const striker = e.getPublicState().pieces.find((p) => p.kind === "striker")!;
    expect(inBounds(striker)).toBe(true);
  });

  it("hides the turn owner while a shot resolves", () => {
    const e = newGame();
    e.applyMove({ playerId: "p0", type: "shoot", data: { angle: -Math.PI / 2, power: 0.8 } });
    // Nobody may act mid-strike, so nobody is "the current player".
    expect(e.getPublicState().turnPlayerId).toBeNull();
  });
});

describe("scoring rules", () => {
  /** Force a specific pot by teleporting a piece onto a pocket. */
  function potPiece(e: CarromEngine, kind: string): void {
    const inner = e as unknown as { pieces: CarromPiece[] };
    const piece = inner.pieces.find((p) => p.kind === kind && !p.pocketed)!;
    piece.x = CARROM_BOARD.cushion;
    piece.y = CARROM_BOARD.cushion;
  }

  it("awards a point and another shot for potting your own colour", () => {
    const e = newGame();
    e.applyMove({ playerId: "p0", type: "shoot", data: { angle: -Math.PI / 2, power: 0.4 } });
    potPiece(e, "white");
    settle(e);
    const st = e.getPublicState();
    const white = st.seats.find((s) => s.color === "white")!;
    expect(white.score).toBeGreaterThanOrEqual(1);
    expect(white.remaining).toBeLessThan(9);
    // Potting your own coin keeps the strike.
    expect(st.turnPlayerId).toBe("p0");
  });

  it("penalises a potted striker and passes the turn", () => {
    const e = newGame();
    e.applyMove({ playerId: "p0", type: "shoot", data: { angle: -Math.PI / 2, power: 0.4 } });
    potPiece(e, "striker");
    settle(e);
    const st = e.getPublicState();
    expect(st.lastShot).toContain("striker");
    expect(st.turnPlayerId).toBe("p1");
  });

  it("holds the queen until she is covered", () => {
    const e = newGame();
    e.applyMove({ playerId: "p0", type: "shoot", data: { angle: -Math.PI / 2, power: 0.4 } });
    potPiece(e, "queen");
    settle(e);
    // Potted alone, she is owed a cover rather than banked.
    expect(e.getPublicState().queenPendingFor).toBe("p0");
    expect(e.getPublicState().lastShot).toContain("queen");
  });

  it("returns an uncovered queen to the board", () => {
    const e = newGame();
    e.applyMove({ playerId: "p0", type: "shoot", data: { angle: -Math.PI / 2, power: 0.4 } });
    potPiece(e, "queen");
    settle(e);
    expect(e.getPublicState().queenPendingFor).toBe("p0");

    // Next shot pots nothing → she comes back and is nobody's.
    const st = e.getPublicState();
    e.applyMove({ playerId: st.turnPlayerId!, type: "shoot", data: { angle: -Math.PI / 2, power: 0.15 } });
    settle(e);
    const after = e.getPublicState();
    expect(after.queenPendingFor).toBeNull();
    const queen = after.pieces.find((p) => p.kind === "queen")!;
    expect(queen.pocketed).toBe(false);
    expect(inBounds(queen)).toBe(true);
  });

  it("never returns a coin on top of another piece", () => {
    const e = newGame();
    e.applyMove({ playerId: "p0", type: "shoot", data: { angle: -Math.PI / 2, power: 0.4 } });
    potPiece(e, "queen");
    settle(e);
    const st = e.getPublicState();
    e.applyMove({ playerId: st.turnPlayerId!, type: "shoot", data: { angle: -Math.PI / 2, power: 0.15 } });
    settle(e);

    const live = e.getPublicState().pieces.filter((p) => !p.pocketed);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const d = Math.hypot(live[i].x - live[j].x, live[i].y - live[j].y);
        // An overlapping return would be flung apart by the solver next strike.
        expect(d).toBeGreaterThan(radiusOf(live[i]) + radiusOf(live[j]) - 0.5);
      }
    }
  });
});

describe("match lifecycle", () => {
  it("ends when a player leaves", () => {
    const e = newGame();
    e.removePlayer("p1");
    expect(e.isOver()).toBe(true);
    expect(e.getPublicState().winnerId).toBe("p0");
  });

  it("keeps a bot table moving with an auto shot", () => {
    const e = newGame();
    expect(e.pendingActors()).toEqual(["p0"]);
    expect(e.applyAutoMove("p0").ok).toBe(true);
    expect(e.getPublicState().phase).toBe("resolving");
    settle(e);
    expect(e.getPublicState().phase).toBe("aiming");
  });

  it("stops accepting shots once finished", () => {
    const e = newGame();
    e.removePlayer("p1");
    expect(e.applyMove({ playerId: "p0", type: "shoot", data: { angle: 0, power: 0.5 } }).ok).toBe(false);
  });
});
