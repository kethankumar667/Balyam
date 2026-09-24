/**
 * BHALYAM Mandali — Room Invite Card
 *
 * A room someone shared into chat, as something you can act on: who is
 * hosting, which game, how many seats are taken right now, and a Join button
 * that takes you straight into the room.
 *
 * The card never lets you walk into a wall. Its status is live (see
 * roomInviteStatusStore), and a full, started or closed room is shown as a
 * calm, plain fact rather than an error — with the reason and what you can do
 * about it. If the room fills up in the moment between your tap and the
 * server's answer, that is explained too, in words, not as a red failure.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Users, Lock, Loader2, ArrowRight, DoorClosed, Clock } from "lucide-react";
import type { MandaliMessage } from "@shared/mandali/types.js";
import type { RoomInviteState } from "@shared/mandali/notifications.js";
import { joinRoomByCode, joinFailureMessage, type RoomJoinFailure } from "../../lib/roomJoin";
import { useRoomInviteStatusStore } from "../../store/roomInviteStatusStore";

export interface RoomInviteCardProps {
  message: MandaliMessage;
  selfId: string | null;
}

/** How the card presents each standing. `tone` picks the palette; nothing here is an "error". */
const STATE_COPY: Record<RoomInviteState, { label: string; hint: string }> = {
  OPEN: { label: "Open", hint: "" },
  FULL: { label: "Room full", hint: "Every seat is taken. Ask the host to open one, or check back." },
  IN_PROGRESS: { label: "In progress", hint: "The match has started — no new players can join." },
  CLOSED: { label: "Closed", hint: "This room has ended." },
};

export default function RoomInviteCard({ message, selfId }: RoomInviteCardProps) {
  const navigate = useNavigate();
  const code = message.roomCode ?? "";
  const meta = message.roomInvite;
  const status = useRoomInviteStatusStore((s) => s.statuses[code]);
  const refresh = useRoomInviteStatusStore((s) => s.refresh);
  const subscribe = useRoomInviteStatusStore((s) => s.subscribe);

  const [joining, setJoining] = useState(false);
  const [failure, setFailure] = useState<{ reason: RoomJoinFailure; error: string } | null>(null);
  const joiningRef = useRef(false);

  useEffect(() => {
    if (!code) return;
    return subscribe([code]);
  }, [code, subscribe]);

  if (!code || message.content === "") {
    // A deleted card: nothing left to join.
    return (
      <div className="rounded-2xl px-4 py-3 bg-slate-100 dark:bg-slate-800/60 text-xs italic text-slate-500 dark:text-slate-400">
        This invitation was removed.
      </div>
    );
  }

  const state: RoomInviteState | null = status?.state ?? null;
  const maxPlayers = status?.maxPlayers || meta?.maxPlayers || 0;
  const players = status?.players ?? null;
  const youAreIn = status?.youAreIn === true;
  const isMine = message.senderId === selfId;
  const canJoin = !youAreIn ? state === null || state === "OPEN" : true;

  const gameName = meta?.gameName ?? "Game";
  const title = meta?.roomName ? `${meta.roomName}` : `${gameName} room`;
  const host = meta?.hostName ?? message.senderName;

  const handleJoin = async () => {
    if (joiningRef.current) return;
    if (youAreIn) {
      navigate(`/room/${code}`);
      return;
    }
    joiningRef.current = true;
    setJoining(true);
    setFailure(null);
    try {
      const result = await joinRoomByCode(code);
      if (result.ok) {
        navigate(`/room/${code}`);
        return;
      }
      setFailure({ reason: result.reason, error: result.error });
      // The card should now tell the truth about the room, not the stale "open".
      void refresh([code]);
    } finally {
      joiningRef.current = false;
      setJoining(false);
    }
  };

  const muted = !canJoin;
  const failureText = failure ? joinFailureMessage(failure) : "";
  const seatSummary = players !== null && maxPlayers > 0 ? `${players} of ${maxPlayers} seats` : null;

  return (
    <div
      role="group"
      aria-label={`Room invitation: ${title}${seatSummary ? `, ${seatSummary} taken` : ""}${state ? `, ${STATE_COPY[state].label}` : ""}`}
      className={`w-full max-w-sm rounded-2xl overflow-hidden border shadow-sm transition-colors ${
        muted
          ? "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
          : "bg-white dark:bg-slate-900/90 border-amber-500/30"
      }`}
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${
          muted ? "bg-slate-100/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800" : "bg-amber-500/10 border-amber-500/20"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            muted ? "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {isMine ? "You invited the Mandali" : `${message.senderName} invited you to play`}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {gameName} · hosted by {host}
          </p>
        </div>
        {state && (
          <span
            className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 border ${
              state === "OPEN"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : "bg-slate-500/10 border-slate-500/25 text-slate-600 dark:text-slate-300"
            }`}
          >
            {state === "FULL" && <Lock className="w-3 h-3" />}
            {state === "IN_PROGRESS" && <Clock className="w-3 h-3" />}
            {state === "CLOSED" && <DoorClosed className="w-3 h-3" />}
            {STATE_COPY[state].label}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm font-black truncate ${muted ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
              {title}
            </p>
            <p className="font-mono text-xs font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400">{code}</p>
          </div>

          <div className="shrink-0 text-right">
            {maxPlayers > 0 && (
              <div className="flex items-center justify-end gap-1" aria-hidden>
                {Array.from({ length: maxPlayers }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full ${
                      players !== null && i < players
                        ? muted
                          ? "bg-slate-400 dark:bg-slate-500"
                          : "bg-amber-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            )}
            <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
              <Users className="w-3 h-3" />
              {seatSummary ?? "Checking seats…"}
            </p>
          </div>
        </div>

        {state && STATE_COPY[state].hint && !youAreIn && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{STATE_COPY[state].hint}</p>
        )}

        {failureText && (
          <p role="status" className="text-xs font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
            {failureText}
          </p>
        )}

        <button
          type="button"
          onClick={handleJoin}
          disabled={joining || (!canJoin && !youAreIn)}
          className={`w-full min-h-[44px] rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
            canJoin
              ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md active:scale-[0.98] cursor-pointer"
              : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
          } disabled:opacity-70`}
        >
          {joining ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Joining…
            </>
          ) : youAreIn ? (
            <>
              Return to room
              <ArrowRight className="w-4 h-4" />
            </>
          ) : canJoin ? (
            <>
              Join room
              <ArrowRight className="w-4 h-4" />
            </>
          ) : state === "FULL" ? (
            "Room full"
          ) : state === "IN_PROGRESS" ? (
            "Already started"
          ) : (
            "Room closed"
          )}
        </button>
      </div>
    </div>
  );
}
