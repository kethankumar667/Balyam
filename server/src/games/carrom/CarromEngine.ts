import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  CarromColor,
  CarromOptions,
  CarromPiece,
  CarromPublicState,
  CarromSeat,
  Player,
} from "@shared/types.js";
import { CARROM_BOARD, DEFAULT_CARROM_OPTIONS } from "@shared/types.js";
import { allAtRest, launchVelocity, radiusOf, step } from "./physics.js";

/**
 * Carrom.
 *
 * The first game here that is turn-based AND continuous: a player aims at
 * leisure, then the strike plays out over several seconds that every client
 * must see identically. It is built on the real-time contract from ADR-007 —
 * `tickRateHz` + `simulateTick()` — so the server owns the clock and the
 * client only sends a shot and renders the result.
 *
 * Phase machine:
 *   aiming    → player positions the striker and shoots
 *   resolving → simulateTick integrates until everything stops
 *   (resolve the shot: score it, decide who is next) → aiming
 *
 * Rules implemented (standard two-player carrom, simplified where noted):
 *   • Each player owns white or black. Pot your own colour for a point and
 *     shoot again.
 *   • The queen (red) must be *covered* — followed by one of your own coins
 *     on the same or the next shot — or she returns to the centre.
 *   • Potting the striker is a foul: one point off and one of your potted
 *     coins goes back to the board.
 *   • First to clear their colour (queen settled) wins the board.
 */

const TICK_HZ = 60;
const DT = 1 / TICK_HZ;
/** A strike that somehow never settles must not spin forever. */
const MAX_RESOLVE_TICKS = TICK_HZ * 12;

export class CarromEngine implements GameEngine {
  readonly kind = "carrom" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 2;
  readonly tickRateHz = TICK_HZ;

  private opts: CarromOptions = { ...DEFAULT_CARROM_OPTIONS };
  private pendingOptions: CarromOptions | null = null;

  private seats: CarromSeat[] = [];
  private pieces: CarromPiece[] = [];
  private turnIndex = 0;
  private phase: "aiming" | "resolving" | "finished" = "aiming";
  private strikerPos = 0.5;
  private queenPendingFor: string | null = null;
  private lastShot: string | null = null;
  private lastCombo: string | null = null;
  private resolveTicks = 0;
  private pottedThisShot: CarromPiece[] = [];
  private turnDeadline: number | null = null;
  private winnerId: string | null = null;
  private nextId = 0;

  private rng: () => number = Math.random;

  setRng(fn: () => number): void {
    this.rng = fn;
  }

  setOptions(opts: Partial<CarromOptions>): void {
    this.pendingOptions = { ...DEFAULT_CARROM_OPTIONS, ...opts };
  }

  private id(prefix: string): string {
    return `${prefix}${++this.nextId}`;
  }

  init(players: Player[]): void {
    this.opts = this.pendingOptions ?? { ...DEFAULT_CARROM_OPTIONS };
    this.seats = players.slice(0, 2).map((p, i) => ({
      playerId: p.id,
      color: (i === 0 ? "white" : "black") as CarromColor,
      score: 0,
      remaining: 9,
    }));
    this.turnIndex = 0;
    this.phase = "aiming";
    this.strikerPos = 0.5;
    this.queenPendingFor = null;
    this.lastShot = null;
    this.winnerId = null;
    this.resolveTicks = 0;
    this.pottedThisShot = [];
    this.layoutBoard();
  }

