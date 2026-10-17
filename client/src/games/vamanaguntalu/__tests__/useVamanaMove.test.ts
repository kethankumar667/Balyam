import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { VamanaPublicState } from "@shared/types.js";

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

import { useVamanaMove, MOVE_LOCK_TIMEOUT_MS } from "../useVamanaMove";

function makeState(overrides: Partial<VamanaPublicState> = {}): VamanaPublicState {
  return {
    kind: "vamanaguntalu",
    phase: "playing",
    options: { turnTimerSeconds: 25, botDifficulty: "medium" },
    playerOrder: ["me", "them"],
    turnPlayerId: "me",
    pits: Array(14).fill(5),
    captured: { me: 0, them: 0 },
    swept: { me: 0, them: 0 },
    winnerId: null,
    isDraw: false,
    endReason: null,
    moveCount: 0,
    lastMove: null,
    turnDeadline: null,
    ...overrides,
  };
}

const fireServerError = () => handlers.get("game:error")?.forEach((h) => h("Not your turn"));

describe("useVamanaMove", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    handlers.clear();
    emit.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(state = makeState(), selfId = "me") {
    return renderHook(({ s }) => useVamanaMove({ state: s, selfId }), { initialProps: { s: state } });
  }

  it("emits a sow for the acting seat and locks further taps", () => {
    const { result } = setup();
    let sent = false;
    act(() => {
      sent = result.current.sowPit(3);
    });
    expect(sent).toBe(true);
    expect(emit).toHaveBeenCalledWith("game:move", { type: "sow", data: { pit: 3 }, playerId: "me" });
    expect(result.current.isPending).toBe(true);

    let secondSent = false;
    act(() => {
      secondSent = result.current.sowPit(3);
    });
    expect(secondSent).toBe(false);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("unlocks when authoritative state advances", () => {
    const initial = makeState();
    const { result, rerender } = setup(initial);
    act(() => {
      result.current.sowPit(2);
    });
    expect(result.current.isPending).toBe(true);
    rerender({ s: { ...initial, turnPlayerId: "them", moveCount: 1 } });
    expect(result.current.isPending).toBe(false);
  });

  it("unlocks when the server answers with game:error", () => {
    const { result } = setup();
    act(() => {
      result.current.sowPit(0);
    });
    act(() => {
      fireServerError();
    });
    expect(result.current.isPending).toBe(false);
  });

  it("unlocks after the timeout safety net", () => {
    const { result } = setup();
    act(() => {
      result.current.sowPit(1);
    });
    act(() => {
      vi.advanceTimersByTime(MOVE_LOCK_TIMEOUT_MS);
    });
    expect(result.current.isPending).toBe(false);
  });

  it("sends nothing when it is not your turn", () => {
    const { result } = setup(makeState({ turnPlayerId: "them" }));
    expect(result.current.isMyTurn).toBe(false);
    let sent = true;
    act(() => {
      sent = result.current.sowPit(0);
    });
    expect(sent).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });

  it("sends nothing once the match is over", () => {
    const { result } = setup(makeState({ phase: "finished" }));
    expect(result.current.sowPit(0)).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });

  it("sends nothing for a spectator", () => {
    const { result } = setup(makeState(), "watcher");
    expect(result.current.sowPit(0)).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });

  it("refuses the opponent's pits and empty pits without a round trip", () => {
    const pits = Array(14).fill(5);
    pits[2] = 0;
    const { result } = setup(makeState({ pits }));
    expect(result.current.canSow(7)).toBe(false); // opponent's row
    expect(result.current.canSow(2)).toBe(false); // own but empty
    expect(result.current.canSow(3)).toBe(true);
    act(() => {
      result.current.sowPit(7);
      result.current.sowPit(2);
    });
    expect(emit).not.toHaveBeenCalled();
  });

  it("lets the second seat sow its own row (pits 7..13) and not the first seat's", () => {
    const { result } = setup(makeState({ turnPlayerId: "them" }), "them");
    expect(result.current.canSow(9)).toBe(true);
    expect(result.current.canSow(2)).toBe(false);
  });

  it("refuses pit numbers that are not whole board positions", () => {
    const { result } = setup();
    for (const bad of [-1, 14, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(result.current.canSow(bad)).toBe(false);
    }
  });

  it("stops listening for server errors when it unmounts", () => {
    const { unmount } = setup();
    expect(handlers.get("game:error")?.size).toBe(1);
    unmount();
    expect(handlers.get("game:error")?.size ?? 0).toBe(0);
  });
});
