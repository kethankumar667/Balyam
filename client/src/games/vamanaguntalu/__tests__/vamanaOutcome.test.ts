import { describe, expect, it } from "vitest";
import type { Player, VamanaPublicState } from "@shared/types.js";
import { describeVamanaOutcome } from "../vamanaOutcome";

const player = (id: string, name: string, extra: Partial<Player> = {}): Player => ({
  id,
  name,
  isHost: id === "me",
  isReady: true,
  isConnected: true,
  ...extra,
});
const PLAYERS = [player("me", "Alice"), player("them", "Bob")];

function finished(overrides: Partial<VamanaPublicState> = {}): VamanaPublicState {
  return {
    kind: "vamanaguntalu",
    phase: "finished",
    options: { turnTimerSeconds: 25, botDifficulty: "medium" },
    playerOrder: ["me", "them"],
    turnPlayerId: "me",
    pits: Array(14).fill(0),
    captured: { me: 41, them: 29 },
    swept: { me: 4, them: 0 },
    winnerId: "me",
    isDraw: false,
    endReason: "seeds",
    moveCount: 40,
    lastMove: null,
    turnDeadline: null,
    ...overrides,
  };
}

describe("describeVamanaOutcome", () => {
  it("says nothing while the match is still being played", () => {
    expect(describeVamanaOutcome(finished({ phase: "playing" }), "me", PLAYERS).kind).toBe("none");
  });

  it("tells the winner they won, with the seed count", () => {
    const outcome = describeVamanaOutcome(finished(), "me", PLAYERS);
    expect(outcome.kind).toBe("win");
    expect(outcome.headline).toBe("VICTORY — 41 TO 29");
    expect(outcome.announcement).toMatch(/won/i);
  });

  it("tells the loser they lost, with the seed count from the winner's side", () => {
    const outcome = describeVamanaOutcome(finished(), "them", PLAYERS);
    expect(outcome.kind).toBe("loss");
    expect(outcome.headline).toBe("DEFEAT — 41 TO 29");
  });

  it("reads the score correctly when the second seat wins", () => {
    const state = finished({ winnerId: "them", captured: { me: 22, them: 48 } });
    expect(describeVamanaOutcome(state, "them", PLAYERS).headline).toBe("VICTORY — 48 TO 22");
    expect(describeVamanaOutcome(state, "me", PLAYERS).headline).toBe("DEFEAT — 48 TO 22");
  });

  it("never presents a draw as a win or a loss for anyone", () => {
    const state = finished({ winnerId: null, isDraw: true, endReason: "draw", captured: { me: 35, them: 35 } });
    for (const viewer of ["me", "them", "spectator", ""]) {
      const outcome = describeVamanaOutcome(state, viewer, PLAYERS);
      expect(outcome.kind).toBe("draw");
      expect(outcome.headline).toBe("DRAW — 35 SEEDS EACH");
    }
  });

  it("treats a missing winner as a draw even if the flags disagree", () => {
    const state = finished({ winnerId: null, isDraw: false, endReason: "seeds" });
    expect(describeVamanaOutcome(state, "me", PLAYERS).kind).toBe("draw");
  });

  it("says the opponent left when the winner won by walkover — no score is claimed", () => {
    const state = finished({ endReason: "forfeit", captured: { me: 12, them: 9 }, swept: { me: 0, them: 0 } });
    const outcome = describeVamanaOutcome(state, "me", PLAYERS);
    expect(outcome.kind).toBe("win");
    expect(outcome.headline).toBe("VICTORY — OPPONENT LEFT");
    expect(outcome.headline).not.toMatch(/\d/);
  });

  it("describes the result neutrally to a spectator", () => {
    const outcome = describeVamanaOutcome(finished(), "watcher", PLAYERS);
    expect(outcome.kind).toBe("spectated");
    expect(outcome.headline).toBe("ALICE WINS — 41 TO 29");
  });

  it("names the winner, not 'victory' or 'defeat', when one person plays both sides on one device", () => {
    const players = [player("me", "Alice"), player("local", "Bob", { isLocal: true })];
    const state = finished({ playerOrder: ["me", "local"], captured: { me: 30, local: 40 }, winnerId: "local" });
    for (const viewer of ["me", "local"]) {
      const outcome = describeVamanaOutcome(state, viewer, players);
      expect(outcome.kind).toBe("passplay");
      expect(outcome.headline).toBe("BOB WINS — 40 TO 30");
    }
  });

  it("falls back to a generic name when the winner is not in the player list", () => {
    const outcome = describeVamanaOutcome(finished({ winnerId: "ghost", playerOrder: ["me", "ghost"], captured: { me: 10, ghost: 60 } }), "watcher", PLAYERS);
    expect(outcome.headline).toContain("OPPONENT WINS");
  });
});