  /** Standard opening: queen centred, coins in alternating rings around her. */
  private layoutBoard(): void {
    const c = CARROM_BOARD.size / 2;
    const r = CARROM_BOARD.coinRadius;
    this.pieces = [
      { id: this.id("q"), kind: "queen", x: c, y: c, vx: 0, vy: 0, pocketed: false },
    ];
    // Two concentric rings of 6 and 12, alternating colours — 9 of each.
    const rings: { count: number; radius: number }[] = [
      { count: 6, radius: r * 2.1 },
      { count: 12, radius: r * 4.2 },
    ];
    let flip = 0;
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        const a = (i / ring.count) * Math.PI * 2;
        const kind: CarromColor = flip++ % 2 === 0 ? "white" : "black";
        this.pieces.push({
          id: this.id("c"),
          kind,
          x: c + Math.cos(a) * ring.radius,
          y: c + Math.sin(a) * ring.radius,
          vx: 0,
          vy: 0,
          pocketed: false,
        });
      }
    }
    this.placeStriker();
  }

  private placeStriker(): void {
    const existing = this.pieces.find((p) => p.kind === "striker");
    const { size, baseline, cushion } = CARROM_BOARD;
    // Player 0 shoots from the bottom edge, player 1 from the top.
    const y = this.turnIndex === 0 ? size - baseline : baseline;
    const span = size - cushion * 2 - CARROM_BOARD.strikerRadius * 2;
    const x = cushion + CARROM_BOARD.strikerRadius + this.strikerPos * span;
    if (existing) {
      Object.assign(existing, { x, y, vx: 0, vy: 0, pocketed: false });
      return;
    }
    this.pieces.push({ id: this.id("s"), kind: "striker", x, y, vx: 0, vy: 0, pocketed: false });
  }

  private get currentSeat(): CarromSeat | undefined {
    return this.seats[this.turnIndex];
  }

  /* ────────────────────────────── input ────────────────────────────── */

  applyMove(move: MoveContext): MoveResult {
    if (move.type === "setOptions") {
      const optData = (move.data as Partial<CarromOptions>) ?? {};
      if (optData.strikerSkin) this.opts.strikerSkin = optData.strikerSkin;
      if (optData.boardSkin) this.opts.boardSkin = optData.boardSkin;
      return { ok: true };
    }

    if (this.phase === "finished") return { ok: false, error: "Game over" };
    const seat = this.currentSeat;
    if (!seat || move.playerId !== seat.playerId) return { ok: false, error: "Not your turn" };
    // Input during resolution is the classic double-shot exploit: the strike
    // is still playing out, so a second shot would launch from a board state
    // nobody has seen yet.
    if (this.phase !== "aiming") return { ok: false, error: "Shot in progress" };

    if (move.type === "place") {
      const { pos } = (move.data as { pos?: number }) ?? {};
      if (typeof pos !== "number" || !Number.isFinite(pos)) {
        return { ok: false, error: "Bad striker position" };
      }
      this.strikerPos = Math.max(0, Math.min(1, pos));
      this.placeStriker();
      return { ok: true };
    }

    if (move.type === "shoot") {
      const { angle, power } = (move.data as { angle?: number; power?: number }) ?? {};
      if (typeof angle !== "number" || !Number.isFinite(angle)) {
        return { ok: false, error: "Bad angle" };
      }
      if (typeof power !== "number" || !Number.isFinite(power) || power <= 0) {
        return { ok: false, error: "Bad power" };
      }
      const striker = this.pieces.find((p) => p.kind === "striker");
      if (!striker) return { ok: false, error: "No striker" };

      // Power is clamped in launchVelocity — a client asking for 10^9 gets
      // exactly the same shot as one asking for 1.
      const { vx, vy } = launchVelocity(angle, power);
      striker.vx = vx;
      striker.vy = vy;
      striker.pocketed = false;
      this.phase = "resolving";
      this.resolveTicks = 0;
      this.pottedThisShot = [];
      this.turnDeadline = null;
      return { ok: true };
    }

    return { ok: false, error: `Unknown move: ${move.type}` };
  }

  /* ────────────────────────────── simulation ───────────────────────── */

  simulateTick(): MoveResult {
    if (this.phase !== "resolving") {
      return { ok: true, isOver: this.phase === "finished", winnerId: this.winnerId };
    }
    this.resolveTicks++;
    const potted = step(this.pieces, DT);
    this.pottedThisShot.push(...potted);

    // Settled, or the safety valve tripped — either way the shot is over.
    if (allAtRest(this.pieces) || this.resolveTicks >= MAX_RESOLVE_TICKS) {
      this.resolveShot();
      return { ok: true, isOver: this.isOver(), winnerId: this.winnerId, turnPhaseChanged: true };
    }
    return { ok: true, isOver: this.isOver(), winnerId: this.winnerId };
  }

  private resolveShot(): void {
    const seat = this.currentSeat;
    if (!seat) return;

    const potted = this.pottedThisShot;
    const strikerPotted = potted.some((p) => p.kind === "striker");
    const own = potted.filter((p) => p.kind === seat.color);
    const opponentSeat = this.seats[(this.turnIndex + 1) % this.seats.length];
    const opponentPotted = potted.filter((p) => p.kind === opponentSeat?.color);
    const queenPotted = potted.some((p) => p.kind === "queen");

    const notes: string[] = [];
    let keepTurn = false;

    if (queenPotted) {
      // The queen is only banked once covered by one of your own coins.
      if (own.length > 0) {
        seat.score += 3;
        this.queenPendingFor = null;
        notes.push("queen covered (+3)");
      } else {
        // Potting the queen earns the covering stroke. Without this the turn
        // passes immediately and the player can never satisfy the cover — the
        // queen would return every single time, making her unwinnable.
        this.queenPendingFor = seat.playerId;
        keepTurn = true;
        notes.push("queen potted — cover her next shot");
      }
    } else if (this.queenPendingFor === seat.playerId) {
      if (own.length > 0) {
        seat.score += 3;
        this.queenPendingFor = null;
        notes.push("queen covered (+3)");
      } else {
        this.returnQueen();
        this.queenPendingFor = null;
        notes.push("queen returned — not covered");
      }
    }

    if (own.length > 0) {
      seat.score += own.length;
      seat.remaining = Math.max(0, seat.remaining - own.length);
      keepTurn = true;
      notes.push(`${own.length} own coin${own.length === 1 ? "" : "s"} (+${own.length})`);
    }

    if (opponentPotted.length > 0 && opponentSeat) {
      // Their coin goes to them, and it does not earn you another shot.
      opponentSeat.score += opponentPotted.length;
      opponentSeat.remaining = Math.max(0, opponentSeat.remaining - opponentPotted.length);
      notes.push(`${opponentPotted.length} to ${opponentSeat.color}`);
    }

    if (strikerPotted) {
      // Foul: a point back, one coin back on the table, and the turn passes.
      seat.score = Math.max(0, seat.score - 1);
      this.returnOneCoin(seat);
      keepTurn = false;
      notes.push("striker potted (-1)");
    }

    if (potted.length === 0) notes.push("no pot");

    this.lastShot = notes.join(", ");
    this.pottedThisShot = [];

    if (seat.remaining === 0 && this.queenPendingFor === null) {
      this.phase = "finished";
      this.winnerId = seat.playerId;
      return;
    }
    if (seat.score >= this.opts.targetScore) {
      this.phase = "finished";
      this.winnerId = seat.playerId;
      return;
    }

    if (!keepTurn) this.turnIndex = (this.turnIndex + 1) % this.seats.length;
    this.phase = "aiming";
    this.strikerPos = 0.5;
    this.placeStriker();
  }

  /** Put the queen back on the centre spot, nudged clear if it is occupied. */
  private returnQueen(): void {
    const queen = this.pieces.find((p) => p.kind === "queen");
    if (!queen) return;
    const c = CARROM_BOARD.size / 2;
    queen.pocketed = false;
    queen.vx = 0;
    queen.vy = 0;
    const spot = this.freeSpotNear(c, c, radiusOf(queen), queen.id);
    queen.x = spot.x;
    queen.y = spot.y;
  }

  /** Foul penalty: one of the fouling player's potted coins returns. */
  private returnOneCoin(seat: CarromSeat): void {
    const coin = this.pieces.find((p) => p.kind === seat.color && p.pocketed);
    if (!coin) return;
    const c = CARROM_BOARD.size / 2;
    coin.pocketed = false;
    coin.vx = 0;
    coin.vy = 0;
    const spot = this.freeSpotNear(c, c, radiusOf(coin), coin.id);
    coin.x = spot.x;
    coin.y = spot.y;
    seat.remaining += 1;
  }

  /**
   * Nearest free spot to (x, y) that does not overlap a piece on the board.
   * Returning a coin onto an occupied square would leave two pieces
   * interpenetrating, and the collision solver would fling them apart on the
   * next strike.
   */
  private freeSpotNear(x: number, y: number, r: number, ignoreId: string): { x: number; y: number } {
    const occupied = this.pieces.filter((p) => !p.pocketed && p.id !== ignoreId);
    const clear = (px: number, py: number) =>
      occupied.every((o) => Math.hypot(o.x - px, o.y - py) >= r + radiusOf(o) + 0.1);
    if (clear(x, y)) return { x, y };
    for (let ring = 1; ring <= 12; ring++) {
      const radius = ring * r * 1.2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + this.rng() * 0.2;
        const px = x + Math.cos(a) * radius;
        const py = y + Math.sin(a) * radius;
        const lo = CARROM_BOARD.cushion + r;
        const hi = CARROM_BOARD.size - CARROM_BOARD.cushion - r;
        if (px < lo || px > hi || py < lo || py > hi) continue;
        if (clear(px, py)) return { x: px, y: py };
      }
    }
    return { x, y };
  }

  /* ────────────────────────────── state ────────────────────────────── */

  setTurnDeadline(deadline: number): void {
    this.turnDeadline = deadline;
  }

  getPhaseTimerSeconds(): number {
    // Only the aiming phase is on the clock; a strike resolves in its own time.
    return this.phase === "aiming" ? this.opts.shotTimerSeconds : 0;
  }

  getPublicState(): CarromPublicState {
    return {
      kind: "carrom",
      phase: this.phase,
      turnPlayerId: this.phase === "aiming" ? this.currentSeat?.playerId ?? null : null,
      seats: this.seats.map((s) => ({ ...s })),
      pieces: this.pieces.map((p) => ({ ...p })),
      strikerPos: this.strikerPos,
      queenPendingFor: this.queenPendingFor,
      lastShot: this.lastShot,
      lastCombo: this.lastCombo,
      mode: this.opts.mode ?? "classic",
      strikerSkin: this.opts.strikerSkin ?? "pearl",
      boardSkin: this.opts.boardSkin ?? "birch",
      turnDeadline: this.turnDeadline,
      isOver: this.phase === "finished",
      winnerId: this.winnerId,
    };
  }

  getStateFor(_playerId: string): CarromPublicState {
    // A carrom board is fully visible to both players by nature — there is
    // nothing private to filter.
    return this.getPublicState();
  }

  isOver(): boolean {
    return this.phase === "finished";
  }

  removePlayer(playerId: string): void {
    const idx = this.seats.findIndex((s) => s.playerId === playerId);
    if (idx === -1) return;
    this.seats.splice(idx, 1);
    if (this.seats.length === 1) {
      this.phase = "finished";
      this.winnerId = this.seats[0].playerId;
      return;
    }
    if (this.seats.length === 0) {
      this.phase = "finished";
      this.winnerId = null;
      return;
    }
    this.turnIndex = this.turnIndex % this.seats.length;
  }

  pendingActors(): string[] {
    if (this.phase !== "aiming") return [];
    const seat = this.currentSeat;
    return seat ? [seat.playerId] : [];
  }

  /**
   * Bot / timeout shot. Aims at the nearest coin of the bot's own colour with
   * moderate power — good enough to keep a table moving when someone drops,
   * which is what this exists for.
   */
  applyAutoMove(playerId: string): MoveResult {
    const seat = this.seats.find((s) => s.playerId === playerId);
    let striker = this.pieces.find((p) => p.kind === "striker");
    if (!seat || !striker || this.phase !== "aiming") return { ok: false, error: "Cannot shoot" };

    const targets = this.pieces.filter((p) => !p.pocketed && p.kind === seat.color);
    const target =
      targets.sort(
        (a, b) =>
          Math.hypot(a.x - striker!.x, a.y - striker!.y) - Math.hypot(b.x - striker!.x, b.y - striker!.y),
      )[0] ?? this.pieces.find((p) => !p.pocketed && p.kind === "queen");

    // Align striker position with target X for optimal shot alignment
    if (target) {
      const span = CARROM_BOARD.size - CARROM_BOARD.cushion * 2 - CARROM_BOARD.strikerRadius * 2;
      const targetPos = Math.max(0, Math.min(1, (target.x - CARROM_BOARD.cushion - CARROM_BOARD.strikerRadius) / span));
      this.strikerPos = targetPos;
      this.placeStriker();
      striker = this.pieces.find((p) => p.kind === "striker") ?? striker;
    }

    const angle = target
      ? Math.atan2(target.y - striker.y, target.x - striker.x)
      : this.turnIndex === 0
      ? -Math.PI / 2
      : Math.PI / 2;

    return this.applyMove({
      playerId,
      type: "shoot",
      data: { angle, power: 0.6 + this.rng() * 0.25 },
    });
  }

  armDeadline(): number { return 0; }
  clearDeadline(): void { this.turnDeadline = null; }
  resolveDeadline(): void {
    const seat = this.currentSeat;
    if (seat) this.applyAutoMove(seat.playerId);
  }
}
