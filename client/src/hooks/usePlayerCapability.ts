import { useEffect, useRef, useState } from "react";
import type { GameKind, StartPreflightPayload, StartBlockReason } from "@shared/types";
import { getSocket } from "../lib/socket";

/**
 * The set of room phases where active preflight monitoring is meaningful.
 * We only arm orientation / visibility monitors when the room is in the lobby
 * or transitioning to start — in-progress and finished rooms do not need them.
 */
const MONITORED_PHASES: ReadonlySet<string> = new Set(["lobby", "starting"]);

/**
 * Minimum time the "not satisfied yet" retry window is allowed to run before
 * declining, regardless of what `payload.expiresAt - Date.now()` computes to.
 *
 * That subtraction mixes a server clock (`expiresAt`) with the client's own
 * (`Date.now()`) — under real client/server clock skew it can go negative,
 * which would otherwise decline almost instantly instead of giving the
 * visibility/orientation listeners above a fair chance to catch a transient
 * blip resolving on its own (the whole reason this retry loop exists). The
 * server's own `attempt.expiresAt` check remains the authoritative deadline
 * either way — this floor only protects how patient the CLIENT is before
 * giving up and telling the server it's blocked.
 */
const RETRY_DEADLINE_FLOOR_MS = 2000;

/**
 * How long a single `room:acknowledgeStart` emit waits for the server's
 * delivery-confirmation callback before being treated as lost and retried.
 *
 * Root-caused 2026-09-09 against a real "Start timed out" report: a
 * fire-and-forget emit can silently never reach the server even on a
 * genuinely connected socket — confirmed live (this exact handler ran,
 * `getSocket().connected` was true, the socket stayed connected for
 * minutes afterward, yet the server logged zero trace of the ack ever
 * arriving, on every server-side drop path already instrumented). A
 * transport-level loss (a WebSocket-upgrade race, a restrictive proxy)
 * that a fire-and-forget emit has no way to detect, let alone recover
 * from. `socket.timeout(ms).emit(...)` turns that into a fact the client
 * can act on instead of quietly trusting a single send.
 */
const ACK_CONFIRM_TIMEOUT_MS = 2000;

/** Cap on retries within one preflight window — bounded by the server's own
 *  deadline either way, this just stops a pathological retry loop. */
const MAX_ACK_RETRIES = 4;

/**
 * Evaluates whether the current viewport is in portrait mode for a mobile
 * breakpoint (width < 768 px and height > width). Matches the same guard used
 * by the existing Rummy `rotation-sync.tsx` so the two sources of truth stay
 * aligned even if the breakpoint is later adjusted.
 *
 * Note: this function is intentionally side-effect-free and reads only from
 * `window` — safe to call inside event listeners or async callbacks.
 */
function isMobilePortrait(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
}

/**
 * Evaluates whether the current viewport satisfies the orientation requirement
 * specified in a server-issued preflight challenge.
 *
 * - `"landscape"`: satisfied when the client is NOT in mobile portrait mode.
 * - `"portrait"`:  satisfied when the client IS in portrait mode.
 * - `null`:        always satisfied (no orientation constraint for this game).
 */
function isOrientationSatisfied(
  requiredOrientation: "landscape" | "portrait" | null,
): boolean {
  if (requiredOrientation === null) return true;
  const portrait = isMobilePortrait();
  return requiredOrientation === "landscape" ? !portrait : portrait;
}

/**
 * Evaluates whether the document is currently visible (i.e. the browser tab
 * or app window has focus). Falls back to `true` in environments where
 * `document` is unavailable (SSR, worker contexts).
 */
