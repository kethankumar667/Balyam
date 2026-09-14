import { describe, it, expect, vi, afterEach } from "vitest";
import { GAME_REACTIONS } from "@shared/reactions.js";
import { RummyEngine } from "../RummyEngine.js";

/** Cast to set the engine's private `winnerId` directly — the method under
 *  test only reads that one field, and driving a real declare through the
 *  full deal/draw/arrange pipeline just to populate it is far more setup
 *  than the decision logic being tested warrants. */
function setWinner(engine: RummyEngine, winnerId: string | null): void {
  (engine as unknown as { s: { winnerId: string | null } }).s.winnerId = winnerId;
}

function makeEngine(): RummyEngine {
  const engine = new RummyEngine();
  engine.init([
    { id: "p0", name: "A", isReady: true, isBot: true },
    { id: "p1", name: "B", isReady: true, isConnected: true },
  ] as never);
  return engine;
}

describe("RummyEngine.getBotReactionEmoji", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when there is no winner yet", () => {
    const engine = makeEngine();
    setWinner(engine, null);
    expect(engine.getBotReactionEmoji("p0")).toBeNull();
  });

  it("returns null when the OPPONENT won, not this bot", () => {
    const engine = makeEngine();
    setWinner(engine, "p1");
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(engine.getBotReactionEmoji("p0")).toBeNull();
  });

  it("returns a themed rummy emoji when this bot itself just declared and won", () => {
    const engine = makeEngine();
    setWinner(engine, "p0");
    vi.spyOn(Math, "random").mockReturnValue(0); // < 0.8 gate, then picks index 0
    const emoji = engine.getBotReactionEmoji("p0");
    expect(GAME_REACTIONS.rummy).toContain(emoji);
  });

  it("respects the ~80% reaction-chance gate — a very high roll still suppresses it", () => {
    const engine = makeEngine();
    setWinner(engine, "p0");
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(engine.getBotReactionEmoji("p0")).toBeNull();
  });
});
