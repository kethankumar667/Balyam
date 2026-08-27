import { describe, it, expect } from "vitest";
import { deriveTerminalMatchId, isMatchStartTransition, buildCommitmentPayload } from "../economyMotionTriggers";
import type { RoomPublicState, Player } from "@shared/types";

/**
 * These three functions ARE the fix for the audited contract mismatch:
 * `currentMatchId` is nulled by the server in the same broadcast that
 * reports a match finished, so the frontend must derive the terminal id
 * from `lastMatchId`, never fall back to the room code for a per-match
 * sequence id, and never fire the commitment animation ahead of a real,
 * authoritative commit. Tested in isolation, without mounting Room.tsx,
 * so the actual defect (a broadcast-shape/timing bug, not a rendering
 * bug) is provable directly against the real derivation logic.
 */

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "p1",
    name: "Alice",
    isHost: true,
    isReady: true,
    isConnected: true,
    ...overrides,
  } as Player;
}

describe("deriveTerminalMatchId", () => {
  it("returns lastMatchId only once phase is finished", () => {
    expect(
      deriveTerminalMatchId({ phase: "finished", lastMatchId: "m_123" } as RoomPublicState),
    ).toBe("m_123");
  });

  it("returns undefined while the match is still playing, even if lastMatchId happens to be set from a PRIOR match", () => {
    expect(
      deriveTerminalMatchId({ phase: "playing", lastMatchId: "m_stale" } as RoomPublicState),
    ).toBeUndefined();
  });

  it("returns undefined in the lobby", () => {
    expect(deriveTerminalMatchId({ phase: "lobby", lastMatchId: null } as RoomPublicState)).toBeUndefined();
  });

  it("returns undefined for a null roomState (not yet loaded)", () => {
    expect(deriveTerminalMatchId(null)).toBeUndefined();
    expect(deriveTerminalMatchId(undefined)).toBeUndefined();
  });

  it("never falls back to currentMatchId — it must not exist by the time phase is finished, per the server contract", () => {
    // Simulates the exact broadcast shape that exposed the bug: the SAME
    // message reports phase:"finished" AND currentMatchId already null.
    const finishedBroadcast = { phase: "finished", lastMatchId: "m_real" } as RoomPublicState;
    expect(deriveTerminalMatchId(finishedBroadcast)).toBe("m_real");
  });
});

describe("isMatchStartTransition", () => {
  it("true for a fresh match: lobby -> playing", () => {
    expect(isMatchStartTransition("lobby", "playing")).toBe(true);
  });

  it("true for a rematch: finished -> playing (RoomManager.startRematch sets phase directly, never back through lobby)", () => {
    expect(isMatchStartTransition("finished", "playing")).toBe(true);
  });

  it("false for any other transition into playing", () => {
    expect(isMatchStartTransition("playing", "playing")).toBe(false);
    expect(isMatchStartTransition(undefined, "playing")).toBe(false);
  });

  it("false when not transitioning into playing at all", () => {
    expect(isMatchStartTransition("lobby", "finished")).toBe(false);
    expect(isMatchStartTransition("playing", "finished")).toBe(false);
  });
});

describe("buildCommitmentPayload", () => {
  const players = [player({ id: "p1", name: "Alice", isHost: true }), player({ id: "p2", name: "Bot", isHost: false, isBot: true })];

  it("builds a real payload from authoritative broadcast fields — never a guess", () => {
    const payload = buildCommitmentPayload(
      {
        currentMatchId: "m_real_123",
        committedCostPerSeat: "100",
        committedTotalPot: "200",
        players,
      },
      "p1",
    );
    expect(payload).not.toBeNull();
    expect(payload?.matchId).toBe("m_real_123");
    expect(payload?.sequenceId).toBe("commit-m_real_123");
    expect(payload?.amountPerSeat).toBe("100");
    expect(payload?.totalPotAmount).toBe("200");
    expect(payload?.seats).toHaveLength(2);
    expect(payload?.seats[0]).toMatchObject({ seatId: "p1", isHost: true, isSelf: true });
    expect(payload?.seats[1]).toMatchObject({ seatId: "p2", isBot: true, isSelf: false });
  });

  it("the sequence id is match-scoped, never room-code-scoped — a second match in the same room gets a different id", () => {
    const first = buildCommitmentPayload({
      currentMatchId: "m_first",
      committedCostPerSeat: "100",
      committedTotalPot: "200",
      players,
    });
    const second = buildCommitmentPayload({
      currentMatchId: "m_second_after_rematch",
      committedCostPerSeat: "100",
      committedTotalPot: "200",
      players,
    });
    expect(first?.sequenceId).not.toBe(second?.sequenceId);
    expect(first?.sequenceId).not.toContain("ROOMCODE");
  });

  it("returns null (never a room-code fallback, never an optimistic guess) when there is no authoritative commit to animate", () => {
    expect(
      buildCommitmentPayload({ currentMatchId: null, committedCostPerSeat: null, committedTotalPot: null, players }),
    ).toBeNull();
    // Partial data (e.g. a stale/incomplete broadcast) is treated the same as absent — no half-real payload.
    expect(
      buildCommitmentPayload({ currentMatchId: "m_x", committedCostPerSeat: null, committedTotalPot: "200", players }),
    ).toBeNull();
  });

  it("omits isSelf when no selfId is supplied, rather than guessing", () => {
    const payload = buildCommitmentPayload({
      currentMatchId: "m_x",
      committedCostPerSeat: "100",
      committedTotalPot: "200",
      players,
    });
    expect(payload?.seats[0].isSelf).toBeUndefined();
  });
});
