import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  SnakeOptions,
  SnakePlayerPublic,
  SnakePublicState,
  SnakeTheme,
  SnakeWallMode,
} from "@shared/types.js";
import { DEFAULT_SNAKE_OPTIONS } from "@shared/types.js";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface SnakeData {
  body: { x: number; y: number }[];
  dir: Direction;
  inputQueue: Direction[];
  isAlive: boolean;
  score: number;
  color: string;
}

export class SnakeEngine implements GameEngine {
  readonly kind = "snake" as const;
  readonly minPlayers = 1;
  readonly maxPlayers = 4;

  private opts: SnakeOptions = { ...DEFAULT_SNAKE_OPTIONS };
  private pendingOptions: SnakeOptions | null = null;

  private seatOrder: string[] = [];
  private isBot = new Set<string>();

  private snakes = new Map<string, SnakeData>();
  private food: { x: number; y: number } = { x: 10, y: 10 };
  private isOverFlag = false;
  private winnerId: string | null = null;

  private rng: () => number = Math.random;

  setRng(fn: () => number): void {
    this.rng = fn;
  }

  setOptions(opts: Partial<SnakeOptions>): void {
    this.pendingOptions = { ...DEFAULT_SNAKE_OPTIONS, ...opts };
  }

  init(players: Player[]): void {
    this.opts = this.pendingOptions ?? { ...DEFAULT_SNAKE_OPTIONS };
    this.seatOrder = players.map((p) => p.id);
    this.isBot = new Set(players.filter((p) => p.isBot).map((p) => p.id));
    this.snakes.clear();

    const colors = ["#22c55e", "#3b82f6", "#eab308", "#ec4899"];
    this.seatOrder.forEach((pid, idx) => {
      const startX = Math.min(this.opts.gridSize - 3, 5 + (idx % 2) * 8);
      const startY = Math.min(this.opts.gridSize - 3, 5 + Math.floor(idx / 2) * 8);
      this.snakes.set(pid, {
        body: [
          { x: startX, y: startY },
          { x: startX - 1, y: startY },
          { x: startX - 2, y: startY },
        ],
        dir: "RIGHT",
        inputQueue: [],
        isAlive: true,
        score: 0,
        color: colors[idx % colors.length],
      });
    });

    this.spawnFood();
    this.isOverFlag = false;
    this.winnerId = null;
  }

