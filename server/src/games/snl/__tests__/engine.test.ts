import { describe, it, expect, beforeEach } from "vitest";
import type { Player, SnlState } from "@shared/types.js";
import { SnlEngine } from "../SnlEngine.js";

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));
}

function rigDice(engine: SnlEngine, rolls: number[]): void {
  let i = 0;
  engine.setRng(() => {
    const v = rolls[i++ % rolls.length];
    return (v - 1) / 6 + 0.0001;
  });
}

function state(engine: SnlEngine): SnlState {
  return engine.getPublicState() as SnlState;
}

describe("SnlEngine", () => {
  let engine: SnlEngine;

  beforeEach(() => {
    engine = new SnlEngine();
    engine.init(makePlayers(2));
  });

  it("starts both players at square 0 with p0 to roll", () => {
    const s = state(engine);
    expect(s.phase).toBe("playing");
    expect(s.positions["p0"]).toBe(0);
    expect(s.positions["p1"]).toBe(0);
    expect(s.turnPlayerId).toBe("p0");
    expect(s.turnPhase).toBe("rolling");
  });

  it("rejects rolls from the wrong player", () => {
    const res = engine.applyMove({ playerId: "p1", type: "roll" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/not your turn/i);
  });

  it("rejects unknown move types", () => {
    const res = engine.applyMove({ playerId: "p0", type: "jump" });
    expect(res.ok).toBe(false);
  });

  it("advances by the rolled value when no snake/ladder", () => {
    // Roll a 5 from 0 → 5 (no snake/ladder on 5).
    rigDice(engine, [5]);
    engine.applyMove({ playerId: "p0", type: "roll" });
    const s = state(engine);
    expect(s.positions["p0"]).toBe(5);
    expect(s.turnPlayerId).toBe("p1");
  });

  it("climbs a ladder at square 1 (1 → 38)", () => {
    rigDice(engine, [1]);
    engine.applyMove({ playerId: "p0", type: "roll" });
    const s = state(engine);
    expect(s.positions["p0"]).toBe(38);
    expect(s.stats["p0"].laddersClimbed).toBe(1);
    const ladderEv = s.recentEvents.find((e) => e.kind === "ladder");
    expect(ladderEv?.to).toBe(38);
  });

  it("slides down a snake at square 16 (16 → 6)", () => {
    // p0 rolls 6 (lands on 6, ladder? no), wait — 6 is not a ladder start.
    // We want to land on 16. Easier: roll p0 to 16 in two turns. p0=5, p1=any, p0=11... too long.
    // Use 4 then 6+6: actually let's do roll 4 (lands on 4=ladder → 14), nope.
    // Cleanest: roll 5 (→5), p1 rolls 6 (→6), p0 rolls 5 again? no checker is too coupled.
    // Use stateful sequence carefully:
    //   roll 1: p0 → 1 → ladder → 38
    // bad. Try a fresh engine where we pick a path:
    //   roll p0=5 → square 5
    //   roll p1=5 → square 5
    //   roll p0=5 → square 10
    //   roll p1=5 → square 10
    //   roll p0=6 → square 16 → snake → 6
    const seq = [5, 5, 5, 5, 6];
    rigDice(engine, seq);
    for (let i = 0; i < 5; i++) {
      const pid = i % 2 === 0 ? "p0" : "p1";
      engine.applyMove({ playerId: pid, type: "roll" });
    }
    const s = state(engine);
    expect(s.positions["p0"]).toBe(6);
    expect(s.stats["p0"].snakesBitten).toBe(1);
  });

  it("bounces back on overshoot past 100", () => {
    // Place p0 at 98 by rigging then directly mutate via repeated rolls is messy;
    // Use the engine setRng then walk a sequence that lands p0 at 98 via a ladder.
    // Square 71 → 91 (ladder), then 91 + 7 = 98. So: get p0 to 71, then roll 7? No, max roll is 6.
    // From 91, roll 7 not possible. From 95, roll 3 → 98. But 95 is a snake (→75).
    // Try landing on 98 via 80→100 ladder is winning, not useful.
    // Strategy: p0 to 91 (via 71-ladder), then 91+6=97, then 97+? not predictable.
    // Use a 4-player game where p0 is alone advancing.
    // Simpler: directly drive p0 to a known pre-overshoot square via rolls without snakes/ladders.
    // Plot a path: 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5 = many 5s.
    // 0+5=5, 5+5=10, 10+5=15, 15+5=20, 20+5=25, ... 95 takes 19 rolls, 95 is snake.
    // Use rolls of 2: 0+2=2,4(ladder→14? yes 4→14), nope.
    // Use rolls of 3: 0+3=3, 6, 9(ladder→31), nope.
    // Use rolls of 5 carefully: 5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80(ladder→100=win).
    // So 5s would auto-win at step 16. We need to overshoot — start a fresh engine and rig such that
    // p0 reaches exactly 97, then rolls a 6 → overshoot 103 → bounce to 97. We need 97 reachable.
    // Path via 6s: 6, 12, 18, 24, 30, 36(ladder→44), 50, 56(snake→53), 59, 65, 71(ladder→91), 97 → next roll 6 = bounce.
    // Sequence of p0 rolls only: 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, then 6.
    // But p1 alternates. Two-player: p0 rolls 6 then p1 rolls (anything), then p0 etc.
    // Let p1 always roll 1 (lands on 1, ladder→38). That's fine; we only care about p0.
    const seq: number[] = [];
    // 12 rolls of 6 for p0 take p0 to 97; interleave p1=2 (no snake/ladder at 2).
    for (let i = 0; i < 12; i++) {
      seq.push(6); // p0
      seq.push(2); // p1
    }
    seq.push(6); // p0's overshoot roll
    rigDice(engine, seq);
    for (let i = 0; i < 25; i++) {
      const pid = i % 2 === 0 ? "p0" : "p1";
      const r = engine.applyMove({ playerId: pid, type: "roll" });
      expect(r.ok).toBe(true);
      if (state(engine).phase === "finished") break;
    }
    const s = state(engine);
    // p0 path: 6,12,18,24,30,36→44,50,56→53,59,65,71→91,97; then overshoot 97+6=103 → bounce to 97.
    // But 97 has no snake/ladder, so final = 97. Bounces stat must be >= 1.
    expect(s.stats["p0"].bounces).toBeGreaterThanOrEqual(1);
    expect(s.positions["p0"]).toBe(97);
  });

  it("declares a winner on landing exactly on 100", () => {
    // p0 reaches 80 via the 71→91 ladder isn't 80. Use direct path:
    // Roll 5 thirteen times alternating: 5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80→100 (ladder ends game).
    const seq: number[] = [];
    for (let i = 0; i < 20; i++) {
      seq.push(5); // p0
      seq.push(2); // p1 filler
    }
    rigDice(engine, seq);
    let winnerFound = false;
    for (let i = 0; i < 40; i++) {
      const pid = i % 2 === 0 ? "p0" : "p1";
      const res = engine.applyMove({ playerId: pid, type: "roll" });
      if (!res.ok) break;
      if (res.isOver) {
        winnerFound = true;
        break;
      }
    }
    const s = state(engine);
    expect(winnerFound).toBe(true);
    expect(s.winnerId).toBe("p0");
    expect(s.phase).toBe("finished");
    expect(s.positions["p0"]).toBe(100);
  });

  it("masks state correctly (public == personal)", () => {
    rigDice(engine, [3]);
    engine.applyMove({ playerId: "p0", type: "roll" });
    const pub = engine.getPublicState() as SnlState;
    const personal = engine.getStateFor("p1") as SnlState;
    expect(pub.positions).toEqual(personal.positions);
    expect(pub.turnPlayerId).toBe(personal.turnPlayerId);
  });

  it("removePlayer ends game when only one active player remains", () => {
    engine.removePlayer("p1");
    const s = state(engine);
    expect(s.phase).toBe("finished");
    expect(s.winnerId).toBe("p0");
  });

  it("rejects rolling twice in the same turn", () => {
    rigDice(engine, [3, 4]);
    const first = engine.applyMove({ playerId: "p0", type: "roll" });
    expect(first.ok).toBe(true);
    // Turn has advanced to p1, so p0 rolling again should also fail with "not your turn".
    const second = engine.applyMove({ playerId: "p0", type: "roll" });
    expect(second.ok).toBe(false);
  });
});
