import type {
  LudoColor,
  LudoEvent,
  LudoGameOptions,
  LudoState,
  LudoToken,
  Player,
} from "@shared/types.js";
import { DEFAULT_LUDO_OPTIONS } from "@shared/types.js";
import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import {
  PLAYER_COLORS_ORDER,
  STRETCH_LENGTH,
  colorStartFor,
  lastTrackPosFor,
  safeSquaresFor,
  trackLengthFor,
} from "./track.js";

interface Internal {
  phase: "playing" | "finished";
  turnIndex: number;
  turnPhase: "rolling" | "moving" | "done";
  diceValue: number | null;
  consecutiveSixes: number;
  movableTokenIds: string[];
  tokens: Map<string, LudoToken[]>;
  colorOf: Map<string, LudoColor>;
  playerOrder: string[];
  finishedCount: Map<string, number>;
  winnerId: string | null;
  hasCaptured: Map<string, boolean>;
  lastEvent: LudoEvent | null;
  rollCount: Map<string, number>;
  captureCount: Map<string, number>;
  sixCount: Map<string, number>;
  biggestStreak: Map<string, number>;
  startedAt: number;
  endedAt: number | null;
  turnDeadline: number | null;
  options: LudoGameOptions;
}

const TOKENS_PER_PLAYER = 4;

export class LudoEngine implements GameEngine {
  readonly kind = "ludo" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 8;

  private s!: Internal;
  private rng: () => number = Math.random;
  private pendingOptions: LudoGameOptions | null = null;

  /** Test hook: inject a deterministic RNG (returns 0..1). */
  setRng(fn: () => number): void {
    this.rng = fn;
  }

  /** Set game options before init. Must be called before init(). */
  setOptions(opts: Partial<LudoGameOptions>): void {
    this.pendingOptions = { ...DEFAULT_LUDO_OPTIONS, ...opts };
  }

