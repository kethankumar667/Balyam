import type { MandaliMessage } from "@shared/mandali/types.js";
import type { MandaliDigest, NotificationLevel } from "@shared/mandali/notifications.js";

/** Same ceiling as the SQL digest: a very busy chat is summarised, not scanned forever. */
export const DIGEST_UNREAD_CAP = 1000;
const DIGEST_TOP_SENDERS = 3;
const DIGEST_MAX_INVITES = 5;
const PREVIEW_LENGTH = 120;

/** What is worth telling someone they missed. System chatter and their own messages are not. */
const COUNTED_KINDS = new Set(["TEXT", "ROOM_INVITE", "COIN_REQUEST"]);

export interface DigestMandali {
  id: string;
  handle: string;
  name: string;
  emblem: string;
}

/**
 * The in-memory twin of `get_mandali_digests` (Postgres). Same rules, so local
 * development and the tests behave like production: one summary per Mandali,
 * built from messages newer than the member's read pointer, from other people.
 */
export function buildDigests(args: {
  playerId: string;
  mandalis: readonly DigestMandali[];
  messages: readonly MandaliMessage[];
  readPointer: (mandaliId: string) => number;
  level: (mandaliId: string) => NotificationLevel;
  nameOf: (mandaliId: string, playerId: string) => string;
}): MandaliDigest[] {
  const digests = args.mandalis.map((mandali): MandaliDigest => {
    const pointer = args.readPointer(mandali.id);
    const unread = args.messages
      .filter(
        (m) =>
          m.mandaliId === mandali.id &&
          m.timestamp > pointer &&
          m.senderId !== args.playerId &&
          COUNTED_KINDS.has(m.kind ?? "TEXT") &&
          m.content !== ""
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, DIGEST_UNREAD_CAP);

    const perSender = new Map<string, number>();
    for (const m of unread) perSender.set(m.senderId, (perSender.get(m.senderId) ?? 0) + 1);

    const topSenders = [...perSender.entries()]
      .map(([id, count]) => ({ name: args.nameOf(mandali.id, id), count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, DIGEST_TOP_SENDERS);

    const newest = unread[0];
    return {
      mandaliId: mandali.id,
      handle: mandali.handle,
      name: mandali.name,
      emblem: mandali.emblem,
      level: args.level(mandali.id),
      lastReadAt: new Date(pointer).toISOString(),
      unreadCount: unread.length,
      senderCount: perSender.size,
      topSenders,
      latest: newest
        ? {
            senderName: args.nameOf(mandali.id, newest.senderId),
            kind: newest.kind ?? "TEXT",
            preview: newest.content.slice(0, PREVIEW_LENGTH),
            at: new Date(newest.timestamp).toISOString(),
          }
        : null,
      invites: unread
        .filter((m) => m.kind === "ROOM_INVITE" && m.roomCode)
        .slice(0, DIGEST_MAX_INVITES)
        .map((m) => ({
          messageId: m.messageId,
          roomCode: m.roomCode as string,
          senderName: args.nameOf(mandali.id, m.senderId),
          metadata: m.roomInvite ?? {},
          at: new Date(m.timestamp).toISOString(),
        })),
    };
  });

  // Busiest-first ordering mirrors the SQL: newest activity on top, quiet ones last.
  return digests.sort((a, b) => (b.latest?.at ?? "").localeCompare(a.latest?.at ?? ""));
}
