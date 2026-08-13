import { describe, expect, it } from "vitest";
import type { Player } from "@shared/types.js";
import { BlockBlastEngine } from "../BlockBlastEngine.js";
import { PIECE_BY_ID } from "../pieces.js";
import { anyFit } from "../grid.js";

function seat(id: string, name = id, isBot = false): Player {
  return { id, name, isHost: false, isReady: true, isConnected: true, isBot };
}

/** An engine with a fixed seed and a clock the test drives by hand. */
function makeEngine(players: Player[], opts?: { raceSeconds?: number }) {
  const engine = new BlockBlastEngine();
  engine.setRng(() => 0.5);
  let clock = 1_000_000;
  engine.setClock(() => clock);
  if (opts) engine.setOptions({ raceSeconds: opts.raceSeconds ?? 180 });
  engine.init(players);
  return {
    engine,
    advance(ms: number) {
      clock += ms;
    },
    now: () => clock,
  };
}

/**
 * A board that is choked but has NO completable line.
 *
 * Getting this wrong is instructive: the obvious "fill everything but one
 * corner" board is not stuck at all — dropping a piece into the last hole
 * completes eight rows and eight columns, wipes the board, and the game
 * carries on. A board is only dead when every row and every column already
 * has a hole, which needs at least eight of them.
 *
 * Both diagonals, so filling any single cell still leaves its row and its
 * column one short.
 */
function chokedGrid(): number[] {
  const grid = new Array<number>(64).fill(1);
  for (let r = 0; r < 8; r++) {
    grid[r * 8 + r] = 0;
    grid[r * 8 + (7 - r)] = 0;
  }
  return grid;
}

/** Places whichever tray slot fits, wherever it fits. Used to burn turns. */
function playAnything(engine: BlockBlastEngine, playerId: string): boolean {
  const self = engine.getStateFor(playerId);
  const me = self.players.find((p) => p.id === playerId);
  if (!me) return false;
  for (let slot = 0; slot < self.you.tray.length; slot++) {
    const view = self.you.tray[slot];
    if (!view) continue;
    const piece = PIECE_BY_ID.get(view.id);
    if (!piece) continue;
    for (let r = 0; r + piece.h <= 8; r++) {
      for (let c = 0; c + piece.w <= 8; c++) {
        const res = engine.applyMove({ playerId, type: "place", data: { slot, r, c } });
        if (res.ok) return true;
      }
    }
  }
  return false;
}

describe("mode", () => {
  it("is solo with one seat and has no clock", () => {
    const { engine } = makeEngine([seat("a")]);
    const state = engine.getPublicState();
    expect(state.mode).toBe("solo");
    expect(state.deadline).toBeNull();
    expect(engine.getRaceDeadline()).toBeNull();
  });

  it("is a race with two seats and arms one deadline", () => {
    const { engine, now } = makeEngine([seat("a"), seat("b")], { raceSeconds: 90 });
    const state = engine.getPublicState();
    expect(state.mode).toBe("race");
    expect(state.deadline).toBe(now() + 90_000);
  });

  it("refuses an absurdly short race rather than starting a finished one", () => {
    const { engine, now } = makeEngine([seat("a"), seat("b")], { raceSeconds: 0 });
    // Floored, not honoured. A zero-second race would be over before the
    // first broadcast and would look like the game crashed on start.
    expect(engine.getRaceDeadline()).toBe(now() + 30_000);
  });
});

describe("the same-seed promise", () => {
  it("deals every racer an identical opening tray", () => {
    const { engine } = makeEngine([seat("a"), seat("b"), seat("c")]);
    const a = engine.getStateFor("a").you.tray.map((p) => p?.id);
    const b = engine.getStateFor("b").you.tray.map((p) => p?.id);
    const c = engine.getStateFor("c").you.tray.map((p) => p?.id);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });

  it("keeps trays aligned by draw index, not by who played first", () => {
    /**
     * The whole point. `a` races ahead through three trays while `b` sits
     * still; when `b` finally reaches their third tray it must be the same
     * three pieces `a` saw, not whatever came next in a shared stream.
     */
    const { engine } = makeEngine([seat("a"), seat("b")]);

    const trayHistory: (string | undefined)[][] = [];
    for (let round = 0; round < 3; round++) {
      trayHistory.push(engine.getStateFor("a").you.tray.map((p) => p?.id));
      for (let i = 0; i < 3; i++) playAnything(engine, "a");
    }

    for (let round = 0; round < 3; round++) {
      expect(engine.getStateFor("b").you.tray.map((p) => p?.id)).toEqual(trayHistory[round]);
      for (let i = 0; i < 3; i++) playAnything(engine, "b");
    }
  });

  it("publishes the seed so a disputed result can be replayed", () => {
    const { engine } = makeEngine([seat("a"), seat("b")]);
    expect(engine.getPublicState().seed).toBeGreaterThan(0);
  });
});

