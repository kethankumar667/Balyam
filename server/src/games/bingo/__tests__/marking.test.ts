import { beforeEach, describe, expect, it } from "vitest";
import { BingoEngine } from "../BingoEngine.js";
import { BINGO_MARK_WINDOW_MS } from "@shared/types.js";
import type { Player } from "@shared/types.js";

/**
 * Player-owned marking.
 *
 * `callNumber` used to set `marked` on every board at once, and both
 * `getStateFor` and win evaluation read the shared `calledSet` — so the
 * per-cell flag was decorative and no call ever required a player to do
 * anything. That is what players reported as the game not feeling real.
 *
 * Numbers now go out unmarked and each player claims their own. The rules
 * worth pinning are the ones whose failure is quiet: a board that diverges
 * permanently from what was called, a table held hostage by one phone, or a
 * client able to mark a number that was never called (which would let it
 * fake a winning line, since `claim` validates against the same set).
 */

function players(n: number, opts: { bots?: number } = {}): Player[] {
  const bots = opts.bots ?? 0;
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isBot: i >= n - bots,
    isConnected: true,
  })) as Player[];
}

/** Engine with a clock we control, so windows can be expired deterministically. */
function makeEngine(n = 2, opts: { bots?: number } = {}) {
  const e = new BingoEngine();
  let now = 1_000_000;
  e.setClock(() => now);
  e.init(players(n, opts));
  for (let i = 0; i < n; i++) e.applyMove({ playerId: `p${i}`, type: "lockBoard" });
  return { e, advance: (ms: number) => { now += ms; } };
}

const marksOf = (e: BingoEngine, pid: string) =>
  e.getStateFor(pid) as { myBoard: Array<{ value: number; marked: boolean }> };

const isMarked = (e: BingoEngine, pid: string, num: number) =>
  marksOf(e, pid).myBoard.find((c) => c.value === num)?.marked === true;

describe("a called number is not marked for anyone", () => {
  let ctx: ReturnType<typeof makeEngine>;
  beforeEach(() => {
    ctx = makeEngine(2);
  });

  it("leaves every board unmarked until someone taps", () => {
    ctx.e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    expect(isMarked(ctx.e, "p0", 7)).toBe(false);
    expect(isMarked(ctx.e, "p1", 7)).toBe(false);
  });

  it("marks only the player who tapped", () => {
    ctx.e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    ctx.e.applyMove({ playerId: "p1", type: "markNumber", data: { number: 7 } });
    expect(isMarked(ctx.e, "p1", 7)).toBe(true);
    expect(isMarked(ctx.e, "p0", 7)).toBe(false);
  });

  it("opens a window with a deadline", () => {
    ctx.e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    expect(ctx.e.getPublicState().markDeadline).not.toBeNull();
  });
});

describe("the open number gates the next call", () => {
  it("refuses a new call while players are still marking", () => {
    const { e } = makeEngine(2);
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    const res = e.applyMove({ playerId: "p1", type: "callNumber", data: { number: 8 } });
    // Without this gate the caller races ahead on a 2.5s interval while the
    // mark window is 8s, and boards drift onto different numbers.
    expect(res.ok).toBe(false);
    expect(e.getPublicState().calledNumbers.length).toBe(1);
  });

  it("opens up as soon as everyone has marked", () => {
    const { e } = makeEngine(2);
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    e.applyMove({ playerId: "p0", type: "markNumber", data: { number: 7 } });
    e.applyMove({ playerId: "p1", type: "markNumber", data: { number: 7 } });
    expect(e.getPublicState().markDeadline).toBeNull();
    expect(e.applyMove({ playerId: "p1", type: "callNumber", data: { number: 8 } }).ok).toBe(true);
  });

  it("does not wait the full window when nobody needs it", () => {
    // One human, one bot: the bot resolves on arrival, so the table only
    // ever waits on the human.
    const { e } = makeEngine(2, { bots: 1 });
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    e.applyMove({ playerId: "p0", type: "markNumber", data: { number: 7 } });
    expect(e.getPublicState().markDeadline).toBeNull();
  });
});

