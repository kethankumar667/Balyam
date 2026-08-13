import { describe, expect, it } from "vitest";
import type { Player } from "@shared/types.js";
import { VYOMA_WORLD } from "@shared/types.js";
import { VyomaYudhEngine } from "../VyomaYudhEngine.js";
import { isRealtimeEngine } from "../../GameEngine.js";

/**
 * Vyoma Yudh.
 *
 * The old shooter this replaces was unplayable in ways no test noticed: it
 * had no enemy-ship collision, so `hp` never dropped and `isOver` was
 * unreachable — the game could not be lost, won, or finished. Several of the
 * cases below exist specifically so that class of bug cannot come back.
 *
 * The other half is anti-cheat. The previous engine let the CLIENT drive the
 * simulation clock and let any player move any ship; both are pinned here.
 */

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  })) as Player[];
}

function newGame(n = 1, rng = () => 0.5): VyomaYudhEngine {
  const e = new VyomaYudhEngine();
  e.setRng(rng);
  e.init(makePlayers(n));
  return e;
}

/** Advance the simulation n steps. */
function run(e: VyomaYudhEngine, n: number): void {
  for (let i = 0; i < n; i++) e.simulateTick();
}

describe("real-time contract", () => {
  it("declares itself a real-time engine so the room owns the clock", () => {
    const e = newGame();
    expect(isRealtimeEngine(e)).toBe(true);
    expect(e.tickRateHz).toBeGreaterThan(0);
  });

  it("refuses a client-sent tick", () => {
    const e = newGame();
    // The whole point of the server loop: a client that emits `tick` must not
    // be able to advance the world. The old engine accepted exactly this.
    const before = e.getPublicState().tick;
    const res = e.applyMove({ playerId: "p0", type: "tick" });
    expect(res.ok).toBe(false);
    expect(e.getPublicState().tick).toBe(before);
  });

  it("advances only through simulateTick", () => {
    const e = newGame();
    const before = e.getPublicState().tick;
    e.simulateTick();
    expect(e.getPublicState().tick).toBe(before + 1);
  });
});

describe("run ownership", () => {
  it("accepts input from the pilot and nobody else", () => {
    const e = newGame(1);
    expect(e.getPublicState().pilotId).toBe("p0");
    expect(e.applyMove({ playerId: "p0", type: "fire" }).ok).toBe(true);
    // Any other id is not in this game at all.
    expect(e.applyMove({ playerId: "p1", type: "fire" }).ok).toBe(false);
  });

  it("clamps a steer request instead of trusting its magnitude", () => {
    const e = newGame(1);
    const startY = e.getPublicState().ship!.y;
    // A hostile client asking to jump the full board height in one input.
    e.applyMove({ playerId: "p0", type: "steer", data: { dy: 9999 } });
    /**
     * The steer records a DIRECTION and the tick flies the ship, so the
     * distance is measured after a tick rather than at the moment the
     * message lands. Flight speed used to be a function of how many packets
     * arrived, which is what made the controls feel heavy on a phone —
     * see steering.test.ts.
     */
    e.simulateTick();
    const moved = e.getPublicState().ship!.y - startY;
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(5);
  });

  it("rejects a non-numeric steer", () => {
    const e = newGame(1);
    expect(e.applyMove({ playerId: "p0", type: "steer", data: { dy: NaN } }).ok).toBe(false);
    expect(e.applyMove({ playerId: "p0", type: "steer", data: {} }).ok).toBe(false);
  });

  it("keeps the ship inside the world however hard it is steered", () => {
    const e = newGame(1);
    for (let i = 0; i < 200; i++) e.applyMove({ playerId: "p0", type: "steer", data: { dy: 1 } });
    expect(e.getPublicState().ship!.y).toBeLessThanOrEqual(VYOMA_WORLD.h);
    for (let i = 0; i < 400; i++) e.applyMove({ playerId: "p0", type: "steer", data: { dy: -1 } });
    expect(e.getPublicState().ship!.y).toBeGreaterThanOrEqual(0);
  });
});

describe("weapons", () => {
  it("gives unlimited basic fire but finite specials", () => {
    const e = newGame(1);
    for (let i = 0; i < 50; i++) {
      expect(e.applyMove({ playerId: "p0", type: "fire" }).ok).toBe(true);
    }
    const ammo = e.getPublicState().ammo;
    let fired = 0;
    while (e.applyMove({ playerId: "p0", type: "special", data: { weapon: "missile" } }).ok) {
      fired++;
      if (fired > 20) break; // guard against an infinite-ammo regression
    }
    expect(fired).toBe(ammo.missile);
    expect(e.getPublicState().ammo.missile).toBe(0);
  });

  it("rejects an unknown weapon", () => {
    const e = newGame(1);
    expect(
      e.applyMove({ playerId: "p0", type: "special", data: { weapon: "nuke" } }).ok,
    ).toBe(false);
  });

  it("fires a spread of homing missiles", () => {
    const e = newGame(1);
    e.applyMove({ playerId: "p0", type: "special", data: { weapon: "missile" } });
    const missiles = e.getPublicState().shots.filter((s) => s.weapon === "missile");
    expect(missiles.length).toBe(3);
  });
});

