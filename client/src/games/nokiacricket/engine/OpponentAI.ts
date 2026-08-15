import type { DeliveryProfile, DeliveryType } from "../types";

export class OpponentAI {
  public selectDelivery(currentBall: number, wickets: number): DeliveryProfile {
    const rand = Math.random();

    // Scale delivery variation as the innings progresses
    let type: DeliveryType = "FAST";

    if (currentBall <= 6) {
      // Over 1: Mostly Fast and Swing
      if (rand < 0.5) type = "FAST";
      else if (rand < 0.75) type = "OUTSWING";
      else if (rand < 0.9) type = "SLOW";
      else type = "BOUNCER";
    } else if (currentBall <= 18) {
      // Middle overs: Spin, Yorker, and Off-pace
      if (rand < 0.3) type = "FAST";
      else if (rand < 0.55) type = "OFFBREAK";
      else if (rand < 0.75) type = "YORKER";
      else if (rand < 0.9) type = "SLOW";
      else type = "BOUNCER";
    } else {
      // Death overs / high pressure: Fast Yorkers & Bouncers
      if (rand < 0.35) type = "YORKER";
      else if (rand < 0.6) type = "BOUNCER";
      else if (rand < 0.8) type = "OFFBREAK";
      else type = "OUTSWING";
    }

    return this.buildProfile(type);
  }

  private buildProfile(type: DeliveryType): DeliveryProfile {
    const config: Record<
      DeliveryType,
      { speedY: number; initialX: number; pitchY: number; postPitchVx: number; bounceScale: number; label: string }
    > = {
      FAST: {
        speedY: 78,
        initialX: 64 + (Math.random() * 4 - 2),
        pitchY: 54,
        postPitchVx: 0,
        bounceScale: 1.0,
        label: "FAST 140KPH",
      },
      SLOW: {
        speedY: 48,
        initialX: 64,
        pitchY: 50,
        postPitchVx: 0,
        bounceScale: 1.1,
        label: "OFF-PACE SLOW",
      },
      YORKER: {
        speedY: 86,
        initialX: 64,
        pitchY: 72,
        postPitchVx: 0,
        bounceScale: 0.8,
        label: "TOE CRUSHER YORKER",
      },
      BOUNCER: {
        speedY: 74,
        initialX: 63,
        pitchY: 40,
        postPitchVx: 0.2,
        bounceScale: 1.8,
        label: "SHARP BOUNCER",
      },
      OUTSWING: {
        speedY: 68,
        initialX: 63,
        pitchY: 52,
        postPitchVx: 1.1,
        bounceScale: 1.0,
        label: "OUTSWINGER",
      },
      OFFBREAK: {
        speedY: 54,
        initialX: 67,
        pitchY: 54,
        postPitchVx: -1.5,
        bounceScale: 1.2,
        label: "OFF BREAK SPIN",
      },
    };

    return { type, ...config[type] };
  }
}
