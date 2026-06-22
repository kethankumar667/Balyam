import type {
  DotsBoxesClaim,
  DotsBoxesLine,
  DotsBoxesOptions,
  DotsBoxesPublicState,
  Player,
} from "@shared/types.js";
import { DEFAULT_DOTSBOXES_OPTIONS } from "@shared/types.js";
import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";

/**
 * Dots & Boxes — Rough Notebook Edition (Phase 2).
 *
 * 2–4 player turn-based shared board. RxC dots → (R-1)x(C-1) boxes.
 * On each turn the player draws ONE line between two adjacent dots.
 * Closing a box (4 edges drawn) claims it for the player AND grants
 * a bonus move — the same player draws again until they draw a line
 * that doesn't close anything. Game ends when every box is claimed.
 *
 * Storage convention (matches shared types):
 *   • A horizontal line at (r,c) connects dots (r,c) and (r,c+1).
 *     Valid range: 0 ≤ r < size,  0 ≤ c < size-1.
 *   • A vertical line at (r,c) connects dots (r,c) and (r+1,c).
 *     Valid range: 0 ≤ r < size-1,  0 ≤ c < size.
 *   • A box's top-left dot is (br,bc); its four edges are:
 *       top    = hLine(br,   bc)
 *       bottom = hLine(br+1, bc)
 *       left   = vLine(br,   bc)
 *       right  = vLine(br,   bc+1)
 */

interface InternalState {
  phase: "playing" | "finished";
  options: DotsBoxesOptions;
  playerOrder: string[];
  turnIndex: number;
  /** [size][size-1] — true when drawn. */
  hGrid: boolean[][];
  /** [size-1][size] — true when drawn. */
  vGrid: boolean[][];
  /** [size-1][size-1] — player id or null. */
  boxOwner: (string | null)[][];
  /** Flat audit lists for the client. */
  hLines: DotsBoxesLine[];
  vLines: DotsBoxesLine[];
  claims: DotsBoxesClaim[];
  scores: Record<string, number>;
  turnDeadline: number | null;
  winnerId: string | null;
  moveCount: number;
  lastMoveScored: boolean;
  totalBoxes: number;
  claimedBoxes: number;
}

export class DotsBoxesEngine implements GameEngine {
  readonly kind = "dotsboxes" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 4;

  private s!: InternalState;
  private pendingOptions: DotsBoxesOptions = { ...DEFAULT_DOTSBOXES_OPTIONS };

  setOptions(options: DotsBoxesOptions): void {
    this.pendingOptions = { ...DEFAULT_DOTSBOXES_OPTIONS, ...options };
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
      throw new Error(`Dots & Boxes requires ${this.minPlayers}-${this.maxPlayers} players`);
    }
    const opts = { ...this.pendingOptions };
    const size = opts.boardSize;
    const ids = players.map((p) => p.id);
    const scores: Record<string, number> = {};
    for (const id of ids) scores[id] = 0;

