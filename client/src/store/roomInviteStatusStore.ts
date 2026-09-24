import { create } from "zustand";
import type { RoomInviteStatus } from "@shared/mandali/notifications.js";
import { apiJson } from "../lib/playerIdentity";

/**
 * Live standing of rooms shared into Mandali chats.
 *
 * A shared-room card is only honest while its "3 of 4, open" is current, and
 * a chat can show many of them at once. So every card subscribes to a code and
 * ONE poller asks the server about all of them together — not a request per
 * card, and nothing at all while the tab is hidden. Rooms that have closed are
 * dropped from polling (they cannot reopen) but their last answer is kept so
 * the card keeps saying "Room closed".
 */

const POLL_INTERVAL_MS = 6_000;
/** The server answers at most this many codes per request. */
const MAX_CODES_PER_REQUEST = 20;

interface RoomInviteStatusState {
  statuses: Record<string, RoomInviteStatus>;
  /** Ask about these codes now. */
  refresh: (codes: readonly string[]) => Promise<void>;
  /** Start keeping these codes fresh; returns the function that stops. */
  subscribe: (codes: readonly string[]) => () => void;
}

const subscribers = new Map<string, number>();
let timer: ReturnType<typeof setInterval> | null = null;
let visibilityBound = false;

function activeCodes(statuses: Record<string, RoomInviteStatus>): string[] {
  return Array.from(subscribers.keys()).filter((code) => statuses[code]?.state !== "CLOSED");
}

async function pollOnce(): Promise<void> {
  const { statuses, refresh } = useRoomInviteStatusStore.getState();
  const codes = activeCodes(statuses);
  if (codes.length === 0) return;
  await refresh(codes);
}

function ensureTimer(): void {
  if (timer !== null || subscribers.size === 0) return;
  timer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    void pollOnce();
  }, POLL_INTERVAL_MS);
}

function stopTimerIfIdle(): void {
  if (timer !== null && subscribers.size === 0) {
    clearInterval(timer);
    timer = null;
  }
}

function bindVisibility(): void {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  // Coming back to the tab is exactly when a stale "3 of 4" is most misleading.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pollOnce();
  });
}

export const useRoomInviteStatusStore = create<RoomInviteStatusState>((set) => ({
  statuses: {},

  refresh: async (codes) => {
    const unique = Array.from(new Set(codes)).slice(0, MAX_CODES_PER_REQUEST);
    if (unique.length === 0) return;
    const res = await apiJson<{ success: boolean; statuses: RoomInviteStatus[] }>(
      `/api/mandali/room-invites/status?codes=${encodeURIComponent(unique.join(","))}`
    );
    if (!res?.success) return;
    set((state) => {
      const next = { ...state.statuses };
      for (const status of res.statuses) next[status.code] = status;
      return { statuses: next };
    });
  },

  subscribe: (codes) => {
    const mine = Array.from(new Set(codes));
    for (const code of mine) subscribers.set(code, (subscribers.get(code) ?? 0) + 1);
    bindVisibility();
    ensureTimer();
    void pollOnce();

    return () => {
      for (const code of mine) {
        const left = (subscribers.get(code) ?? 1) - 1;
        if (left <= 0) subscribers.delete(code);
        else subscribers.set(code, left);
      }
      stopTimerIfIdle();
    };
  },
}));
