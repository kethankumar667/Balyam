import type {
  MemoryMatchOptions,
  MemoryMatchPhase,
  MemoryMatchPublicState,
  Player,
} from "@shared/types.js";
import { DEFAULT_MEMORYMATCH_OPTIONS } from "@shared/types.js";
import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import { MEMORYMATCH_SYMBOLS } from "./symbols.js";

/**
 * Memory Match — Old Photo Album Edition.
 *
 *   - NxN grid of face-down cards (N² must be even — 4×4, 6×6, 8×8 all work).
 *   - Each unique symbol appears EXACTLY twice on the board, positioned
 *     randomly via a Fisher-Yates shuffle.
 *   - Players flip 2 cards per turn. Match → keep, score, bonus turn.
 *     No match → cards enter REVEAL phase for ~1.5 s (so everyone sees
 *     them), then flip back and the next player goes. The room manager
 *     schedules the reveal-timer.
 *   - Game ends when every pair is claimed. Tie → winnerId=null.
 */

interface InternalCard {
  id: number;
  symbol: string;
  /** Face-up while in `flipped`, OR permanently face-up once claimed. */
  ownerId: string | null;
}

interface InternalState {
  phase: MemoryMatchPhase;
  options: MemoryMatchOptions;
  playerOrder: string[];
  turnIndex: number;
  /** Row-major card list. Index = r * size + c. */
  cards: InternalCard[];
  /** Card ids currently face-up (1 or 2 entries during play, 2 during reveal). */
  flipped: number[];
  scores: Record<string, number>;
  turnDeadline: number | null;
  revealUntil: number | null;
  lastMoveScored: boolean;
  winnerId: string | null;
  totalPairs: number;
  matchedPairs: number;
}

export class MemoryMatchEngine implements GameEngine {
  readonly kind = "memorymatch" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 4;

  private s!: InternalState;
  private pendingOptions: MemoryMatchOptions = { ...DEFAULT_MEMORYMATCH_OPTIONS };

  setOptions(options: MemoryMatchOptions): void {
    this.pendingOptions = { ...DEFAULT_MEMORYMATCH_OPTIONS, ...options };
  }

