import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Connect4PublicState } from "@shared/types.js";

type Handler = (...args: unknown[]) => void;
const handlers = new Map<string, Set<Handler>>();
const emit = vi.fn();
const fakeSocket = {
  emit,
  on: vi.fn((event: string, h: Handler) => {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(h);
  }),
  off: vi.fn((event: string, h: Handler) => {
    handlers.get(event)?.delete(h);
  }),
};
vi.mock("../../../lib/socket", () => ({ getSocket: () => fakeSocket }));

import { useConnect4Move, MOVE_LOCK_TIMEOUT_MS } from "../useConnect4Move";

function makeState(overrides: Partial<Connect4PublicState> = {}): Connect4PublicState {
  const emptyGrid = Array.from({ length: 6 }, () => Array(7).fill(null));
  return {
    kind: "connect4",
    phase: "playing",
    options: { turnTimerSeconds: 20, botDifficulty: "medium" },
    playerOrder: ["me", "them"],
    playerDiscs: { me: "R", them: "Y" },
    turnPlayerId: "me",
    grid: emptyGrid,
    winningCells: null,
    winnerId: null,
    isDraw: false,
    endReason: null,
    moveCount: 0,
    discsPlaced: { me: 0, them: 0 },
    turnDeadline: null,
    lastMove: null,
    ...overrides,
  };
}

const fireServerError = () => handlers.get("game:error")?.forEach((h) => h("Not your turn"));

describe("useConnect4Move", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    handlers.clear();
    emit.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(state = makeState(), selfId = "me") {
    return renderHook(({ s }) => useConnect4Move({ state: s, selfId }), {
      initialProps: { s: state },
    });
  }

  it("emits a drop move for the acting seat and locks further taps", () => {
    const { result } = setup();
    let sent = false;
    act(() => {
      sent = result.current.dropDisc(3);
    });
    expect(sent).toBe(true);
    expect(emit).toHaveBeenCalledWith("game:move", {
      type: "drop",
      data: { column: 3 },
      playerId: "me",
    });
    expect(result.current.isPending).toBe(true);

    // Further clicks ignored while in flight (double-click guard)
    let secondSent = false;
    act(() => {
      secondSent = result.current.dropDisc(3);
    });
    expect(secondSent).toBe(false);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("unlocks when authoritative state advances", () => {
    const initial = makeState();
    const { result, rerender } = setup(initial);
    act(() => {
      result.current.dropDisc(2);
    });
    expect(result.current.isPending).toBe(true);

    rerender({
      s: { ...initial, turnPlayerId: "them", moveCount: 1 },
    });
    expect(result.current.isPending).toBe(false);
  });

  it("unlocks when server responds with game:error", () => {
    const { result } = setup();
    act(() => {
      result.current.dropDisc(0);
    });
    expect(result.current.isPending).toBe(true);

    act(() => {
      fireServerError();
    });
    expect(result.current.isPending).toBe(false);
  });

  it("unlocks after timeout safety net", () => {
    const { result } = setup();
    act(() => {
      result.current.dropDisc(1);
    });
    expect(result.current.isPending).toBe(true);

    act(() => {
      vi.advanceTimersByTime(MOVE_LOCK_TIMEOUT_MS);
    });
    expect(result.current.isPending).toBe(false);
  });

  it("rejects drops when it is not your turn or column is full", () => {
    const notMyTurnState = makeState({ turnPlayerId: "them" });
    const { result: notMyTurn } = setup(notMyTurnState);
    expect(notMyTurn.current.isMyTurn).toBe(false);
    let sent = false;
    act(() => {
      sent = notMyTurn.current.dropDisc(0);
    });
    expect(sent).toBe(false);

    // Full column 0 (row 0 occupied)
    const fullColGrid = Array.from({ length: 6 }, () => Array(7).fill(null));
    fullColGrid[0][0] = "R";
    const fullColState = makeState({ grid: fullColGrid });
    const { result: fullCol } = setup(fullColState);
    let fullSent = false;
    act(() => {
      fullSent = fullCol.current.dropDisc(0);
    });
    expect(fullSent).toBe(false);
  });
});
