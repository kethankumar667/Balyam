import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  BlockBlastMode,
  BlockBlastOptions,
  BlockBlastPlayerPublic,
  BlockBlastPublicState,
  BlockBlastResultRow,
  BlockBlastSelfState,
  Player,
} from "@shared/types.js";
import { BLOCK_TRAY_SIZE, DEFAULT_BLOCKBLAST_OPTIONS } from "@shared/types.js";
import { anyFit, clearLines, emptyGrid, fits, placeInto, scorePlacement } from "./grid.js";
import type { Grid } from "./grid.js";
import { drawTray, toView } from "./pieces.js";
import type { BlockPiece } from "./pieces.js";
import { chooseBotPlacement } from "./bot.js";

interface Seat {
  id: string;
  name: string;
  isBot: boolean;
  isConnected: boolean;
  grid: Grid;
  /** Three slots; a slot goes null when its piece is placed. */
  tray: (BlockPiece | null)[];
  /**
   * Which tray this player is on. The tray CONTENT is a pure function of
   * (seed, drawIndex), so this number is the only thing that has to be
   * tracked per player for everyone to be drawing from the same bag.
   */
  drawIndex: number;
  score: number;
  streak: number;
  bestClear: number;
  linesCleared: number;
  isOut: boolean;
}

/**
 * Block Blast, the hub version.
 *
 * Two modes, both running on this one engine:
 *
 *   solo  — one seat, endless, ends when nothing fits.
 *   race  — every seat draws the IDENTICAL piece sequence from one seed and
 *           plays it at their own pace against a shared clock. Highest score
 *           when the clock runs out.
 *
 * Race is the reason this exists. A block puzzle played alone is a solved
 * product with a studio behind it; the same puzzle dealt identically to your
 * whole room, where the only variable is judgement, is not something you can
 * download.
 *
 * ── On the clock ──────────────────────────────────────────────────────────
 * This engine deliberately does NOT declare `tickRateHz`. It has no
 * simulation to run — nothing moves unless a player places something — and a
 * server loop would broadcast to an idle solo player once a second forever
 * for no gain. The race deadline is one absolute timestamp, armed once by
 * RoomManager and re-derived (never extended) on every re-arm.
 *
 * It also accepts no `tick` move from anybody. Clients here send intent and
 * render what comes back; the clock is not theirs to advance.
 */
export class BlockBlastEngine implements GameEngine {
  readonly kind = "blockblast" as const;
  readonly minPlayers = 1;
  readonly maxPlayers = 8;

  private opts: BlockBlastOptions = { ...DEFAULT_BLOCKBLAST_OPTIONS };
  private pendingOptions: BlockBlastOptions | null = null;

  private seatOrder: string[] = [];
  private seats = new Map<string, Seat>();
  private mode: BlockBlastMode = "solo";
  private seed = 0;
  private deadline: number | null = null;
  private isOverFlag = false;
  private winnerId: string | null = null;
  private result: BlockBlastResultRow[] | null = null;

  private rng: () => number = Math.random;
  private now: () => number = Date.now;

  /** Test seam. Also how a room could ever replay a recorded match. */
  setRng(fn: () => number): void {
    this.rng = fn;
  }

  /** Test seam for the race clock; production leaves this as `Date.now`. */
  setClock(fn: () => number): void {
    this.now = fn;
  }

  setOptions(opts: Partial<BlockBlastOptions>): void {
    this.pendingOptions = { ...DEFAULT_BLOCKBLAST_OPTIONS, ...opts };
  }

  init(players: Player[]): void {
    this.opts = this.pendingOptions ?? { ...DEFAULT_BLOCKBLAST_OPTIONS };
    this.seatOrder = players.map((p) => p.id);

    /**
     * Mode is derived from seat count, never chosen in a menu.
     *
     * A picker that can disagree with how many people are actually in the
     * room is a bug generator, and there is no case where the answer is
     * ambiguous: alone you want endless, together you want the clock.
     */
    this.mode = players.length > 1 ? "race" : "solo";

    // 31 bits: stays a safe integer through JSON and mulberry32's `>>> 0`.
    this.seed = Math.floor(this.rng() * 0x7fffffff) >>> 0;

    this.deadline =
      this.mode === "race"
        ? this.now() + Math.max(30, this.opts.raceSeconds) * 1000
        : null;

    this.isOverFlag = false;
    this.winnerId = null;
    this.result = null;

    this.seats.clear();
    for (const p of players) {
      this.seats.set(p.id, {
        id: p.id,
        name: p.name,
        isBot: !!p.isBot,
        isConnected: true,
        grid: emptyGrid(),
        tray: drawTray(this.seed, 0, BLOCK_TRAY_SIZE),
        drawIndex: 0,
        score: 0,
        streak: 0,
        bestClear: 0,
        linesCleared: 0,
        isOut: false,
      });
    }
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.isOverFlag) return { ok: false, error: "Game is over" };

