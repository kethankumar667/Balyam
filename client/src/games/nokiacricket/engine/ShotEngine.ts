import type { ShotType, ShotResult, DeliveryProfile, CricketDifficulty } from "../types";
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
    delivery: DeliveryProfile,
    difficulty: CricketDifficulty = "MEDIUM"
  ): ShotResult {
    const timing = this.timingEngine.evaluateTiming(ballY, difficulty);
    return this.scoringEngine.calculateOutcome(shot, ballX, timing, delivery);
  }
}
