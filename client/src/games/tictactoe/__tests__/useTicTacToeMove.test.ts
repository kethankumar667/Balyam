import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { TicTacToePublicState } from "@shared/types.js";

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

import { useTicTacToeMove, MOVE_LOCK_TIMEOUT_MS } from "../useTicTacToeMove";

function makeState(overrides: Partial<TicTacToePublicState> = {}): TicTacToePublicState {
  return {
    kind: "tictactoe",
    phase: "playing",
    options: { mode: "classic", turnTimerSeconds: 15 },
    playerOrder: ["me", "them"],
    playerMarks: { me: "X", them: "O" },
    turnPlayerId: "me",
    grid: Array(9).fill(null),
    pieceQueues: { X: [], O: [] },
    winningLine: null,
    winnerId: null,
    moveCount: 0,
    turnDeadline: null,
    lastEvaporatedCell: null,
    ...overrides,
  };
}

const fireServerError = () => handlers.get("game:error")?.forEach((h) => h("Not your turn"));

describe("useTicTacToeMove", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    handlers.clear();
    emit.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(state = makeState(), selfId = "me") {
    return renderHook(({ s }) => useTicTacToeMove({ state: s, selfId }), { initialProps: { s: state } });
  }

  it("emits a place move for the acting seat and locks further taps", () => {
    const { result } = setup();
    let sent = false;
    act(() => {
      sent = result.current.placeMark(4);
    });
    expect(sent).toBe(true);
    expect(emit).toHaveBeenCalledWith("game:move", { type: "place", data: { cellIndex: 4 }, playerId: "me" });
    expect(result.current.isPending).toBe(true);

    act(() => {
      expect(result.current.placeMark(5)).toBe(false);
    });
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("unlocks when the authoritative state moves on", () => {
    const { result, rerender } = setup();
    act(() => {
      result.current.placeMark(0);
    });
    expect(result.current.isPending).toBe(true);
    rerender({ s: makeState({ turnPlayerId: "them", moveCount: 1 }) });
    expect(result.current.isPending).toBe(false);
  });

  it("unlocks when the server rejects the move, so an untimed game cannot freeze", () => {
    const { result } = setup(makeState({ options: { mode: "classic", turnTimerSeconds: 0 } }));
    act(() => {
      result.current.placeMark(0);
    });
    expect(result.current.isPending).toBe(true);
    act(() => fireServerError());
    expect(result.current.isPending).toBe(false);
    act(() => {
      expect(result.current.placeMark(1)).toBe(true);
    });
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("unlocks after a timeout if the move was silently lost", () => {
    const { result } = setup();
    act(() => {
      result.current.placeMark(0);
    });
    act(() => {
      vi.advanceTimersByTime(MOVE_LOCK_TIMEOUT_MS + 1);
    });
    expect(result.current.isPending).toBe(false);
  });

  it.each([
    ["it is not this seat's turn", makeState({ turnPlayerId: "them" })],
    ["the match is over", makeState({ phase: "finished", winnerId: "them" })],
    ["the cell is occupied", makeState({ grid: [{ mark: "O", playerId: "them", moveNumber: 1 }, ...Array(8).fill(null)] })],
  ])("does not send when %s", (_label, state) => {
    const { result } = setup(state);
    act(() => {
      expect(result.current.placeMark(0)).toBe(false);
    });
    expect(emit).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
  });

  it("does not send for a spectator", () => {
    const { result } = setup(makeState(), "");
    act(() => {
      expect(result.current.placeMark(0)).toBe(false);
    });
    expect(emit).not.toHaveBeenCalled();
  });

  it("rejects out-of-range cell indexes", () => {
    const { result } = setup();
    act(() => {
      expect(result.current.placeMark(-1)).toBe(false);
      expect(result.current.placeMark(9)).toBe(false);
      expect(result.current.placeMark(1.5)).toBe(false);
    });
    expect(emit).not.toHaveBeenCalled();
  });

  it("acts as the local seat on a Pass & Play device", () => {
    const { result } = setup(makeState({ turnPlayerId: "local_bob", playerMarks: { me: "X", local_bob: "O" } }), "local_bob");
    act(() => {
      result.current.placeMark(2);
    });
    expect(emit).toHaveBeenCalledWith("game:move", { type: "place", data: { cellIndex: 2 }, playerId: "local_bob" });
  });

  it("removes its socket listener on unmount", () => {
    const { unmount } = setup();
    expect(handlers.get("game:error")?.size).toBe(1);
    unmount();
    expect(handlers.get("game:error")?.size ?? 0).toBe(0);
  });
});
