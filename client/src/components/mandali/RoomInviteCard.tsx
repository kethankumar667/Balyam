/**
 * BHALYAM Mandali — a game room someone shared into the chat.
 *
 * Pinned to the page like an invitation: who is hosting, which game, how many
 * seats are taken right now, and a Join button that takes you straight in.
 *
 * The card never lets you walk into a wall. Its status is live (see
 * roomInviteStatusStore), and a full, started or closed room is shown as a
 * calm, plain fact rather than an error — with the reason and what you can do
 * about it. If the room fills up in the moment between your tap and the
 * server's answer, that is explained too, in words, not as a red failure.
 *
 * Requirements:
 * - Light and dark themes both flip fully (panels and ink together).
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, DoorClosed, Gamepad2, Lock } from "lucide-react";
import type { MandaliMessage } from "@shared/mandali/types.js";
import type { RoomInviteState } from "@shared/mandali/notifications.js";
import { joinRoomByCode, joinFailureMessage, type RoomJoinFailure } from "../../lib/roomJoin";
import { useRoomInviteStatusStore } from "../../store/roomInviteStatusStore";
import { useTranslation } from "../../hooks/useTranslation";
import { AlbumButton } from "./album/AlbumButton";

export interface RoomInviteCardProps {
  message: MandaliMessage;
  selfId: string | null;
}

const STATE_KEYS: Record<RoomInviteState, { label: string; hint: string | null }> = {
  OPEN: { label: "mandali.invite.state.open", hint: null },
  FULL: { label: "mandali.invite.state.full", hint: "mandali.invite.hint.full" },
  IN_PROGRESS: { label: "mandali.invite.state.inProgress", hint: "mandali.invite.hint.inProgress" },
  CLOSED: { label: "mandali.invite.state.closed", hint: "mandali.invite.hint.closed" },
};

export default function RoomInviteCard({ message, selfId }: RoomInviteCardProps) {
  const { t } = useTranslation();
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
      <div className="rounded-2xl bg-album-field px-4 py-3 text-sm italic text-album-ink3">{t("mandali.invite.removed")}</div>
    );
  }

  const state: RoomInviteState | null = status?.state ?? null;
  const maxPlayers = status?.maxPlayers || meta?.maxPlayers || 0;
  const players = status?.players ?? null;
  const youAreIn = status?.youAreIn === true;
  const isMine = message.senderId === selfId;
  const canJoin = !youAreIn ? state === null || state === "OPEN" : true;

  const gameName = meta?.gameName ?? "Game";
  const title = meta?.roomName ? `${meta.roomName}` : t("mandali.invite.roomOf", { game: gameName });
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
  const seatSummary = players !== null && maxPlayers > 0 ? t("mandali.invite.seats", { players, max: maxPlayers }) : null;
  const seatsTaken = players !== null && maxPlayers > 0 ? t("mandali.invite.seatsTaken", { players, max: maxPlayers }) : "";
  const stateLabel = state ? t(STATE_KEYS[state].label) : "";
  const stateHint = state && STATE_KEYS[state].hint ? t(STATE_KEYS[state].hint as string) : "";
  const StateIcon = state === "FULL" ? Lock : state === "IN_PROGRESS" ? Clock : state === "CLOSED" ? DoorClosed : null;

  const buttonLabel = joining
    ? t("mandali.invite.joining")
    : youAreIn
      ? t("mandali.invite.return")
      : canJoin
        ? t("mandali.invite.join")
        : state === "FULL"
          ? t("mandali.invite.btn.full")
          : state === "IN_PROGRESS"
            ? t("mandali.invite.btn.started")
            : t("mandali.invite.btn.closed");

  return (
    <div
      role="group"
      aria-label={`${t("mandali.invite.label", { title })}${seatsTaken ? `, ${seatsTaken}` : ""}${stateLabel ? `, ${stateLabel}` : ""}`}
      className={`album-corners w-full max-w-sm rounded-2xl border bg-album-raised p-4 ${muted ? "border-album-line" : "border-album-foil/40"}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
            muted ? "bg-album-field text-album-ink3" : "bg-album-foilfill/20 text-album-foil"
          }`}
        >
          <Gamepad2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-sm font-semibold leading-snug text-album-ink">
            {isMine ? t("mandali.invite.youInvited") : t("mandali.invite.invitedYou", { name: message.senderName })}
          </p>
          <p className="m-0 truncate text-[13px] text-album-ink3">{t("mandali.invite.hostedBy", { game: gameName, host })}</p>
        </div>
        {state && (
          <span className={`flex flex-shrink-0 items-center gap-1 text-[13px] font-medium ${state === "OPEN" ? "text-album-success" : "text-album-ink3"}`}>
            {StateIcon && <StateIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            {stateLabel}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`m-0 truncate text-lg font-semibold leading-tight ${muted ? "text-album-ink3" : "text-album-ink"}`}>{title}</p>
          <p className="m-0 font-mono text-[13px] font-semibold tracking-[0.2em] text-album-ink3">{code}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          {maxPlayers > 0 && (
            <div className="flex items-center justify-end gap-1" aria-hidden="true">
              {Array.from({ length: maxPlayers }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full ${
                    players !== null && i < players ? (muted ? "bg-album-ink3" : "bg-album-foilfill") : "bg-album-line"
                  }`}
                />
              ))}
            </div>
          )}
          <p className="m-0 mt-1 text-[13px] text-album-ink3">{seatSummary ?? t("mandali.invite.checking")}</p>
        </div>
      </div>

      {stateHint && !youAreIn && <p className="m-0 mt-3 text-sm leading-relaxed text-album-ink2">{stateHint}</p>}

      {failureText && (
        <p role="status" className="m-0 mt-3 text-sm font-medium leading-relaxed text-album-foil">
          {failureText}
        </p>
      )}

      <AlbumButton
        variant={canJoin ? "primary" : "quiet"}
        size="lg"
        onClick={handleJoin}
        loading={joining}
        disabled={!canJoin && !youAreIn}
        className="mt-3 w-full"
        icon={!joining && (youAreIn || canJoin) ? <ArrowRight className="h-4 w-4 order-last" aria-hidden="true" /> : undefined}
      >
        {buttonLabel}
      </AlbumButton>
    </div>
  );
}
