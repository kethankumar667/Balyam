import { useEffect, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import type { MandaliMember, MandaliMessage } from "@shared/mandali/types.js";
import { useTranslation } from "../../../hooks/useTranslation";
import { useJoinSharedRoom } from "../../../hooks/useJoinSharedRoom";
import { useRoomInviteStatusStore } from "../../../store/roomInviteStatusStore";
import { AlbumAvatar } from "./AlbumAvatar";
import { AlbumButton } from "./AlbumButton";
import {
  AROUND_FACES_MAX,
  OPEN_TABLE_MAX_AGE_MS,
  pickOpenTables,
  playingSummary,
  whoIsAround,
  type OpenTable,
} from "./aroundNow";

export interface WhosAroundStripProps {
  members: MandaliMember[];
  messages: MandaliMessage[];
  selfId: string | null;
}

/** A soft halo in the same colour as the presence badge, so the glow and the badge never disagree. */
const GLOW: Record<MandaliMember["presence"], string> = {
  online: "shadow-[0_0_12px_rgb(var(--album-success)/0.75)]",
  "in-game": "shadow-[0_0_12px_rgb(var(--album-danger)/0.7)]",
  idle: "",
  offline: "",
};

const PRESENCE_KEY: Record<MandaliMember["presence"], string> = {
  online: "mandali.people.presence.online",
  "in-game": "mandali.people.presence.inGame",
  idle: "mandali.people.presence.idle",
  offline: "mandali.people.presence.offline",
};

/** How many recent shared rooms to keep fresh. More than the strip can show, so one filling up is replaced by the next. */
const WATCHED_ROOMS = 5;

/**
 * The first thing a friend group should see: who is here right now, who is mid-match, and which
 * tables are still open to sit down at.
 *
 * Faces glow by presence (and carry the same badge as everywhere else, so colour is never the only
 * signal). "Open tables" are rooms friends shared into this chat that are still waiting for players,
 * with a one-tap Join. There is deliberately no Join for someone who is mid-match: a running match
 * cannot take new players, so offering it would be a button that always fails. Hidden entirely when
 * nobody is around and no table is open, rather than taking a row to say nothing.
 */
export function WhosAroundStrip({ members, messages, selfId }: WhosAroundStripProps) {
  const { t } = useTranslation();
  const statuses = useRoomInviteStatusStore((s) => s.statuses);
  const subscribe = useRoomInviteStatusStore((s) => s.subscribe);

  const around = useMemo(() => whoIsAround(members, selfId), [members, selfId]);

  // Keep the newest recent rooms' status live, so an open table stops being offered the moment it fills.
  const watched = useMemo(() => {
    const cutoff = Date.now() - OPEN_TABLE_MAX_AGE_MS;
    const codes: string[] = [];
    for (let i = messages.length - 1; i >= 0 && codes.length < WATCHED_ROOMS; i -= 1) {
      const m = messages[i];
      if (m.kind === "ROOM_INVITE" && m.roomCode && m.content !== "" && m.timestamp >= cutoff && !codes.includes(m.roomCode)) {
        codes.push(m.roomCode);
      }
    }
    return codes.join(",");
  }, [messages]);
  useEffect(() => {
    if (!watched) return undefined;
    return subscribe(watched.split(","));
  }, [watched, subscribe]);

  const tables = pickOpenTables(messages, statuses, Date.now());

  if (around.length === 0 && tables.length === 0) return null;

  const here = around.filter((m) => m.presence === "online" || m.presence === "in-game").length;
  const playing = playingSummary(around);
  const shown = around.slice(0, AROUND_FACES_MAX);
  const hidden = around.length - shown.length;

  const playingLine = playing
    ? playing.others > 0
      ? t("mandali.around.playingMore", { name: playing.first.displayName, count: playing.others })
      : playing.game
        ? t("mandali.around.playing", { name: playing.first.displayName, game: playing.game })
        : t("mandali.around.inGame", { name: playing.first.displayName })
    : null;
  const summary = [here > 0 ? t("mandali.people.online", { count: here }) : null, playingLine].filter(Boolean).join(" · ");

  return (
    <section aria-label={t("mandali.around.label")} className="flex-shrink-0 border-b border-album-line bg-album-raised/70 px-3 py-2.5">
      {around.length > 0 && (
        <div className="flex items-center gap-3">
          <ul aria-label={t("mandali.around.label")} className="m-0 flex flex-shrink-0 list-none -space-x-2 p-0">
            {shown.map((m) => (
              <li key={m.playerId} className="relative">
                <span
                  title={`${m.displayName} · ${t(PRESENCE_KEY[m.presence])}`}
                  className={`block rounded-full ring-2 ring-album-raised ${GLOW[m.presence]}`}
                >
                  <AlbumAvatar avatar={m.avatar} name={`${m.displayName}, ${t(PRESENCE_KEY[m.presence])}`} size="sm" presence={m.presence} />
                </span>
              </li>
            ))}
            {hidden > 0 && (
              <li className="relative flex h-8 min-w-8 items-center justify-center rounded-full bg-album-field px-1.5 text-xs font-semibold text-album-ink2 ring-2 ring-album-raised">
                {t("mandali.around.more", { count: hidden })}
              </li>
            )}
          </ul>
          {summary && <p className="m-0 min-w-0 flex-1 truncate text-sm font-medium text-album-ink2">{summary}</p>}
        </div>
      )}

      {tables.length > 0 && (
        <ul aria-label={t("mandali.around.tables")} className={`m-0 grid list-none gap-2 p-0 ${around.length > 0 ? "mt-2.5" : ""}`}>
          {tables.map((table) => (
            <li key={table.code}>
              <OpenTableRow table={table} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OpenTableRow({ table }: { table: OpenTable }) {
  const { t } = useTranslation();
  const { joining, failureText, join } = useJoinSharedRoom(table.code);

  return (
    <div className="rounded-xl border border-album-foil/40 bg-album-foilfill/10 px-3 py-2">
      <div className="flex items-center gap-3">
        <AlbumAvatar avatar={table.hostAvatar} name="" size="md" />
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-semibold leading-snug text-album-ink">{table.title}</p>
          <p className="m-0 truncate text-[13px] leading-snug text-album-ink3">
            {t("mandali.around.seats", { game: table.gameName, players: table.players, max: table.maxPlayers })}
          </p>
        </div>
        <AlbumButton
          variant="primary"
          loading={joining}
          onClick={() => void join(false)}
          aria-label={t("mandali.around.joinLabel", { title: table.title, host: table.hostName })}
          icon={joining ? undefined : <ArrowRight className="h-4 w-4 order-last" aria-hidden="true" />}
          className="flex-shrink-0"
        >
          {t("mandali.around.join")}
        </AlbumButton>
      </div>
      {failureText && (
        <p role="status" className="m-0 mt-1.5 text-sm font-medium leading-snug text-album-foil">
          {failureText}
        </p>
      )}
    </div>
  );
}
