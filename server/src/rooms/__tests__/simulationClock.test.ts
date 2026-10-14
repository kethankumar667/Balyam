import { describe, expect, it } from "vitest";
import { MIN_TICK_PERIOD_MS, tickPeriodMs } from "../simulationClock.js";
import { CarromEngine } from "../../games/carrom/CarromEngine.js";
import { SpaceWarEngine } from "../../games/spacewar/SpaceWarEngine.js";

/**
 * A real-time engine advances a FIXED slice of simulated time per tick (Carrom: 1/60 s). The room
 * fires a tick every `tickPeriodMs` of wall-clock time. The two must agree, or the whole match runs
 * at the wrong speed: the room used to clamp the period to at least 20 ms and round it, so Carrom
 * (60 Hz = 16.67 ms) ticked every 20 ms and every coin moved at 83% of its real speed.
 */
describe("tickPeriodMs", () => {
  it("is exactly the engine's own step for the rates the games use", () => {
    expect(tickPeriodMs(60)).toBeCloseTo(1000 / 60, 6);
    expect(tickPeriodMs(30)).toBeCloseTo(1000 / 30, 6);
    expect(tickPeriodMs(10)).toBeCloseTo(100, 6);
  });

  it("is never rounded, so the simulation cannot drift slow or fast", () => {
    expect(tickPeriodMs(60)).not.toBe(17);
    expect(tickPeriodMs(60)).not.toBe(20);
  });

  it("still refuses an absurd rate rather than spinning the CPU", () => {
    expect(tickPeriodMs(10_000)).toBe(MIN_TICK_PERIOD_MS);
    expect(MIN_TICK_PERIOD_MS).toBeGreaterThanOrEqual(4);
  });
});

describe("simulation speed equals real time", () => {
  it("Carrom: simulated seconds per wall-clock second is 1", () => {
    const engine = new CarromEngine();
    const simSecondsPerTick = 1 / engine.tickRateHz; // the engine steps DT = 1/TICK_HZ
    const wallSecondsPerTick = tickPeriodMs(engine.tickRateHz) / 1000;
    expect(simSecondsPerTick / wallSecondsPerTick).toBeCloseTo(1, 4);
  });

  it("Space War: the room's tick period matches the engine's own dt", () => {
    const engine = new SpaceWarEngine();
    expect(tickPeriodMs(engine.tickRateHz)).toBeCloseTo(1000 / engine.tickRateHz, 6);
  });
});
