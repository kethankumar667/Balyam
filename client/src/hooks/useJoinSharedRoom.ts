import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinRoomByCode, joinFailureMessage, type RoomJoinFailure } from "../lib/roomJoin";
import { useRoomInviteStatusStore } from "../store/roomInviteStatusStore";

/**
 * The one way a "Join" button on a room shared into a Mandali takes someone in.
 *
 * Already seated there → just go. Otherwise join, and on success go. If the join lost a race (the
 * room filled, or the match started, between the tap and the server's answer) say so in words and
 * refresh the room's live status, so whatever drew the button stops claiming the room is open.
 * A ref guards double taps: two quick taps must never ask the server for two seats.
 */
export interface SharedRoomJoin {
  joining: boolean;
  /** What to tell the person when the join did not work, or "" when there is nothing to say. */
  failureText: string;
  join: (alreadyIn: boolean) => Promise<void>;
}

export function useJoinSharedRoom(roomCode: string): SharedRoomJoin {
  const navigate = useNavigate();
  const refresh = useRoomInviteStatusStore((s) => s.refresh);
  const [joining, setJoining] = useState(false);
  const [failure, setFailure] = useState<{ reason: RoomJoinFailure; error: string } | null>(null);
  const joiningRef = useRef(false);

  const join = useCallback(
    async (alreadyIn: boolean): Promise<void> => {
      if (joiningRef.current) return;
      if (alreadyIn) {
        navigate(`/room/${roomCode}`);
        return;
      }
      joiningRef.current = true;
      setJoining(true);
      setFailure(null);
      try {
        const result = await joinRoomByCode(roomCode);
        if (result.ok) {
          navigate(`/room/${roomCode}`);
          return;
        }
        setFailure({ reason: result.reason, error: result.error });
        void refresh([roomCode]);
      } finally {
        joiningRef.current = false;
        setJoining(false);
      }
    },
    [navigate, refresh, roomCode],
  );

  return { joining, failureText: failure ? joinFailureMessage(failure) : "", join };
}
