import { describe, it, expect, vi, afterEach } from "vitest";
import type { HcState, HcBall } from "@shared/types.js";
import { GAME_REACTIONS } from "@shared/reactions.js";
import { HandCricketEngine } from "../HandCricketEngine.js";

/** Minimal ball record — only the fields getBotReactionEmoji actually reads. */
function ball(overrides: Partial<HcBall> = {}): HcBall {
  return {
    inningsNumber: 1,
    overNumber: 1,
    ballInOver: 1,
    batterPick: 4,
    bowlerPick: 4,
    runs: 4,
    wicket: false,
    isBoundary: false,
    isRestrictedBall: false,
    batterId: "b0",
    bowlerId: "w0",
    milestone: null,
    ...overrides,
  } as HcBall;
}

/** Cast to poke the engine's private innings state directly, rather than
 *  driving a full team-select → toss → delivery flow just to get one ball
 *  onto `innings.history` — the method under test only reads `phase` and
 *  `innings.{number,history}`. */
function setInnings(engine: HandCricketEngine, history: HcBall[]): void {
  const internal = engine as unknown as { state: HcState };
  internal.state.phase = "innings1";
  internal.state.innings1 = { number: 1, history } as unknown as HcState["innings1"];
}

describe("HandCricketEngine.getBotReactionEmoji", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null outside an innings phase (e.g. teamSelect, toss)", () => {
    const engine = new HandCricketEngine();
    engine.init([
      { id: "p0", name: "A", isReady: true, isBot: true },
      { id: "p1", name: "B", isReady: true, isConnected: true },
    ] as never);
    expect(engine.getBotReactionEmoji("p0")).toBeNull();
  });

  it("returns null when the last ball was unremarkable (no wicket/boundary/milestone)", () => {
    const engine = new HandCricketEngine();
    engine.init([
      { id: "p0", name: "A", isReady: true, isBot: true },
      { id: "p1", name: "B", isReady: true, isConnected: true },
    ] as never);
    setInnings(engine, [ball({ runs: 1 })]);
    vi.spyOn(Math, "random").mockReturnValue(0); // would react if the event qualified
    expect(engine.getBotReactionEmoji("p0")).toBeNull();
  });

  it("returns a themed handcricket emoji on a wicket, when the reaction roll hits", () => {
    const engine = new HandCricketEngine();
    engine.init([
      { id: "p0", name: "A", isReady: true, isBot: true },
      { id: "p1", name: "B", isReady: true, isConnected: true },
    ] as never);
    setInnings(engine, [ball({ wicket: true, runs: 0 })]);
    vi.spyOn(Math, "random").mockReturnValue(0); // < 0.5 reaction-chance gate, then picks index 0
    const emoji = engine.getBotReactionEmoji("p0");
    expect(GAME_REACTIONS.handcricket).toContain(emoji);
  });

  it("does not react to the SAME ball twice (no fresh delivery since the last check)", () => {
    const engine = new HandCricketEngine();
    engine.init([
      { id: "p0", name: "A", isReady: true, isBot: true },
      { id: "p1", name: "B", isReady: true, isConnected: true },
    ] as never);
    setInnings(engine, [ball({ isBoundary: true, runs: 6 })]);
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(engine.getBotReactionEmoji("p0")).not.toBeNull();
    // Same history, unchanged — e.g. the bot's next move was selectBowler,
    // not a new delivery. Must not re-fire on the ball already considered.
    expect(engine.getBotReactionEmoji("p0")).toBeNull();
  });
});
