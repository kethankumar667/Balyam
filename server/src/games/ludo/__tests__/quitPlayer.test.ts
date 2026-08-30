import { describe, it, expect } from "vitest";
import type { Player } from "@shared/types.js";
import { LudoEngine } from "../LudoEngine.js";
import { PLAYER_COLORS_ORDER } from "../track.js";

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
    chosenColor: PLAYER_COLORS_ORDER[i],
  })) as Player[];
}

describe("LudoEngine.quitPlayer — forced removal via the auto-play turn cap", () => {
  it("marks the seat in quitPlayers without deleting its tokens or per-player stats", () => {
    const engine = new LudoEngine();
    engine.init(makePlayers(3));
    const before = engine.getPublicState();
    const target = before.playerOrder[0]!;
    const tokensBefore = before.tokens[target]!.length;

    engine.quitPlayer(target);

    const after = engine.getPublicState();
    expect(after.quitPlayers).toContain(target);
    // Unlike removePlayer, the seat and its tokens are still fully real —
    // still in playerOrder, still projected by getPublicState.
    expect(after.playerOrder).toContain(target);
    expect(after.tokens[target]).toBeDefined();
    expect(after.tokens[target]!.length).toBe(tokensBefore);
  });

  it("turn rotation moves off a quit seat immediately when it was their turn", () => {
    const engine = new LudoEngine();
    engine.init(makePlayers(3));
    const target = engine.getPublicState().playerOrder[0]!;
    expect(engine.getPublicState().turnPlayerId).toBe(target);

    engine.quitPlayer(target);

    expect(engine.getPublicState().turnPlayerId).not.toBe(target);
  });

  it("is a no-op for a seat that already quit, or one that already left via removePlayer", () => {
    const engine = new LudoEngine();
    engine.init(makePlayers(3));
    const target = engine.getPublicState().playerOrder[0]!;

    engine.quitPlayer(target);
    engine.quitPlayer(target); // second call, same seat
    expect(engine.getPublicState().quitPlayers).toEqual([target]);

    const other = engine.getPublicState().playerOrder.find((id) => id !== target)!;
    engine.removePlayer(other);
    engine.quitPlayer(other); // already fully removed — no tokens left to quit out of
    expect(engine.getPublicState().quitPlayers).toEqual([target]);
  });

  it("with exactly 2 seats, quitting ends the match immediately — the other seat wins by forfeit", () => {
    const engine = new LudoEngine();
    engine.init(makePlayers(2));
    const target = engine.getPublicState().playerOrder[0]!;
    const opponent = engine.getPublicState().playerOrder[1]!;

    engine.quitPlayer(target);

    const after = engine.getPublicState();
    expect(after.phase).toBe("finished");
    expect(engine.isOver()).toBe(true);
    expect(after.winnerId).toBe(opponent);
    expect(after.quitPlayers).toContain(target);
    // Same "trace persists" guarantee as the 3+ seat case — the loser by
    // forfeit is still a real, named seat with its tokens intact, not purged.
    expect(after.playerOrder).toContain(target);
    expect(after.tokens[target]).toBeDefined();
  });

  it("with 4 seats, quitting three of them ends the match — one active seat left wins", () => {
    // quitPlayer, unlike Rummy's (which reuses handleDrop's own
    // current-turn gate), does not require the target to be the current
    // actor — RoomManager only ever calls it for the current actor in
    // practice, but the engine itself just needs "still has tokens, hasn't
    // finished, hasn't already quit", so all three can be quit back-to-back
    // without driving real turns through them first.
    const engine = new LudoEngine();
    engine.init(makePlayers(4));
    const order = engine.getPublicState().playerOrder;
    const survivor = order[3]!;

    engine.quitPlayer(order[0]!);
    engine.quitPlayer(order[1]!);
    engine.quitPlayer(order[2]!);

    const after = engine.getPublicState();
    expect(after.phase).toBe("finished");
    expect(after.winnerId).toBe(survivor);
    expect(after.quitPlayers).toEqual(expect.arrayContaining([order[0], order[1], order[2]]));
  });
});
