import { describe, it, expect, beforeEach } from "vitest";
import { TimingEngine } from "../engine/TimingEngine";
import { ScoringEngine } from "../engine/ScoringEngine";
import { BallPhysics } from "../engine/BallPhysics";
import { OpponentAI } from "../engine/OpponentAI";
import { StorageService } from "../utils/storage";
import type { DeliveryProfile } from "../types";

describe("Nokia Cricket - TimingEngine", () => {
  const timing = new TimingEngine();

  it("identifies exact sweet spot (Y = 78) as PERFECT", () => {
    expect(timing.evaluateTiming(78.0)).toBe("PERFECT");
    expect(timing.evaluateTiming(77.0)).toBe("PERFECT");
    expect(timing.evaluateTiming(79.5)).toBe("PERFECT");
  });

  it("identifies proximity shots as GOOD", () => {
    expect(timing.evaluateTiming(74.0)).toBe("GOOD");
    expect(timing.evaluateTiming(82.5)).toBe("GOOD");
  });

  it("identifies early and late swings correctly", () => {
    expect(timing.evaluateTiming(70.0)).toBe("EARLY");
    expect(timing.evaluateTiming(85.0)).toBe("LATE");
  });

  it("identifies out of window balls as MISS", () => {
    expect(timing.evaluateTiming(45.0)).toBe("MISS");
    expect(timing.evaluateTiming(95.0)).toBe("MISS");
  });
});

describe("Nokia Cricket - ScoringEngine", () => {
  const scoring = new ScoringEngine();
  const fastDelivery: DeliveryProfile = {
    type: "FAST",
    speedY: 78,
    initialX: 64,
    pitchY: 54,
    postPitchVx: 0,
    bounceScale: 1.0,
    label: "FAST",
  };

  it("awards 6 runs for PERFECT timing on optimal straight line", () => {
    const result = scoring.calculateOutcome("STRAIGHT", 64, "PERFECT", fastDelivery);
    expect(result.runs).toBe(6);
    expect(result.outcome).toBe("SIX");
  });

  it("awards 4 runs for PERFECT timing on non-optimal line", () => {
    const result = scoring.calculateOutcome("LEFT", 68, "PERFECT", fastDelivery);
    expect(result.runs).toBe(4);
    expect(result.outcome).toBe("FOUR");
  });

  it("detects clean bowled when ball is in stumps channel and missed", () => {
    const result = scoring.calculateOutcome("STRAIGHT", 64, "MISS", fastDelivery);
    expect(result.runs).toBe(0);
    expect(result.outcome).toBe("BOWLED");
  });
});

describe("Nokia Cricket - BallPhysics", () => {
  let physics: BallPhysics;

  beforeEach(() => {
    physics = new BallPhysics();
    physics.initDelivery({
      type: "OUTSWING",
      speedY: 60,
      initialX: 63,
      pitchY: 50,
      postPitchVx: 1.0,
      bounceScale: 1.0,
      label: "OUTSWING",
    });
  });

  it("initializes ball state correctly", () => {
    expect(physics.x).toBe(63);
    expect(physics.y).toBe(20);
    expect(physics.hasBounced).toBe(false);
  });

  it("triggers bounce and lateral movement past pitch threshold", () => {
    physics.update(600); // 0.6s -> y = 20 + 36 = 56 (> 50)
    expect(physics.hasBounced).toBe(true);
    expect(physics.vx).toBe(1.0);
  });

  it("accurately detects stumps hit range", () => {
    physics.x = 64;
    physics.y = 80;
    expect(physics.isStumpsHit()).toBe(true);

    physics.x = 40;
    expect(physics.isStumpsHit()).toBe(false);
  });
});

describe("Nokia Cricket - OpponentAI", () => {
  const ai = new OpponentAI();

  it("generates valid delivery profiles with positive speeds", () => {
    const delivery = ai.selectDelivery(1, 0);
    expect(delivery.speedY).toBeGreaterThan(40);
    expect(delivery.pitchY).toBeGreaterThan(30);
    expect(delivery.label).toBeDefined();
  });
});

describe("Nokia Cricket - StorageService", () => {
  it("records match statistics and returns high score", () => {
    const result = StorageService.recordMatch(36, 1, 12, 4, 3, true);
    expect(result.nextData.totalRuns).toBeGreaterThanOrEqual(36);
    expect(result.nextData.highScore).toBeGreaterThanOrEqual(36);
  });
});
