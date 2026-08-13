import { describe, expect, it } from "vitest";
import type { Player } from "@shared/types.js";
import { SnakeEngine } from "../SnakeEngine.js";

function seat(id: string): Player {
  return { id, name: id, isHost: true, isReady: true, isConnected: true };
}

function start(opts?: Partial<{ speedMs: number; speedProgression: boolean }>) {
  const engine = new SnakeEngine();
  if (opts) engine.setOptions(opts);
  engine.init([seat("a")]);
  return engine;
}

/**
 * The speed setting used to be decorative.
 *
 * `tickRateHz` was a hard `10`, so the game stepped every 100ms whatever the
 * player picked — and `speedMs` was published in the state anyway. The board
 * interpolates its motion over exactly that published duration, so it was
 * drawing the snake at a rate with no relationship to when new positions
 * actually arrived.
 *
 * Nothing threw. The only symptom was that the game "felt glitchy", which is
 * why it survived a round of fixes aimed at the renderer.
 */
describe("the speed setting drives the clock", () => {
  it("ticks at the chosen speed, not a fixed rate", () => {
    // Round-trip through the same arithmetic RoomManager uses to arm its
    // interval: periodMs = 1000 / tickRateHz.
    expect(Math.round(1000 / start({ speedMs: 140 }).tickRateHz)).toBe(140);
    expect(Math.round(1000 / start({ speedMs: 100 }).tickRateHz)).toBe(100);
    expect(Math.round(1000 / start({ speedMs: 70 }).tickRateHz)).toBe(70);
  });

  it("publishes the same period it is actually running at", () => {
    /**
     * The load-bearing one. If these two ever disagree the client
     * interpolates over the wrong duration and the snake stutters — which is
     * exactly the bug this file exists for, and neither number is wrong on
     * its own.
     */
    for (const speedMs of [140, 100, 70]) {
      const engine = start({ speedMs });
      const published = (engine.getPublicState() as { speedMs: number }).speedMs;
      expect(Math.round(1000 / engine.tickRateHz)).toBe(published);
    }
  });

  it("keeps the published period honest as the snake speeds up", () => {
    // Speed progression shaves a millisecond per pellet. It used to shave a
    // number nobody read; now the loop follows it, so the two must stay
    // locked together as it moves.
    const engine = start({ speedMs: 120, speedProgression: true });
    const internal = engine as unknown as { opts: { speedMs: number } };
    for (const speed of [119, 100, 80, 55]) {
      internal.opts.speedMs = speed;
      const published = (engine.getPublicState() as { speedMs: number }).speedMs;
      expect(Math.round(1000 / engine.tickRateHz)).toBe(published);
    }
  });

  it("refuses a speed the loop could not honour", () => {
    // RoomManager floors its interval at 20ms. A speed below that would be
    // silently clamped there, and the published number would start lying
    // again — from the other end.
    const engine = start({ speedMs: 5 });
    expect(Math.round(1000 / engine.tickRateHz)).toBeGreaterThanOrEqual(50);
  });
});

describe("the clock is the server's", () => {
  it("refuses a `tick` move from a client", () => {
    /**
     * Snake declares `tickRateHz`, so RoomManager runs its loop — and it
     * ALSO used to accept `tick` from clients, which is precisely the shape
     * of the Bounce bug where two players ran the game at double speed.
     *
     * Nothing in the client sends this. The point is that nothing can.
     */
    const engine = start();
    const res = engine.applyMove({ playerId: "a", type: "tick" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/clock/i);
  });

  it("does not advance the snake when a tick is refused", () => {
    const engine = start();
    const before = JSON.stringify(engine.getPublicState());
    for (let i = 0; i < 20; i++) engine.applyMove({ playerId: "a", type: "tick" });
    expect(JSON.stringify(engine.getPublicState())).toBe(before);
  });
});