    this.s = {
      phase: "playing",
      options: opts,
      playerOrder: ids,
      turnIndex: 0,
      hGrid: Array.from({ length: size }, () => Array(size - 1).fill(false)),
      vGrid: Array.from({ length: size - 1 }, () => Array(size).fill(false)),
      boxOwner: Array.from({ length: size - 1 }, () => Array(size - 1).fill(null)),
      hLines: [],
      vLines: [],
      claims: [],
      scores,
      turnDeadline: null,
      winnerId: null,
      moveCount: 0,
      lastMoveScored: false,
      totalBoxes: (size - 1) * (size - 1),
      claimedBoxes: 0,
    };
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.s.phase !== "playing") return { ok: false, error: "Game is over" };
    if (move.type !== "draw") return { ok: false, error: `Unknown move type: ${move.type}` };
    const currentPid = this.s.playerOrder[this.s.turnIndex];
    if (move.playerId !== currentPid) return { ok: false, error: "Not your turn" };

    const data = move.data as { kind?: "h" | "v"; r?: number; c?: number } | undefined;
    const kind = data?.kind;
    const r = data?.r;
    const c = data?.c;
    if ((kind !== "h" && kind !== "v") || typeof r !== "number" || typeof c !== "number") {
      return { ok: false, error: "Specify kind (h|v) and (r,c)" };
    }
    const size = this.s.options.boardSize;
    if (kind === "h") {
      if (r < 0 || r >= size || c < 0 || c >= size - 1) {
        return { ok: false, error: "Line out of range" };
      }
      if (this.s.hGrid[r][c]) return { ok: false, error: "Line already drawn" };
      this.s.hGrid[r][c] = true;
      this.s.hLines.push({ kind, r, c, playerId: move.playerId });
    } else {
      if (r < 0 || r >= size - 1 || c < 0 || c >= size) {
        return { ok: false, error: "Line out of range" };
      }
      if (this.s.vGrid[r][c]) return { ok: false, error: "Line already drawn" };
      this.s.vGrid[r][c] = true;
      this.s.vLines.push({ kind, r, c, playerId: move.playerId });
    }
    this.s.moveCount += 1;

    // Closure detection — at most TWO boxes can be affected by a single
    // line. For each candidate box check all 4 edges.
    const candidates: Array<{ br: number; bc: number }> = [];
    if (kind === "h") {
      if (r > 0) candidates.push({ br: r - 1, bc: c });
      if (r < size - 1) candidates.push({ br: r, bc: c });
    } else {
      if (c > 0) candidates.push({ br: r, bc: c - 1 });
      if (c < size - 1) candidates.push({ br: r, bc: c });
    }
    let scoredThisMove = false;
    for (const { br, bc } of candidates) {
      if (this.s.boxOwner[br][bc] !== null) continue;
      if (!this.isBoxClosed(br, bc)) continue;
      this.s.boxOwner[br][bc] = move.playerId;
      this.s.scores[move.playerId] = (this.s.scores[move.playerId] ?? 0) + 1;
      this.s.claims.push({
        r: br,
        c: bc,
        ownerId: move.playerId,
        closedAt: this.s.moveCount,
      });
      this.s.claimedBoxes += 1;
      scoredThisMove = true;
    }
    this.s.lastMoveScored = scoredThisMove;

    if (this.s.claimedBoxes >= this.s.totalBoxes) {
      this.finalize();
      return { ok: true, isOver: true, winnerId: this.s.winnerId };
    }

    // Bonus turn — same player keeps the turn if they scored.
    if (!scoredThisMove) {
      this.s.turnIndex = (this.s.turnIndex + 1) % this.s.playerOrder.length;
    }
    return { ok: true };
  }

  private isBoxClosed(br: number, bc: number): boolean {
    return (
      this.s.hGrid[br][bc] &&
      this.s.hGrid[br + 1][bc] &&
      this.s.vGrid[br][bc] &&
      this.s.vGrid[br][bc + 1]
    );
  }

  private finalize(): void {
    this.s.phase = "finished";
    this.s.turnDeadline = null;
    // Winner = highest box count. Ties → null winnerId (the scorecard
    // surfaces a tie message). Deterministic so 2-2 reads the same on
    // every client.
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

  getPublicState(): DotsBoxesPublicState {
    return {
      kind: "dotsboxes",
      phase: this.s.phase,
      options: this.s.options,
      playerOrder: this.s.playerOrder,
      turnPlayerId: this.s.playerOrder[this.s.turnIndex],
      hLines: this.s.hLines.slice(),
      vLines: this.s.vLines.slice(),
      claims: this.s.claims.slice(),
      scores: { ...this.s.scores },
      turnDeadline: this.s.turnDeadline,
      winnerId: this.s.winnerId,
      moveCount: this.s.moveCount,
      lastMoveScored: this.s.lastMoveScored,
    };
  }

  getStateFor(_playerId: string): DotsBoxesPublicState {
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
   * Bot strategy — "first do no harm":
   *   1. If any box is already at 3 edges → close it (free point).
   *   2. Else play a "safe" line — one that does NOT take a box's edge
   *      count from 2 → 3 (would gift the opponent a closure).
   *   3. Else (board is fully sacrificial) play the line that gives away
   *      the SMALLEST chain — currently approximated as a random
   *      remaining line. Real chain analysis is a v3 concern; this still
   *      plays well above random and avoids most "obvious" gifts.
   */
  applyAutoMove(playerId: string): MoveResult {
    if (this.s.phase !== "playing") return { ok: false, error: "Game over" };
    const all = this.allRemainingLines();
    if (all.length === 0) {
      this.finalize();
      return { ok: true, isOver: true };
    }

    // (1) Greedy capture
    for (const line of all) {
      const closes = this.countClosuresFor(line);
      if (closes >= 1) {
        return this.applyMove({ playerId, type: "draw", data: line });
      }
    }
    // (2) Safe moves
    const safe = all.filter((line) => !this.givesOpponentABox(line));
    const pickFrom = safe.length > 0 ? safe : all;
    const pick = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    return this.applyMove({ playerId, type: "draw", data: pick });
  }

  private allRemainingLines(): Array<{ kind: "h" | "v"; r: number; c: number }> {
    const size = this.s.options.boardSize;
    const out: Array<{ kind: "h" | "v"; r: number; c: number }> = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 1; c++) {
        if (!this.s.hGrid[r][c]) out.push({ kind: "h", r, c });
      }
    }
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size; c++) {
        if (!this.s.vGrid[r][c]) out.push({ kind: "v", r, c });
      }
    }
    return out;
  }

  /** How many boxes would this line close right now (0, 1, or 2). */
  private countClosuresFor(line: { kind: "h" | "v"; r: number; c: number }): number {
    const size = this.s.options.boardSize;
    let count = 0;
    const checkBox = (br: number, bc: number, exclude: { kind: "h" | "v"; r: number; c: number }) => {
      if (br < 0 || bc < 0 || br >= size - 1 || bc >= size - 1) return;
      if (this.s.boxOwner[br][bc] !== null) return;
      const edges = [
        this.s.hGrid[br][bc],          // top
        this.s.hGrid[br + 1][bc],      // bottom
        this.s.vGrid[br][bc],          // left
        this.s.vGrid[br][bc + 1],      // right
      ];
      // Replace the candidate edge with `true` (since this line being
      // drawn IS what we're scoring), then check if all 4 are true.
      if (exclude.kind === "h" && exclude.r === br && exclude.c === bc) edges[0] = true;
      if (exclude.kind === "h" && exclude.r === br + 1 && exclude.c === bc) edges[1] = true;
      if (exclude.kind === "v" && exclude.r === br && exclude.c === bc) edges[2] = true;
      if (exclude.kind === "v" && exclude.r === br && exclude.c === bc + 1) edges[3] = true;
      if (edges.every((e) => e)) count += 1;
    };
    if (line.kind === "h") {
      checkBox(line.r - 1, line.c, line);
      checkBox(line.r, line.c, line);
    } else {
      checkBox(line.r, line.c - 1, line);
      checkBox(line.r, line.c, line);
    }
    return count;
  }

  /** True if drawing this line creates a 3-edged box (opponent's free point). */
  private givesOpponentABox(line: { kind: "h" | "v"; r: number; c: number }): boolean {
    const size = this.s.options.boardSize;
    const sidesAfterDraw = (br: number, bc: number) => {
      if (br < 0 || bc < 0 || br >= size - 1 || bc >= size - 1) return 0;
      if (this.s.boxOwner[br][bc] !== null) return 0;
      let n = 0;
      if (this.s.hGrid[br][bc]) n += 1;
      if (this.s.hGrid[br + 1][bc]) n += 1;
      if (this.s.vGrid[br][bc]) n += 1;
      if (this.s.vGrid[br][bc + 1]) n += 1;
      // Account for the candidate line being added.
      if (line.kind === "h" && line.r === br && line.c === bc) n += 1;
      if (line.kind === "h" && line.r === br + 1 && line.c === bc) n += 1;
      if (line.kind === "v" && line.r === br && line.c === bc) n += 1;
      if (line.kind === "v" && line.r === br && line.c === bc + 1) n += 1;
      return n;
    };
    if (line.kind === "h") {
      if (sidesAfterDraw(line.r - 1, line.c) === 3) return true;
      if (sidesAfterDraw(line.r, line.c) === 3) return true;
    } else {
      if (sidesAfterDraw(line.r, line.c - 1) === 3) return true;
      if (sidesAfterDraw(line.r, line.c) === 3) return true;
    }
    return false;
  }

  removePlayer(playerId: string): void {
    if (!this.s.playerOrder.includes(playerId)) return;
    const wasCurrent = this.s.playerOrder[this.s.turnIndex] === playerId;
    this.s.playerOrder = this.s.playerOrder.filter((id) => id !== playerId);
    if (this.s.playerOrder.length < 2 && this.s.phase === "playing") {
      this.s.winnerId = this.s.playerOrder[0] ?? null;
      this.s.phase = "finished";
      this.s.turnDeadline = null;
      return;
    }
    if (wasCurrent && this.s.turnIndex >= this.s.playerOrder.length) {
      this.s.turnIndex = 0;
    } else if (this.s.turnIndex >= this.s.playerOrder.length) {
      this.s.turnIndex = 0;
    }
  }
}
