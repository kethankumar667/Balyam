/**
 * BHALYAM Mandali — a game room someone shared into the chat, drawn as a ticket.
 *
 * A gold band carries the host's face and the invitation; below it the room, its code and its seats;
 * a perforated tear line separates all that from the one thing to do, a Join button that takes you
 * straight in. When the room can no longer be joined the band goes quiet and the ticket is clearly
 * spent, with the reason in words.
 *
 * The card never lets you walk into a wall. Its status is live (see roomInviteStatusStore), and a
 * full, started or closed room is shown as a calm, plain fact rather than an error — with the reason
 * and what you can do about it. If the room fills up in the moment between your tap and the server's
 * answer, that is explained too, in words, not as a red failure.
 *
 * Requirements:
 * - Light and dark themes both flip fully (album tokens only: panels and ink together).
 * - 44x44px touch targets.
 * - Status is a word with an icon, never colour alone.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useEffect } from "react";
import { ArrowRight, Clock, DoorClosed, Gamepad2, Lock, Users } from "lucide-react";
import type { MandaliMessage } from "@shared/mandali/types.js";
import type { RoomInviteState } from "@shared/mandali/notifications.js";
import { useRoomInviteStatusStore } from "../../store/roomInviteStatusStore";
import { useTranslation } from "../../hooks/useTranslation";
import { useJoinSharedRoom } from "../../hooks/useJoinSharedRoom";
import { AlbumAvatar } from "./album/AlbumAvatar";
import { AlbumButton } from "./album/AlbumButton";
import { gameLabel, plainGameName } from "./album/games";

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
  const code = message.roomCode ?? "";
  const meta = message.roomInvite;
  const status = useRoomInviteStatusStore((s) => s.statuses[code]);
  const subscribe = useRoomInviteStatusStore((s) => s.subscribe);
  const { joining, failureText, join } = useJoinSharedRoom(code);

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

  const gameName = plainGameName(meta?.gameName ?? "") || (meta?.game ? gameLabel(meta.game) : "Game");
  const title = meta?.roomName ? `${meta.roomName}` : t("mandali.invite.roomOf", { game: gameName });
  const host = meta?.hostName ?? message.senderName;

  const handleJoin = () => void join(youAreIn);

  const muted = !canJoin;
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

  const bandTone = muted
    ? "bg-album-field text-album-ink2"
    : "bg-gradient-to-br from-album-foilfill via-album-foilfill to-album-foilfill/75 text-album-onfoil";

  return (
    <div
      role="group"
      aria-label={`${t("mandali.invite.label", { title })}${seatsTaken ? `, ${seatsTaken}` : ""}${stateLabel ? `, ${stateLabel}` : ""}`}
      className={`relative w-full max-w-sm overflow-hidden rounded-3xl border bg-album-raised shadow-md ${
        muted ? "border-album-line" : "border-album-foil/50"
      }`}
    >
      {/* The invitation band: who is asking, and the state of the table. */}
      <div className={`relative flex items-center gap-3 px-4 py-3.5 ${bandTone}`}>
        <Gamepad2
          aria-hidden="true"
          className={`pointer-events-none absolute -right-3 -top-3 h-24 w-24 -rotate-12 ${muted ? "opacity-[0.07]" : "opacity-[0.16]"}`}
        />
        <span className="relative flex-shrink-0 rounded-full p-0.5 ring-2 ring-current/40">
          <AlbumAvatar avatar={message.senderAvatar} name="" size="md" />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-semibold leading-snug">
            {isMine ? t("mandali.invite.youInvited") : t("mandali.invite.invitedYou", { name: message.senderName })}
          </p>
          <p className="m-0 truncate text-[13px] leading-snug opacity-80">{t("mandali.invite.hostedBy", { game: gameName, host })}</p>
        </div>
      </div>

      {/* The room: its name, the code to say out loud, and who is already at the table. */}
      <div className="px-4 pb-4 pt-4">
        <p className={`m-0 truncate text-xl font-semibold leading-tight ${muted ? "text-album-ink3" : "text-album-ink"}`}>{title}</p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="m-0 rounded-lg border border-dashed border-album-ink3/50 bg-album-field px-2.5 py-1 font-mono text-[15px] font-bold tracking-[0.3em] text-album-ink2">
            {code}
          </p>
          {state && (
            <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-album-line bg-album-field px-2.5 py-1 text-[13px] font-semibold text-album-ink">
              {StateIcon ? (
                <StateIcon className="h-3.5 w-3.5 text-album-ink3" aria-hidden="true" />
              ) : (
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-album-success motion-safe:animate-pulse" />
              )}
              {stateLabel}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {maxPlayers > 0 && (
              <div className="flex flex-wrap items-center gap-1" aria-hidden="true">
                {Array.from({ length: maxPlayers }).map((_, i) => {
                  const taken = players !== null && i < players;
                  return (
                    <span
                      key={i}
                      className={`flex h-[22px] w-[22px] items-center justify-center rounded-full ${
                        taken
                          ? muted
                            ? "bg-album-ink3/35 text-album-raised"
                            : "bg-album-foilfill text-album-onfoil"
                          : "border border-dashed border-album-ink3/60"
                      }`}
                    >
                      {taken && <Users className="h-3 w-3" />}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <p className="m-0 flex-shrink-0 text-[13px] text-album-ink3">{seatSummary ?? t("mandali.invite.checking")}</p>
        </div>

        {stateHint && !youAreIn && (
          <p className="m-0 mt-3 flex items-start gap-2 rounded-xl bg-album-field px-3 py-2 text-sm leading-relaxed text-album-ink2">
            {StateIcon && <StateIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-album-ink3" aria-hidden="true" />}
            <span>{stateHint}</span>
          </p>
        )}

        {failureText && (
          <p role="status" className="m-0 mt-3 text-sm font-medium leading-relaxed text-album-foil">
            {failureText}
          </p>
        )}
      </div>

      {/* The tear line: two notches and a dashed rule, so the button reads as the ticket's stub. */}
      <div aria-hidden="true" className="relative h-0">
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border border-album-line bg-album-page" />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full border border-album-line bg-album-page" />
        <span className="absolute inset-x-6 top-0 border-t border-dashed border-album-line" />
      </div>

      <div className="px-4 pb-4 pt-4">
        <AlbumButton
          variant={canJoin ? "primary" : "quiet"}
          size="lg"
          onClick={handleJoin}
          loading={joining}
          disabled={!canJoin && !youAreIn}
          className="w-full"
          icon={!joining && (youAreIn || canJoin) ? <ArrowRight className="h-4 w-4 order-last" aria-hidden="true" /> : undefined}
        >
          {buttonLabel}
        </AlbumButton>
      </div>
    </div>
  );
}
