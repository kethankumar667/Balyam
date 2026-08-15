import type { ShotType, TimingGrade, ShotResult, DeliveryProfile } from "../types";

export class ScoringEngine {
  public calculateOutcome(
    shot: ShotType,
    ballX: number,
    timing: TimingGrade,
    delivery: DeliveryProfile
  ): ShotResult {
    const isLegSide = ballX < 62;
    const isOffSide = ballX > 66;
    const isStraightLine = !isLegSide && !isOffSide;

    const isOptimalMatch =
      (shot === "LEFT" && (isLegSide || delivery.type === "BOUNCER")) ||
      (shot === "STRAIGHT" && (isStraightLine || delivery.type === "YORKER")) ||
      (shot === "RIGHT" && (isOffSide || delivery.type === "OUTSWING"));

    const isSevereMismatch =
      (shot === "LEFT" && isOffSide) ||
      (shot === "RIGHT" && isLegSide);

    // Angle of shot projection in degrees relative to vertical (0 = Straight, -45 = Midwicket, +45 = Covers)
    const shotAngle = shot === "LEFT" ? -48 : shot === "STRAIGHT" ? 0 : 48;

    if (timing === "PERFECT") {
      if (isOptimalMatch) {
        return {
          grade: "PERFECT",
          runs: 6,
          outcome: "SIX",
          trajectory: { angle: shotAngle, power: 100 },
          feedbackText: "SIX! OVER THE ROOF!",
        };
      }
      return {
        grade: "PERFECT",
        runs: 4,
        outcome: "FOUR",
        trajectory: { angle: shotAngle, power: 85 },
        feedbackText: "FOUR! RACING TO ROPE!",
      };
    }

    if (timing === "GOOD") {
      if (isSevereMismatch) {
        // 25% edge risk on severe line mismatch
        if (Math.random() < 0.25) {
          return {
            grade: "GOOD",
            runs: 0,
            outcome: "CAUGHT",
            trajectory: { angle: shotAngle + 20, power: 45 },
            feedbackText: "CAUGHT IN DEEP!",
          };
        }
        return {
          grade: "GOOD",
          runs: 1,
          outcome: "RUNS_1",
          trajectory: { angle: shotAngle, power: 40 },
          feedbackText: "1 RUN (EDGED)",
        };
      }
      return {
        grade: "GOOD",
        runs: 4,
        outcome: "FOUR",
        trajectory: { angle: shotAngle, power: 75 },
        feedbackText: "FOUR RUNS!",
      };
    }

    if (timing === "EARLY" || timing === "LATE") {
      if (isSevereMismatch || delivery.type === "BOUNCER" || delivery.type === "YORKER") {
        return {
          grade: timing,
          runs: 0,
          outcome: "CAUGHT",
          trajectory: { angle: shotAngle, power: 35 },
          feedbackText: "CAUGHT! MIS-TIMED SHOT!",
        };
      }
      return {
        grade: timing,
        runs: 2,
        outcome: "RUNS_2",
        trajectory: { angle: shotAngle, power: 45 },
        feedbackText: "2 RUNS",
      };
    }

    // Default Miss
    const isBowled = ballX >= 60 && ballX <= 68;
    return {
      grade: "MISS",
      runs: 0,
      outcome: isBowled ? "BOWLED" : "DOT",
      trajectory: { angle: 0, power: 0 },
      feedbackText: isBowled ? "CLEAN BOWLED!" : "DOT BALL",
    };
  }
}
