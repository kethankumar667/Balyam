import { useEffect, useRef, useState } from "react";
import { checkRoomAlive, type RoomLivenessResult } from "../core/recovery/roomLiveness";
import { verdictFromLiveness, type RoomRefusal } from "../lib/roomRefusal";

/**
 * How long the page may be "not in the room yet" before it starts asking the server. A normal join lands well inside
 * this, so a room that opens promptly never costs an extra request.
 */
export const WATCH_FIRST_CHECK_MS = 2_500;
/** While the room is there but the join has not landed (a slow handshake): look again at this pace. */
export const WATCH_OPEN_RECHECK_MS = 8_000;
/** While the server is not answering, ask quickly at first, then settle: 3s, 4s, 5s ... 8s. */
export const WATCH_UNREACHABLE_BASE_MS = 3_000;
export const WATCH_UNREACHABLE_STEP_MS = 1_000;
export const WATCH_UNREACHABLE_MAX_MS = 8_000;

export interface RoomWatchOptions {
  code: string | undefined;
  /** This player's seat in the room, so the server can say the seat was released. Optional: a first visit has none. */
  seatId?: string;
  /** Watch only while the page is stuck outside the room; switching it off stops everything. */
  enabled: boolean;
  /** The room is gone, or cannot take this player back. Called once, then the watch stops. */
  onRefusal: (status: RoomRefusal) => void;
}

/**
 * Keeps asking "is this room still there?" for a room page that cannot get in.
 *
 * ── Why this exists ────────────────────────────────────────────────────
 * Come back to a tab you left on a table that has since closed and the page used to sit on its "connecting" screen,
 * because the only thing that ever told it the table was gone was a socket answer, and a socket that is still backing
 * off after a long sleep (or a server still waking up) gives none. The server's `alive` endpoint answers without a
 * socket, so this asks it directly and lets the page leave the connecting screen the moment the answer is "gone".
 *
 * It also reports whether the server is answering at all, which is what lets the loader say "the server is waking up"
 * instead of pretending to verify a seat.
 *
 * Re-asks immediately when the tab becomes visible, the browser comes back online, or the window is focused: those are
 * the moments a returning player is looking at the screen.
 */
export function useRoomWatch({ code, seatId, enabled, onRefusal }: RoomWatchOptions): { serverReachable: boolean | null } {
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);

  // Read through refs so a new callback or seat id never restarts the watch (and its backoff) mid-flight.
  const onRefusalRef = useRef(onRefusal);
  onRefusalRef.current = onRefusal;
  const seatIdRef = useRef(seatId);
  seatIdRef.current = seatId;

  useEffect(() => {
    if (!enabled || !code) {
      setServerReachable(null);
      return;
    }

    let cancelled = false;
    let inFlight = false;
    let unreachableCount = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delay: number) => {
      if (cancelled) return;
      clearTimeout(timer);
      timer = setTimeout(() => void check(), delay);
    };

    const check = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      let result: RoomLivenessResult;
      try {
        result = await checkRoomAlive(code, seatIdRef.current);
      } catch {
        // `checkRoomAlive` swallows its own network errors; this is the belt for anything it did not foresee.
        result = { alive: false, reason: "UNREACHABLE" };
      } finally {
        inFlight = false;
      }
      if (cancelled) return;

      const verdict = verdictFromLiveness(result);
      if (verdict.kind === "refused") {
        cancelled = true;
        clearTimeout(timer);
        onRefusalRef.current(verdict.status);
        return;
      }
      if (verdict.kind === "unreachable") {
        unreachableCount += 1;
        setServerReachable(false);
        schedule(Math.min(WATCH_UNREACHABLE_BASE_MS + (unreachableCount - 1) * WATCH_UNREACHABLE_STEP_MS, WATCH_UNREACHABLE_MAX_MS));
        return;
      }
      unreachableCount = 0;
      setServerReachable(true);
      schedule(WATCH_OPEN_RECHECK_MS);
    };

    // A returning player is looking at the screen right now: do not make them wait out the timer.
    const nudge = () => {
      if (cancelled || (typeof document !== "undefined" && document.visibilityState === "hidden")) return;
      clearTimeout(timer);
      void check();
    };

    schedule(WATCH_FIRST_CHECK_MS);
    document.addEventListener("visibilitychange", nudge);
    window.addEventListener("online", nudge);
    window.addEventListener("focus", nudge);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", nudge);
      window.removeEventListener("online", nudge);
      window.removeEventListener("focus", nudge);
    };
  }, [code, enabled]);

  return { serverReachable };
}
