import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLACE_INTERVAL_MS, useThrottledPlace } from "../useThrottledPlace";

/**
 * Sliding the striker along the baseline used to send one message to the server for every input
 * event, hundreds a second on a fast mouse, and the server answered each with a full state broadcast.
 * The striker is drawn from that answer, so it lagged and stuttered under the finger. Now it is at
 * most one message per interval, and the last position always gets through.
 */

const send = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  send.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useThrottledPlace", () => {
  it("sends the first position straight away", () => {
    const { result } = renderHook(() => useThrottledPlace(send));

    act(() => result.current(0.3));

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith(0.3);
  });

  it("turns a burst of movements into two messages: the first, and the last", () => {
    const { result } = renderHook(() => useThrottledPlace(send));

    act(() => {
      for (let i = 0; i <= 100; i++) result.current(i / 100);
    });
    expect(send).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(PLACE_INTERVAL_MS);
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith(1);
  });

  it("never loses the final position, however briefly it was held", () => {
    const { result } = renderHook(() => useThrottledPlace(send));

    act(() => result.current(0.2));
    act(() => {
      vi.advanceTimersByTime(PLACE_INTERVAL_MS / 5);
    });
    act(() => result.current(0.7));
    act(() => {
      vi.advanceTimersByTime(PLACE_INTERVAL_MS * 3);
    });

    expect(send).toHaveBeenLastCalledWith(0.7);
  });

  it("keeps up with a slow drag by sending every step", () => {
    const { result } = renderHook(() => useThrottledPlace(send));

    for (let i = 0; i < 5; i++) {
      act(() => result.current(i / 10));
      act(() => {
        vi.advanceTimersByTime(PLACE_INTERVAL_MS + 5);
      });
    }

    expect(send.mock.calls.map((c) => c[0])).toEqual([0, 0.1, 0.2, 0.3, 0.4]);
  });

  it("does not send a stale position after the player has left", () => {
    const { result, unmount } = renderHook(() => useThrottledPlace(send));
    act(() => result.current(0.2));
    act(() => result.current(0.9));

    unmount();
    act(() => {
      vi.advanceTimersByTime(PLACE_INTERVAL_MS * 3);
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("uses the latest send function, not the one from the first render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useThrottledPlace(fn), { initialProps: { fn: first } });
    act(() => result.current(0.1));

    rerender({ fn: second });
    act(() => result.current(0.5));
    act(() => {
      vi.advanceTimersByTime(PLACE_INTERVAL_MS);
    });

    expect(second).toHaveBeenLastCalledWith(0.5);
  });
});
