import { useMemo } from "react";
import type { MandaliMessage } from "@shared/mandali/types.js";
import { useTranslation } from "../../hooks/useTranslation";
import { AlbumButton } from "./album/AlbumButton";
import { OPEN_TABLE_MAX_AGE_MS } from "./album/aroundNow";
import RoomInviteCard from "./RoomInviteCard";

/** The most tables worth showing at once: this is "what is on right now", not an archive. */
const MAX_TABLES = 6;

/**
 * Recent rooms the group shared, newest first, one card per room code and never a deleted one.
 * Each card already tells its own live story (open, full, in progress, closed), so this only decides
 * which cards to show.
 */
export function recentTables(messages: readonly MandaliMessage[], now: number): MandaliMessage[] {
  const seen = new Set<string>();
  const tables: MandaliMessage[] = [];
  for (let i = messages.length - 1; i >= 0 && tables.length < MAX_TABLES; i -= 1) {
    const message = messages[i];
    const code = message.roomCode;
    if (message.kind !== "ROOM_INVITE" || !code || message.content === "" || seen.has(code)) continue;
    seen.add(code);
    if (now - message.timestamp > OPEN_TABLE_MAX_AGE_MS) continue;
    tables.push(message);
  }
  return tables;
}

export interface PlayTablesProps {
  messages: readonly MandaliMessage[];
  groupName: string;
  selfId: string | null;
  onStart: () => void;
  /** phone: one column; desktop: two columns on wide screens. */
  variant: "phone" | "desktop";
}

/**
 * The Play tab: the tables the group has open, and one way to start another. A game is started by
 * making a real room (the create sheet), which posts its invite card into the group; the cards here
 * are those same cards, so what is listed is exactly what can be joined.
 */
export function PlayTables({ messages, groupName, selfId, onStart, variant }: PlayTablesProps) {
  const { t } = useTranslation();
  const tables = useMemo(() => recentTables(messages, Date.now()), [messages]);

  if (tables.length === 0) {
    return (
      <div className={`mx-auto flex max-w-md flex-col items-center justify-center px-4 text-center ${variant === "phone" ? "min-h-[55dvh] py-8" : "py-20"}`}>
        <p className={`album-hand m-0 leading-none text-album-foil ${variant === "phone" ? "text-4xl" : "text-5xl"}`}>{t("mandali.play.empty.title")}</p>
        <p className="mb-5 mt-3 max-w-xs text-[15px] leading-relaxed text-album-ink2">{t("mandali.play.empty.body", { name: groupName })}</p>
        <AlbumButton variant="primary" size="lg" onClick={onStart}>
          {t("mandali.play.empty.action")}
        </AlbumButton>
      </div>
    );
  }

  return (
    <div className={variant === "desktop" ? "grid grid-cols-1 gap-4 xl:grid-cols-2" : "space-y-3"}>
      {tables.map((message) => (
        <RoomInviteCard key={message.messageId} message={message} selfId={selfId} />
      ))}
    </div>
  );
}
