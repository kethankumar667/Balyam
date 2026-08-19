import type { LaneIndex, Point } from "../types";
import { LANE_CENTERS } from "../utils/constants";

export class PlayerCar {
  public lane: LaneIndex = 1; // Start in Center Lane
  public readonly y: number = 8; // Anchored at bottom rows [8, 9, 10, 11] on 12-row screen
  public isBoosting: boolean = false;

  public reset(): void {
    this.lane = 1;
    this.isBoosting = false;
  }

  public moveLeft(): boolean {
    if (this.lane > 0) {
      this.lane = (this.lane - 1) as LaneIndex;
      return true;
    }
    return false;
  }

  public moveRight(): boolean {
    if (this.lane < 2) {
      this.lane = (this.lane + 1) as LaneIndex;
      return true;
    }
    return false;
  }

  public get centerCol(): number {
    return LANE_CENTERS[this.lane];
  }

  public getPixels(): Point[] {
    const cx = this.centerCol;
    const y = this.y;
    return [
      { x: cx, y: y }, // Nose
      { x: cx - 1, y: y + 1 }, // Front Left Wheel
      { x: cx, y: y + 1 }, // Front Axle Center
      { x: cx + 1, y: y + 1 }, // Front Right Wheel
      { x: cx, y: y + 2 }, // Cockpit
      { x: cx - 1, y: y + 3 }, // Rear Left Wheel
      { x: cx, y: y + 3 }, // Rear Axle Center
      { x: cx + 1, y: y + 3 }, // Rear Right Wheel
    ];
  }
}
