import type {
  LudoColor,
  LudoEvent,
  LudoGameOptions,
  LudoState,
  LudoToken,
  Player,
} from "@shared/types.js";
import { DEFAULT_LUDO_OPTIONS } from "@shared/types.js";
import {
  DICE_ROLL_MS,
  TURN_HANDOFF_MS,
  botThinkMs,
  travelMsFor,
} from "@shared/ludo-pacing.js";
import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import {
  PLAYER_COLORS_ORDER,
  STRETCH_LENGTH,
  colorStartFor,
  lastTrackPosFor,
  safeSquaresFor,
  trackLengthFor,
  wedgeCountFor,
  resolveDestination,
} from "./track.js";

interface Internal {
  phase: "playing" | "finished";
  turnIndex: number;
  turnPhase: "rolling" | "moving" | "done";
  diceValue: number | null;
  consecutiveSixes: number;
  movableTokenIds: string[];
  tokens: Map<string, LudoToken[]>;
  /** Board ARM per player — geometry only (track start, stretch, yard,
   *  token ids). Always one of the board's canonical wedge colors. */
  colorOf: Map<string, LudoColor>;
  /** Display color per player — any of the 8, never touches geometry. */
  paintOf: Map<string, LudoColor>;
  playerOrder: string[];
  finishedCount: Map<string, number>;
  /** Seats that are all-home, in finishing order: 1st, 2nd, 3rd ... */
  finishOrder: string[];
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
  /**
   * How long the client will still be animating what the LAST broadcast
   * contained — dice tumble, token walk, handover beat.
   *
   * The engine is the only place that knows this, because it is the only place
   * that knows a roll and its move collapsed into one broadcast (see the
   * auto-move in `handleRoll`). Accumulated across a single `applyMove` call
   * and consumed by `getBotThinkDelayMs`, so the next seat cannot act on top
   * of the previous seat's animation.
   */
  pendingAnimMs: number;
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

  /**
   * How long a bot "thinks" before each sub-move.
   *
   * Ludo originally did not implement this, so it inherited RoomManager's
   * generic 1200-2000ms fallback — applied PER SUB-MOVE. A Ludo turn is two
   * sub-moves (roll, then move), so every bot turn cost 2.4-4s and a table
   * with three bots left a human waiting 7-12s between their own turns.
   *
   * The fix for that was a flat ~500ms pause, and it overshot in the other
   * direction: a flat pause is shorter than the animation the client is still
   * playing, so the bot's move landed while its own die was still tumbling and
   * the next bot rolled while the previous token was still walking. Whole
   * turns went past with nothing legible in them.
   *
   * So the pause is no longer flat. It is `whatever animation the last
   * broadcast still owes the viewer` plus a short hesitation — which makes the
   * ordering structural rather than a lucky consequence of the constants:
   *
   *   before a MOVE  →  the die is readable first (DICE_ROLL_MS)
   *   before a ROLL  →  the previous token has stopped walking, and the
   *                     handover beat has passed
   */
  getBotThinkDelayMs(): number {
    return botThinkMs(this.s?.pendingAnimMs ?? 0, this.rng);
  }

  /** Price the animation this broadcast just handed the client. Additive
   *  within one `applyMove` so a roll that auto-moves pays for both. */
  private owe(ms: number): void {
    this.s.pendingAnimMs += ms;
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
    /**
     * Two separate things that used to be one field, which is exactly why
     * picking purple in a 3-player room silently turned into blue:
     *
     *   ARM   — which wedge of the board you sit on. The cross board (2-4
     *           players) has four arms and the polygon board has N, and the
     *           track/stretch/yard coordinates are keyed to them. Only the
     *           first `wedgeCountFor(n)` colors are legal here, ever.
     *   PAINT — what color you appear in. Any of the 8, honored exactly as
     *           picked, because it is only ever used to look up a hex.
     *
     * Collapsing them meant a 3-player game could only offer four colors, and
     * any pick outside that pool was dropped without telling anyone. Splitting
     * them lets a 2-player game be purple vs orange on the classic four-arm
     * board.
     *
     * Unpicked seats (bots, and humans who never opened the picker) draw at
     * random rather than taking the next canonical color, so the table is not
     * red/green/yellow/blue in that order every single game. All randomness
     * runs through `this.rng` so tests can pin it.
     */
    const shuffled = (src: LudoColor[]): LudoColor[] => {
      const a = src.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [a[i], a[j]] = [a[j]!, a[i]!];
      }
      return a;
    };

