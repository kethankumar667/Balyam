import { describe, it, expect } from "vitest";
import type { LudoColor, Player } from "@shared/types.js";
import { LudoEngine } from "../LudoEngine.js";
import { PLAYER_COLORS_ORDER, colorStartFor, trackLengthFor } from "../track.js";

function makePlayers(n: number, chosen?: (i: number) => LudoColor | undefined): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
    chosenColor: chosen?.(i),
  }));
}

/** Rig the RNG to return a specific sequence of dice values (1-6). */
function rigDice(engine: LudoEngine, rolls: number[]): void {
  let i = 0;
  engine.setRng(() => (rolls[i++ % rolls.length] - 1) / 6 + 0.0001);
}

describe("LudoEngine — 5-8 player polygon games", () => {
  for (const n of [5, 6, 7, 8]) {
    it(`${n} players: assigns exactly the first ${n} canonical colors, one each`, () => {
      const e = new LudoEngine();
      e.init(makePlayers(n));
      const st = e.getPublicState();
      const assigned = st.playerOrder.map((pid) => st.playerColors[pid]);
      expect(new Set(assigned).size).toBe(n); // all distinct
      expect([...assigned].sort()).toEqual([...PLAYER_COLORS_ORDER.slice(0, n)].sort());
    });

    it(`${n} players: track scales to 13*${n} and each color enters at its i*13 start`, () => {
      const e = new LudoEngine();
      e.init(makePlayers(n));
      expect(trackLengthFor(n)).toBe(13 * n);

      for (let turn = 0; turn < n; turn++) {
        const pid = `p${turn}`;
        const color = e.getPublicState().playerColors[pid];
        // Release a token onto the track with a 6 (grants a bonus turn).
        rigDice(e, [6]);
        e.applyMove({ playerId: pid, type: "roll" });
        expect(e.getPublicState().movableTokenIds).toContain(`${color}-0`);
        e.applyMove({ playerId: pid, type: "move", data: { tokenId: `${color}-0` } });
        const tok = e.getPublicState().tokens[pid].find((t) => t.id === `${color}-0`)!;
        expect(tok.state).toBe("track");
        expect(tok.trackPos).toBe(colorStartFor(color, n));
        // Burn the bonus turn: a non-6 leaves exactly one movable token (the one
        // on the track), which the engine auto-moves and then passes the turn.
        rigDice(e, [1]);
        e.applyMove({ playerId: pid, type: "roll" });
      }
    });
  }

  it("honors an in-pool chosen color and reassigns an out-of-pool pick", () => {
    const e = new LudoEngine();
    // 5-player pool = red, green, yellow, blue, purple. p0 picks purple (in
    // pool, kept); p1 picks brown (out of pool → reassigned to a free color).
    e.init(makePlayers(5, (i) => (i === 0 ? "purple" : i === 1 ? "brown" : undefined)));
    const st = e.getPublicState();
    expect(st.playerColors["p0"]).toBe("purple");
    expect(st.playerColors["p1"]).not.toBe("brown");
    const all = st.playerOrder.map((pid) => st.playerColors[pid]);
    expect(new Set(all).size).toBe(5);
    expect([...all].sort()).toEqual([...PLAYER_COLORS_ORDER.slice(0, 5)].sort());
  });
});
