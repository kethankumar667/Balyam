import { useEffect, useRef } from "react";
import type { GameKind, StartPreflightPayload, StartBlockReason } from "@shared/types";
import { getSocket } from "../lib/socket";

/**
 * The set of room phases where active preflight monitoring is meaningful.
 * We only arm orientation / visibility monitors when the room is in the lobby
 * or transitioning to start — in-progress and finished rooms do not need them.
 */
const MONITORED_PHASES: ReadonlySet<string> = new Set(["lobby", "starting"]);

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
 * ## Why fail-closed
 *
 * Missing acknowledgements are treated server-side as `ACKNOWLEDGEMENT_MISSING`
 * blockers. This hook's job is to emit a *positive* ack as quickly as possible
 * when everything is fine — not to paper over edge-cases with silence.
 *
 * ## Non-host players only
 *
 * The server only dispatches `room:startPreflight` to non-host human participants
 * that have remote seats. Bots and local (pass-and-play) seats are resolved
 * immediately server-side (Rule 15). This hook emits on the socket for the
 * current connection, which means it is only wired to the authenticated seat;
 * there is no risk of a bot seat accidentally emitting from the client.
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
}): void {
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

  // ── Effect 1: preflight challenge responder ────────────────────────────
  useEffect(() => {
    if (!roomCode || !playerId || !game) return;

    const socket = getSocket();

    const handleStartPreflight = (payload: StartPreflightPayload): void => {
      // Stash the active preflight so the continuous monitor (Effect 2) can
      // compare against it when deciding whether to emit reportUnavailable.
      activePreflightRef.current = payload;

      // Guard: the preflight deadline has already passed (clock drift or very
      // slow handler). Emit nothing — the server will time out independently.
      if (Date.now() >= payload.expiresAt) {
        return;
      }

      const visible = isPageVisible();
      const orientationOk = isOrientationSatisfied(payload.requiredOrientation);

      if (visible && orientationOk) {
        socket.emit("room:acknowledgeStart", {
          startAttemptId: payload.startAttemptId,
          roomRevision: payload.roomRevision,
          visible: true,
          orientationSatisfied: true,
        });
        return;
      }

      // Determine the most specific decline reason (visibility takes priority
      // over orientation since a hidden tab cannot show the rotation prompt).
      const reason: StartBlockReason = !visible
        ? "PAGE_NOT_VISIBLE"
        : "ORIENTATION_REQUIRED";

      socket.emit("room:declineStart", {
        startAttemptId: payload.startAttemptId,
        reason,
      });
    };

    const handleStartCancelled = (): void => {
      // Clear the active preflight when the attempt is cancelled so the
      // continuous monitor knows no attempt is in flight.
      activePreflightRef.current = null;
    };

    socket.on("room:startPreflight", handleStartPreflight);
    socket.on("room:startCancelled", handleStartCancelled);

    return () => {
      socket.off("room:startPreflight", handleStartPreflight);
      socket.off("room:startCancelled", handleStartCancelled);
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
     * Emits `room:reportUnavailable` only when there is an active in-flight
     * start attempt. We do NOT want to spam the server with unavailability
     * events during routine lobby browsing — only when the server is actively
     * collecting preflight acks.
     */
    const reportUnavailable = (reason: "PAGE_NOT_VISIBLE" | "ORIENTATION_REQUIRED"): void => {
      if (!activePreflightRef.current) return;
      socket.emit("room:reportUnavailable", { reason });
    };

    const handleVisibilityChange = (): void => {
      if (!isPageVisible()) {
        reportUnavailable("PAGE_NOT_VISIBLE");
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
          reportUnavailable("ORIENTATION_REQUIRED");
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
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
      }
    };
  }, [roomCode, playerId, game, phase]);
}
