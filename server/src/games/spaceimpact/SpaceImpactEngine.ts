import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  SpaceImpactOptions,
  SpaceImpactPublicState,
} from "@shared/types.js";
import { DEFAULT_SPACEIMPACT_OPTIONS } from "@shared/types.js";

interface ShipData {
  x: number;
  y: number;
  hp: number;
  score: number;
  isAlive: boolean;
}

export class SpaceImpactEngine implements GameEngine {
  readonly kind = "spaceimpact" as const;
  readonly minPlayers = 1;
  readonly maxPlayers = 4;

  private opts: SpaceImpactOptions = { ...DEFAULT_SPACEIMPACT_OPTIONS };
  private pendingOptions: SpaceImpactOptions | null = null;

  private seatOrder: string[] = [];
  private ships = new Map<string, ShipData>();
  private enemies: { id: string; x: number; y: number; type: string }[] = [];
  private bullets: { x: number; y: number; isPlayer: boolean }[] = [];
  private isOverFlag = false;
  private winnerId: string | null = null;

  private rng: () => number = Math.random;

  setRng(fn: () => number): void {
    this.rng = fn;
  }

  setOptions(opts: Partial<SpaceImpactOptions>): void {
    this.pendingOptions = { ...DEFAULT_SPACEIMPACT_OPTIONS, ...opts };
  }

  init(players: Player[]): void {
    this.opts = this.pendingOptions ?? { ...DEFAULT_SPACEIMPACT_OPTIONS };
    this.seatOrder = players.map((p) => p.id);
    this.ships.clear();
    this.enemies = [];
    this.bullets = [];

    this.seatOrder.forEach((pid, idx) => {
      this.ships.set(pid, {
        x: 10,
        y: 20 + idx * 15,
        hp: 3,
        score: 0,
        isAlive: true,
      });
    });

    // Initial enemy wave
    for (let i = 0; i < 5; i++) {
      this.enemies.push({
        id: `e_${i}`,
        x: 80 + i * 15,
        y: Math.floor(this.rng() * 50) + 10,
        type: "scout",
      });
    }

    this.isOverFlag = false;
    this.winnerId = null;
  }

  applyMove(move: MoveContext): MoveResult {
    const pid = move.playerId;
    const ship = this.ships.get(pid);
    if (!ship || !ship.isAlive || this.isOverFlag) {
      return { ok: false, error: "Cannot move" };
    }

    if (move.type === "moveShip") {
      const { dx, dy } = (move.data as { dx?: number; dy?: number }) || {};
      if (dx) ship.x = Math.max(0, Math.min(100, ship.x + dx));
      if (dy) ship.y = Math.max(0, Math.min(60, ship.y + dy));
      return { ok: true };
    }

    if (move.type === "shoot") {
      this.bullets.push({ x: ship.x + 5, y: ship.y, isPlayer: true });
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

    // Advance bullets
    this.bullets.forEach((b) => {
      b.x += b.isPlayer ? 5 : -4;
    });
    this.bullets = this.bullets.filter((b) => b.x >= 0 && b.x <= 110);

    // Advance enemies
    this.enemies.forEach((e) => {
      e.x -= 2;
    });

    // Bullet-enemy collisions
    this.bullets = this.bullets.filter((b) => {
      if (!b.isPlayer) return true;
      const hitIdx = this.enemies.findIndex((e) => Math.abs(e.x - b.x) < 5 && Math.abs(e.y - b.y) < 5);
      if (hitIdx >= 0) {
        this.enemies.splice(hitIdx, 1);
        for (const ship of this.ships.values()) {
          if (ship.isAlive) ship.score += 50;
        }
        return false;
      }
      return true;
    });

    // Respawn enemies
    if (this.enemies.length < 3) {
      this.enemies.push({
        id: `e_${Date.now()}`,
        x: 100,
        y: Math.floor(this.rng() * 50) + 10,
        type: "scout",
      });
    }

    // Check ship survival
    const aliveShips = Array.from(this.ships.entries()).filter(([_, s]) => s.isAlive);
    if (aliveShips.length === 0) {
      this.isOverFlag = true;
      let maxScore = -1;
      for (const [pid, s] of this.ships.entries()) {
        if (s.score > maxScore) {
          maxScore = s.score;
          this.winnerId = pid;
        }
      }
    }
  }

  getPublicState(): SpaceImpactPublicState {
    const shipsObj: Record<string, { x: number; y: number; hp: number; score: number }> = {};
    const playersPub: { id: string; score: number; isAlive: boolean }[] = [];

    for (const pid of this.seatOrder) {
      const s = this.ships.get(pid);
      if (s) {
        shipsObj[pid] = { x: s.x, y: s.y, hp: s.hp, score: s.score };
        playersPub.push({ id: pid, score: s.score, isAlive: s.isAlive });
      }
    }

    return {
      kind: "spaceimpact",
      ships: shipsObj,
      enemies: [...this.enemies],
      bullets: [...this.bullets],
      players: playersPub,
      isOver: this.isOverFlag,
      winnerId: this.winnerId,
    };
  }

  getStateFor(playerId: string): SpaceImpactPublicState {
    return this.getPublicState();
  }

  isOver(): boolean {
    return this.isOverFlag;
  }

  removePlayer(playerId: string): void {
    this.ships.delete(playerId);
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
