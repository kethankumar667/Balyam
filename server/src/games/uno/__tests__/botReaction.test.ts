import { describe, it, expect, vi, afterEach } from "vitest";
import { QUICK_REACTIONS } from "@shared/reactions.js";
import { UnoEngine } from "../UnoEngine.js";

/** Cast to set the engine's private `lastHit` directly — the method under
 *  test only reads that one field, and driving a real Draw-4/skip through
 *  the full move pipeline just to populate it would be far more setup than
 *  the thing being tested warrants. */
function setLastHit(
  engine: UnoEngine,
  hit: { targetIds: string[]; kind: "skip" | "draw2" | "draw4" | "stack" | "swap" | "rotate" | "catch"; count?: number } | null,
): void {
  (engine as unknown as { state: { lastHit: typeof hit } }).state.lastHit = hit;
}

describe("UnoEngine.getBotReactionEmoji", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeEngine(): UnoEngine {
    const engine = new UnoEngine();
    engine.init([
      { id: "p0", name: "A", isReady: true, isBot: true },
      { id: "p1", name: "B", isReady: true, isConnected: true },
    ] as never);
    return engine;
  }

  it("returns null when there is no lastHit", () => {
    const engine = makeEngine();
    setLastHit(engine, null);
    expect(engine.getBotReactionEmoji("p0")).toBeNull();
  });

  it("returns null for a non-reactive hit kind (e.g. a plain rotate/swap)", () => {
    const engine = makeEngine();
    setLastHit(engine, { targetIds: ["p1"], kind: "rotate" });
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(engine.getBotReactionEmoji("p0")).toBeNull();
  });

  it("returns a QUICK_REACTIONS emoji on a draw4, when the reaction roll hits", () => {
    const engine = makeEngine();
    setLastHit(engine, { targetIds: ["p1"], kind: "draw4", count: 4 });
    vi.spyOn(Math, "random").mockReturnValue(0); // < 0.5 gate, then picks index 0
    const emoji = engine.getBotReactionEmoji("p0");
    expect(QUICK_REACTIONS).toContain(emoji);
  });

  it("respects the ~50% reaction-chance gate — a high roll suppresses it", () => {
    const engine = makeEngine();
    setLastHit(engine, { targetIds: ["p1"], kind: "draw2" });
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(engine.getBotReactionEmoji("p0")).toBeNull();
  });
});
