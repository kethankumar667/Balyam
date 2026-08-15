import type { DeliveryProfile } from "../types";

export class BallPhysics {
  public x: number = 64;
  public y: number = 20;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 1.5;
  public hasBounced: boolean = false;
  public hitState: boolean = false;
  public hitVelocityX: number = 0;
  public hitVelocityY: number = 0;
  public currentDelivery!: DeliveryProfile;

  public initDelivery(profile: DeliveryProfile): void {
    this.currentDelivery = profile;
    this.x = profile.initialX;
    this.y = 20;
    this.vx = 0;
    this.vy = profile.speedY;
    this.radius = 1.5;
    this.hasBounced = false;
    this.hitState = false;
    this.hitVelocityX = 0;
    this.hitVelocityY = 0;
  }

  public update(dt: number): void {
    const deltaSec = dt / 1000;

    if (!this.hitState) {
      this.y += this.vy * deltaSec;
      this.x += this.vx * deltaSec;

      // Trigger pitch contact & break
      if (!this.hasBounced && this.y >= this.currentDelivery.pitchY) {
        this.hasBounced = true;
        this.vx = this.currentDelivery.postPitchVx;
      }

      // Depth perspective ball scaling (from 1.5px to 3.5px)
      const progress = Math.min(1, Math.max(0, (this.y - 20) / 60));
      this.radius = 1.5 + progress * 2.0;
    } else {
      // Ball in flight post-bat hit
      this.x += this.hitVelocityX * deltaSec;
      this.y += this.hitVelocityY * deltaSec;
      // Shrink as it flies into the outfield
      this.radius = Math.max(1, this.radius - deltaSec * 0.8);
    }
  }

  public applyHit(angleDeg: number, power: number): void {
    this.hitState = true;
    const rad = (angleDeg - 90) * (Math.PI / 180);
    const speed = 70 * (power / 100);
    this.hitVelocityX = Math.cos(rad) * speed;
    this.hitVelocityY = Math.sin(rad) * speed;
  }

  public isStumpsHit(): boolean {
    // Batsman stumps located at X: [60, 68], Y: [78, 83]
    return this.x >= 60 && this.x <= 68 && this.y >= 78;
  }

  public hasPassedCrease(): boolean {
    return this.y >= 86;
  }

  public isOutOfField(): boolean {
    return this.x < -10 || this.x > 138 || this.y < -10 || this.y > 106;
  }
}