describe("the pilot can actually die — and the run can actually end", () => {
  it("loses a life to an enemy and eventually ends the run", () => {
    // Dense spawns, always firing: the old engine could sit in this state
    // forever without ever losing a life.
    const e = new VyomaYudhEngine();
    e.setRng(() => 0.5);
    e.setOptions({ difficulty: "hard", lives: 2, levels: 8 });
    e.init(makePlayers(1));

    const startLives = e.getPublicState().lives;
    let livesDropped = false;
    for (let i = 0; i < 4000; i++) {
      e.simulateTick();
      const st = e.getPublicState();
      if (st.pilotId === null || st.isOver) break;
      if (st.lives < startLives) livesDropped = true;
    }
    expect(livesDropped).toBe(true);
  });

  it("reaches game over rather than running forever", () => {
    const e = new VyomaYudhEngine();
    e.setRng(() => 0.5);
    e.setOptions({ difficulty: "hard", lives: 1, levels: 8 });
    e.init(makePlayers(1));

    let over = false;
    for (let i = 0; i < 20000; i++) {
      e.simulateTick();
      if (e.isOver()) { over = true; break; }
    }
    expect(over).toBe(true);
    expect(e.getPublicState().winnerId).not.toBeUndefined();
  });
});

describe("solo run", () => {
  it("seats exactly one pilot", () => {
    const e = new VyomaYudhEngine();
    expect(e.minPlayers).toBe(1);
    expect(e.maxPlayers).toBe(1);
  });

  it("records the run's result when it ends", () => {
    const e = new VyomaYudhEngine();
    e.setRng(() => 0.5);
    e.setOptions({ difficulty: "hard", lives: 1, levels: 8 });
    e.init(makePlayers(1));

    for (let i = 0; i < 20000 && !e.isOver(); i++) e.simulateTick();
    expect(e.isOver()).toBe(true);

    const result = e.getPublicState().result;
    expect(result).not.toBeNull();
    expect(result!.reason).toBe("destroyed");
    expect(result!.levelReached).toBeGreaterThanOrEqual(1);
    expect(result!.score).toBeGreaterThanOrEqual(0);
  });

  it("names no winner for a run that ended in destruction", () => {
    const e = new VyomaYudhEngine();
    e.setRng(() => 0.5);
    e.setOptions({ difficulty: "hard", lives: 1, levels: 8 });
    e.init(makePlayers(1));
    for (let i = 0; i < 20000 && !e.isOver(); i++) e.simulateTick();
    // Calling a dead pilot the winner would make the game-over screen say
    // the opposite of what happened.
    expect(e.getPublicState().winnerId).toBeNull();
  });

  it("names the pilot the winner when the game is cleared", () => {
    const e = new VyomaYudhEngine();
    e.setRng(() => 0.5);
    e.setOptions({ difficulty: "easy", lives: 3, levels: 1 });
    e.init(makePlayers(1));

    // Drive the final level's boss down rather than playing it out.
    const inner = e as unknown as {
      run: { level: number; kills: number; score: number } | null;
      advanceLevel(run: unknown): void;
    };
    inner.advanceLevel(inner.run);

    expect(e.isOver()).toBe(true);
    expect(e.getPublicState().result?.reason).toBe("cleared");
    expect(e.getPublicState().winnerId).toBe("p0");
  });

  it("has no live run once the match is over", () => {
    const e = new VyomaYudhEngine();
    e.setRng(() => 0.5);
    e.setOptions({ difficulty: "hard", lives: 1, levels: 8 });
    e.init(makePlayers(1));
    for (let i = 0; i < 20000 && !e.isOver(); i++) e.simulateTick();
    expect(e.getPublicState().pilotId).toBeNull();
    expect(e.getPublicState().ship).toBeNull();
  });
});

describe("player departure", () => {
  it("ends the match and banks the score when the pilot leaves", () => {
    const e = newGame(1);
    run(e, 40);
    e.removePlayer("p0");
    expect(e.isOver()).toBe(true);
    // What they flew was real even though they walked away from it.
    expect(e.getPublicState().result).not.toBeNull();
    expect(e.getPublicState().pilotId).toBeNull();
  });

  it("ignores a departure from somebody who was not the pilot", () => {
    const e = newGame(1);
    e.removePlayer("someone-else");
    expect(e.isOver()).toBe(false);
  });
});

describe("state hygiene", () => {
  it("never leaks unbounded entity lists", () => {
    const e = newGame(1);
    for (let i = 0; i < 600; i++) {
      e.applyMove({ playerId: "p0", type: "fire" });
      e.simulateTick();
    }
    const st = e.getPublicState();
    // Everything must be culled once off-screen. An engine that keeps every
    // shot ever fired grows its broadcast payload without limit.
    expect(st.shots.length).toBeLessThan(120);
    expect(st.enemies.length).toBeLessThan(120);
  });

  it("hides nothing — a solo run has no private state", () => {
    const e = newGame(1);
    run(e, 25);
    expect(e.getStateFor("p0")).toEqual(e.getPublicState());
  });
});
