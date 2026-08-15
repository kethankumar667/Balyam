import { StateMachine } from "./StateMachine";
import { RenderPipeline } from "../canvas/RenderPipeline";
import { RetroSoundEngine } from "../audio/RetroSoundEngine";
import type { GameInput } from "../types";

export class GameEngine {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  constructor(
    public readonly stateMachine: StateMachine,
    private renderPipeline: RenderPipeline,
    public readonly soundEngine: RetroSoundEngine
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const delta = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;
    this.accumulator += delta;

    const tickInterval = this.stateMachine.getCurrentTickInterval();

    while (this.accumulator >= tickInterval) {
      this.stateMachine.update(tickInterval);
      this.accumulator -= tickInterval;
    }

    this.stateMachine.render(this.renderPipeline);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public handleInput(input: GameInput): void {
    this.stateMachine.handleInput(input);
  }

  public togglePause(): void {
    this.stateMachine.togglePause();
  }
}
