import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import type { MandaliAroundPerson } from "@shared/mandali/types";

const apiJson = vi.fn();
vi.mock("../../../lib/playerIdentity", () => ({
  apiJson: (...args: unknown[]) => apiJson(...args),
}));

import { useAroundNow, AROUND_POLL_MS } from "../useAroundNow";

const BALA: MandaliAroundPerson = { playerId: "p_bala", displayName: "Bala", avatar: "avatar_1", presence: "online" };
const RAVI: MandaliAroundPerson = { playerId: "p_ravi", displayName: "Ravi", avatar: "avatar_2", presence: "in-game", activeGame: "ludo" };

function answer(around: MandaliAroundPerson[]) {
  apiJson.mockResolvedValue({ success: true, around });
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  apiJson.mockReset();
  setVisibility("visible");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useAroundNow", () => {
  it("asks for nothing and returns nobody while disabled", async () => {
    answer([BALA]);
    const { result } = renderHook(() => useAroundNow(false));
    await flush();

    expect(apiJson).not.toHaveBeenCalled();
    expect(result.current).toEqual([]);
  });

  it("loads who is around as soon as it is enabled", async () => {
    answer([BALA, RAVI]);
    const { result } = renderHook(() => useAroundNow(true));
    await flush();

    expect(apiJson).toHaveBeenCalledWith("/api/mandali/around");
    expect(result.current.map((p) => p.playerId)).toEqual(["p_bala", "p_ravi"]);
  });

  it("refreshes on a timer while the page is visible", async () => {
    answer([BALA]);
    renderHook(() => useAroundNow(true));
    await flush();
    expect(apiJson).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AROUND_POLL_MS);
    });

    expect(apiJson).toHaveBeenCalledTimes(2);
  });

  it("does not ask while the tab is hidden", async () => {
    answer([BALA]);
    renderHook(() => useAroundNow(true));
    await flush();
    setVisibility("hidden");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AROUND_POLL_MS * 3);
    });

    expect(apiJson).toHaveBeenCalledTimes(1);
  });

  it("catches up the moment the tab becomes visible again", async () => {
    answer([BALA]);
    renderHook(() => useAroundNow(true));
    await flush();
    setVisibility("hidden");
    setVisibility("visible");

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(apiJson).toHaveBeenCalledTimes(2);
  });

  it("keeps the last list when a refresh fails, instead of flickering to empty", async () => {
    answer([BALA]);
    const { result } = renderHook(() => useAroundNow(true));
    await flush();

    apiJson.mockResolvedValue(null);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AROUND_POLL_MS);
    });

    expect(result.current.map((p) => p.playerId)).toEqual(["p_bala"]);
  });

  it("empties the list when it is switched off", async () => {
    answer([BALA]);
    const { result, rerender } = renderHook(({ on }) => useAroundNow(on), { initialProps: { on: true } });
    await flush();
    expect(result.current).toHaveLength(1);

    rerender({ on: false });
    await flush();

    expect(result.current).toEqual([]);
  });

  it("stops asking once the page is gone", async () => {
    answer([BALA]);
    const { unmount } = renderHook(() => useAroundNow(true));
    await flush();
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AROUND_POLL_MS * 3);
    });

    expect(apiJson).toHaveBeenCalledTimes(1);
  });
});
