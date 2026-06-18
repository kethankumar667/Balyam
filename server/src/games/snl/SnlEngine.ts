import type {
  Player,
  SnlBoardConfig,
  SnlDifficulty,
  SnlEvent,
  SnlGameOptions,
  SnlPlayerStats,
  SnlState,
} from "@shared/types.js";
import { DEFAULT_SNL_OPTIONS } from "@shared/types.js";
import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";

const RECENT_EVENTS_CAP = 16;

// 4 difficulty boards. No conflicts: no square is both a snake head and a ladder bottom.

const EASY_BOARD: SnlBoardConfig = {
  size: 100,
  difficulty: "easy",
  // Many ladders (12), few snakes (5), short slides — beginner friendly.
  ladders: {
    2: 38, 4: 14, 9: 31, 21: 42, 25: 60, 28: 84,
    33: 78, 36: 44, 51: 67, 65: 88, 71: 91, 80: 100,
  },
  snakes: { 47: 26, 56: 53, 64: 60, 87: 24, 95: 75 },
};

const MEDIUM_BOARD: SnlBoardConfig = {
  size: 100,
  difficulty: "medium",
  // Classic balanced board — what most people grew up playing.
  ladders: {
    1: 38, 4: 14, 9: 31, 21: 42, 28: 84,
    36: 44, 51: 67, 71: 91, 80: 100,
  },
  snakes: {
    16: 6, 47: 26, 49: 11, 56: 53, 62: 19,
    64: 60, 87: 24, 93: 73, 95: 75, 98: 79,
  },
};

const HARD_BOARD: SnlBoardConfig = {
  size: 100,
  difficulty: "hard",
  // Fewer ladders (6), more snakes (12), longer slides — punishing.
  ladders: { 4: 14, 9: 31, 21: 42, 51: 67, 71: 91, 80: 100 },
  snakes: {
    16: 3, 24: 5, 47: 13, 49: 11, 56: 30, 62: 19,
    65: 7, 78: 50, 87: 24, 93: 55, 95: 8, 99: 35,
  },
};

const EXTREME_BOARD: SnlBoardConfig = {
  size: 100,
  difficulty: "extreme",
  // Just 3 ladders, 15 snakes, devastating drops including 99 -> 1.
  ladders: { 4: 14, 28: 84, 80: 100 },
  snakes: {
    9: 2, 16: 3, 21: 7, 36: 11, 42: 20,
    47: 14, 49: 8, 56: 30, 62: 19, 65: 25,
    72: 50, 78: 33, 87: 24, 93: 55, 99: 1,
  },
};

const BOARDS_BY_DIFFICULTY: Record<SnlDifficulty, SnlBoardConfig> = {
  easy: EASY_BOARD,
  medium: MEDIUM_BOARD,
  hard: HARD_BOARD,
  extreme: EXTREME_BOARD,
};

function boardFor(difficulty: SnlDifficulty): SnlBoardConfig {
  return BOARDS_BY_DIFFICULTY[difficulty] ?? MEDIUM_BOARD;
}

interface Internal {
  phase: "playing" | "finished";
  config: SnlBoardConfig;
  playerOrder: string[];
  turnIndex: number;
  turnPhase: "rolling" | "resolving";
  positions: Map<string, number>;
  diceValue: number | null;
  winnerId: string | null;
  finishedOrder: string[];
  stats: Map<string, SnlPlayerStats>;
  recentEvents: SnlEvent[];
  startedAt: number;
}

function freshStats(): SnlPlayerStats {
  return {
    rolls: 0,
    laddersClimbed: 0,
    snakesBitten: 0,
    bounces: 0,
    highestSquare: 0,
  };
}

export class SnlEngine implements GameEngine {
  readonly kind = "snl" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 10;

  private s!: Internal;
  private rng: () => number = Math.random;
  private pendingOptions: SnlGameOptions = { ...DEFAULT_SNL_OPTIONS };

  /** Test hook: deterministic RNG returning 0..1. */
  setRng(fn: () => number): void {
    this.rng = fn;
  }

