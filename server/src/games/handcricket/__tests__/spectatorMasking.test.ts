import { describe, it, expect } from "vitest";
import type { HcState, Player } from "@shared/types.js";
import { HandCricketEngine } from "../HandCricketEngine.js";

const players = (): Player[] =>
  ["p0", "p1"].map((id, i) => ({
    id,
    name: `P${i}`,
    isHost: i === 0,
    isReady: true,
    isConnected: true,
  }));

function toTossPhase(engine: HandCricketEngine): void {
  engine.init(players());
  engine.applyMove({ playerId: "p0", type: "selectTeam", data: { teamId: "bangladesh" } });
  engine.applyMove({ playerId: "p1", type: "selectTeam", data: { teamId: "afghanistan" } });
  engine.applyMove({
    playerId: "p0",
    type: "confirmSquad",
    data: { playerIds: Array.from({ length: 11 }, (_, i) => `a${i}`), captainId: "a0" },
  });
  engine.applyMove({
    playerId: "p1",
    type: "confirmSquad",
    data: { playerIds: Array.from({ length: 11 }, (_, i) => `b${i}`), captainId: "b0" },
  });
  engine.applyMove({ playerId: "p0", type: "tossCall", data: { call: "even" } });
}

describe("HandCricketEngine — spectator / TV state never carries a live pick", () => {
  it("masks a locked toss pick for a spectator but not for its owner", () => {
    const engine = new HandCricketEngine();
    toTossPhase(engine);
    expect((engine.getPublicState() as HcState).phase).toBe("toss");

    engine.applyMove({ playerId: "p0", type: "tossPick", data: { pick: 4 } });

    const spectator = engine.getPublicState() as HcState;
    expect(spectator.tossPicks["p0"]).toBe(-1);
    expect(spectator.tossPicks["p1"]).toBeNull();

    const owner = engine.getStateFor("p0") as HcState;
    expect(owner.tossPicks["p0"]).toBe(4);
    const opponent = engine.getStateFor("p1") as HcState;
    expect(opponent.tossPicks["p0"]).toBe(-1);
  });

  it("does not mutate the engine's own state when masking", () => {
    const engine = new HandCricketEngine();
    toTossPhase(engine);
    engine.applyMove({ playerId: "p0", type: "tossPick", data: { pick: 4 } });

    engine.getPublicState();

    expect((engine.getStateFor("p0") as HcState).tossPicks["p0"]).toBe(4);
  });
});