  setTurnDeadline(deadline: number): void {
    this.s.turnDeadline = deadline;
  }
  clearTurnDeadline(): void {
    this.s.turnDeadline = null;
  }
  getTurnTimerSeconds(): number {
    return this.s?.options.turnTimerSeconds ?? this.pendingOptions.turnTimerSeconds;
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Memory Match requires ${this.minPlayers}-${this.maxPlayers} players`);
    }
    const opts = { ...this.pendingOptions };
    const size = opts.boardSize;
    const cellCount = size * size;
    if (cellCount % 2 !== 0) throw new Error("Board cell count must be even");
    const pairCount = cellCount / 2;
    if (pairCount > MEMORYMATCH_SYMBOLS.length) {
      throw new Error(
        `Not enough symbols (${MEMORYMATCH_SYMBOLS.length}) for ${pairCount} pairs`,
      );
    }

    // Pick `pairCount` symbols from the pool, shuffled so the choice
    // differs each match. Then build the card list as [s, s, t, t, ...]
    // and shuffle THAT to randomise positions.
    const pool = [...MEMORYMATCH_SYMBOLS];
    shuffle(pool);
    const chosen = pool.slice(0, pairCount);
    const list: InternalCard[] = [];
    let nextId = 0;
    for (const sym of chosen) {
      list.push({ id: nextId++, symbol: sym, ownerId: null });
      list.push({ id: nextId++, symbol: sym, ownerId: null });
    }
    shuffle(list);

    const ids = players.map((p) => p.id);
    const scores: Record<string, number> = {};
    for (const id of ids) scores[id] = 0;

    this.s = {
      phase: "playing",
      options: opts,
      playerOrder: ids,
      turnIndex: 0,
      cards: list,
      flipped: [],
      scores,
      turnDeadline: null,
      revealUntil: null,
      lastMoveScored: false,
      winnerId: null,
      totalPairs: pairCount,
      matchedPairs: 0,
    };
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.s.phase === "finished") return { ok: false, error: "Game is over" };
    if (this.s.phase === "reveal") {
      return { ok: false, error: "Wait — cards are revealing" };
    }
    if (move.type !== "flip") return { ok: false, error: `Unknown move type: ${move.type}` };
    const currentPid = this.s.playerOrder[this.s.turnIndex];
    if (move.playerId !== currentPid) return { ok: false, error: "Not your turn" };

    const data = move.data as { cardId?: number } | undefined;
    const cardId = data?.cardId;
    if (typeof cardId !== "number") {
      return { ok: false, error: "Missing cardId" };
    }
    const card = this.s.cards.find((c) => c.id === cardId);
    if (!card) return { ok: false, error: "Unknown card" };
    if (card.ownerId !== null) return { ok: false, error: "Card already claimed" };
    if (this.s.flipped.includes(cardId)) return { ok: false, error: "Card already face-up" };
    if (this.s.flipped.length >= 2) return { ok: false, error: "Already flipped 2 — wait" };

    this.s.flipped.push(cardId);
    this.s.lastMoveScored = false;

    if (this.s.flipped.length === 2) {
      const [aId, bId] = this.s.flipped;
      const a = this.s.cards.find((c) => c.id === aId)!;
      const b = this.s.cards.find((c) => c.id === bId)!;
      if (a.symbol === b.symbol) {
        // Match!
        a.ownerId = move.playerId;
        b.ownerId = move.playerId;
        this.s.scores[move.playerId] = (this.s.scores[move.playerId] ?? 0) + 1;
        this.s.matchedPairs += 1;
        this.s.flipped = [];
        this.s.lastMoveScored = true;
        if (this.s.matchedPairs >= this.s.totalPairs) {
          this.finalize();
          return { ok: true, isOver: true, winnerId: this.s.winnerId };
        }
        // Bonus turn — current player keeps the turn.
        return { ok: true };
      }
      // No match — enter reveal phase. The room manager schedules a
      // setTimeout to call `resolveReveal()` after revealMs so the
      // cards flip back and the turn advances.
      this.s.phase = "reveal";
      this.s.revealUntil = Date.now() + this.s.options.revealMs;
    }
    return { ok: true };
  }

  /**
   * Called by the room manager (via a reveal-timer) to flip the two
   * non-matching cards back and advance the turn. Safe to call from
   * any state — if the engine isn't actually in reveal phase the call
   * is a no-op.
   */
  resolveReveal(): void {
    if (this.s.phase !== "reveal") return;
    this.s.flipped = [];
    this.s.revealUntil = null;
    this.s.phase = "playing";
    this.s.turnIndex = (this.s.turnIndex + 1) % this.s.playerOrder.length;
  }

  /** True when the engine is currently in reveal phase. The room manager
   *  checks this to schedule the flip-back timer. */
  isRevealing(): boolean {
    return this.s.phase === "reveal";
  }

  /** Wall-clock ms until reveal flip-back. -1 if not revealing. */
  revealRemainingMs(now: number = Date.now()): number {
    if (this.s.phase !== "reveal" || this.s.revealUntil == null) return -1;
    return Math.max(0, this.s.revealUntil - now);
  }

  private finalize(): void {
    this.s.phase = "finished";
    this.s.turnDeadline = null;
    this.s.revealUntil = null;
    let bestId: string | null = null;
    let bestScore = -1;
    let tied = false;
    for (const pid of this.s.playerOrder) {
      const sc = this.s.scores[pid] ?? 0;
      if (sc > bestScore) {
        bestScore = sc;
        bestId = pid;
        tied = false;
      } else if (sc === bestScore) {
        tied = true;
      }
    }
    this.s.winnerId = tied ? null : bestId;
  }

  getPublicState(): MemoryMatchPublicState {
    const flippedSet = new Set(this.s.flipped);
    return {
      kind: "memorymatch",
      phase: this.s.phase,
      options: this.s.options,
      playerOrder: this.s.playerOrder,
      turnPlayerId: this.s.playerOrder[this.s.turnIndex],
      board: this.s.cards.map((c) => ({
        id: c.id,
        // Symbol only visible if face-up OR claimed.
        symbol: c.ownerId !== null || flippedSet.has(c.id) ? c.symbol : null,
        ownerId: c.ownerId,
      })),
      flipped: this.s.flipped.slice(),
      scores: { ...this.s.scores },
      turnDeadline: this.s.turnDeadline,
      revealUntil: this.s.revealUntil,
      lastMoveScored: this.s.lastMoveScored,
      winnerId: this.s.winnerId,
      totalPairs: this.s.totalPairs,
      matchedPairs: this.s.matchedPairs,
    };
  }

  getStateFor(_playerId: string): MemoryMatchPublicState {
    return this.getPublicState();
  }

  isOver(): boolean {
    return this.s.phase === "finished";
  }

  pendingActors(): string[] {
    if (this.s.phase !== "playing") return [];
    return [this.s.playerOrder[this.s.turnIndex]];
  }

  /**
   * Bot — limited-memory player. The bot keeps an internal map of
   * `cardId → symbol it briefly saw` so it can match pairs it's
   * spotted before. Memory has a chance to "forget" any given known
   * card on each turn, simulating an imperfect human player.
   *
   * Each turn the bot:
   *   1. Looks for two known-and-still-unclaimed cards with the same
   *      symbol → flip both (guaranteed match).
   *   2. Else flips an unknown card. If its symbol is in memory and
   *      that other card is still unclaimed → flip it.
   *   3. Else flips a second random unknown card.
   */
  private memory = new Map<number, string>();
  private MEMORY_FORGET_CHANCE = 0.18; // ~ 5 turns to forget on average

  applyAutoMove(playerId: string): MoveResult {
    if (this.s.phase !== "playing") return { ok: false, error: "Not playing" };
    // Forget some memory each turn (humans forget!)
    for (const id of [...this.memory.keys()]) {
      if (Math.random() < this.MEMORY_FORGET_CHANCE) this.memory.delete(id);
    }

    // Refresh memory with anything currently visible (face-up + claimed).
    for (const c of this.s.cards) {
      if (c.ownerId !== null) this.memory.delete(c.id); // claimed → useless
    }

    const unclaimedIds = this.s.cards.filter((c) => c.ownerId === null).map((c) => c.id);
    if (unclaimedIds.length === 0) return { ok: false, error: "No unclaimed cards" };

    // Look for a known pair.
    const memorySymbolToIds = new Map<string, number[]>();
    for (const [id, sym] of this.memory.entries()) {
      if (!unclaimedIds.includes(id)) continue;
      const arr = memorySymbolToIds.get(sym) ?? [];
      arr.push(id);
      memorySymbolToIds.set(sym, arr);
    }
    let knownPair: [number, number] | null = null;
    for (const ids of memorySymbolToIds.values()) {
      if (ids.length >= 2) {
        knownPair = [ids[0], ids[1]];
        break;
      }
    }

    if (knownPair) {
      // Flip first half of the known pair.
      const r1 = this.applyMove({ playerId, type: "flip", data: { cardId: knownPair[0] } });
      if (!r1.ok) return r1;
      this.memory.set(knownPair[0], this.symbolOf(knownPair[0]));
      // Then flip the second.
      const r2 = this.applyMove({ playerId, type: "flip", data: { cardId: knownPair[1] } });
      if (r2.ok) this.memory.set(knownPair[1], this.symbolOf(knownPair[1]));
      return r2;
    }

    // No known pair. Flip an unknown card first.
    const knownIds = new Set(this.memory.keys());
    const unknownIds = unclaimedIds.filter((id) => !knownIds.has(id));
    const pool = unknownIds.length > 0 ? unknownIds : unclaimedIds;
    const firstId = pool[Math.floor(Math.random() * pool.length)];
    const r1 = this.applyMove({ playerId, type: "flip", data: { cardId: firstId } });
    if (!r1.ok) return r1;
    const firstSym = this.symbolOf(firstId);
    this.memory.set(firstId, firstSym);

    // Now look for a known matching card for the second flip.
    let secondId: number | null = null;
    for (const [id, sym] of this.memory.entries()) {
      if (id === firstId) continue;
      if (sym !== firstSym) continue;
      if (!unclaimedIds.includes(id)) continue;
      if (this.s.flipped.includes(id)) continue;
      secondId = id;
      break;
    }
    if (secondId == null) {
      const remaining = unclaimedIds.filter((id) => id !== firstId && !this.s.flipped.includes(id));
      if (remaining.length === 0) return { ok: true };
      secondId = remaining[Math.floor(Math.random() * remaining.length)];
    }
    const r2 = this.applyMove({ playerId, type: "flip", data: { cardId: secondId } });
    if (r2.ok) this.memory.set(secondId, this.symbolOf(secondId));
    return r2;
  }

  private symbolOf(cardId: number): string {
    return this.s.cards.find((c) => c.id === cardId)?.symbol ?? "";
  }

  removePlayer(playerId: string): void {
    if (!this.s.playerOrder.includes(playerId)) return;
    const wasCurrent = this.s.playerOrder[this.s.turnIndex] === playerId;
    this.s.playerOrder = this.s.playerOrder.filter((id) => id !== playerId);
    if (this.s.playerOrder.length < 2 && this.s.phase !== "finished") {
      this.s.winnerId = this.s.playerOrder[0] ?? null;
      this.s.phase = "finished";
      this.s.turnDeadline = null;
      this.s.revealUntil = null;
      return;
    }
    if (wasCurrent && this.s.turnIndex >= this.s.playerOrder.length) {
      this.s.turnIndex = 0;
    } else if (this.s.turnIndex >= this.s.playerOrder.length) {
      this.s.turnIndex = 0;
    }
  }
}

/** Fisher–Yates in-place shuffle. */
function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
