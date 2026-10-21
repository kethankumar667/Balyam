import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { RoomLivenessResult } from "../../core/recovery/roomLiveness";
import {
  WATCH_FIRST_CHECK_MS,
  WATCH_OPEN_RECHECK_MS,
  WATCH_UNREACHABLE_BASE_MS,
  WATCH_UNREACHABLE_MAX_MS,
  useRoomWatch,
} from "../useRoomWatch";

const checkRoomAlive = vi.fn<[string, string | undefined], Promise<RoomLivenessResult>>();
vi.mock("../../core/recovery/roomLiveness", () => ({
  checkRoomAlive: (code: string, seatId?: string) => checkRoomAlive(code, seatId),
}));

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const gone: RoomLivenessResult = { alive: false, reason: "NOT_FOUND" };
const silent: RoomLivenessResult = { alive: false, reason: "UNREACHABLE" };
const alive: RoomLivenessResult = { alive: true, game: "bingo", phase: "playing" };

function watch(over: Partial<Parameters<typeof useRoomWatch>[0]> = {}) {
  const onRefusal = vi.fn();
  const view = renderHook((props: Parameters<typeof useRoomWatch>[0]) => useRoomWatch(props), {
    initialProps: { code: "ABC123", seatId: "p_1", enabled: true, onRefusal, ...over },
  });
  return { ...view, onRefusal };
}

