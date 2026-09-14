import { describe, it, expect, vi, afterEach } from "vitest";
import { QUICK_REACTIONS } from "@shared/reactions.js";
import { LudoEngine } from "../LudoEngine.js";

type FakeLudoEvent = { kind: string; ts: number } | null;

/** Cast to set the engine's private `lastEvent` directly, same rationale as
 *  the UNO/Hand Cricket reaction tests — the method under test only reads
 *  `lastEvent`, so driving a real capture/home/win through the board is far
 *  more setup than the decision logic being tested warrants. */
function setLastEvent(engine: LudoEngine, event: FakeLudoEvent): void {
  (engine as unknown as { s: { lastEvent: FakeLudoEvent } }).s.lastEvent = event;
}

function makeEngine(): LudoEngine {
  const engine = new LudoEngine();
  engine.init([
    { id: "a", name: "A", isReady: true, isBot: true },
    { id: "b", name: "B", isReady: true, isConnected: true },
  ] as never);
  return engine;
}

describe("LudoEngine.getBotReactionEmoji", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when there is no lastEvent", () => {
    const engine = makeEngine();
    setLastEvent(engine, null);
    expect(engine.getBotReactionEmoji("a")).toBeNull();
  });

  it("returns null for a non-reactive event kind (e.g. a plain move)", () => {
    const engine = makeEngine();
    setLastEvent(engine, { kind: "move", ts: Date.now() });
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(engine.getBotReactionEmoji("a")).toBeNull();
  });

  it("returns a QUICK_REACTIONS emoji on a capture, when the reaction roll hits", () => {
    const engine = makeEngine();
    setLastEvent(engine, { kind: "capture", ts: Date.now() });
    vi.spyOn(Math, "random").mockReturnValue(0);
    const emoji = engine.getBotReactionEmoji("a");
    expect(QUICK_REACTIONS).toContain(emoji);
  });

  it("ignores a STALE lastEvent from a previous turn (older than the freshness window)", () => {
    const engine = makeEngine();
    setLastEvent(engine, { kind: "win", ts: Date.now() - 5000 });
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(engine.getBotReactionEmoji("a")).toBeNull();
  });
});
