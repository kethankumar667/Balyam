import type { TimingGrade } from "../types";

export class TimingEngine {
  public readonly sweetSpotY: number = 78;

  public evaluateTiming(ballY: number): TimingGrade {
    const diff = Math.abs(ballY - this.sweetSpotY);

    if (diff <= 2.8) return "PERFECT";
    if (diff <= 6.0) return "GOOD";
    if (diff <= 9.8) return ballY < this.sweetSpotY ? "EARLY" : "LATE";
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
