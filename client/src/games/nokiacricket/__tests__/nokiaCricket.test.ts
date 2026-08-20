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
    expect(timing.evaluateTiming(78.0, "MEDIUM")).toBe("PERFECT");
    expect(timing.evaluateTiming(77.0, "MEDIUM")).toBe("PERFECT");
    expect(timing.evaluateTiming(79.5, "MEDIUM")).toBe("PERFECT");
  });

  it("has wider tolerance on EASY difficulty", () => {
    // 78 - 3.5 = 74.5 is PERFECT on EASY (diff <= 3.8) but GOOD on MEDIUM (diff > 2.8)
    expect(timing.evaluateTiming(74.5, "EASY")).toBe("PERFECT");
    expect(timing.evaluateTiming(74.5, "MEDIUM")).toBe("GOOD");
  });

  it("has tighter tolerance on HARD difficulty", () => {
    // 78 - 2.5 = 75.5 is PERFECT on MEDIUM (diff <= 2.8) but GOOD on HARD (diff > 2.0)
    expect(timing.evaluateTiming(75.5, "MEDIUM")).toBe("PERFECT");
    expect(timing.evaluateTiming(75.5, "HARD")).toBe("GOOD");
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
    const delivery = ai.selectDelivery(1, 0, "MEDIUM");
    expect(delivery.speedY).toBeGreaterThan(40);
    expect(delivery.pitchY).toBeGreaterThan(30);
    expect(delivery.label).toBeDefined();
  });

  it("scales ball speeds across EASY and HARD difficulties", () => {
    const easyFast = ai.selectDelivery(1, 0, "EASY");
    const hardDelivery = ai.selectDelivery(1, 0, "HARD");
    expect(easyFast.speedY).toBeLessThan(100);
    expect(hardDelivery.speedY).toBeGreaterThan(50);
  });
});

describe("Nokia Cricket - StorageService", () => {
  it("records match statistics and returns high score", () => {
    const result = StorageService.recordMatch(36, 1, 12, 4, 3, true, true);
    expect(result.nextData.totalRuns).toBeGreaterThanOrEqual(36);
    expect(result.nextData.highScore).toBeGreaterThanOrEqual(36);
    expect(result.nextData.chaseMatchesPlayed).toBeGreaterThanOrEqual(1);
    expect(result.nextData.chaseMatchesWon).toBeGreaterThanOrEqual(1);
  });
});