    // The clock is server-owned. Bounce shipped an engine that ticked itself
    // AND took ticks from clients, and two players ran the game at double
    // speed. Not repeating that here.
    if (move.type === "tick") {
      return { ok: false, error: "Server owns the clock; `tick` is not accepted" };
    }

    if (move.type !== "place") {
      return { ok: false, error: `Unknown move: ${move.type}` };
    }

    // The race may already have run out while this move was in flight.
    if (this.raceExpired()) {
      this.finish();
      return { ok: true, isOver: true, winnerId: this.winnerId };
    }

    const seat = this.seats.get(move.playerId);
    if (!seat) return { ok: false, error: "You are not in this game" };
    if (seat.isOut) return { ok: false, error: "You have no moves left" };

    const data = move.data as { slot?: unknown; r?: unknown; c?: unknown } | undefined;
    const slot = toInt(data?.slot);
    const r = toInt(data?.r);
    const c = toInt(data?.c);
    if (slot == null || r == null || c == null) {
      return { ok: false, error: "Bad placement" };
    }
    if (slot < 0 || slot >= seat.tray.length) {
      return { ok: false, error: "No such tray slot" };
    }

    const piece = seat.tray[slot];
    if (!piece) return { ok: false, error: "That piece is already placed" };

    // Bounds and overlap, checked here and nowhere else that matters. A
    // client-trusted placement is a leaderboard anyone can write to.
    if (!fits(seat.grid, piece, r, c)) {
      return { ok: false, error: "That piece does not fit there" };
    }

    placeInto(seat.grid, piece, r, c);
    seat.tray[slot] = null;

    const clear = clearLines(seat.grid);
    const scored = scorePlacement(piece.cells.length, clear, seat.streak);
    seat.score += scored.gained;
    seat.streak = scored.streak;
    seat.linesCleared += clear.lines;
    seat.bestClear = Math.max(seat.bestClear, clear.lines);

    // The emptying tray is the tension. Refilling early — even by one slot —
    // removes every interesting decision from the last two placements.
    if (seat.tray.every((p) => p == null)) {
      seat.drawIndex += 1;
      seat.tray = drawTray(this.seed, seat.drawIndex, BLOCK_TRAY_SIZE);
    }

    seat.isOut = !this.hasAnyMove(seat);

    if (this.everyoneOut()) {
      this.finish();
      return { ok: true, isOver: true, winnerId: this.winnerId };
    }

