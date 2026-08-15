import type { ShotType, ShotResult, DeliveryProfile } from "../types";
import { TimingEngine } from "./TimingEngine";
import { ScoringEngine } from "./ScoringEngine";

export class ShotEngine {
  constructor(
    private timingEngine: TimingEngine,
    private scoringEngine: ScoringEngine
  ) {}

  public executeShot(
    shot: ShotType,
    ballX: number,
    ballY: number,
    delivery: DeliveryProfile
  ): ShotResult {
    const timing = this.timingEngine.evaluateTiming(ballY);
    return this.scoringEngine.calculateOutcome(shot, ballX, timing, delivery);
  }
}