  /** Set game options before init. Must be called before init(). */
  setOptions(options: SnlGameOptions): void {
    this.pendingOptions = { ...DEFAULT_SNL_OPTIONS, ...options };
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`SnL needs ${this.minPlayers}-${this.maxPlayers} players`);
    }
    const order = players.map((p) => p.id);
    const positions = new Map<string, number>();
    const stats = new Map<string, SnlPlayerStats>();
    for (const id of order) {
      positions.set(id, 0);
      stats.set(id, freshStats());
    }
    this.s = {
      phase: "playing",
      config: boardFor(this.pendingOptions.difficulty),
      playerOrder: order,
      turnIndex: 0,
      turnPhase: "rolling",
      positions,
      diceValue: null,
      winnerId: null,
      finishedOrder: [],
      stats,
      recentEvents: [],
      startedAt: Date.now(),
    };
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.s.phase === "finished") {
      return { ok: false, error: "Game is finished" };
    }
    if (move.type !== "roll") {
      return { ok: false, error: `Unknown move type: ${move.type}` };
    }
    const turnPlayerId = this.currentPlayerId();
    if (move.playerId !== turnPlayerId) {
      return { ok: false, error: "Not your turn" };
    }
    if (this.s.turnPhase !== "rolling") {
      return { ok: false, error: "Already rolled this turn" };
    }
    const playerId = move.playerId;
    const roll = 1 + Math.floor(this.rng() * 6);
    this.s.diceValue = roll;
    this.s.turnPhase = "resolving";

    const stats = this.s.stats.get(playerId)!;
    stats.rolls += 1;

    const from = this.s.positions.get(playerId) ?? 0;
    const ts = Date.now();
    this.pushEvent({ kind: "roll", playerId, ts, roll });

    const size = this.s.config.size;
    const raw = from + roll;
    let landing: number;
    let bounced = false;
    if (raw <= size) {
      landing = raw;
    } else {
      landing = size - (raw - size);
      bounced = true;
      stats.bounces += 1;
    }

    if (landing === from) {
      this.pushEvent({ kind: "stay", playerId, ts, from, landing });
      this.endTurn();
      return { ok: true };
    }

    this.s.positions.set(playerId, landing);
    this.pushEvent({
      kind: bounced ? "bounce" : "move",
      playerId,
      ts,
      from,
      landing,
      to: landing,
    });

    // Snake or ladder at landing?
    const ladderTo = this.s.config.ladders[landing];
    const snakeTo = this.s.config.snakes[landing];
    let finalSquare = landing;

    if (ladderTo != null) {
      this.s.positions.set(playerId, ladderTo);
      finalSquare = ladderTo;
      stats.laddersClimbed += 1;
      this.pushEvent({ kind: "ladder", playerId, ts, from: landing, to: ladderTo });
    } else if (snakeTo != null) {
      this.s.positions.set(playerId, snakeTo);
      finalSquare = snakeTo;
      stats.snakesBitten += 1;
      this.pushEvent({ kind: "snake", playerId, ts, from: landing, to: snakeTo });
    }

    if (finalSquare > stats.highestSquare) {
      stats.highestSquare = finalSquare;
    }

    if (finalSquare === size) {
      this.s.finishedOrder.push(playerId);
      if (!this.s.winnerId) {
        this.s.winnerId = playerId;
      }
      this.pushEvent({ kind: "win", playerId, ts, to: size });

      const remaining = this.s.playerOrder.filter(
        (id) => !this.s.finishedOrder.includes(id)
      );
      if (remaining.length <= 1) {
        this.s.phase = "finished";
        return { ok: true, isOver: true, winnerId: this.s.winnerId };
      }
    }

    this.endTurn();
    return { ok: true };
  }

  private endTurn(): void {
    if (this.s.phase === "finished") return;
    const total = this.s.playerOrder.length;
    for (let i = 1; i <= total; i++) {
      const idx = (this.s.turnIndex + i) % total;
      const candidate = this.s.playerOrder[idx];
      if (!this.s.finishedOrder.includes(candidate)) {
        this.s.turnIndex = idx;
        break;
      }
    }
    this.s.turnPhase = "rolling";
    // Intentionally NOT resetting diceValue here. The whole turn (roll →
    // move → snake/ladder → endTurn) happens in one synchronous applyMove
    // call, so if we clear diceValue before the broadcast the client never
    // sees the rolled number. Leave the last value visible; the next
    // player's handleRoll overwrites it. The client uses `recentEvents`
    // (which carries playerId) to know whose roll the visible value
    // belongs to and animates accordingly.
  }

  private currentPlayerId(): string {
    return this.s.playerOrder[this.s.turnIndex];
  }

  private pushEvent(ev: SnlEvent): void {
    this.s.recentEvents.push(ev);
    if (this.s.recentEvents.length > RECENT_EVENTS_CAP) {
      this.s.recentEvents.splice(0, this.s.recentEvents.length - RECENT_EVENTS_CAP);
    }
  }

  getStateFor(_playerId: string): unknown {
    return this.snapshot();
  }

  getPublicState(): unknown {
    return this.snapshot();
  }

  private snapshot(): SnlState {
    return {
      kind: "snl",
      phase: this.s.phase,
      config: this.s.config,
      playerOrder: [...this.s.playerOrder],
      turnPlayerId: this.currentPlayerId(),
      turnPhase: this.s.turnPhase,
      positions: Object.fromEntries(this.s.positions),
      diceValue: this.s.diceValue,
      winnerId: this.s.winnerId,
      finishedOrder: [...this.s.finishedOrder],
      stats: Object.fromEntries(this.s.stats),
      recentEvents: [...this.s.recentEvents],
      startedAt: this.s.startedAt,
    };
  }

  isOver(): boolean {
    return this.s.phase === "finished";
  }

  /* ── Bot support ── */

  pendingActors(): string[] {
    if (this.s.phase !== "playing") return [];
    return [this.currentPlayerId()];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.s.phase !== "playing") return { ok: false, error: "Not playing" };
    if (playerId !== this.currentPlayerId()) return { ok: false, error: "Not your turn" };
    return this.applyMove({ playerId, type: "roll" });
  }

  removePlayer(playerId: string): void {
    if (!this.s.playerOrder.includes(playerId)) return;
    if (this.s.finishedOrder.includes(playerId)) return;
    // Treat as forfeit — drop them from the rotation.
    const wasCurrent = this.currentPlayerId() === playerId;
    this.s.playerOrder = this.s.playerOrder.filter((id) => id !== playerId);

    if (this.s.playerOrder.length === 0) {
      this.s.phase = "finished";
      return;
    }
    if (this.s.playerOrder.length === 1 && this.s.finishedOrder.length === 0) {
      // One player left and nobody has won — declare them winner by walkover.
      const last = this.s.playerOrder[0];
      this.s.winnerId = last;
      this.s.finishedOrder.push(last);
      this.s.phase = "finished";
      return;
    }
    if (this.s.turnIndex >= this.s.playerOrder.length) {
      this.s.turnIndex = 0;
    }
    if (wasCurrent) {
      this.s.turnPhase = "rolling";
      this.s.diceValue = null;
    }
  }
}