describe("nobody is stranded by a missed number", () => {
  it("auto-marks anyone who missed it once the window lapses", () => {
    const { e, advance } = makeEngine(2);
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    expect(isMarked(e, "p1", 7)).toBe(false);

    advance(BINGO_MARK_WINDOW_MS + 1);
    // Settling happens on the next call, which is what unblocks the table.
    e.applyMove({ playerId: "p1", type: "callNumber", data: { number: 8 } });

    // A dropped connection must never cost a player a number permanently —
    // boards converge back to what was called.
    expect(isMarked(e, "p0", 7)).toBe(true);
    expect(isMarked(e, "p1", 7)).toBe(true);
  });

  it("accepts a tap that lands just after the deadline", () => {
    const { e, advance } = makeEngine(2);
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    advance(BINGO_MARK_WINDOW_MS + 1);
    // Latency between the tap leaving the phone and arriving must not be
    // punished, so a late mark still succeeds.
    expect(e.applyMove({ playerId: "p1", type: "markNumber", data: { number: 7 } }).ok).toBe(true);
    expect(isMarked(e, "p1", 7)).toBe(true);
  });

  it("resolves a disconnected seat rather than holding the table", () => {
    const e = new BingoEngine();
    e.init([
      { id: "p0", name: "P0", isBot: false, isConnected: true },
      { id: "p1", name: "P1", isBot: false, isConnected: false },
    ] as Player[]);
    e.applyMove({ playerId: "p0", type: "lockBoard" });
    e.applyMove({ playerId: "p1", type: "lockBoard" });
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    e.applyMove({ playerId: "p0", type: "markNumber", data: { number: 7 } });
    expect(e.getPublicState().markDeadline).toBeNull();
  });
});

describe("clients cannot mark whatever they like", () => {
  it("rejects a number that is not the one being called", () => {
    const { e } = makeEngine(2);
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    // `claim` validates against this same set, so accepting an arbitrary
    // number would let a client fabricate a winning line.
    expect(e.applyMove({ playerId: "p1", type: "markNumber", data: { number: 19 } }).ok).toBe(false);
    expect(isMarked(e, "p1", 19)).toBe(false);
  });

  it("rejects marking when no number is open", () => {
    const { e } = makeEngine(2);
    expect(e.applyMove({ playerId: "p0", type: "markNumber", data: { number: 7 } }).ok).toBe(false);
  });

  it("rejects marking the same number twice", () => {
    const { e } = makeEngine(2);
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    e.applyMove({ playerId: "p1", type: "markNumber", data: { number: 7 } });
    expect(e.applyMove({ playerId: "p1", type: "markNumber", data: { number: 7 } }).ok).toBe(false);
  });
});

describe("auto-mark is a per-player preference", () => {
  it("marks on arrival for the player who opted in, and nobody else", () => {
    const { e } = makeEngine(2);
    e.applyMove({ playerId: "p1", type: "setAutoMark", data: { on: true } });
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });

    expect(isMarked(e, "p1", 7)).toBe(true);
    expect(isMarked(e, "p0", 7)).toBe(false);
  });

  it("catches up the open number when switched on mid-window", () => {
    const { e } = makeEngine(2);
    e.applyMove({ playerId: "p0", type: "callNumber", data: { number: 7 } });
    e.applyMove({ playerId: "p1", type: "setAutoMark", data: { on: true } });
    // Otherwise the player who just delegated marking is still the one the
    // table is waiting on.
    expect(isMarked(e, "p1", 7)).toBe(true);
  });

  it("defaults to off, because manual marking is the game", () => {
    const { e } = makeEngine(2);
    const p0 = e.getPublicState().players.find((p) => p.id === "p0");
    expect(p0?.autoMark).toBe(false);
  });
});