    // ── ARMS (geometry) ──────────────────────────────────────────────────
    // One per player, always from the colors the board actually has
    // coordinates for. Arms are seats, not looks — which arm you get does not
    // affect what color you appear in, so these are simply dealt at random.
    const armPool = PLAYER_COLORS_ORDER.slice(0, wedgeCountFor(players.length));
    const takenArm = new Set<LudoColor>();
    // Prefer the arm matching the pick. On the 5-8 polygon board the sector
    // colour IS the arm, so this keeps those boards honouring a pick exactly
    // as they did before the split; on the cross board it simply means a
    // red/green/yellow/blue pick also gets the matching wedge.
    for (const p of players) {
      const chosen = p.chosenColor as LudoColor | undefined;
      if (chosen && armPool.includes(chosen) && !takenArm.has(chosen)) {
        colorOf.set(p.id, chosen);
        takenArm.add(chosen);
      }
    }
    const armDeck = shuffled(armPool.filter((c) => !takenArm.has(c)));
    for (const p of players) {
      if (colorOf.has(p.id)) continue;
      const arm = armDeck.pop();
      if (!arm) throw new Error("Ran out of Ludo board arms");
      colorOf.set(p.id, arm);
      takenArm.add(arm);
    }

    // ── PAINT (looks) ────────────────────────────────────────────────────
    // Paint DEFAULTS to the arm, and only diverges when a player picked a
    // color the board has no arm for — purple on the four-arm cross board,
    // say. That keeps the two in sync everywhere they have to be:
    //
    //   * On the 5-8 polygon boards every color is an arm, so a pick is
    //     already honored by the arm pass above and paint == arm. Those
    //     boards paint their sectors by arm INDEX, so letting paint wander
    //     free there would put a purple seat card next to an orange token.
    //   * On the cross board a purple pick lands on whichever wedge is free
    //     and that wedge is then drawn purple.
    //
    // No collision is possible: a pick that is IN the arm pool became that
    // player's own arm, and a pick outside it can never be another player's
    // arm-derived paint.
    // The divergence is CROSS-BOARD ONLY. The polygon boards draw each
    // sector from its arm INDEX, so a paint color that is not an arm has
    // nothing to paint with there and would leave a brown seat card beside a
    // blue token. Those boards have an arm for all 8 colors anyway, so the
    // arm pass above already honors every pick they can express.
    const crossBoard = wedgeCountFor(players.length) === 4;
    const paintOf = new Map<string, LudoColor>();
    for (const p of players) {
      const chosen = p.chosenColor as LudoColor | undefined;
      const arm = colorOf.get(p.id)!;
      paintOf.set(p.id, crossBoard && chosen ? chosen : arm);
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
      paintOf,
      playerOrder: order,
      finishedCount: new Map(order.map((p) => [p, 0])),
      finishOrder: [],
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
      pendingAnimMs: 0,
    };
    this.pendingOptions = null;
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.s.phase === "finished") return { ok: false, error: "Game is over" };
    const turnPid = this.s.playerOrder[this.s.turnIndex];
    if (move.playerId !== turnPid) return { ok: false, error: "Not your turn" };

    // One `applyMove` produces exactly one broadcast, so the animation debt
    // starts fresh here and the handlers below add to it. A roll that resolves
    // its own move (single movable token) therefore pays for the dice tumble
    // AND the walk, which is precisely the case that used to flash past.
    this.s.pendingAnimMs = 0;

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
    // Every roll costs the client a dice tumble before anything else it
    // contains is readable.
    this.owe(DICE_ROLL_MS);
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

    // The client walks the piece one cell at a time. Boarding out of the yard
    // is a single pop rather than a walk — same rule `cellsMoved` uses below.
    this.owe(travelMsFor(stateBeforeCapture === "yard" ? 1 : this.s.diceValue));

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

    // A player sending their last token home takes a PLACE; it does not end
    // the game. Real Ludo keeps going so 2nd and 3rd are decided and the last
    // player left is the loser. Ending on the first finisher robbed everyone
    // else of their result.
    if ((this.s.finishedCount.get(pid) ?? 0) === TOKENS_PER_PLAYER) {
      if (!this.s.finishOrder.includes(pid)) this.s.finishOrder.push(pid);
      // `winnerId` stays the FIRST finisher, for every existing consumer.
      if (this.s.winnerId == null) this.s.winnerId = pid;
      this.s.lastEvent = { kind: "win", byPlayerId: pid, ts: Date.now() };

      // Over once everyone but one has placed — the straggler is last.
      if (this.s.finishOrder.length >= this.s.playerOrder.length - 1) {
        this.s.phase = "finished";
        this.s.endedAt = Date.now();
        return { ok: true, isOver: true, winnerId: this.s.winnerId };
      }
      // Otherwise play continues. No bonus turn: this seat has nothing left
      // to move, so hand over rather than fall through to the bonus rules.
      this.advanceTurn();
      return { ok: true };
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
    // The rule itself lives in shared/ludo-rules.ts so the client's hover
    // preview resolves the SAME move. This body used to be duplicated there
    // by hand and had already drifted (the copy ignored `mandatoryCapture`).
    return resolveDestination(token, dice, {
      color: this.s.colorOf.get(pid)!,
      playerCount: this.playerCount(),
      mandatoryCapture: this.s.options.mandatoryCapture,
      hasCaptured: this.s.hasCaptured.get(pid) ?? false,
    });
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
    // A still moment between seats. Without it the next player starts on the
    // same frame the last token stops, and at a table of bots there is never
    // an instant where the board is quiet enough to see the turn change.
    this.owe(TURN_HANDOFF_MS);
    const order = this.s.playerOrder;
    for (let step = 1; step <= order.length; step++) {
      const idx = (this.s.turnIndex + step) % order.length;
      const pid = order[idx];
      // Skip seats that have left (no tokens) AND seats that have already
      // placed — a finished player has four tokens, all home, so without this
      // the table would hand them a dead turn every single lap.
      if (this.s.tokens.has(pid) && !this.s.finishOrder.includes(pid)) {
        this.s.turnIndex = idx;
        return;
      }
    }
  }

  getPublicState(): LudoState {
    const tokens: Record<string, LudoToken[]> = {};
    const playerColors: Record<string, LudoColor> = {};
    const playerArms: Record<string, LudoColor> = {};
    const finishedCount: Record<string, number> = {};
    const hasCaptured: Record<string, boolean> = {};
    const rollCount: Record<string, number> = {};
    const captureCount: Record<string, number> = {};
    const sixCount: Record<string, number> = {};
    const biggestStreak: Record<string, number> = {};
    for (const pid of this.s.playerOrder) {
      tokens[pid] = (this.s.tokens.get(pid) ?? []).map((t) => ({ ...t }));
      const arm = this.s.colorOf.get(pid);
      if (arm) playerArms[pid] = arm;
      // Paint falls back to the arm for states created before the split.
      const paint = this.s.paintOf?.get(pid) ?? arm;
      if (paint) playerColors[pid] = paint;
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
      playerArms,
      playerOrder: this.s.playerOrder,
      winnerId: this.s.winnerId,
      finishOrder: [...this.s.finishOrder],
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

  /**
   * Drop a seat for good — called when a disconnect's 90s grace window expires
   * or a player explicitly leaves.
   *
   * This used to delete only the player's TOKENS and leave them in
   * `playerOrder`. Since `getPublicState` projects every per-player field by
   * iterating `playerOrder`, the departed player stayed a seat forever: the
   * board rendered a card for them, `players.find(...)` missed (they are gone
   * from the roster), so it drew as a nameless "Player" with the turn banner
   * saying "?", and the turn cursor still landed on them every lap — a whole
   * dead beat each time round, since a seat with no tokens can never move.
   */
  removePlayer(playerId: string): void {
    if (!this.s.tokens.has(playerId)) return;
    this.s.tokens.delete(playerId);

    const idx = this.s.playerOrder.indexOf(playerId);
    const wasCurrent = this.currentPid() === playerId;
    if (idx >= 0) {
      this.s.playerOrder.splice(idx, 1);
      // Keep `turnIndex` pointing at the same SEAT it did before the splice.
      // Removing someone earlier in the order shifts everyone after them down.
      if (idx < this.s.turnIndex) this.s.turnIndex -= 1;
      if (this.s.turnIndex >= this.s.playerOrder.length) this.s.turnIndex = 0;
    }
    // Per-player side tables, so nothing orphaned survives into the state.
    this.s.colorOf.delete(playerId);
    this.s.paintOf.delete(playerId);
    this.s.finishedCount.delete(playerId);
    this.s.finishOrder = this.s.finishOrder.filter((id) => id !== playerId);
    this.s.hasCaptured.delete(playerId);
    this.s.rollCount.delete(playerId);
    this.s.captureCount.delete(playerId);
    this.s.sixCount.delete(playerId);
    this.s.biggestStreak.delete(playerId);

    const remaining = this.s.playerOrder;
    if (remaining.length < 2 && this.s.phase === "playing") {
      this.s.phase = "finished";
      this.s.winnerId = remaining[0] ?? null;
      return;
    }
    if (wasCurrent) {
      // The splice already moved the cursor onto the next seat, so start that
      // player's turn cleanly rather than advancing a second time (which would
      // skip them).
      this.s.turnPhase = "rolling";
      this.s.diceValue = null;
      this.s.movableTokenIds = [];
      this.s.consecutiveSixes = 0;
      this.s.turnDeadline = null;
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
