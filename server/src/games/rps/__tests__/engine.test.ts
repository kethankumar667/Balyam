import { describe, it, expect } from "vitest";
import type { Player, RpsState } from "@shared/types.js";
import { RpsEngine } from "../RpsEngine.js";

function players(): Player[] {
  return [
    { id: "human", name: "Human", isHost: true, isReady: true, isConnected: true },
    { id: "bot", name: "Bot", isHost: false, isReady: true, isConnected: true, isBot: true },
  ];
}

function state(e: RpsEngine): RpsState {
  return e.getPublicState() as RpsState;
}

describe("RpsEngine — round timer", () => {
  it("starts a round with no deadline until armed", () => {
    const e = new RpsEngine();
    e.init(players());
    expect(state(e).roundDeadline).toBeNull();
  });

  it("arms a 30s deadline once and keeps it within the same round", () => {
    const e = new RpsEngine();
    e.init(players());
    expect(e.getRoundTimerSeconds()).toBe(30);
    const ms = e.getRoundTimerSeconds() * 1000;
    const remaining = e.armRoundDeadline(ms);
    expect(remaining).toBeGreaterThan(29_000);
    const deadline = state(e).roundDeadline;
    expect(deadline).not.toBeNull();
    // Re-arming mid-round must NOT grant a fresh window — slow opponents
    // shouldn't reset the clock by making the other player wait.
    e.armRoundDeadline(ms);
    expect(state(e).roundDeadline).toBe(deadline);
  });

  it("resets the deadline at the start of each new round", () => {
    const e = new RpsEngine();
    e.init(players());
    e.armRoundDeadline(30_000);
    expect(state(e).roundDeadline).not.toBeNull();
    e.applyMove({ playerId: "human", type: "choose", data: { choice: "rock" } });
    e.applyMove({ playerId: "bot", type: "choose", data: { choice: "scissors" } });
    const s = state(e);
    expect(s.round).toBe(2);
    expect(s.roundDeadline).toBeNull();
  });

  it("clears the deadline when the match ends", () => {
    const e = new RpsEngine();
    e.init(players());
    for (let i = 0; i < 10; i++) {
      e.armRoundDeadline(30_000);
      e.applyMove({ playerId: "human", type: "choose", data: { choice: "rock" } });
      e.applyMove({ playerId: "bot", type: "choose", data: { choice: "scissors" } });
    }
    const s = state(e);
    expect(s.isOver).toBe(true);
    expect(s.winnerId).toBe("human");
    expect(s.roundDeadline).toBeNull();
  });
});

describe("RpsEngine — realistic bot pacing", () => {
  it("a bot is not a pending actor until its opponent has thrown", () => {
    const e = new RpsEngine();
    e.init(players());
    // Round start: nobody has committed, so no one is auto-move-ready.
    expect(e.pendingActors()).toEqual([]);
    // But both still owe a throw (raw list used by the timeout).
    expect([...e.choosersRemaining()].sort()).toEqual(["bot", "human"]);

    // Human commits → the bot may now react.
    e.applyMove({ playerId: "human", type: "choose", data: { choice: "rock" } });
    expect(e.pendingActors()).toEqual(["bot"]);
    expect(e.choosersRemaining()).toEqual(["bot"]);
  });

  it("preserves both throws in history so the reveal can be shown", () => {
    const e = new RpsEngine();
    e.init(players());
    e.applyMove({ playerId: "human", type: "choose", data: { choice: "paper" } });
    e.applyMove({ playerId: "bot", type: "choose", data: { choice: "rock" } });
    const s = state(e);
    expect(s.history).toHaveLength(1);
    expect(s.history[0].choices).toEqual({ human: "paper", bot: "rock" });
    expect(s.history[0].winnerId).toBe("human");
  });

  it("auto-move still resolves a round for the bot once it is pending", () => {
    const e = new RpsEngine();
    e.init(players());
    e.applyMove({ playerId: "human", type: "choose", data: { choice: "rock" } });
    const res = e.applyAutoMove("bot");
    expect(res.ok).toBe(true);
    expect(state(e).history).toHaveLength(1);
  });
});