describe("useRoomWatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    checkRoomAlive.mockReset().mockResolvedValue(alive);
  });
  afterEach(() => {
    // Unmount first: a hook left mounted keeps its focus / online / visibility listeners and answers the next test's events.
    cleanup();
    vi.useRealTimers();
  });

  it("asks nothing while it is switched off", async () => {
    const { result } = watch({ enabled: false });
    await advance(60_000);
    expect(checkRoomAlive).not.toHaveBeenCalled();
    expect(result.current.serverReachable).toBeNull();
  });

  it("gives a normal join time to land before it costs a request", async () => {
    watch();
    await advance(WATCH_FIRST_CHECK_MS - 1);
    expect(checkRoomAlive).not.toHaveBeenCalled();
    await advance(1);
    expect(checkRoomAlive).toHaveBeenCalledTimes(1);
  });

  it("asks about this room, with this player's seat", async () => {
    watch({ code: "XYZ789", seatId: "p_seat" });
    await advance(WATCH_FIRST_CHECK_MS);
    expect(checkRoomAlive).toHaveBeenCalledWith("XYZ789", "p_seat");
  });

  it("says the room is gone once, and then stops asking", async () => {
    checkRoomAlive.mockResolvedValue(gone);
    const { onRefusal } = watch();
    await advance(WATCH_FIRST_CHECK_MS);
    expect(onRefusal).toHaveBeenCalledTimes(1);
    expect(onRefusal).toHaveBeenCalledWith("not_found");
    await advance(120_000);
    expect(checkRoomAlive).toHaveBeenCalledTimes(1);
    expect(onRefusal).toHaveBeenCalledTimes(1);
  });

  it("tells a player whose seat was released from a match that has moved on, and does not for a lobby", async () => {
    checkRoomAlive.mockResolvedValue({ alive: false, reason: "SEAT_EXPIRED", phase: "finished" });
    const finished = watch();
    await advance(WATCH_FIRST_CHECK_MS);
    expect(finished.onRefusal).toHaveBeenCalledWith("started");
    finished.unmount();

    checkRoomAlive.mockResolvedValue({ alive: false, reason: "SEAT_EXPIRED", phase: "lobby" });
    const lobby = watch();
    await advance(WATCH_FIRST_CHECK_MS);
    expect(lobby.onRefusal).not.toHaveBeenCalled();
  });

  it("reports a silent server, and backs off from 3s towards 8s", async () => {
    checkRoomAlive.mockResolvedValue(silent);
    const { result, onRefusal } = watch();
    await advance(WATCH_FIRST_CHECK_MS);
    expect(result.current.serverReachable).toBe(false);
    expect(checkRoomAlive).toHaveBeenCalledTimes(1);

    await advance(WATCH_UNREACHABLE_BASE_MS - 1);
    expect(checkRoomAlive).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(checkRoomAlive).toHaveBeenCalledTimes(2);

    // 4s, then 5s, 6s, 7s, and from there it never waits longer than the cap.
    for (const wait of [4_000, 5_000, 6_000, 7_000]) {
      const before = checkRoomAlive.mock.calls.length;
      await advance(wait - 1);
      expect(checkRoomAlive).toHaveBeenCalledTimes(before);
      await advance(1);
      expect(checkRoomAlive).toHaveBeenCalledTimes(before + 1);
    }
    const before = checkRoomAlive.mock.calls.length;
    await advance(WATCH_UNREACHABLE_MAX_MS);
    expect(checkRoomAlive).toHaveBeenCalledTimes(before + 1);
    expect(onRefusal).not.toHaveBeenCalled();
  });

  it("treats a throw from the check as silence rather than giving up", async () => {
    checkRoomAlive.mockRejectedValueOnce(new Error("boom")).mockResolvedValue(gone);
    const { result, onRefusal } = watch();
    await advance(WATCH_FIRST_CHECK_MS);
    expect(result.current.serverReachable).toBe(false);
    await advance(WATCH_UNREACHABLE_BASE_MS);
    expect(onRefusal).toHaveBeenCalledWith("not_found");
  });

  it("keeps watching a room that is there but not joined yet, and notices when it closes", async () => {
    const { result, onRefusal } = watch();
    await advance(WATCH_FIRST_CHECK_MS);
    expect(result.current.serverReachable).toBe(true);
    expect(onRefusal).not.toHaveBeenCalled();

    checkRoomAlive.mockResolvedValue(gone);
    await advance(WATCH_OPEN_RECHECK_MS);
    expect(onRefusal).toHaveBeenCalledWith("not_found");
  });

  it("asks again at once when a returning player brings the tab back, but not while it is hidden", async () => {
    checkRoomAlive.mockResolvedValue(silent);
    watch();
    await advance(WATCH_FIRST_CHECK_MS);
    expect(checkRoomAlive).toHaveBeenCalledTimes(1);

    // A plain own-property override, removed afterwards. `vi.spyOn(document, "visibilityState", "get")` + restore can
    // leave the property pointing at itself when the real getter lives on the prototype, and the next read recurses.
    let visibility: DocumentVisibilityState = "hidden";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    try {
      await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
      expect(checkRoomAlive).toHaveBeenCalledTimes(1);

      visibility = "visible";
      await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
      expect(checkRoomAlive).toHaveBeenCalledTimes(2);

      await act(async () => { window.dispatchEvent(new Event("online")); });
      expect(checkRoomAlive).toHaveBeenCalledTimes(3);
    } finally {
      delete (document as { visibilityState?: unknown }).visibilityState;
    }
  });

  it("does not stack a second check on top of one still in flight", async () => {
    let finish!: (value: RoomLivenessResult) => void;
    checkRoomAlive.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    watch();
    await advance(WATCH_FIRST_CHECK_MS);
    await act(async () => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("online")); });
    expect(checkRoomAlive).toHaveBeenCalledTimes(1);
    await act(async () => finish(alive));
  });

  it("stops everything when switched off or unmounted, and forgets what it knew", async () => {
    checkRoomAlive.mockResolvedValue(silent);
    const { result, rerender, unmount, onRefusal } = watch();
    await advance(WATCH_FIRST_CHECK_MS);
    expect(result.current.serverReachable).toBe(false);

    rerender({ code: "ABC123", seatId: "p_1", enabled: false, onRefusal });
    expect(result.current.serverReachable).toBeNull();
    const calls = checkRoomAlive.mock.calls.length;
    await advance(60_000);
    expect(checkRoomAlive).toHaveBeenCalledTimes(calls);

    rerender({ code: "ABC123", seatId: "p_1", enabled: true, onRefusal });
    await advance(WATCH_FIRST_CHECK_MS);
    expect(checkRoomAlive).toHaveBeenCalledTimes(calls + 1);
    unmount();
    await advance(60_000);
    expect(checkRoomAlive).toHaveBeenCalledTimes(calls + 1);
  });
});