  private spawnFood(): void {
    let x: number, y: number;
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 200) {
      attempts++;
      x = Math.floor(this.rng() * this.opts.gridSize);
      y = Math.floor(this.rng() * this.opts.gridSize);
      valid = true;

      for (const snake of this.snakes.values()) {
        if (snake.body.some((segment) => segment.x === x && segment.y === y)) {
          valid = false;
          break;
        }
      }
      if (valid) {
        this.food = { x, y };
      }
    }
  }

  applyMove(move: MoveContext): MoveResult {
    const pid = move.playerId;
    const snake = this.snakes.get(pid);

    if (move.type === "tick") {
      this.tick();
      return { ok: true, isOver: this.isOverFlag, winnerId: this.winnerId };
    }

    if (!snake || !snake.isAlive || this.isOverFlag) {
      return { ok: false, error: "Cannot move" };
    }

    if (move.type === "turn") {
      const dir = (move.data as { dir?: string })?.dir as Direction;
      if (!dir) return { ok: false, error: "Missing dir" };

      const opposites: Record<Direction, Direction> = {
        UP: "DOWN",
        DOWN: "UP",
        LEFT: "RIGHT",
        RIGHT: "LEFT",
      };

      const lastDir = snake.inputQueue.length > 0 ? snake.inputQueue[snake.inputQueue.length - 1] : snake.dir;
      if (dir !== lastDir && dir !== opposites[lastDir]) {
        if (snake.inputQueue.length < 2) {
          snake.inputQueue.push(dir);
        }
      }
      return { ok: true };
    }

    return { ok: false, error: `Unknown move: ${move.type}` };
  }

  private tick(): void {
    if (this.isOverFlag) return;

    // Run Bot Steering
    for (const [pid, snake] of this.snakes.entries()) {
      if (snake.isAlive && this.isBot.has(pid)) {
        this.steerBot(snake);
      }
    }

    for (const [pid, snake] of this.snakes.entries()) {
      if (!snake.isAlive) continue;

      if (snake.inputQueue.length > 0) {
        snake.dir = snake.inputQueue.shift()!;
      }

      const head = { ...snake.body[0] };

      switch (snake.dir) {
        case "UP": head.y -= 1; break;
        case "DOWN": head.y += 1; break;
        case "LEFT": head.x -= 1; break;
        case "RIGHT": head.x += 1; break;
      }

      // Handle Wall Mode
      if (this.opts.wallMode === "wrap") {
        if (head.x < 0) head.x = this.opts.gridSize - 1;
        if (head.x >= this.opts.gridSize) head.x = 0;
        if (head.y < 0) head.y = this.opts.gridSize - 1;
        if (head.y >= this.opts.gridSize) head.y = 0;
      } else {
        // Solid wall collision
        if (head.x < 0 || head.x >= this.opts.gridSize || head.y < 0 || head.y >= this.opts.gridSize) {
          snake.isAlive = false;
          continue;
        }
      }

      // Body Collision check (ignore tail tip if not eating food)
      let collided = false;
      for (const s of this.snakes.values()) {
        const bodyToCheck = s.body.slice(0, s.body.length - 1);
        if (bodyToCheck.some((seg) => seg.x === head.x && seg.y === head.y)) {
          collided = true;
          break;
        }
      }

      if (collided) {
        snake.isAlive = false;
        continue;
      }

      snake.body.unshift(head);

      // Check food collection
      if (head.x === this.food.x && head.y === this.food.y) {
        snake.score += 10;
        if (this.opts.speedProgression && this.opts.speedMs > 60) {
          this.opts.speedMs = Math.max(50, this.opts.speedMs - 1);
        }
        this.spawnFood();
      } else {
        snake.body.pop();
      }
    }

    // Check game over condition
    const aliveSnakes = Array.from(this.snakes.entries()).filter(([_, s]) => s.isAlive);
    if (aliveSnakes.length === 0 || (this.seatOrder.length > 1 && aliveSnakes.length === 1)) {
      this.isOverFlag = true;
      let maxScore = -1;
      for (const [pid, s] of this.snakes.entries()) {
        if (s.score > maxScore) {
          maxScore = s.score;
          this.winnerId = pid;
        }
      }
    }
  }

  private steerBot(snake: SnakeData): void {
    const head = snake.body[0];
    const dx = this.food.x - head.x;
    const dy = this.food.y - head.y;

    const candidates: Direction[] = [];
    if (dx > 0) candidates.push("RIGHT");
    if (dx < 0) candidates.push("LEFT");
    if (dy > 0) candidates.push("DOWN");
    if (dy < 0) candidates.push("UP");

    const opposites: Record<Direction, Direction> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    const allDirs: Direction[] = ["UP", "RIGHT", "DOWN", "LEFT"];

    for (const d of candidates) {
      if (d !== opposites[snake.dir]) {
        snake.inputQueue.push(d);
        return;
      }
    }

    for (const d of allDirs) {
      if (d !== opposites[snake.dir]) {
        snake.inputQueue.push(d);
        return;
      }
    }
  }

  getPublicState(): SnakePublicState {
    const snakesObj: Record<string, { body: { x: number; y: number }[]; dir: string; isAlive: boolean }> = {};
    const playersPub: SnakePlayerPublic[] = [];

    for (const pid of this.seatOrder) {
      const s = this.snakes.get(pid);
      if (s) {
        snakesObj[pid] = { body: s.body, dir: s.dir, isAlive: s.isAlive };
        playersPub.push({ id: pid, score: s.score, isAlive: s.isAlive, color: s.color });
      }
    }

    return {
      kind: "snake",
      gridSize: this.opts.gridSize,
      speedMs: this.opts.speedMs,
      wallMode: this.opts.wallMode,
      theme: this.opts.theme,
      snakes: snakesObj,
      food: this.food,
      players: playersPub,
      isOver: this.isOverFlag,
      winnerId: this.winnerId,
    };
  }

  getStateFor(playerId: string): SnakePublicState {
    return this.getPublicState();
  }

  isOver(): boolean {
    return this.isOverFlag;
  }

  removePlayer(playerId: string): void {
    this.snakes.delete(playerId);
    this.seatOrder = this.seatOrder.filter((id) => id !== playerId);
    if (this.seatOrder.length === 0) this.isOverFlag = true;
  }

  getPhaseTimerSeconds(): number {
    return 0;
  }

  armDeadline(): number {
    return 0;
  }

  clearDeadline(): void {}
  resolveDeadline(): void {}
  pendingActors(): string[] {
    return [];
  }
  applyAutoMove(): MoveResult {
    return { ok: true };
  }
}
