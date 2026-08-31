import { getApiBaseUrl } from "./socket";
import { authHeaders, operationalFetch, OperationalAuthError } from "./operationalApi";
import { useAdminLiveStore } from "../store/adminLiveStore";
import type {
  OperationalRoomSummary,
  OperationalRecoverySummary,
  PlatformHealthCounters,
  PlatformTickPayload,
} from "@shared/types";

let activeAbortController: AbortController | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let fallbackPollingTimer: ReturnType<typeof setInterval> | null = null;
let subscribersCount = 0;

/**
 * Set the moment either the SSE stream or the REST fallback gets a 401.
 * While true, neither `connectStream` nor `pollOperationalFallback` retries
 * on its own — a stale/revoked credential doing that would just poll (SSE at
 * a 5s fixed delay, REST every 3s) forever, correctly refused every time but
 * never actually giving up. Only `retryAdminLiveConnection` (a new,
 * refreshed credential becoming available) or `resetAdminLiveStream`
 * (logout, or unmount) clears it.
 */
let unauthorizedLocked = false;

/**
 * Parses raw SSE chunks into event frames and dispatches them to the store.
 */
function processSseBuffer(buffer: string): { remaining: string; events: Array<{ event: string; data: string }> } {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const blocks = normalized.split("\n\n");
  const remaining = blocks.pop() ?? "";
  const events: Array<{ event: string; data: string }> = [];

  for (const block of blocks) {
    if (!block.trim()) continue;
    let currentEvent = "message";
    const dataLines: string[] = [];

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length > 0) {
      events.push({ event: currentEvent, data: dataLines.join("\n") });
    }
  }

  return { remaining, events };
}

function handleUnauthorized(): void {
  unauthorizedLocked = true;
  stopFallbackPolling();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  useAdminLiveStore.getState().setUnauthorized(true);
  useAdminLiveStore.getState().setError("Not authorized for the operational API.");
  useAdminLiveStore.getState().setConnectionStatus("offline");
}

/**
 * Fallback polling mechanism when SSE streaming is unavailable.
 *
 * Reads `platform` from `/api/operational/rooms` (added alongside the
 * pre-existing `rooms` field) rather than fabricating recovery/host-
 * migration/abandonment numbers client-side — this is the same
 * `RoomManager.getOperationalDetailedStats()` snapshot the SSE stream
 * already carries, so a dashboard stuck on the fallback path sees the same
 * real numbers, not a permanently reassuring placeholder.
 */
async function pollOperationalFallback(): Promise<void> {
  if (unauthorizedLocked) return;
  try {
    const [roomsRes, recoveryRes] = await Promise.allSettled([
      operationalFetch<{ rooms: OperationalRoomSummary[]; platform: PlatformHealthCounters }>(
        "/api/operational/rooms",
      ),
      operationalFetch<OperationalRecoverySummary & { activeGraceCount: number }>("/api/operational/recovery"),
    ]);

    if (roomsRes.status === "rejected" && roomsRes.reason instanceof OperationalAuthError) {
      handleUnauthorized();
      return;
    }

    const rooms = roomsRes.status === "fulfilled" && Array.isArray(roomsRes.value?.rooms) ? roomsRes.value.rooms : [];
    const platform = roomsRes.status === "fulfilled" ? roomsRes.value.platform ?? null : null;
    const recoveryValue = recoveryRes.status === "fulfilled" ? recoveryRes.value : null;

    const tickPayload: PlatformTickPayload = {
      timestamp: Date.now(),
      platform: platform ?? {
        onlineHumans: 0,
        activeBots: 0,
        activeRooms: rooms.length,
        runningMatches: 0,
        disconnectedUsers: 0,
        rejoinEligibleUsers: 0,
        connectedSockets: 0,
        lobbyRooms: 0,
        recoveringRooms: 0,
        pausedRooms: 0,
        recoverySuccessRate: null,
        hostMigrationCount: 0,
        abandonmentRate: 0,
      },
      rooms,
      recovery: {
        activeGraceCount: recoveryValue?.activeGraceCount ?? (recoveryValue?.seats?.length || 0),
        seats: Array.isArray(recoveryValue?.seats) ? recoveryValue.seats : [],
      },
    };

    useAdminLiveStore.getState().ingestTick(tickPayload);
    useAdminLiveStore.getState().setConnectionStatus("offline");
  } catch (err) {
    if (err instanceof OperationalAuthError) {
      handleUnauthorized();
    } else if (err instanceof Error) {
      useAdminLiveStore.getState().setError(err.message);
    }
  }
}