function isPageVisible(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

/**
 * `usePlayerCapability` — client-side preflight responder for the
 * server-authoritative match-start safety protocol.
 *
 * ## Responsibilities
 *
 * 1. **Preflight challenge**: listens for `room:startPreflight`. On receipt,
 *    checks the client's current visibility state and orientation against the
 *    server-issued requirements, then emits either `room:acknowledgeStart`
 *    (all satisfied) or `room:declineStart` (a blocker is present).
 *
 * 2. **Continuous unavailability monitoring**: while the room is in the lobby
 *    or starting phase, monitors `visibilitychange` and window resize /
 *    `orientationchange` events. If either condition becomes invalid, emits
 *    `room:reportUnavailable` to cancel any in-flight start attempt early.
 *    This allows other players to see an accurate "player not ready" state
 *    rather than waiting for the 5-second preflight timeout to fire.
 *
 * ## This hook is an optimisation, not a gate (changed 2026-09-09)
 *
 * A missing acknowledgement still shows as an `ACKNOWLEDGEMENT_MISSING`
 * blocker in the live readiness view, but it NO LONGER fails the match
 * start on its own: when the preflight window expires the server checks
 * whether each silent seat is still connected and ready on its own
 * evidence, and starts the match if so. See
 * `RoomManager.resolveExpiredPreflight` for why that inversion was
 * necessary — in short, four separate real bugs in this file and its
 * server counterpart had each produced the identical user-visible symptom
 * ("Start timed out waiting for players to confirm readiness"), because
 * the protocol treated silence as refusal and so had no floor.
 *
 * What this hook still buys, and why it is worth keeping: when the ack DOES
 * arrive, the match starts immediately instead of after the full preflight
 * window, and an explicit decline (below) reports a specific, actionable
 * reason instead of a generic timeout.
 *
 * ## Every remote seat, host included
 *
 * The server challenges every non-bot, non-local participant — the host is
 * NOT exempt (an older version of this comment claimed otherwise, which was
 * never true; `requiredHumanPlayerIds` filters only bots and local seats).
 * Bots and local (pass-and-play) seats are resolved server-side. This hook
 * emits on the socket for the current connection, so it is only ever wired
 * to the authenticated seat; there is no risk of a bot seat accidentally
 * emitting from the client.
 *
 * ## The gap this used to have (root-caused 2026-09-09)
 *
 * A landscape-only game (Rummy, UNO) challenges a mobile player who is
 * sitting in the lobby holding their phone in its natural, resting portrait
 * orientation. `tryAcknowledge()` correctly withholds the ack and arms the
 * retry-until-deadline loop below — but NOTHING in the UI ever told the
 * player they needed to rotate. Every existing "rotate your device" prompt
 * in this codebase (Rummy's and UNO's own `rotation-sync.tsx`) only renders
 * once `phase === "playing"` — the in-round deal-gate, a completely
 * different moment. During the lobby/preflight window the player just sees
 * an ordinary lobby screen, has no idea anything is expected of them, and
 * the window quietly expires. The eventual server-side "Start timed out"
 * message they DO see never explains why, because the client's own
 * deadline-triggered decline (which DOES carry the specific
 * "ORIENTATION_REQUIRED" reason) has to cross the network, while the
 * server's own independent timeout timer does not — it almost always wins
 * that race and the specific reason is discarded. `blockedByOrientation`
 * (and `orientationDeadline`, for a countdown) below exist so a mounted
 * `Room.tsx` can show that prompt during the ONE window it was actually
 * needed, instead of only after the round has already started.
 *
 * @param roomCode     - The 6-char room code. Hook is a no-op when falsy.
 * @param playerId     - The authenticated player's id. Hook is a no-op when falsy.
 * @param game         - Current game kind. Used to re-evaluate orientation on resize.
 * @param phase        - Current room phase. Monitoring is only armed for lobby/starting.
 * @param roomRevision - Monotonically increasing server revision for fencing stale acks.
 */
export function usePlayerCapability({
  roomCode,
  playerId,
  game,
  phase,
  roomRevision,
}: {
  roomCode: string | undefined;
  playerId: string | null;
  game: GameKind | undefined;
  phase: string | undefined;
  roomRevision: number | undefined;
}): {
  /** True exactly while a real, in-flight preflight challenge is blocked
   *  on THIS device's orientation (page is visible, orientation is not).
   *  Never true for a visibility block — a hidden/backgrounded tab can't
   *  show a prompt to itself anyway; Effect 2's reportUnavailable already
   *  handles that case by cancelling the attempt early instead. */
  blockedByOrientation: boolean;
  /** The active preflight's own deadline (ms epoch), while blocked — for a
   *  countdown in the prompt. `null` whenever `blockedByOrientation` is
   *  false. */
  orientationDeadline: number | null;
} {
  /**
   * Stable ref to the current roomRevision so the event handlers that close
   * over it via `useRef` never capture a stale value without needing the
   * entire effect to re-run when the revision ticks.
   */
  const roomRevisionRef = useRef<number | undefined>(roomRevision);
  roomRevisionRef.current = roomRevision;

  /**
   * Ref to the most recently received preflight payload — used by the
   * visibility / orientation monitor to avoid reporting unavailability when
   * there is no active start attempt the monitor could help cancel.
   */
  const activePreflightRef = useRef<StartPreflightPayload | null>(null);

  /**
   * Cancels whatever `handleStartPreflight` is currently waiting on (see
   * below) — a pending retry-until-deadline for an earlier preflight that a
   * newer preflight, a cancellation, or unmount has now superseded.
   */
  const cancelPendingRetryRef = useRef<(() => void) | null>(null);

  const [blockedByOrientation, setBlockedByOrientation] = useState(false);
  const [orientationDeadline, setOrientationDeadline] = useState<number | null>(null);

  // ── Effect 1: preflight challenge responder ────────────────────────────
  useEffect(() => {
    if (!roomCode || !playerId || !game) return;

    const socket = getSocket();

    const handleStartPreflight = (payload: StartPreflightPayload): void => {
      cancelPendingRetryRef.current?.();
      cancelPendingRetryRef.current = null;

      // Stash the active preflight so the continuous monitor (Effect 2) can
      // compare against it when deciding whether to emit reportUnavailable.
      activePreflightRef.current = payload;

      // There used to be an early-return here — "if Date.now() >=
      // payload.expiresAt, emit nothing, the server will time out
      // independently" — reasoning that only considered a slow HANDLER
      // (a few hundred ms). It compared `payload.expiresAt` (computed on
      // the SERVER's clock) against `Date.now()` on the CLIENT's own clock.
      // Any real-world clock skew — a Windows machine with a wrong system
      // clock or disabled time sync is common, not exotic — larger than the
      // preflight window makes this condition true INSTANTLY, every single
      // time, for that one client: it would never emit an ack OR a decline,
      // leaving zero trace anywhere (confirmed against a real "Start timed
      // out" report: the required player's ack simply never arrived, no
      // drop logged on any server-side guard, because nothing was ever
      // sent). The server already independently and correctly enforces
      // this exact deadline, on its OWN clock, inside `acknowledgeStart`
      // (`Date.now() > attempt.expiresAt` -> `attempt_expired`) — that is
      // the authoritative check; this was a redundant, clock-skew-fragile
      // client-side guess ahead of it, worse than not checking at all.

      /**
       * Sends the ack with real delivery confirmation, retrying on a timeout
       * or an explicit `accepted: false` — see `ACK_CONFIRM_TIMEOUT_MS`'s own
       * doc comment for why a bare `socket.emit` was not good enough here.
       * Fires and forgets from the CALLER's perspective (matching the old
       * synchronous emit's contract) — `tryAcknowledge()` below still
       * returns immediately, optimistically; this just keeps working in the
       * background to make that optimism actually true.
       */
      const sendAcknowledgementWithRetry = (attemptNum: number): void => {
        socket.timeout(ACK_CONFIRM_TIMEOUT_MS).emit(
          "room:acknowledgeStart",
          {
            startAttemptId: payload.startAttemptId,
            roomRevision: payload.roomRevision,
            visible: true,
            orientationSatisfied: true,
          },
          (err: Error | null, response?: { accepted: boolean }) => {
            if (!err && response?.accepted) return;
            if (attemptNum >= MAX_ACK_RETRIES) {
              // `console.warn`, not `console.debug` — Chrome hides Verbose
              // under its default level filter, which has already once
              // produced a false "nothing in the console" reading while
              // diagnosing this exact failure.
              console.warn(
                `[BHALYAM] Start acknowledgement gave up after ${MAX_ACK_RETRIES + 1} attempts ` +
                  `(attempt=${payload.startAttemptId}, lastError=${err ? err.message : `server replied accepted=${response?.accepted}`}). ` +
                  `The server now starts the match anyway when this seat is still connected and ready.`,
              );
              return;
            }
            if (Date.now() >= payload.expiresAt) return;
            // A newer preflight or a cancellation superseded this one while
            // the timeout was in flight — nothing left to retry for.
            if (activePreflightRef.current?.startAttemptId !== payload.startAttemptId) return;
            sendAcknowledgementWithRetry(attemptNum + 1);
          },
        );
      };

      /** True (and acked, pending delivery confirmation) iff both conditions hold right now. */
      const tryAcknowledge = (): boolean => {
        if (!isPageVisible() || !isOrientationSatisfied(payload.requiredOrientation)) {
          return false;
        }
        sendAcknowledgementWithRetry(0);
        return true;
      };

      if (tryAcknowledge()) {
        setBlockedByOrientation(false);
        setOrientationDeadline(null);
        return;
      }

      /**
       * Not satisfied at this exact instant — which is routinely a one-frame
       * artifact, not a real problem: clicking "Start" lives in ONE window/
       * tab, and the very act of clicking it is what makes every OTHER
       * window/tab not the OS-focused one for a moment (two windows on one
       * machine testing together; a friend's phone screen briefly dimming;
       * a notification stealing focus). The server already budgets
       * `expiresAt - now` (5s) for every participant to confirm — declining
       * instantly on a single bad snapshot spent none of that budget and
       * killed the WHOLE match start over something that, in every case
       * above, resolves on its own within a heartbeat. So: keep re-checking
       * on the same signals Effect 2 already listens for, and only decline
       * if the deadline actually passes still unsatisfied — a real,
       * sustained backgrounded tab or wrong orientation still fails
       * exactly as before, just no longer punished for a transient blip.
       *
       * A visibility block gets no UI treatment here — a hidden/backgrounded
       * tab can't show a prompt to itself. An orientation block genuinely
       * can (and, root-caused 2026-09-09, previously didn't): surface it so
       * `Room.tsx` can render a "rotate your device" prompt for the rest of
       * this window instead of the player seeing nothing at all.
       */
      if (isPageVisible() && !isOrientationSatisfied(payload.requiredOrientation)) {
        setBlockedByOrientation(true);
        setOrientationDeadline(payload.expiresAt);
      }

      let settled = false;
      const recheck = (): void => {
        if (settled) return;
        if (tryAcknowledge() === false) {
          // Still blocked — keep the flag in sync with which specific
          // condition is failing right now (a portrait->hidden transition,
          // e.g. locking the phone mid-rotate, should drop the prompt since
          // Effect 2 owns cancelling on a hidden tab, not this one).
          const stillOrientationOnly = isPageVisible() && !isOrientationSatisfied(payload.requiredOrientation);
          setBlockedByOrientation(stillOrientationOnly);
          return;
        }
        settled = true;
        setBlockedByOrientation(false);
        setOrientationDeadline(null);
        cleanup();
      };
      const cleanup = (): void => {
        document.removeEventListener("visibilitychange", recheck);
        window.removeEventListener("resize", recheck);
        window.removeEventListener("orientationchange", recheck);
        window.clearTimeout(deadlineTimer);
        if (cancelPendingRetryRef.current === cleanup) cancelPendingRetryRef.current = null;
      };
      document.addEventListener("visibilitychange", recheck);
      window.addEventListener("resize", recheck, { passive: true });
      window.addEventListener("orientationchange", recheck, { passive: true });
      const deadlineTimer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        setBlockedByOrientation(false);
        setOrientationDeadline(null);
        // Still unsatisfied when the server's own deadline arrived — a
        // genuine, sustained block, not a blip. Determine the most specific
        // decline reason (visibility takes priority over orientation since a
        // hidden tab cannot show the rotation prompt).
        const reason: StartBlockReason = !isPageVisible()
          ? "PAGE_NOT_VISIBLE"
          : "ORIENTATION_REQUIRED";
        socket.emit("room:declineStart", { startAttemptId: payload.startAttemptId, reason });
      }, Math.max(RETRY_DEADLINE_FLOOR_MS, payload.expiresAt - Date.now()));
      cancelPendingRetryRef.current = cleanup;
    };

    const handleStartCancelled = (): void => {
      // Clear the active preflight when the attempt is cancelled so the
      // continuous monitor knows no attempt is in flight, and stop waiting
      // on a retry for an attempt that no longer exists.
      activePreflightRef.current = null;
      cancelPendingRetryRef.current?.();
      cancelPendingRetryRef.current = null;
      setBlockedByOrientation(false);
      setOrientationDeadline(null);
    };

    socket.on("room:startPreflight", handleStartPreflight);
    socket.on("room:startCancelled", handleStartCancelled);

    return () => {
      socket.off("room:startPreflight", handleStartPreflight);
      socket.off("room:startCancelled", handleStartCancelled);
      cancelPendingRetryRef.current?.();
      cancelPendingRetryRef.current = null;
      setBlockedByOrientation(false);
      setOrientationDeadline(null);
      // Don't clear activePreflightRef here — the continuous monitor (Effect 2)
      // has its own independent lifecycle and shares the ref across both effects.
    };
  }, [roomCode, playerId, game]);

  // ── Effect 2: continuous unavailability monitor ────────────────────────
  useEffect(() => {
    if (!roomCode || !playerId || !game) return;

    // Only arm monitors when the room is in a phase where they are meaningful.
    const inMonitoredPhase = phase !== undefined && MONITORED_PHASES.has(phase);
    if (!inMonitoredPhase) return;

    const socket = getSocket();

    /**
     * A short window a reported unavailability must SURVIVE before it is
     * actually sent — see the matching reasoning in Effect 1's
     * `handleStartPreflight`. `visibilitychange`/`resize` fire on one-frame
     * artifacts (the click that triggers a start attempt necessarily
     * unfocuses every OTHER window/tab for an instant) just as readily as on
     * a real backgrounded tab, and `room:reportUnavailable` was an
     * unconditional, immediate hard-cancel with no way to tell the two
     * apart. A real problem is still there 800ms later; a focus-shift blip
     * from clicking a button is not — this is short enough that Effect 2's
     * whole reason for existing ("caught immediately rather than only at a
     * timeout") still holds, well under the server's 5s preflight window.
     */
    const UNAVAILABILITY_GRACE_MS = 800;
    let graceTimer: number | null = null;

    /**
     * Emits `room:reportUnavailable` only when there is an active in-flight
     * start attempt, AND only once the condition has survived the grace
     * window above — never on the strength of a single event.
     */
    const reportUnavailable = (
      reason: "PAGE_NOT_VISIBLE" | "ORIENTATION_REQUIRED",
      stillBad: () => boolean,
    ): void => {
      if (!activePreflightRef.current || graceTimer !== null) return;
      graceTimer = window.setTimeout(() => {
        graceTimer = null;
        if (activePreflightRef.current && stillBad()) {
          socket.emit("room:reportUnavailable", { reason });
        }
      }, UNAVAILABILITY_GRACE_MS);
    };

    const handleVisibilityChange = (): void => {
      if (!isPageVisible()) {
        reportUnavailable("PAGE_NOT_VISIBLE", () => !isPageVisible());
      }
    };

    /**
     * Orientation / resize monitor. Only emits when the required orientation
     * for this game is non-null AND the current viewport violates it. This
     * avoids false positives for games that have no orientation requirement
     * (the vast majority).
     */
    const handleResize = (): void => {
      // Re-read game from the captured closure; `game` is stable for the
      // lifetime of this effect since it is in the deps array below.
      const portrait = isMobilePortrait();
      // Rummy and UNO require landscape. If the client rotates back to
      // portrait during the preflight window, cancel the attempt early.
      if (portrait && !isOrientationSatisfied("landscape")) {
        // Only report if the game actually requires landscape.
        // We derive this inline rather than calling getGameOrientationRequirement
        // (shared import) to avoid pulling the entire catalog into the hook
        // bundle — the information we need is already on the preflight payload
        // stored in activePreflightRef if one is in flight.
        const req = activePreflightRef.current?.requiredOrientation;
        if (req === "landscape" && portrait) {
          reportUnavailable("ORIENTATION_REQUIRED", () => isMobilePortrait() && !isOrientationSatisfied("landscape"));
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize, { passive: true });
      window.addEventListener("orientationchange", handleResize, { passive: true });
    }

    return () => {
      if (graceTimer !== null) window.clearTimeout(graceTimer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
      }
    };
  }, [roomCode, playerId, game, phase]);

  return { blockedByOrientation, orientationDeadline };
}
