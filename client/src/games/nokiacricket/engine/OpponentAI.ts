import type { DeliveryProfile, DeliveryType, CricketDifficulty } from "../types";

export class OpponentAI {
  public selectDelivery(
    currentBall: number,
    wickets: number,
    difficulty: CricketDifficulty = "MEDIUM"
  ): DeliveryProfile {
    const rand = Math.random();
    let type: DeliveryType = "FAST";

    if (difficulty === "EASY") {
      // EASY: Gentle, predictable bowling (mostly straight & slow)
      if (rand < 0.6) type = "FAST";
      else if (rand < 0.85) type = "SLOW";
      else if (rand < 0.95) type = "OUTSWING";
      else type = "OFFBREAK";
    } else if (difficulty === "HARD") {
      // HARD: Aggressive, high variation, deadly yorkers & bouncers
      if (rand < 0.3) type = "YORKER";
      else if (rand < 0.55) type = "BOUNCER";
      else if (rand < 0.75) type = "OFFBREAK";
      else if (rand < 0.9) type = "OUTSWING";
      else type = "FAST";
    } else {
      // MEDIUM: Balanced match progression
      if (currentBall <= 6) {
        if (rand < 0.5) type = "FAST";
        else if (rand < 0.75) type = "OUTSWING";
        else if (rand < 0.9) type = "SLOW";
        else type = "BOUNCER";
      } else if (currentBall <= 18) {
        if (rand < 0.3) type = "FAST";
        else if (rand < 0.55) type = "OFFBREAK";
        else if (rand < 0.75) type = "YORKER";
        else if (rand < 0.9) type = "SLOW";
        else type = "BOUNCER";
      } else {
        if (rand < 0.35) type = "YORKER";
        else if (rand < 0.6) type = "BOUNCER";
        else if (rand < 0.8) type = "OFFBREAK";
        else type = "OUTSWING";
      }
    }

    return this.buildProfile(type, difficulty);
  }

  private buildProfile(type: DeliveryType, difficulty: CricketDifficulty): DeliveryProfile {
    const speedMult = difficulty === "EASY" ? 0.86 : difficulty === "HARD" ? 1.15 : 1.0;

    const config: Record<
      DeliveryType,
      { speedY: number; initialX: number; pitchY: number; postPitchVx: number; bounceScale: number; label: string }
    > = {
      FAST: {
        speedY: Math.round(78 * speedMult),
        initialX: 64 + (Math.random() * 4 - 2),
        pitchY: 54,
        postPitchVx: 0,
        bounceScale: 1.0,
        label: difficulty === "HARD" ? "EXPRESS 152KPH" : difficulty === "EASY" ? "MED-PACE 125KPH" : "FAST 140KPH",
      },
      SLOW: {
        speedY: Math.round(48 * speedMult),
        initialX: 64,
        pitchY: 50,
        postPitchVx: 0,
        bounceScale: 1.1,
        label: "OFF-PACE SLOW",
      },
      YORKER: {
        speedY: Math.round(86 * speedMult),
        initialX: 64,
        pitchY: 72,
        postPitchVx: 0,
        bounceScale: 0.8,
        label: "TOE CRUSHER YORKER",
      },
      BOUNCER: {
        speedY: Math.round(74 * speedMult),
        initialX: 63,
        pitchY: 40,
        postPitchVx: difficulty === "HARD" ? 0.4 : 0.2,
        bounceScale: difficulty === "HARD" ? 2.0 : 1.8,
        label: "SHARP BOUNCER",
      },
      OUTSWING: {
        speedY: Math.round(68 * speedMult),
        initialX: 63,
        pitchY: 52,
        postPitchVx: difficulty === "HARD" ? 1.4 : 1.1,
        bounceScale: 1.0,
        label: "OUTSWINGER",
      },
      OFFBREAK: {
        speedY: Math.round(54 * speedMult),
        initialX: 67,
        pitchY: 54,
        postPitchVx: difficulty === "HARD" ? -1.8 : -1.5,
        bounceScale: 1.2,
        label: "OFF BREAK SPIN",
      },
    };

    return { type, ...config[type] };
  }
}