function startFallbackPolling() {
  if (fallbackPollingTimer || unauthorizedLocked) return;
  void pollOperationalFallback();
  fallbackPollingTimer = setInterval(pollOperationalFallback, 3000);
}

function stopFallbackPolling() {
  if (fallbackPollingTimer) {
    clearInterval(fallbackPollingTimer);
    fallbackPollingTimer = null;
  }
}

/**
 * Connect to the SSE endpoint with authorization headers via fetch streaming.
 */
async function connectStream(): Promise<void> {
  if (subscribersCount <= 0 || unauthorizedLocked) return;

  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }

  const controller = new AbortController();
  activeAbortController = controller;

  useAdminLiveStore.getState().setConnectionStatus("reconnecting");

  try {
    const url = `${getApiBaseUrl()}/api/operational/stream`;
    const response = await fetch(url, {
      headers: {
        ...authHeaders(),
        Accept: "text/event-stream",
      },
      signal: controller.signal,
    }).catch(() => null);

    if (!response) {
      startFallbackPolling();
      return;
    }

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok || !response.body) {
      startFallbackPolling();
      return;
    }

    stopFallbackPolling();
    useAdminLiveStore.getState().setConnectionStatus("connected");
    useAdminLiveStore.getState().setError(null);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let streamBuffer = "";

    while (!controller.signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      streamBuffer += decoder.decode(value, { stream: true });
      const { remaining, events } = processSseBuffer(streamBuffer);
      streamBuffer = remaining;

      for (const { event, data } of events) {
        if (event === "platform_tick" || event === "message") {
          try {
            const parsed = JSON.parse(data) as PlatformTickPayload;
            if (parsed && parsed.platform && Array.isArray(parsed.rooms)) {
              useAdminLiveStore.getState().ingestTick(parsed);
            }
          } catch {
            // Ignored malformed frame
          }
        }
      }
    }
  } catch (err: unknown) {
    if (controller.signal.aborted) return;
    useAdminLiveStore.getState().setConnectionStatus("offline");

    // Start fallback polling
    startFallbackPolling();

    // Schedule reconnect — fixed delay, not exponential (there is no
    // unbounded-retry-count risk to guard against here: the delay itself
    // never grows, so it is bounded by construction).
    if (!reconnectTimer && subscribersCount > 0 && !unauthorizedLocked) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connectStream();
      }, 5000);
    }
  }
}

/**
 * Subscribes to the live admin operational stream.
 */
export function subscribeAdminLiveStream(): () => void {
  subscribersCount++;
  if (subscribersCount === 1) {
    void connectStream();
  }

  return () => {
    subscribersCount--;
    if (subscribersCount <= 0) {
      subscribersCount = 0;
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      stopFallbackPolling();
      useAdminLiveStore.getState().setConnectionStatus("offline");
    }
  };
}

/**
 * Triggers an immediate manual refresh.
 */
export async function refreshAdminLive(): Promise<void> {
  if (unauthorizedLocked) return;
  useAdminLiveStore.getState().setLoading(true);
  await pollOperationalFallback();
  useAdminLiveStore.getState().setLoading(false);
}

/**
 * A changed or refreshed valid credential (signed back in, pasted a new
 * operational key) is the only thing allowed to restart a connection that
 * `handleUnauthorized` stopped. Call this after the credential actually
 * changes — it does nothing on its own to verify one exists, the next
 * `connectStream`/`pollOperationalFallback` attempt does that the normal way.
 */
export function retryAdminLiveConnection(): void {
  unauthorizedLocked = false;
  useAdminLiveStore.getState().setUnauthorized(false);
  useAdminLiveStore.getState().setError(null);
  if (subscribersCount > 0) {
    void connectStream();
  }
}

/**
 * Hard stop: aborts the stream, clears every timer, stops fallback polling,
 * and resets the store's operational data — independent of the mount-based
 * reference count `subscribeAdminLiveStream` otherwise uses. For logout: a
 * signed-out session must not keep an authenticated stream open or keep
 * showing the last platform snapshot it saw. Idempotent — safe to call when
 * nothing is active.
 */
export function resetAdminLiveStream(): void {
  subscribersCount = 0;
  unauthorizedLocked = false;
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  stopFallbackPolling();
  useAdminLiveStore.getState().resetOperationalState();
}
