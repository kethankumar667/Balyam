/**
 * BHALYAM Mandali — a game the group is gathering for.
 *
 * Says in plain words what is happening ("Gathering players", "3 of 4 seats
 * filled") and offers the one thing to do next: join, start, or leave. No
 * badges, no telemetry — a family deciding who sits down to Ludo.
 *
 * Requirements:
 * - Light and dark themes both flip fully (panels and ink together).
 * - Touch targets at least 44 x 44 px.
 * - Zero usage of Sparkles from lucide-react.
 */

import React from "react";
import { Gamepad2 } from "lucide-react";
import type { MandaliParty } from "@shared/mandali/types.js";
import { useTranslation } from "../../hooks/useTranslation";
import { AlbumAvatar } from "./album/AlbumAvatar";
import { AlbumButton } from "./album/AlbumButton";
import { gameLabel } from "./album/games";

export interface PartyLoungeCardProps {
  party: MandaliParty;
  currentUserId: string | null;
  onJoin: (partyId: string) => void;
  onLeave: (partyId: string) => void;
  onLaunch: (partyId: string) => void;
  disabled?: boolean;
}

export const PartyLoungeCard: React.FC<PartyLoungeCardProps> = ({
  party,
  currentUserId,
  onJoin,
  onLeave,
  onLaunch,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const isMember = party.members.some((m) => m.playerId === currentUserId);
  const isLeader = party.leaderId === currentUserId;
  const isFull = party.members.length >= party.slots;
  const isForming = party.status === "FORMING";
  const statusText =
    party.status === "FORMING"
      ? t("mandali.party.status.forming")
      : party.status === "IN_GAME"
        ? t("mandali.party.status.inGame")
        : t("mandali.party.status.done");

  return (
    <article className="rounded-2xl border border-album-line bg-album-raised p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 truncate text-base font-semibold leading-snug text-album-ink">{party.title}</h3>
          <p className="m-0 mt-0.5 text-sm text-album-ink3">
            {gameLabel(party.game)} · {statusText}
          </p>
        </div>
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-album-field text-album-foil">
          <Gamepad2 className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4">
        <p className="m-0 mb-2.5 text-sm text-album-ink3">
          {t("mandali.party.seats", { filled: party.members.length, total: party.slots })}
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-2 p-0">
          {Array.from({ length: party.slots }).map((_, index) => {
            const member = party.members[index];
            if (!member) {
              return (
                <li key={`open_${index}`} className="flex w-14 flex-col items-center gap-1">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-album-line text-album-ink3" aria-hidden="true">
                    +
                  </span>
                  <span className="text-xs text-album-ink3">{t("mandali.party.openSeat")}</span>
                </li>
              );
            }
            const isHost = member.playerId === party.leaderId;
            return (
              <li key={member.playerId || index} className="flex w-14 flex-col items-center gap-1">
                <AlbumAvatar avatar={member.avatar} name="" />
                <span className="w-full truncate text-center text-xs font-medium text-album-ink2">{member.displayName.split(" ")[0]}</span>
                {isHost && <span className="-mt-1 text-xs font-semibold text-album-foil">{t("mandali.party.host")}</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {isMember ? (
          <>
            {isLeader ? (
              <AlbumButton variant="primary" className="flex-1" onClick={() => onLaunch(party.partyId)} disabled={disabled || !isForming}>
                {t("mandali.party.start")}
              </AlbumButton>
            ) : (
              <p className="m-0 flex-1 text-sm leading-snug text-album-ink2">{t("mandali.party.waiting")}</p>
            )}
            <AlbumButton variant="quiet" onClick={() => onLeave(party.partyId)} disabled={disabled}>
              {t("mandali.party.leave")}
            </AlbumButton>
          </>
        ) : (
          <AlbumButton variant="primary" className="w-full" onClick={() => onJoin(party.partyId)} disabled={disabled || isFull || !isForming}>
            {isFull ? t("mandali.party.full") : t("mandali.party.join")}
          </AlbumButton>
        )}
      </div>
    </article>
  );
};
