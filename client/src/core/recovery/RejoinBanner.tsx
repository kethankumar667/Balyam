import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getActiveSession,
  clearActiveSession,
  clearRoomSession,
  type RecoverySession,
} from "./recoveryStorage";
import { checkRoomAlive } from "./roomLiveness";
import { useRoomStore } from "../../store/roomStore";

/**
 * Persistent "Rejoin Room" affordance outside the room page.
 *
 * ONLY displays when the room is actively verified to be ALIVE on the server.
 * If the room is not found, concluded, or the seat has expired, this component
 * automatically purges the stale session records from localStorage and the room store,
 * preventing phantom reconnection loops or embarrassing dead re-joins.
 */
export default function RejoinBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<RecoverySession | null>(null);
  const [isAlive, setIsAlive] = useState(false);
  const [dismissedRoomId, setDismissedRoomId] = useState<string | null>(null);
  const [isRejoining, setIsRejoining] = useState(false);

  const isInRoom = location.pathname.startsWith("/room/");

  // localStorage has no React subscription of its own. Re-read and check liveness
  // on route changes and on window focus.
  useEffect(() => {
    if (isInRoom) {
      setSession(null);
      setIsAlive(false);
      return;
    }

    let cancelled = false;

    const verifySession = async () => {
      const active = getActiveSession();
      if (!active?.seatToken || !active?.roomId) {
        if (!cancelled) {
          setSession(null);
          setIsAlive(false);
        }
        return;
      }

      const roomId = active.roomId.trim().toUpperCase();

      // Check session-level dismissal
      try {
        if (
          typeof sessionStorage !== "undefined" &&
          sessionStorage.getItem(`bhalyam.recovery.dismissed.${roomId}`) === "true"
        ) {
          if (!cancelled) {
            setSession(null);
            setIsAlive(false);
          }
          return;
        }
      } catch {
        /* ignore storage access error */
      }

      // Check server liveness
      const result = await checkRoomAlive(roomId, active.playerId);
      if (cancelled) return;

      if (result.alive) {
        setSession(active);
        setIsAlive(true);
      } else {
        // Room does not exist or seat has expired: purge stale session automatically
        clearActiveSession();
        clearRoomSession(roomId);
        useRoomStore.getState().forgetSeat(roomId);
        setSession(null);
        setIsAlive(false);
      }
    };

    verifySession();

    const onFocus = () => {
      verifySession();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [location.pathname]);

  const handleRejoin = useCallback(async () => {
    if (!session?.seatToken || isRejoining) return;
    setIsRejoining(true);

    const roomId = session.roomId.trim().toUpperCase();
    // Safety check right before navigating
    const result = await checkRoomAlive(roomId, session.playerId);
    if (!result.alive) {
      clearActiveSession();
      clearRoomSession(roomId);
      useRoomStore.getState().forgetSeat(roomId);
      setSession(null);
      setIsAlive(false);
      setIsRejoining(false);
      return;
    }

    // Hydrate the in-memory room store BEFORE navigating: Room.tsx's join
    // effect reads its seat credential from here (`seatFor`), not from
    // recoveryStorage directly, and its name-entry gate is seeded from the
    // same lookup on mount.
    const store = useRoomStore.getState();
    store.rememberSeat(roomId, session.playerId, session.seatToken);
    store.setPlayerName(session.playerName);
    if (session.avatar) store.setAvatarId(session.avatar);
    navigate(`/room/${roomId}`);
  }, [session, isRejoining, navigate]);

  const handleDismiss = useCallback(() => {
    if (session) {
      const roomId = session.roomId.trim().toUpperCase();
      try {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(`bhalyam.recovery.dismissed.${roomId}`, "true");
        }
      } catch {
        /* ignore */
      }
      setDismissedRoomId(roomId);
      setIsAlive(false);
    }
  }, [session]);

  if (isInRoom || !session?.seatToken || !isAlive) return null;
  if (dismissedRoomId === session.roomId.trim().toUpperCase()) return null;

  return (
    <div
      className="fixed top-3 inset-x-0 z-50 flex justify-center px-3 pointer-events-none"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-full shadow-lg border text-xs sm:text-sm font-semibold backdrop-blur-md bg-sky-500/90 border-sky-300 text-sky-950 dark:bg-sky-900/90 dark:border-sky-700 dark:text-sky-100">
        <span>
          You were disconnected from Room <strong>{session.roomId}</strong>
        </span>
        <button
          type="button"
          onClick={handleRejoin}
          disabled={isRejoining}
          className="px-3 py-1 bg-white/25 hover:bg-white/40 active:scale-95 rounded-full text-xs font-bold transition min-h-[32px] cursor-pointer disabled:opacity-50"
        >
          {isRejoining ? "Checking..." : "Rejoin Room"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss rejoin notice"
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:outline-none active:scale-95 transition cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