    return { ok: true };
  }

  /**
   * The race clock ran out. Called by RoomManager's turn timer, which holds
   * the single `setTimeout` for the match deadline.
   */
  finishOnDeadline(): MoveResult {
    if (this.isOverFlag) return { ok: true, isOver: true, winnerId: this.winnerId };
    if (!this.raceExpired()) return { ok: false, error: "Race is still running" };
    this.finish();
    return { ok: true, isOver: true, winnerId: this.winnerId };
  }

  /** Absolute epoch ms the race ends, or null when there is no clock. */
  getRaceDeadline(): number | null {
    return this.deadline;
  }

  private raceExpired(): boolean {
    return this.deadline != null && this.now() >= this.deadline;
  }

  private hasAnyMove(seat: Seat): boolean {
    return seat.tray.some((p) => p != null && anyFit(seat.grid, p));
  }

  private everyoneOut(): boolean {
    if (this.seatOrder.length === 0) return true;
    return this.seatOrder.every((id) => this.seats.get(id)?.isOut !== false);
  }

  private finish(): void {
    if (this.isOverFlag) return;
    this.isOverFlag = true;

    const rows = this.seatOrder
      .map((id) => this.seats.get(id))
      .filter((s): s is Seat => s != null)
      .map((s) => ({
        playerId: s.id,
        name: s.name,
        score: s.score,
        linesCleared: s.linesCleared,
        bestClear: s.bestClear,
        rank: 0,
      }));

    // Score, then lines, then the bigger single clear. Three tie-breaks deep
    // because a race between two good players genuinely does tie on score.
    rows.sort(
      (a, b) =>
        b.score - a.score || b.linesCleared - a.linesCleared || b.bestClear - a.bestClear,
    );
    rows.forEach((row, i) => {
      row.rank = i > 0 && sameStanding(rows[i - 1], row) ? rows[i - 1].rank : i + 1;
    });

    this.result = rows;

    // Solo has no winner — you are not beating anybody, and declaring the
    // only player the winner of a game they just lost reads as mockery.
    const contested = rows.length > 1 && rows.filter((r) => r.rank === 1).length === 1;
    this.winnerId = contested ? rows[0].playerId : null;
  }

  getStateFor(playerId: string): BlockBlastSelfState {
    const base = this.getPublicState();
    const seat = this.seats.get(playerId);
    if (!seat) {
      return {
        ...base,
        you: { id: playerId, tray: [], playable: [], score: 0, isOut: true },
      };
    }
    return {
      ...base,
      you: {
        id: seat.id,
        tray: seat.tray.map((p) => (p ? toView(p) : null)),
        /**
         * Whether each slot fits anywhere, computed here rather than in the
         * client. The client must not be the authority on what is legal —
         * and greying out a dead piece is the clearest possible warning that
         * the board is about to close.
         */
        playable: seat.tray.map((p) => (p ? anyFit(seat.grid, p) : false)),
        score: seat.score,
        isOut: seat.isOut,
      },
    };
  }

  getPublicState(): BlockBlastPublicState {
    const players: BlockBlastPlayerPublic[] = this.seatOrder
      .map((id) => this.seats.get(id))
      .filter((s): s is Seat => s != null)
      .map((s) => ({
        id: s.id,
        name: s.name,
        score: s.score,
        streak: s.streak,
        bestClear: s.bestClear,
        linesCleared: s.linesCleared,
        isBot: s.isBot,
        isConnected: s.isConnected,
        isOut: s.isOut,
        grid: s.grid.slice(),
      }));

    return {
      kind: "blockblast",
      mode: this.mode,
      seed: this.seed,
      deadline: this.deadline,
      // Paired with `deadline` so the client can draw a countdown that is
      // right even on a phone whose own clock is minutes out.
      serverNow: this.now(),
      players,
      isOver: this.isOverFlag,
      winnerId: this.winnerId,
      result: this.result,
    };
  }

  isOver(): boolean {
    return this.isOverFlag;
  }

  removePlayer(playerId: string): void {
    this.seats.delete(playerId);
    this.seatOrder = this.seatOrder.filter((id) => id !== playerId);
    if (this.seatOrder.length === 0) {
      this.isOverFlag = true;
    }
  }

  setConnected(playerId: string, connected: boolean): void {
    const seat = this.seats.get(playerId);
    if (seat) seat.isConnected = connected;
  }

  /**
   * Everyone still holding a playable tray.
   *
   * This game is simultaneous — there is no turn, so this is a list of
   * "people the room is waiting on", which for a bot means "place something
   * now". RoomManager paces one placement per `getBotThinkDelayMs`, so a bot
   * that stays in this list forever is exactly right rather than a loop.
   */
  pendingActors(): string[] {
    if (this.isOverFlag) return [];
    return this.seatOrder.filter((id) => this.seats.get(id)?.isOut === false);
  }

  applyAutoMove(playerId: string): MoveResult {
    const seat = this.seats.get(playerId);
    if (!seat || seat.isOut || this.isOverFlag) return { ok: false, error: "Nothing to play" };

    const choice = chooseBotPlacement(seat.grid, seat.tray, this.rng);
    if (!choice) {
      // Belt and braces: `isOut` should already be true if nothing fits.
      seat.isOut = true;
      if (this.everyoneOut()) {
        this.finish();
        return { ok: true, isOver: true, winnerId: this.winnerId };
      }
      return { ok: true };
    }

    return this.applyMove({
      playerId,
      type: "place",
      data: { slot: choice.slot, r: choice.r, c: choice.c },
    });
  }

  /**
   * How long a bot looks at the board. Wide, because a constant cadence in a
   * game where you can see the opponent placing is the tell that gives it
   * away instantly.
   */
  getBotThinkDelayMs(): number {
    return 900 + Math.random() * 1400;
  }
}

function sameStanding(a: BlockBlastResultRow, b: BlockBlastResultRow): boolean {
  return (
    a.score === b.score && a.linesCleared === b.linesCleared && a.bestClear === b.bestClear
  );
}

function toInt(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}
