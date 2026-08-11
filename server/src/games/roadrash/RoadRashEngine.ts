import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  RoadRashOptions,
  RoadRashPublicState,
} from "@shared/types.js";
import { DEFAULT_ROADRASH_OPTIONS } from "@shared/types.js";

interface BikeData {
  position: number;
  lane: number; // 0, 1, 2
  speed: number;
  isAttacking: boolean;
  isKnockedOut: boolean;
}

export class RoadRashEngine implements GameEngine {
  readonly kind = "roadrash" as const;
  readonly minPlayers = 1;
  readonly maxPlayers = 4;
  readonly tickRateHz = 20;

  private opts: RoadRashOptions = { ...DEFAULT_ROADRASH_OPTIONS };
  private pendingOptions: RoadRashOptions | null = null;

  private seatOrder: string[] = [];
  private bikes = new Map<string, BikeData>();
  private isOverFlag = false;
  private winnerId: string | null = null;

  setOptions(opts: Partial<RoadRashOptions>): void {
    this.pendingOptions = { ...DEFAULT_ROADRASH_OPTIONS, ...opts };
  }

  init(players: Player[]): void {
    this.opts = this.pendingOptions ?? { ...DEFAULT_ROADRASH_OPTIONS };
    this.seatOrder = players.map((p) => p.id);
    this.bikes.clear();

    this.seatOrder.forEach((pid, idx) => {
      this.bikes.set(pid, {
        position: 0,
        lane: idx % 3,
        speed: 20,
        isAttacking: false,
        isKnockedOut: false,
      });
    });

    this.isOverFlag = false;
    this.winnerId = null;
  }

  simulateTick(): MoveResult {
    if (this.isOverFlag) {
      return { ok: true, isOver: true, winnerId: this.winnerId };
    }
    this.tick();
    return { ok: true, isOver: this.isOverFlag, winnerId: this.winnerId };
  }

  applyMove(move: MoveContext): MoveResult {
    const pid = move.playerId;
    const bike = this.bikes.get(pid);
    if (!bike || bike.isKnockedOut || this.isOverFlag) {
      return { ok: false, error: "Cannot move" };
    }

    if (move.type === "steer") {
      const { dir } = (move.data as { dir?: string }) || {};
      if (dir === "LEFT") bike.lane = Math.max(0, bike.lane - 1);
      if (dir === "RIGHT") bike.lane = Math.min(2, bike.lane + 1);
      return { ok: true };
    }

    if (move.type === "throttle") {
      const { accel } = (move.data as { accel?: boolean }) || {};
      if (accel) bike.speed = Math.min(100, bike.speed + 10);
      else bike.speed = Math.max(10, bike.speed - 10);
      return { ok: true };
    }

    if (move.type === "attack") {
      bike.isAttacking = true;
      // Knock out adjacent lane bikes
      for (const [otherId, otherBike] of this.bikes.entries()) {
        if (otherId !== pid && Math.abs(otherBike.position - bike.position) < 30 && otherBike.lane === bike.lane) {
          otherBike.isKnockedOut = true;
          otherBike.speed = 0;
        }
      }
      setTimeout(() => { bike.isAttacking = false; }, 500);
      return { ok: true };
    }

    if (move.type === "tick") {
      this.tick();
      return { ok: true, isOver: this.isOverFlag, winnerId: this.winnerId };
    }

    return { ok: false, error: `Unknown move: ${move.type}` };
  }

  private tick(): void {
    if (this.isOverFlag) return;

    for (const [pid, bike] of this.bikes.entries()) {
      if (bike.isKnockedOut) continue;

      bike.position += bike.speed;

      if (bike.position >= this.opts.trackLength) {
        this.isOverFlag = true;
        this.winnerId = pid;
        return;
      }
    }
  }

  getPublicState(): RoadRashPublicState {
    const bikesObj: Record<string, { position: number; lane: number; speed: number; isAttacking: boolean; isKnockedOut: boolean }> = {};
    const playersPub: { id: string; position: number; rank: number; isKnockedOut: boolean }[] = [];

    const sortedByPos = [...this.seatOrder].sort((a, b) => (this.bikes.get(b)?.position ?? 0) - (this.bikes.get(a)?.position ?? 0));

    for (const pid of this.seatOrder) {
      const b = this.bikes.get(pid);
      if (b) {
        bikesObj[pid] = { position: b.position, lane: b.lane, speed: b.speed, isAttacking: b.isAttacking, isKnockedOut: b.isKnockedOut };
        playersPub.push({
          id: pid,
          position: b.position,
          rank: sortedByPos.indexOf(pid) + 1,
          isKnockedOut: b.isKnockedOut,
        });
      }
    }

    return {
      kind: "roadrash",
      bikes: bikesObj,
      players: playersPub,
      isOver: this.isOverFlag,
      winnerId: this.winnerId,
    };
  }

  getStateFor(playerId: string): RoadRashPublicState {
    return this.getPublicState();
  }

  isOver(): boolean { return this.isOverFlag; }
  removePlayer(playerId: string): void {
    this.bikes.delete(playerId);
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
