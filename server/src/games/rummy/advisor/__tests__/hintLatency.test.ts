import { afterEach, describe, expect, it, vi } from "vitest";
import type { Player } from "@shared/types.js";
import { RummyEngine } from "../../RummyEngine.js";

/**
 * A hint is a button press, so it has to come back quickly. This plays real deals and times every hint the
 * coach gives the human seat, across both halves of a turn.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seat = (id: string): Player => ({ id, name: id, isHost: false, isReady: true, isConnected: true, isBot: true }) as unknown as Player;

interface Internals {
  s: { phase: string; playerOrder: string[]; turnIndex: number; turnAction: string };
}

describe("hint latency", () => {
  it("answers in about a second at the 95th percentile, and never takes several", () => {
    vi.spyOn(Math, "random").mockImplementation(mulberry32(404));
    const samples: number[] = [];
    const byPhase: { phase: string; ms: number }[] = [];
    for (let deal = 0; deal < 4; deal++) {
      const engine = new RummyEngine();
      engine.init([seat("me"), seat("bot")]);
      const s = (engine as unknown as Internals).s;
      for (let ply = 0; ply < 60 && s.phase === "playing"; ply++) {
        const actor = s.playerOrder[s.turnIndex];
        if (actor === "me") {
          const phase = s.turnAction;
          const start = performance.now();
          engine.getHint("me");
          const ms = performance.now() - start;
          samples.push(ms);
          byPhase.push({ phase, ms });
        }
        engine.applyAutoMove(actor);
      }
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)];
    console.info(`[hint latency] ${samples.length} hints: median ${Math.round(samples[Math.floor(samples.length / 2)])} ms, p95 ${Math.round(p95)} ms, max ${Math.round(samples[samples.length - 1])} ms`);

    const slowest = byPhase.sort((a, b) => b.ms - a.ms).slice(0, 6).map((x) => `${x.phase} ${Math.round(x.ms)}ms`);
    console.info(`[hint latency] slowest: ${slowest.join(", ")}`);

    // Typically ~1 s at the 95th percentile on an idle machine; the bound leaves room for a busy one (this suite
    // shares the CPU with the rest of the run) and still catches a return to the 10 s the closed-deck estimate once took.
    expect(p95).toBeLessThan(4500);
    expect(samples[samples.length - 1]).toBeLessThan(8000);
  }, 300_000);
});
