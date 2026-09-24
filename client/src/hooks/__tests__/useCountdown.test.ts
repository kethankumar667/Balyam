import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountdown, useIsCountingDown } from "../useCountdown";

const HOUR = 60 * 60 * 1000;

describe("useIsCountingDown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is false when there is no deadline", () => {
    const { result } = renderHook(() => useIsCountingDown(null));

    expect(result.current).toBe(false);
  });

  it("is true before the deadline and flips to false by itself once it passes", () => {
    const endsAt = Date.now() + 4 * HOUR;
    const { result } = renderHook(() => useIsCountingDown(endsAt));
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4 * HOUR + 100);
    });

    expect(result.current).toBe(false);
  });

  it("is false for a deadline already in the past", () => {
    const { result } = renderHook(() => useIsCountingDown(Date.now() - 1));

    expect(result.current).toBe(false);
  });

  it("re-renders once when the time runs out, not every second", () => {
    let renders = 0;
    const endsAt = Date.now() + 4 * HOUR;
    renderHook(() => {
      renders += 1;
      return useIsCountingDown(endsAt);
    });
    const afterMount = renders;

    act(() => {
      vi.advanceTimersByTime(4 * HOUR + 100);
    });

    expect(renders - afterMount).toBeLessThanOrEqual(1);
  });
});

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down each second and stops at zero", () => {
    const endsAt = Date.now() + 3000;
    const { result } = renderHook(() => useCountdown(endsAt));
    expect(result.current).toBe(3000);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2000);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(0);
  });
});
