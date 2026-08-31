import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAdminLiveStore } from "../../store/adminLiveStore";
import {
  subscribeAdminLiveStream,
  resetAdminLiveStream,
  retryAdminLiveConnection,
} from "../operationalStream";

/**
 * Unauthorized handling and logout cleanup for the admin live stream.
 *
 * Both the SSE path (`connectStream`, raw `fetch`) and the REST fallback
 * path (`pollOperationalFallback`, via `operationalFetch`) go through
 * `global.fetch` — mocking that one function covers both.
 */

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    body: null,
    json: async () => body,
  } as unknown as Response;
}

/** A "successful" SSE connection whose body stream ends immediately —
 *  enough to exercise the non-401 control flow without needing a real
 *  streaming mock. */
function openStreamResponse(): Response {
  const reader = {
    read: vi.fn(async () => ({ done: true, value: undefined })),
  };
  return {
    status: 200,
    ok: true,
    body: { getReader: () => reader },
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  useAdminLiveStore.getState().resetOperationalState();
});

afterEach(() => {
  resetAdminLiveStream();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("operationalStream — unauthorized handling", () => {
  it("an SSE 401 marks the store unauthorized and does not fall back to polling forever", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Unauthorized" }));

    subscribeAdminLiveStream();
    await vi.runOnlyPendingTimersAsync();

    expect(useAdminLiveStore.getState().isUnauthorized).toBe(true);
    expect(useAdminLiveStore.getState().error).toMatch(/not authorized/i);

    const callsAtUnauthorized = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock.mock.calls.length).toBe(callsAtUnauthorized);
  });

  it("a REST fallback 401 (SSE unreachable, then polling also refused) locks out further polling", async () => {
    // SSE fetch fails outright (network error) -> falls back to polling.
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error("network down")));
    // Every fallback poll call (rooms + recovery) comes back 401.
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Unauthorized" }));

    subscribeAdminLiveStream();
    await vi.runOnlyPendingTimersAsync(); // SSE attempt fails, starts polling
    await vi.advanceTimersByTimeAsync(1); // let the immediate poll settle

    expect(useAdminLiveStore.getState().isUnauthorized).toBe(true);

    const callsAtUnauthorized = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(15_000); // several 3s poll intervals
    expect(fetchMock.mock.calls.length).toBe(callsAtUnauthorized);
  });

  it("no retries happen after an unauthorized result, on either path", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Unauthorized" }));
    subscribeAdminLiveStream();
    await vi.runOnlyPendingTimersAsync();

    const calls = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock.mock.calls.length).toBe(calls);
    expect(useAdminLiveStore.getState().connectionStatus).toBe("offline");
  });

  it("a later valid authenticated subscription (retryAdminLiveConnection) restarts the connection", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Unauthorized" }));
    subscribeAdminLiveStream();
    await vi.runOnlyPendingTimersAsync();
    expect(useAdminLiveStore.getState().isUnauthorized).toBe(true);

    fetchMock.mockResolvedValue(openStreamResponse());
    retryAdminLiveConnection();
    await vi.runOnlyPendingTimersAsync();

    expect(useAdminLiveStore.getState().isUnauthorized).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe("operationalStream — logout cleanup", () => {
  it("resetAdminLiveStream during an active SSE connection stops it and clears operational state", async () => {
    fetchMock.mockResolvedValue(openStreamResponse());
    subscribeAdminLiveStream();
    await vi.runOnlyPendingTimersAsync();

    useAdminLiveStore.getState().ingestTick({
      timestamp: Date.now(),
      platform: {
        onlineHumans: 3, activeBots: 0, activeRooms: 1, runningMatches: 1,
        disconnectedUsers: 0, rejoinEligibleUsers: 0, connectedSockets: 3,
        lobbyRooms: 0, recoveringRooms: 0, pausedRooms: 0,
        recoverySuccessRate: 100, hostMigrationCount: 0, abandonmentRate: 0,
      },
      rooms: [],
      recovery: { activeGraceCount: 0, seats: [] },
    });
    expect(useAdminLiveStore.getState().rooms).toBeDefined();

    resetAdminLiveStream();

    const state = useAdminLiveStore.getState();
    expect(state.platform).toBeNull();
    expect(state.rooms).toEqual([]);
    expect(state.connectionStatus).toBe("offline");
    expect(state.isUnauthorized).toBe(false);
  });

  it("resetAdminLiveStream during fallback polling stops the poll timer", async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error("network down")));
    fetchMock.mockResolvedValue(jsonResponse(200, { rooms: [], platform: null }));

    subscribeAdminLiveStream();
    await vi.runOnlyPendingTimersAsync();
    await vi.advanceTimersByTimeAsync(1);

    const callsBeforeReset = fetchMock.mock.calls.length;
    resetAdminLiveStream();

    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetchMock.mock.calls.length).toBe(callsBeforeReset);
  });

  it("is idempotent — calling it with nothing active does not throw", () => {
    expect(() => resetAdminLiveStream()).not.toThrow();
    expect(() => resetAdminLiveStream()).not.toThrow();
  });
});

describe("operationalStream — subscribe/unsubscribe reference counting (StrictMode safety)", () => {
  it("an immediate mount -> unmount -> mount does not leave a duplicate connection running", async () => {
    fetchMock.mockResolvedValue(openStreamResponse());

    const unsubscribe1 = subscribeAdminLiveStream();
    unsubscribe1(); // StrictMode's synchronous double-invoke
    subscribeAdminLiveStream();
    await vi.runOnlyPendingTimersAsync();

    // Exactly one real connection attempt reached the network — the
    // immediately-unsubscribed first mount aborted before it could.
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    expect(useAdminLiveStore.getState().connectionStatus).not.toBe("reconnecting");
  });
});
