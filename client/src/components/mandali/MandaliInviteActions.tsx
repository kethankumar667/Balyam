/**
 * BHALYAM Mandali — action row for a shared-room notification.
 *
 * The notification list's counterpart of `RoomInviteCard`: same live status,
 * same Join behaviour, in the compact form a list row needs. A full, started or
 * closed room is shown as a plain fact with the reason — never a dead button
 * that fails when tapped.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { joinRoomByCode, joinFailureMessage, type RoomJoinFailure } from "../../lib/roomJoin";
import { useRoomInviteStatusStore } from "../../store/roomInviteStatusStore";

export interface MandaliInviteActionsProps {
  roomCode: string;
  isDark: boolean;
  /** Called with the room code once the member holds a seat (or already had one). */
  onEnterRoom: (roomCode: string) => void;
  onDismiss: () => void;
}

const UNAVAILABLE: Record<string, { label: string; hint: string }> = {
  FULL: { label: "Room full", hint: "Every seat is taken." },
  IN_PROGRESS: { label: "Already started", hint: "The match has started — no new players can join." },
  CLOSED: { label: "Room closed", hint: "This room has ended." },
};

export default function MandaliInviteActions({ roomCode, isDark, onEnterRoom, onDismiss }: MandaliInviteActionsProps) {
  const status = useRoomInviteStatusStore((s) => s.statuses[roomCode]);
  const refresh = useRoomInviteStatusStore((s) => s.refresh);
  const subscribe = useRoomInviteStatusStore((s) => s.subscribe);
  const [joining, setJoining] = useState(false);
  const [failure, setFailure] = useState<{ reason: RoomJoinFailure; error: string } | null>(null);
  const joiningRef = useRef(false);

  useEffect(() => subscribe([roomCode]), [roomCode, subscribe]);

  const state = status?.state ?? null;
  const youAreIn = status?.youAreIn === true;
  const unavailable = !youAreIn && state !== null && state !== "OPEN" ? UNAVAILABLE[state] : null;
  const seats = status && status.maxPlayers > 0 ? `${status.players} of ${status.maxPlayers} seats` : null;

  const handleJoin = async () => {
    if (joiningRef.current) return;
    if (youAreIn) {
      onEnterRoom(roomCode);
      return;
    }
    joiningRef.current = true;
    setJoining(true);
    setFailure(null);
    try {
      const result = await joinRoomByCode(roomCode);
      if (result.ok) {
        onEnterRoom(roomCode);
        return;
      }
      setFailure({ reason: result.reason, error: result.error });
      void refresh([roomCode]);
    } finally {
      joiningRef.current = false;
      setJoining(false);
    }
  };

  const secondary = isDark ? "text-album-ink3" : "text-[#6E5A4B]";

  return (
    <div className="mt-3 pt-2.5 border-t border-black/5">
      {(seats || unavailable) && (
        <p className={`text-[13px] font-semibold mb-2 ${secondary}`}>
          {[seats, unavailable?.hint].filter(Boolean).join(" · ")}
        </p>
      )}
      {failure && (
        <p role="status" className="text-[13px] font-semibold mb-2 text-album-foil">
          {joinFailureMessage(failure)}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleJoin}
          disabled={joining || unavailable !== null}
          className={`flex-1 min-h-[44px] px-3 rounded-xl font-semibold text-[13px] text-center transition ${
            unavailable
              ? "bg-album-field text-album-ink3 cursor-not-allowed"
              : "bg-album-foilfill text-white shadow-xs active:scale-95 cursor-pointer"
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-album-focus`}
        >
          {joining ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Joining…
            </span>
          ) : unavailable ? (
            unavailable.label
          ) : youAreIn ? (
            "Return to room"
          ) : (
            "Join Room"
          )}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className={`min-h-[44px] px-3.5 rounded-xl text-[13px] font-bold transition cursor-pointer ${
            isDark ? "bg-album-raised/10 text-album-ink3 hover:text-album-ink" : "bg-black/5 text-[#5C3B1E] hover:bg-black/10"
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-album-focus`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
