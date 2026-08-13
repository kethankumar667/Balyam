import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  BounceOptions,
  BouncePublicState,
} from "@shared/types.js";
import { DEFAULT_BOUNCE_OPTIONS } from "@shared/types.js";

interface BallData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ringsCollected: number;
  isAlive: boolean;
}

export class BounceEngine implements GameEngine {
  readonly kind = "bounce" as const;
  readonly minPlayers = 1;
  readonly maxPlayers = 4;
  readonly tickRateHz = 20;

  private opts: BounceOptions = { ...DEFAULT_BOUNCE_OPTIONS };
  private pendingOptions: BounceOptions | null = null;

  private seatOrder: string[] = [];
  private balls = new Map<string, BallData>();
  private rings: { id: string; x: number; y: number; collected: boolean }[] = [];
  private isOverFlag = false;
  private winnerId: string | null = null;
  private isPaused = false;

  private rng: () => number = Math.random;

  setRng(fn: () => number): void {
    this.rng = fn;
  }

  setOptions(opts: Partial<BounceOptions>): void {
    this.pendingOptions = { ...DEFAULT_BOUNCE_OPTIONS, ...opts };
  }

  init(players: Player[]): void {
    this.opts = this.pendingOptions ?? { ...DEFAULT_BOUNCE_OPTIONS };
    this.seatOrder = players.map((p) => p.id);
    this.balls.clear();
    this.rings = [];

    this.seatOrder.forEach((pid, idx) => {
      this.balls.set(pid, {
        x: 10 + idx * 10,
        y: 40,
        vx: 0,
        vy: 0,
        ringsCollected: 0,
        isAlive: true,
      });
    });

    // Spawn gold rings
    for (let i = 0; i < this.opts.targetRings; i++) {
      this.rings.push({
        id: `r_${i}`,
        x: 30 + i * 15,
        y: 20 + Math.floor(this.rng() * 30),
        collected: false,
      });
    }

    this.isOverFlag = false;
    this.winnerId = null;
    this.isPaused = false;
  }

  simulateTick(): MoveResult {
    if (this.isOverFlag) {
      return { ok: true, isOver: true, winnerId: this.winnerId };
    }
    if (this.isPaused) {
      return { ok: true, isOver: false, winnerId: null };
    }
    this.tick();
    return { ok: true, isOver: this.isOverFlag, winnerId: this.winnerId };
  }

  applyMove(move: MoveContext): MoveResult {
    const pid = move.playerId;
    const ball = this.balls.get(pid);

    if (move.type === "pause") {
      this.isPaused = true;
      return { ok: true };
    }

    if (move.type === "resume") {
      this.isPaused = false;
      return { ok: true };
    }

    if (move.type === "togglePause") {
      this.isPaused = !this.isPaused;
      return { ok: true };
    }

    if (!ball || !ball.isAlive || this.isOverFlag) {
      return { ok: false, error: "Cannot move" };
    }

    if (move.type === "move") {
      const { dir } = (move.data as { dir?: string }) || {};
      if (dir === "LEFT") ball.vx = -4;
      if (dir === "RIGHT") ball.vx = 4;
      if (dir === "JUMP" && ball.y >= 40) ball.vy = -12;
      return { ok: true };
    }

    if (move.type === "tick") {
      /**
       * Refused. This engine declares `tickRateHz` and `simulateTick`, so
       * RoomManager owns the clock — and it was ALSO advancing here on every
       * client tick. The simulation therefore ran at the server's 20Hz plus
       * one extra step per client pump, which means two players advanced the
       * physics roughly twice as fast as one, and a modified client could set
       * the rate itself.
       *
       * That is precisely the "client-supplied simulation rate" defect the
       * GameEngine real-time contract exists to prevent; VyomaYudh already
       * rejects this move for the same reason. Answering with an error rather
       * than silently ignoring it means an old client fails visibly instead of
       * looking like it works.
       */
      return { ok: false, error: "Server owns the clock; `tick` is not accepted" };
    }

    return { ok: false, error: `Unknown move: ${move.type}` };
  }

  private tick(): void {
    if (this.isOverFlag) return;

    for (const [pid, ball] of this.balls.entries()) {
      if (!ball.isAlive) continue;

      // Apply gravity
      ball.vy += 1;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Friction
      ball.vx *= 0.8;

      // Floor collision
      if (ball.y >= 40) {
        ball.y = 40;
        ball.vy = 0;
      }

      // Ring collection
      for (const r of this.rings) {
        if (!r.collected && Math.abs(r.x - ball.x) < 8 && Math.abs(r.y - ball.y) < 8) {
          r.collected = true;
          ball.ringsCollected += 1;

          if (ball.ringsCollected >= this.opts.targetRings) {
            this.isOverFlag = true;
            this.winnerId = pid;
            return;
          }
        }
      }
    }
  }

  getPublicState(): BouncePublicState {
    const ballsObj: Record<string, { x: number; y: number; vx: number; vy: number; ringsCollected: number; isAlive: boolean }> = {};
    const playersPub: { id: string; ringsCollected: number; isAlive: boolean }[] = [];

    for (const pid of this.seatOrder) {
      const b = this.balls.get(pid);
      if (b) {
        ballsObj[pid] = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, ringsCollected: b.ringsCollected, isAlive: b.isAlive };
        playersPub.push({ id: pid, ringsCollected: b.ringsCollected, isAlive: b.isAlive });
      }
    }

    return {
      kind: "bounce",
      balls: ballsObj,
      rings: [...this.rings],
      players: playersPub,
      isPaused: this.isPaused,
      isOver: this.isOverFlag,
      winnerId: this.winnerId,
    };
  }

  getStateFor(playerId: string): BouncePublicState {
    return this.getPublicState();
  }

  isOver(): boolean { return this.isOverFlag; }
  removePlayer(playerId: string): void {
    this.balls.delete(playerId);
    this.seatOrder = this.seatOrder.filter((id) => id !== playerId);
    if (this.seatOrder.length === 0) this.isOverFlag = true;
  }
  getPhaseTimerSeconds(): number { return 0; }
  armDeadline(): number { return 0; }
  clearDeadline(): void {}
  resolveDeadline(): void {}
  pendingActors(): string[] { return []; }
  applyAutoMove(): MoveResult { return { ok: true }; }
}