describe("placement", () => {
  it("rejects a piece that does not fit", () => {
    const { engine } = makeEngine([seat("a")]);
    const tray = engine.getStateFor("a").you.tray;
    const slot = tray.findIndex((p) => p != null);
    const piece = PIECE_BY_ID.get(tray[slot]!.id)!;
    // Deliberately off the bottom-right corner.
    const res = engine.applyMove({
      playerId: "a",
      type: "place",
      data: { slot, r: 9 - piece.h, c: 0 },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/does not fit/i);
  });

  it("rejects a slot that has already been played", () => {
    const { engine } = makeEngine([seat("a")]);
    const before = engine.getStateFor("a").you.tray;
    const slot = before.findIndex((p) => p != null);
    expect(engine.applyMove({ playerId: "a", type: "place", data: { slot, r: 0, c: 0 } }).ok).toBe(
      true,
    );
    const again = engine.applyMove({ playerId: "a", type: "place", data: { slot, r: 4, c: 4 } });
    expect(again.ok).toBe(false);
    expect(again.error).toMatch(/already placed/i);
  });

  it("rejects a slot index off the end of the tray", () => {
    const { engine } = makeEngine([seat("a")]);
    expect(engine.applyMove({ playerId: "a", type: "place", data: { slot: 7, r: 0, c: 0 } }).ok)
      .toBe(false);
    expect(engine.applyMove({ playerId: "a", type: "place", data: { slot: -1, r: 0, c: 0 } }).ok)
      .toBe(false);
  });

  it("rejects non-integer coordinates", () => {
    // The wire carries whatever the client sends. `1.5` would index nothing
    // and quietly write outside the row.
    const { engine } = makeEngine([seat("a")]);
    const res = engine.applyMove({
      playerId: "a",
      type: "place",
      data: { slot: 0, r: 1.5, c: 0 },
    });
    expect(res.ok).toBe(false);
  });

  it("rejects a move from someone not in the game", () => {
    const { engine } = makeEngine([seat("a")]);
    const res = engine.applyMove({ playerId: "ghost", type: "place", data: { slot: 0, r: 0, c: 0 } });
    expect(res.ok).toBe(false);
  });

  it("refuses to let a client drive the clock", () => {
    /**
     * Bounce shipped an engine that ticked itself AND accepted `tick` from
     * clients, and two players ran the game at double speed. This game has no
     * simulation at all, so a `tick` can only ever be someone probing.
     */
    const { engine } = makeEngine([seat("a")]);
    const res = engine.applyMove({ playerId: "a", type: "tick" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/clock/i);
  });
});

describe("the tray", () => {
  it("does not refill until all three pieces are gone", () => {
    const { engine } = makeEngine([seat("a")]);
    const opening = engine.getStateFor("a").you.tray.map((p) => p?.id);

    playAnything(engine, "a");
    const afterOne = engine.getStateFor("a").you.tray.map((p) => p?.id);
    expect(afterOne.filter(Boolean)).toHaveLength(2);
    // The two survivors must be untouched — an early refill would remove
    // every interesting decision from the last two placements.
    expect(afterOne.filter(Boolean).every((id) => opening.includes(id))).toBe(true);

    playAnything(engine, "a");
    expect(engine.getStateFor("a").you.tray.filter(Boolean)).toHaveLength(1);

    playAnything(engine, "a");
    expect(engine.getStateFor("a").you.tray.filter(Boolean)).toHaveLength(3);
  });

  it("reports which slots still fit somewhere", () => {
    const { engine } = makeEngine([seat("a")]);
    const self = engine.getStateFor("a");
    // Empty board: everything in the table fits.
    expect(self.you.playable).toEqual([true, true, true]);
  });
});

describe("scoring", () => {
  it("pays for the cells placed even with no clear", () => {
    const { engine } = makeEngine([seat("a")]);
    const tray = engine.getStateFor("a").you.tray;
    const slot = tray.findIndex((p) => p != null);
    const cells = tray[slot]!.cells.length;
    engine.applyMove({ playerId: "a", type: "place", data: { slot, r: 0, c: 0 } });
    expect(engine.getStateFor("a").you.score).toBe(cells);
  });

  it("scores a row clear and starts a streak", () => {
    // Built by hand rather than by playing: a test that depends on the draw
    // breaks every time the piece weights are tuned.
    const engine = new BlockBlastEngine();
    engine.setRng(() => 0.5);
    engine.init([seat("a")]);

    const grid = engine.getPublicState().players[0].grid;
    expect(grid.every((v) => v === 0)).toBe(true);

    // Fill row 0 up to one gap, then drop a single cell into it. Reaching in
    // like this is the only way to control the board without a level editor.
    const internal = engine as unknown as {
      seats: Map<string, { grid: number[]; tray: unknown[]; streak: number; score: number }>;
    };
    const s = internal.seats.get("a")!;
    for (let c = 1; c < 8; c++) s.grid[c] = 1;
    // One stray cell well away from row 0, so the clear is not also a
    // PERFECT clear — that carries a 300-point bonus and would swamp the
    // number this test is actually about.
    s.grid[5 * 8 + 5] = 1;
    s.tray = [PIECE_BY_ID.get("dot")!, null, null];

    const res = engine.applyMove({ playerId: "a", type: "place", data: { slot: 0, r: 0, c: 0 } });
    expect(res.ok).toBe(true);
    // 1 cell + a single line at multiplier 1.
    expect(s.score).toBe(1 + 10);
    expect(s.streak).toBe(1);
    expect(engine.getPublicState().players[0].linesCleared).toBe(1);
  });
});

describe("game over", () => {
  it("ends a solo game when nothing in the tray fits", () => {
    const engine = new BlockBlastEngine();
    engine.setRng(() => 0.5);
    engine.init([seat("a")]);

    const internal = engine as unknown as {
      seats: Map<string, { grid: number[]; tray: unknown[]; isOut: boolean }>;
    };
    const s = internal.seats.get("a")!;
    // Choked board, tray of one dot and two 3x3s. Placing the dot clears
    // nothing and leaves two pieces that fit nowhere.
    s.grid = chokedGrid();
    s.tray = [PIECE_BY_ID.get("dot")!, PIECE_BY_ID.get("sq3")!, PIECE_BY_ID.get("sq3")!];

    const res = engine.applyMove({ playerId: "a", type: "place", data: { slot: 0, r: 0, c: 0 } });
    expect(res.ok).toBe(true);
    expect(res.isOver).toBe(true);
    expect(engine.isOver()).toBe(true);
    // Nobody "wins" a solo run. Declaring the only player the winner of a
    // game they just lost reads as mockery.
    expect(engine.getPublicState().winnerId).toBeNull();
  });

  it("keeps the race running when one racer is out", () => {
    const engine = new BlockBlastEngine();
    engine.setRng(() => 0.5);
    engine.setClock(() => 1_000_000);
    engine.init([seat("a"), seat("b")]);

    const internal = engine as unknown as {
      seats: Map<string, { grid: number[]; tray: unknown[]; isOut: boolean }>;
    };
    const a = internal.seats.get("a")!;
    a.grid = chokedGrid();
    a.tray = [PIECE_BY_ID.get("dot")!, PIECE_BY_ID.get("sq3")!, PIECE_BY_ID.get("sq3")!];

    engine.applyMove({ playerId: "a", type: "place", data: { slot: 0, r: 0, c: 0 } });
    expect(engine.isOver()).toBe(false);
    expect(engine.getStateFor("a").you.isOut).toBe(true);
    expect(engine.getStateFor("b").you.isOut).toBe(false);
    expect(engine.pendingActors()).toEqual(["b"]);

    // And the seat that is out cannot keep playing.
    const res = engine.applyMove({ playerId: "a", type: "place", data: { slot: 1, r: 0, c: 0 } });
    expect(res.ok).toBe(false);
  });

  it("ends the race on the deadline and ranks by score", () => {
    const { engine, advance } = makeEngine([seat("a"), seat("b")], { raceSeconds: 60 });

    // `a` banks some cells; `b` does nothing.
    playAnything(engine, "a");
    playAnything(engine, "a");

    expect(engine.finishOnDeadline().ok).toBe(false);
    expect(engine.isOver()).toBe(false);

    advance(60_000);
    const res = engine.finishOnDeadline();
    expect(res.ok).toBe(true);
    expect(engine.isOver()).toBe(true);

    const state = engine.getPublicState();
    expect(state.winnerId).toBe("a");
    expect(state.result?.map((r) => r.playerId)).toEqual(["a", "b"]);
    expect(state.result?.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("declares no winner when the top two are level", () => {
    const { engine, advance } = makeEngine([seat("a"), seat("b")], { raceSeconds: 60 });
    advance(60_000);
    engine.finishOnDeadline();
    // Both on zero. Picking one on seat order would be inventing a result.
    expect(engine.getPublicState().winnerId).toBeNull();
    expect(engine.getPublicState().result?.map((r) => r.rank)).toEqual([1, 1]);
  });

  it("refuses moves once the deadline has passed, without needing the timer", () => {
    /**
     * The room's timer is the normal way a race ends, but a placement can be
     * in flight when it fires. Without this, the last player to click would
     * score after the whistle.
     */
    const { engine, advance } = makeEngine([seat("a"), seat("b")], { raceSeconds: 60 });
    advance(61_000);
    const res = engine.applyMove({ playerId: "a", type: "place", data: { slot: 0, r: 0, c: 0 } });
    expect(res.isOver).toBe(true);
    expect(engine.isOver()).toBe(true);
    expect(engine.getStateFor("a").you.score).toBe(0);
  });
});

describe("the bot", () => {
  it("places a piece when asked", () => {
    const engine = new BlockBlastEngine();
    engine.init([seat("bot", "Tetra", true)]);
    const before = engine.getPublicState().players[0].grid.filter((v) => v !== 0).length;
    const res = engine.applyAutoMove("bot");
    expect(res.ok).toBe(true);
    expect(engine.getPublicState().players[0].grid.filter((v) => v !== 0).length)
      .toBeGreaterThan(before);
  });

  it("plays a whole solo game to a legal finish", () => {
    /**
     * The real test of the rules: let the bot run until the board closes and
     * check nothing got stuck, over-scored, or overlapped along the way. A
     * hang here would be an engine that never reports game over — the worst
     * possible failure, because the room would sit "playing" forever.
     */
    const engine = new BlockBlastEngine();
    engine.init([seat("bot", "Tetra", true)]);

    let placements = 0;
    while (!engine.isOver() && placements < 5000) {
      const res = engine.applyAutoMove("bot");
      expect(res.ok).toBe(true);
      placements++;
    }

    expect(engine.isOver()).toBe(true);
    expect(placements).toBeGreaterThan(5);
    expect(placements).toBeLessThan(5000);

    // And it really is stuck: nothing left in the tray fits anywhere.
    const self = engine.getStateFor("bot");
    expect(self.you.playable.some(Boolean)).toBe(false);
  });

  it("beats a player who places at random, over a run of games", () => {
    // Not a strength test — a sanity test that the heuristic points the right
    // way at all. A bot that loses to noise is scoring the board backwards.
    let botWins = 0;
    for (let game = 0; game < 8; game++) {
      const bot = new BlockBlastEngine();
      bot.setRng(mulberryish(game));
      bot.init([seat("bot", "Tetra", true)]);
      while (!bot.isOver()) bot.applyAutoMove("bot");

      const random = new BlockBlastEngine();
      random.setRng(mulberryish(game));
      random.init([seat("r")]);
      while (!random.isOver()) {
        if (!playAnything(random, "r")) break;
      }

      if (bot.getStateFor("bot").you.score > random.getStateFor("r").you.score) botWins++;
    }
    expect(botWins).toBeGreaterThanOrEqual(6);
  });
});

describe("leaving", () => {
  it("drops the seat and ends a game with nobody left", () => {
    const { engine } = makeEngine([seat("a")]);
    engine.removePlayer("a");
    expect(engine.isOver()).toBe(true);
    expect(engine.getPublicState().players).toHaveLength(0);
  });

  it("leaves the race running for whoever is still there", () => {
    const { engine } = makeEngine([seat("a"), seat("b")]);
    engine.removePlayer("a");
    expect(engine.isOver()).toBe(false);
    expect(engine.pendingActors()).toEqual(["b"]);
  });
});

describe("state for a player who is not in the game", () => {
  it("returns an empty tray rather than throwing", () => {
    // Spectators and stale sockets both land here.
    const { engine } = makeEngine([seat("a")]);
    const self = engine.getStateFor("nobody");
    expect(self.you.tray).toEqual([]);
    expect(self.you.isOut).toBe(true);
  });
});

/** A small deterministic generator so the bot comparison is repeatable. */
function mulberryish(seed: number): () => number {
  let a = (seed + 1) * 0x9e3779b1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("anyFit agrees with the engine's own out-detection", () => {
  it("marks a seat out only when nothing in the tray fits", () => {
    const engine = new BlockBlastEngine();
    engine.init([seat("a")]);
    while (!engine.isOver()) {
      const self = engine.getStateFor("a");
      const grid = engine.getPublicState().players[0].grid;
      for (let slot = 0; slot < self.you.tray.length; slot++) {
        const view = self.you.tray[slot];
        const piece = view ? PIECE_BY_ID.get(view.id)! : null;
        expect(self.you.playable[slot]).toBe(piece ? anyFit(grid, piece) : false);
      }
      if (!playAnything(engine, "a")) break;
    }
  });
});
