import type { TimingGrade, CricketDifficulty } from "../types";

export class TimingEngine {
  public readonly sweetSpotY: number = 78;

  public evaluateTiming(ballY: number, difficulty: CricketDifficulty = "MEDIUM"): TimingGrade {
    const diff = Math.abs(ballY - this.sweetSpotY);

    const perfectTol = difficulty === "EASY" ? 3.8 : difficulty === "HARD" ? 2.0 : 2.8;
    const goodTol = difficulty === "EASY" ? 7.8 : difficulty === "HARD" ? 4.6 : 6.0;
    const edgeTol = difficulty === "EASY" ? 11.5 : difficulty === "HARD" ? 8.2 : 9.8;

    if (diff <= perfectTol) return "PERFECT";
    if (diff <= goodTol) return "GOOD";
    if (diff <= edgeTol) return ballY < this.sweetSpotY ? "EARLY" : "LATE";
    return "MISS";
  }

  public getTimingFeedback(grade: TimingGrade): string {
    switch (grade) {
      case "PERFECT":
        return "SWEET SPOT!";
      case "GOOD":
        return "GOOD TIMING";
      case "EARLY":
        return "TOO EARLY";
      case "LATE":
        return "LATE SHOT";
      case "MISS":
        return "MISSED!";
    }
  }
}
