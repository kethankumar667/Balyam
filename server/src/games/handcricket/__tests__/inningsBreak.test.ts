import { describe, expect, it } from "vitest";
import { HandCricketEngine } from "../HandCricketEngine.js";
import { HC_INNINGS_BREAK_MS } from "@shared/types.js";
import type { Player } from "@shared/types.js";

/**
 * The innings break.
 *
 * `endCurrentInnings` used to flip `innings1` → `innings2` in the same tick
 * the first innings ended: the scoreboard swapped mid-glance and the very
 * next ball was already legal. Players reported the second innings "starting
 * continuously" and losing track of whose turn it was.
 *
 * The break is a HOLD, not a new phase, so the only thing worth pinning is
 * the hold itself — play refused while it runs, allowed once it lapses. The
 * main engine suite deliberately runs on a clock past the break so those
 * tests can play straight through, which means without this file the hold
 * would ship untested.
 */

const players = (): Player[] =>
  [
    { id: "p0", name: "P0", isBot: false, isConnected: true },
    { id: "p1", name: "P1", isBot: false, isConnected: true },
  ] as Player[];

interface Innards {
  state: {
    phase: string;
    inningsBreakUntil: number | null;
    inningsBreakReady: string[];
  };
  endCurrentInnings: () => void;
}

/**
 * An engine sitting at the end of innings 1, on a clock we control.
 *
 * `endCurrentInnings` is called directly rather than replaying a full innings
 * ball by ball: this file is about the break, and driving the scoring rules
 * here would couple it to tests that already own them.
 */
function atEndOfInnings1() {
  const e = new HandCricketEngine();
  let now = 1_000_000;
  e.setClock(() => now);
  e.init(players());

  // Drive the real setup path — endCurrentInnings reads innings1, so the
  // match has to genuinely be in one.
  e.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: "bangladesh" } });
  e.applyMove({ playerId: "p1", type: "selectTeam", data: { teamId: "afghanistan" } });
  e.applyMove({
    playerId: "p0",
    type: "confirmSquad",
    data: {
      playerIds: ["a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","a10"],
      captainId: "a0",
      viceCaptainId: "a1",
    },
  });
  e.applyMove({
    playerId: "p1",
    type: "confirmSquad",
    data: {
      playerIds: ["b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","b10"],
      captainId: "b0",
      viceCaptainId: "b1",
    },
  });
  e.applyMove({ playerId: "p0", type: "tossPick", data: { pick: 1 } });
  e.applyMove({ playerId: "p1", type: "tossPick", data: { pick: 2 } });
  const winner = (e.getPublicState() as { tossWinnerId: string | null }).tossWinnerId!;
  e.applyMove({ playerId: winner, type: "tossChoice", data: { choice: "bat" } });

  const inner = e as unknown as Innards;

  return {
    e,
    inner,
    advance: (ms: number) => {
      now += ms;
    },
    breakUntil: () => inner.state.inningsBreakUntil,
  };
}

/** Any move that only a live innings accepts. */
const bowl = (e: HandCricketEngine) =>
  e.applyMove({ playerId: "p0", type: "pick", data: { pick: 1 } });

describe("ending innings 1", () => {
  it("moves to innings 2 and arms a break", () => {
    const { inner, breakUntil } = atEndOfInnings1();
    inner.endCurrentInnings();

    expect(inner.state.phase).toBe("innings2");
    expect(breakUntil()).not.toBeNull();
  });

  it("arms the break for the configured duration", () => {
    const { inner, breakUntil } = atEndOfInnings1();
    inner.endCurrentInnings();
    expect(breakUntil()! - 1_000_000).toBe(HC_INNINGS_BREAK_MS);
  });
});

describe("while the break runs", () => {
  it("refuses a delivery", () => {
    const { e, inner } = atEndOfInnings1();
    inner.endCurrentInnings();

    // The whole point: the swap and the next ball must not land together.
    const res = bowl(e);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/break/i);
  });

  it("still refuses one millisecond before it lapses", () => {
    const { e, inner, advance } = atEndOfInnings1();
    inner.endCurrentInnings();
    advance(HC_INNINGS_BREAK_MS - 1);
    expect(bowl(e).ok).toBe(false);
  });
});

describe("after the break", () => {
  it("clears itself with no external timer", () => {
    const { e, inner, advance, breakUntil } = atEndOfInnings1();
    inner.endCurrentInnings();
    advance(HC_INNINGS_BREAK_MS + 1);

    bowl(e); // reading the break is what expires it

    // Self-expiring on read matters: nothing schedules a callback to end the
    // break, so a restart or a backgrounded tab cannot strand a match here.
    expect(breakUntil()).toBeNull();
  });

  it("no longer rejects play for being in the break", () => {
    const { e, inner, advance } = atEndOfInnings1();
    inner.endCurrentInnings();
    advance(HC_INNINGS_BREAK_MS + 1);

    // The move may still fail on ordinary innings-2 rules (no bowler picked
    // yet, wrong player, etc.) — it must simply not fail on the break.
    expect(bowl(e).error ?? "").not.toMatch(/break/i);
  });
});

describe("the Continue button", () => {
  const cont = (e: HandCricketEngine, pid: string) =>
    e.applyMove({ playerId: pid, type: "continueInnings" });

  it("one player continuing does NOT restart the match", () => {
    const { e, inner } = atEndOfInnings1();
    inner.endCurrentInnings();

    cont(e, "p0");

    // The point of the request: p0 must not be able to skip the scorecard
    // out from under p1 while they are still reading it.
    expect(bowl(e).error).toMatch(/break/i);
  });

  it("records who has continued so the UI can name the holdout", () => {
    const { e, inner } = atEndOfInnings1();
    inner.endCurrentInnings();
    cont(e, "p0");
    expect(inner.state.inningsBreakReady).toEqual(["p0"]);
  });

  it("ends the break early once everyone has continued", () => {
    const { e, inner, breakUntil } = atEndOfInnings1();
    inner.endCurrentInnings();

    cont(e, "p0");
    cont(e, "p1");

    // Nobody is still reading, so there is no reason to sit out the clock.
    expect(breakUntil()).toBeNull();
    expect(bowl(e).error ?? "").not.toMatch(/break/i);
  });

  it("is idempotent — double-tapping Continue is not a second vote", () => {
    const { e, inner } = atEndOfInnings1();
    inner.endCurrentInnings();
    cont(e, "p0");
    cont(e, "p0");
    expect(inner.state.inningsBreakReady).toEqual(["p0"]);
  });

  it("still lapses on the deadline if someone never continues", () => {
    const { e, inner, advance, breakUntil } = atEndOfInnings1();
    inner.endCurrentInnings();
    cont(e, "p0");

    advance(HC_INNINGS_BREAK_MS + 1);
    bowl(e);

    // A seat that wandered off must not hold the match open forever.
    expect(breakUntil()).toBeNull();
  });

  it("is refused when no break is running", () => {
    const { e } = atEndOfInnings1();
    expect(cont(e, "p0").ok).toBe(false);
  });
});