  /** Update the turn deadline (in wall-clock ms). Returns updated state. */
  setTurnDeadline(deadline: number | null): void {
    if (!this.s) return;
    this.s.turnDeadline = deadline;
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Ludo requires ${this.minPlayers}-${this.maxPlayers} players`);
    }
    const order = players.map((p) => p.id);
    const colorOf = new Map<string, LudoColor>();
    const tokens = new Map<string, LudoToken[]>();
    // Each game uses exactly the first N canonical colors — one per wedge of
    // the cross (≤4) / polygon (5–8) board. Honor a player's chosen color
    // only when it's inside that pool; everyone else auto-assigns to the next
    // free pool color so the board always has geometry for every player.
    const pool = PLAYER_COLORS_ORDER.slice(0, players.length);
    const poolSet = new Set<LudoColor>(pool);
    const takenColors = new Set<LudoColor>();
    for (const p of players) {
      const chosen = p.chosenColor as LudoColor | undefined;
      if (chosen && poolSet.has(chosen) && !takenColors.has(chosen)) {
        colorOf.set(p.id, chosen);
        takenColors.add(chosen);
      }
    }
    // Second pass: assign remaining players the next free color in canonical order.
    for (const p of players) {
      if (colorOf.has(p.id)) continue;
      const next = pool.find((c) => !takenColors.has(c));
      if (!next) throw new Error("Ran out of Ludo colors");
      colorOf.set(p.id, next);
      takenColors.add(next);
    }
    for (const pid of order) {
      const color = colorOf.get(pid)!;
      tokens.set(
        pid,
        Array.from({ length: TOKENS_PER_PLAYER }, (_, k) => ({
          id: `${color}-${k}`,
          color,
          state: "yard" as const,
        }))
      );
    }
    this.s = {
      phase: "playing",
      turnIndex: 0,
      turnPhase: "rolling",
      diceValue: null,
      consecutiveSixes: 0,
      movableTokenIds: [],
      tokens,
      colorOf,
      playerOrder: order,
      finishedCount: new Map(order.map((p) => [p, 0])),
      winnerId: null,
      hasCaptured: new Map(order.map((p) => [p, false])),
      lastEvent: null,
      rollCount: new Map(order.map((p) => [p, 0])),
      captureCount: new Map(order.map((p) => [p, 0])),
      sixCount: new Map(order.map((p) => [p, 0])),
      biggestStreak: new Map(order.map((p) => [p, 0])),
      startedAt: Date.now(),
      endedAt: null,
      turnDeadline: null,
      options: this.pendingOptions ?? { ...DEFAULT_LUDO_OPTIONS },
    };
    this.pendingOptions = null;
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.s.phase === "finished") return { ok: false, error: "Game is over" };
    const turnPid = this.s.playerOrder[this.s.turnIndex];
    if (move.playerId !== turnPid) return { ok: false, error: "Not your turn" };

    switch (move.type) {
      case "roll":
        return this.handleRoll();
      case "move":
        return this.handleMove(move);
      default:
        return { ok: false, error: `Unknown move type: ${move.type}` };
    }
  }

  private handleRoll(): MoveResult {
    if (this.s.turnPhase !== "rolling") {
      return { ok: false, error: "Cannot roll right now" };
    }
    const roll = 1 + Math.floor(this.rng() * 6);
    this.s.diceValue = roll;
    const pid = this.currentPid();
    this.s.rollCount.set(pid, (this.s.rollCount.get(pid) ?? 0) + 1);
    if (roll === 6) {
      this.s.sixCount.set(pid, (this.s.sixCount.get(pid) ?? 0) + 1);
    }

    if (roll === 6) {
      this.s.consecutiveSixes += 1;
      const prevStreak = this.s.biggestStreak.get(pid) ?? 0;
      if (this.s.consecutiveSixes > prevStreak) {
        this.s.biggestStreak.set(pid, this.s.consecutiveSixes);
      }
      if (this.s.consecutiveSixes >= 3) {
        // Three consecutive sixes: forfeit turn
        this.s.lastEvent = { kind: "forfeit", byPlayerId: this.currentPid(), ts: Date.now() };
        this.advanceTurn();
        return { ok: true };
      }
    } else {
      this.s.consecutiveSixes = 0;
    }

    const movable = this.computeMovableTokens(this.currentPid(), roll);
    this.s.movableTokenIds = movable.map((t) => t.id);

    if (movable.length === 0) {
      this.s.lastEvent = { kind: "noMove", byPlayerId: this.currentPid(), ts: Date.now() };
      this.advanceTurn();
      return { ok: true };
    }

    this.s.turnPhase = "moving";

    // Auto-move when there's only one possible token to move — no point
    // forcing a "pick a token" click when there's only one option. Real
    // Ludo players do this at the table without thinking; the UI used to
    // demand a click here, which felt clumsy especially when a player has
    // exactly one piece in play.
    if (movable.length === 1) {
      const onlyToken = movable[0];
      return this.handleMove({
        playerId: this.currentPid(),
        type: "move",
        data: { tokenId: onlyToken.id },
      } as MoveContext);
    }

    return { ok: true };
  }

  private handleMove(move: MoveContext): MoveResult {
    if (this.s.turnPhase !== "moving" || this.s.diceValue == null) {
      return { ok: false, error: "Roll the dice first" };
    }
    const data = move.data as { tokenId?: string } | undefined;
    const tokenId = data?.tokenId;
    if (!tokenId) return { ok: false, error: "Missing tokenId" };
    if (!this.s.movableTokenIds.includes(tokenId)) {
      return { ok: false, error: "That token cannot move with this roll" };
    }
    const pid = this.currentPid();
    const token = this.findToken(pid, tokenId);
    if (!token) return { ok: false, error: "Token not found" };

    // Reference identity, NOT a `ts` comparison: two moves resolved within
    // the same millisecond (routine under fast bots/tests, possible in real
    // play) would otherwise read as "no new event fired" and clobber a real
    // capture/home event below with a generic "move" one - silently eating
    // the bonus-turn grant that's keyed off lastEvent.kind.
    const eventBefore = this.s.lastEvent;
    const stateBeforeCapture = token.state;
    this.executeMove(pid, token, this.s.diceValue);
    const eventAfter = this.s.lastEvent;

    // If executeMove didn't already fire a capture/home event, emit a generic move event
    // so the client can show an "end-of-turn summary" toast for plain moves too.
    if (eventAfter === eventBefore) {
      this.s.lastEvent = {
        kind: "move",
        byPlayerId: pid,
        tokenId: token.id,
        ts: Date.now(),
        cellsMoved: this.s.diceValue,
        capturedCount: 0,
        destinationState: token.state as "track" | "stretch" | "home" | "yard",
      };
    } else if (this.s.lastEvent) {
      // Enrich existing event (capture or home) with move details
      this.s.lastEvent.cellsMoved = stateBeforeCapture === "yard" ? 1 : this.s.diceValue;
      if (this.s.lastEvent.capturedCount == null) {
        this.s.lastEvent.capturedCount = this.s.lastEvent.kind === "capture" ? 1 : 0;
      }
      this.s.lastEvent.destinationState = token.state as "track" | "stretch" | "home" | "yard";
    }

    // Check win
    if ((this.s.finishedCount.get(pid) ?? 0) === TOKENS_PER_PLAYER) {
      this.s.phase = "finished";
      this.s.winnerId = pid;
      this.s.endedAt = Date.now();
      this.s.lastEvent = { kind: "win", byPlayerId: pid, ts: Date.now() };
      return { ok: true, isOver: true, winnerId: pid };
    }

    // Bonus turn rules: rolling a 6, capturing an opponent's token, or
    // getting a token all the way home all grant another roll - matches
    // the house rule players expect beyond the dice-only "roll a 6" case.
    const rolledSix = this.s.diceValue === 6;
    const bonusFromEvent = this.s.lastEvent?.kind === "capture" || this.s.lastEvent?.kind === "home";
    // NOTE: deliberately NOT clearing diceValue here. The whole turn (roll →
    // move) can resolve in one applyMove call when there's only one movable
    // token; if we clear the value before the broadcast, the client never
    // sees the rolled number. We leave the value visible until the next
    // handleRoll overwrites it.
    this.s.movableTokenIds = [];
    if (rolledSix || bonusFromEvent) {
      this.s.turnPhase = "rolling";
    } else {
      this.advanceTurn();
    }
    return { ok: true };
  }

  private computeMovableTokens(pid: string, dice: number): LudoToken[] {
    const list = this.s.tokens.get(pid) ?? [];
    const out: LudoToken[] = [];
    for (const t of list) {
      if (t.state === "home") continue;
      if (t.state === "yard") {
        if (dice === 6) out.push(t);
        continue;
      }
      // track or stretch: must fit
      if (this.simulateMove(pid, t, dice) !== null) out.push(t);
    }
    return out;
  }

  /** Player count used to scale the track. */
  private playerCount(): number {
    return this.s.playerOrder.length;
  }
  private trackLen(): number {
    return trackLengthFor(this.playerCount());
  }
  private startFor(color: LudoColor): number {
    return colorStartFor(color, this.playerCount());
  }
  private safeSquares(): Set<number> {
    const colors = this.s.playerOrder.map((pid) => this.s.colorOf.get(pid)!);
    return safeSquaresFor(colors, this.playerCount());
  }

  /** Returns the post-move "destination state" without applying it, or null if illegal. */
  private simulateMove(
    pid: string,
    token: LudoToken,
    dice: number,
  ): { state: "track" | "stretch" | "home"; trackPos?: number; stretchPos?: number } | null {
    const color = this.s.colorOf.get(pid)!;
    const TL = this.trackLen();
    if (token.state === "yard") {
      if (dice !== 6) return null;
      return { state: "track", trackPos: this.startFor(color) };
    }
    if (token.state === "stretch") {
      const next = (token.stretchPos ?? 0) + dice;
      if (next > STRETCH_LENGTH) return null;
      if (next === STRETCH_LENGTH) return { state: "home" };
      return { state: "stretch", stretchPos: next };
    }
    // track
    const last = lastTrackPosFor(color, this.playerCount());
    const cur = token.trackPos ?? 0;
    const distToLast = (last - cur + TL) % TL;
    if (dice <= distToLast) {
      return { state: "track", trackPos: (cur + dice) % TL };
    }
    if (this.s.options.mandatoryCapture && !this.s.hasCaptured.get(pid)) {
      return { state: "track", trackPos: (cur + dice) % TL };
    }
    const intoStretch = dice - distToLast;
    if (intoStretch > STRETCH_LENGTH) return null;
    if (intoStretch === STRETCH_LENGTH) return { state: "home" };
    return { state: "stretch", stretchPos: intoStretch - 1 };
  }

  private executeMove(pid: string, token: LudoToken, dice: number): void {
    const dest = this.simulateMove(pid, token, dice);
    if (!dest) return;
    token.state = dest.state;
    token.trackPos = dest.trackPos;
    token.stretchPos = dest.stretchPos;
    if (dest.state === "home") {
      this.s.finishedCount.set(pid, (this.s.finishedCount.get(pid) ?? 0) + 1);
      this.s.lastEvent = { kind: "home", byPlayerId: pid, tokenId: token.id, ts: Date.now() };
    }
    // Capture logic: only when landing on a track square that isn't safe.
    // In "no safe squares" mode, only color start squares retain protection.
    const isSafe =
      this.s.options.noSafeSquares
        ? this.s.playerOrder.some((p) => this.startFor(this.s.colorOf.get(p)!) === (dest.trackPos ?? -1))
        : dest.trackPos != null && this.safeSquares().has(dest.trackPos);
    if (dest.state === "track" && dest.trackPos != null && !isSafe) {
      let capturedAny = false;
      let firstVictim: { pid: string; tokenId: string } | null = null;
      for (const [otherPid, list] of this.s.tokens.entries()) {
        if (otherPid === pid) continue;
        for (const ot of list) {
          if (ot.state === "track" && ot.trackPos === dest.trackPos) {
            ot.state = "yard";
            delete ot.trackPos;
            capturedAny = true;
            if (!firstVictim) firstVictim = { pid: otherPid, tokenId: ot.id };
          }
        }
      }
      if (capturedAny) {
        this.s.hasCaptured.set(pid, true);
        this.s.captureCount.set(pid, (this.s.captureCount.get(pid) ?? 0) + 1);
        this.s.lastEvent = {
          kind: "capture",
          byPlayerId: pid,
          victimPlayerId: firstVictim?.pid,
          tokenId: firstVictim?.tokenId,
          ts: Date.now(),
        };
      }
    }
  }

  private currentPid(): string {
    return this.s.playerOrder[this.s.turnIndex];
  }

  private findToken(pid: string, tokenId: string): LudoToken | null {
    return this.s.tokens.get(pid)?.find((t) => t.id === tokenId) ?? null;
  }

  private advanceTurn(): void {
    // Keep diceValue alive so the player who just rolled can actually see
    // their number — especially relevant when all tokens are still in the
    // yard and a non-6 roll forces an immediate turn pass. The next
    // handleRoll naturally overwrites the value.
    this.s.movableTokenIds = [];
    this.s.consecutiveSixes = 0;
    this.s.turnPhase = "rolling";
    const order = this.s.playerOrder;
    for (let step = 1; step <= order.length; step++) {
      const idx = (this.s.turnIndex + step) % order.length;
      if (this.s.tokens.has(order[idx])) {
        this.s.turnIndex = idx;
        return;
      }
    }
  }

  getPublicState(): LudoState {
    const tokens: Record<string, LudoToken[]> = {};
    const playerColors: Record<string, LudoColor> = {};
    const finishedCount: Record<string, number> = {};
    const hasCaptured: Record<string, boolean> = {};
    const rollCount: Record<string, number> = {};
    const captureCount: Record<string, number> = {};
    const sixCount: Record<string, number> = {};
    const biggestStreak: Record<string, number> = {};
    for (const pid of this.s.playerOrder) {
      tokens[pid] = (this.s.tokens.get(pid) ?? []).map((t) => ({ ...t }));
      const c = this.s.colorOf.get(pid);
      if (c) playerColors[pid] = c;
      finishedCount[pid] = this.s.finishedCount.get(pid) ?? 0;
      hasCaptured[pid] = this.s.hasCaptured.get(pid) ?? false;
      rollCount[pid] = this.s.rollCount.get(pid) ?? 0;
      captureCount[pid] = this.s.captureCount.get(pid) ?? 0;
      sixCount[pid] = this.s.sixCount.get(pid) ?? 0;
      biggestStreak[pid] = this.s.biggestStreak.get(pid) ?? 0;
    }
    return {
      kind: "ludo",
      phase: this.s.phase,
      turnPlayerId: this.s.playerOrder[this.s.turnIndex],
      turnPhase: this.s.turnPhase,
      diceValue: this.s.diceValue,
      consecutiveSixes: this.s.consecutiveSixes,
      movableTokenIds: [...this.s.movableTokenIds],
      tokens,
      playerColors,
      playerOrder: this.s.playerOrder,
      winnerId: this.s.winnerId,
      finishedCount,
      hasCaptured,
      lastEvent: this.s.lastEvent,
      stats: {
        rollCount,
        captureCount,
        sixCount,
        biggestStreak,
        startedAt: this.s.startedAt,
        endedAt: this.s.endedAt,
      },
      turnDeadline: this.s.turnDeadline,
      options: this.s.options,
    };
  }

  getStateFor(_playerId: string): LudoState {
    return this.getPublicState();
  }

  isOver(): boolean {
    return this.s.phase === "finished";
  }

  /**
   * Heuristic AI move picker — used for auto-skip and disconnected players.
   * Priority: capture an opponent > finish a token > bring a yard token out >
   * advance the most-progressed token furthest.
   */
  pickAiMove(playerId: string): string | null {
    const movable = this.s.movableTokenIds;
    if (movable.length === 0) return null;
    if (movable.length === 1) return movable[0];

    const dice = this.s.diceValue ?? 0;
    const list = this.s.tokens.get(playerId) ?? [];
    const byId = new Map(list.map((t) => [t.id, t]));

    // 1. Capture
    for (const id of movable) {
      const t = byId.get(id);
      if (!t) continue;
      const dest = this.simulateMove(playerId, t, dice);
      if (dest?.state === "track" && dest.trackPos != null) {
        const isSafe = this.s.options.noSafeSquares
          ? this.s.playerOrder.some((p) => this.startFor(this.s.colorOf.get(p)!) === dest.trackPos)
          : this.safeSquares().has(dest.trackPos);
        if (!isSafe) {
          for (const [opid, olist] of this.s.tokens.entries()) {
            if (opid === playerId) continue;
            for (const ot of olist) {
              if (ot.state === "track" && ot.trackPos === dest.trackPos) {
                return id;
              }
            }
          }
        }
      }
    }
    // 2. Reach home
    for (const id of movable) {
      const t = byId.get(id);
      if (!t) continue;
      const dest = this.simulateMove(playerId, t, dice);
      if (dest?.state === "home") return id;
    }
    // 3. Bring a yard token out (only when rolling 6 so a yard token is even movable)
    if (dice === 6) {
      for (const id of movable) {
        const t = byId.get(id);
        if (t?.state === "yard") return id;
      }
    }
    // 4. Advance the most-progressed token
    let best = movable[0];
    let bestScore = -1;
    for (const id of movable) {
      const t = byId.get(id);
      if (!t) continue;
      let score = 0;
      if (t.state === "track") score = 100 + (t.trackPos ?? 0);
      if (t.state === "stretch") score = 1000 + (t.stretchPos ?? 0);
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return best;
  }

  removePlayer(playerId: string): void {
    if (!this.s.tokens.has(playerId)) return;
    this.s.tokens.delete(playerId);
    const remaining = [...this.s.tokens.keys()];
    if (remaining.length < 2 && this.s.phase === "playing") {
      this.s.phase = "finished";
      this.s.winnerId = remaining[0] ?? null;
    } else if (this.currentPid() === playerId) {
      this.advanceTurn();
    }
  }

  /* ── Bot support ── */

  pendingActors(): string[] {
    if (this.s.phase !== "playing") return [];
    return [this.currentPid()];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.s.phase !== "playing") return { ok: false, error: "Not playing" };
    if (playerId !== this.currentPid()) return { ok: false, error: "Not your turn" };

    if (this.s.turnPhase === "rolling") {
      return this.applyMove({ playerId, type: "roll" });
    }
    if (this.s.turnPhase === "moving") {
      const tokenId = this.pickBestMovableToken(playerId);
      if (!tokenId) return { ok: false, error: "No movable token" };
      return this.applyMove({ playerId, type: "move", data: { tokenId } });
    }
    return { ok: false, error: "Nothing to do" };
  }

  /**
   * Bot heuristic for choosing which movable token to advance. The previous
   * version was three signals (finish / capture / further along) and lost a
   * lot of fights by walking into capture range, never releasing yard
   * tokens, and breaking up stacks. This pass adds danger awareness,
   * stacking, escape, and yard-release urgency so bots actually contest.
   *
   * Scoring (per candidate destination):
   *   +1500  reaches home
   *   +600   per opponent token captured at the destination
   *   +90    destination is a safe square (bunker)
   *   −180   per opponent threat within 1–6 squares behind the dest
   *          (an opponent token that could land here on their next roll)
   *   +80    we'd be escaping a square that's currently under threat
   *   +70    destination already has one of our own tokens (forms a stack)
   *   +60    releasing a yard token on a 6, scaled by yard-token urgency
   *          (more tokens left in yard → bigger incentive to release now)
   *   +small progress bonuses (stretch > track > yard)
   *
   * Ties default to the first movable id.
   */
  private pickBestMovableToken(pid: string): string | null {
    const movable = this.s.movableTokenIds;
    if (movable.length === 0) return null;
    const dice = this.s.diceValue ?? 0;
    const list = this.s.tokens.get(pid) ?? [];
    const safeSet = this.safeSquares();
    const tokensInYard = list.filter((t) => t.state === "yard").length;

    let best: { id: string; score: number } | null = null;
    for (const id of movable) {
      const token = list.find((t) => t.id === id);
      if (!token) continue;
      const dest = this.simulateMove(pid, token, dice);
      if (!dest) continue;
      let score = 0;

      // -- Hard outcomes --
      if (dest.state === "home") score += 1500;

      // Capture count (only on unsafe track squares).
      let captures = 0;
      if (
        dest.state === "track" &&
        dest.trackPos != null &&
        !safeSet.has(dest.trackPos)
      ) {
        for (const [otherPid, otherList] of this.s.tokens.entries()) {
          if (otherPid === pid) continue;
          for (const ot of otherList) {
            if (ot.state === "track" && ot.trackPos === dest.trackPos) {
              captures += 1;
            }
          }
        }
      }
      score += captures * 600;

      // -- Safety / danger / escape --
      if (dest.state === "track" && dest.trackPos != null) {
        if (safeSet.has(dest.trackPos)) {
          score += 90;
        } else {
          const threats = this.countThreatsAt(pid, dest.trackPos);
          if (threats > 0) score -= threats * 180;
        }

        // Stack with own existing token on the same square — captures need
        // to match all tokens on the square, which (in practice) makes
        // stacks a strong defensive shape.
        for (const myT of list) {
          if (myT.id === token.id) continue;
          if (myT.state === "track" && myT.trackPos === dest.trackPos) {
            score += 70;
            break;
          }
        }
      }
      // Escape bonus — leaving a square currently under threat.
      if (
        token.state === "track" &&
        token.trackPos != null &&
        !safeSet.has(token.trackPos)
      ) {
        const currentThreats = this.countThreatsAt(pid, token.trackPos);
        if (currentThreats > 0) score += 80 + currentThreats * 20;
      }

      // -- Yard release on a 6 --
      // Scaled by how many tokens are still parked. Early game (4 in yard)
      // the bonus is huge; once most pieces are out, releasing is less
      // urgent than progressing the leaders.
      if (token.state === "yard" && dice === 6 && dest.state === "track") {
        score += 60 + Math.max(0, tokensInYard - 1) * 30;
      }

      // -- Progress (small, breaks ties between equally-safe options) --
      if (dest.state === "stretch") {
        score += 40 + (dest.stretchPos ?? 0) * 5;
      } else if (dest.state === "track") {
        score += 8;
      }
      // Carry-forward preference: further-along tokens get a tiny edge so
      // we don't oscillate between equally-good candidates.
      if (token.state === "track") score += (token.trackPos ?? 0) * 0.1;
      else if (token.state === "stretch") score += 5 + (token.stretchPos ?? 0);

      if (!best || score > best.score) best = { id, score };
    }
    return best?.id ?? movable[0];
  }

  /**
   * Count opponent track tokens that could capture `dest` on their next
   * roll — i.e. those sitting 1..6 squares behind on the shared loop.
   * We don't account for opponents who'd actually turn into their own
   * stretch before reaching `dest`; that conservatively over-estimates
   * threats, which biases the bot toward safer play. Fine.
   */
  private countThreatsAt(myPid: string, dest: number): number {
    const TL = this.trackLen();
    let threats = 0;
    for (const [otherPid, list] of this.s.tokens.entries()) {
      if (otherPid === myPid) continue;
      for (const ot of list) {
        if (ot.state !== "track" || ot.trackPos == null) continue;
        const dist = (dest - ot.trackPos + TL) % TL;
        if (dist >= 1 && dist <= 6) threats += 1;
      }
    }
    return threats;
  }
}
