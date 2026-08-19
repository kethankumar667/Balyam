import { StateMachine } from "./StateMachine";
import { BallPhysics } from "./BallPhysics";
import { TimingEngine } from "./TimingEngine";
import { RenderPipeline } from "../canvas/RenderPipeline";
import { NokiaSoundEngine } from "../audio/NokiaSoundEngine";
import type { ShotType } from "../types";

export class GameEngine {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly timeStep: number = 1000 / 60; // 16.666ms fixed physics step
  private isRunning: boolean = false;
  private rAFId: number = 0;

  constructor(
    private stateMachine: StateMachine,
    private ballPhysics: BallPhysics,
    private timingEngine: TimingEngine,
    private renderer: RenderPipeline,
    private soundEngine: NokiaSoundEngine
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rAFId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.rAFId);
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const frameTime = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;
    this.accumulator += frameTime;

    while (this.accumulator >= this.timeStep) {
      this.update(this.timeStep);
      this.accumulator -= this.timeStep;
    }

    this.render();

    this.rAFId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.stateMachine.update(dt);

    const currentState = this.stateMachine.getState();
    if (currentState === "BOWLING") {
      this.ballPhysics.update(dt);
      if (this.ballPhysics.hasPassedCrease()) {
        this.stateMachine.handleMissedBall();
      }
    } else if (currentState === "SHOT_PLAYED") {
      this.ballPhysics.update(dt);
    }
  }

  private render(): void {
    this.renderer.clear();
    this.stateMachine.render(this.renderer);
    this.renderer.blitToScreen(320, 240);
  }

  public togglePause(): void {
    this.stateMachine.togglePause();
  }

  public toggleSound(): boolean {
    return this.stateMachine.toggleSound();
  }

  public handleInput(action: "LEFT" | "STRAIGHT" | "RIGHT" | "UP" | "DOWN" | "SELECT" | "BACK" | "PAUSE" | "SOUND"): void {
    const currentState = this.stateMachine.getState();

    if (action === "PAUSE") {
      this.stateMachine.togglePause();
      return;
    }

    if (action === "SOUND") {
      this.stateMachine.toggleSound();
      return;
    }

    if (currentState === "BOWLING") {
      if (action === "BACK") {
        this.stateMachine.togglePause();
      } else if (action === "LEFT" || action === "RIGHT") {
        this.stateMachine.handleBattingShot(action as ShotType);
      } else if (action === "STRAIGHT" || action === "SELECT" || action === "UP") {
        this.stateMachine.handleBattingShot("STRAIGHT");
      }
    } else if (currentState === "READY" || currentState === "SHOT_PLAYED" || currentState === "BALL_RESULT") {
      if (action === "BACK") {
        this.stateMachine.togglePause();
      } else {
        this.stateMachine.handleMenuInput(action);
      }
    } else {
      this.stateMachine.handleMenuInput(action);
    }
  }
}
