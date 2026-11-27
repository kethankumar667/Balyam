import type { GangMessage } from "@shared/gang/types.js";
import type { GangDigest, NotificationLevel } from "@shared/gang/notifications.js";

/** Same ceiling as the SQL digest: a very busy chat is summarised, not scanned forever. */
export const DIGEST_UNREAD_CAP = 1000;
const DIGEST_TOP_SENDERS = 3;
const DIGEST_MAX_INVITES = 5;
const PREVIEW_LENGTH = 120;

/** What is worth telling someone they missed. System chatter and their own messages are not. */
const COUNTED_KINDS = new Set(["TEXT", "ROOM_INVITE", "COIN_REQUEST"]);

export interface DigestGang {
  id: string;
  handle: string;
  name: string;
  emblem: string;
}

/**
 * The in-memory twin of `get_mandali_digests` (Postgres). Same rules, so local
 * development and the tests behave like production: one summary per Gang,
 * built from messages newer than the member's read pointer, from other people.
 */
export function buildDigests(args: {
  playerId: string;
  gangs: readonly DigestGang[];
  messages: readonly GangMessage[];
  readPointer: (gangId: string) => number;
  level: (gangId: string) => NotificationLevel;
  nameOf: (gangId: string, playerId: string) => string;
}): GangDigest[] {
  const digests = args.gangs.map((gang): GangDigest => {
    const pointer = args.readPointer(gang.id);
    const unread = args.messages
      .filter(
        (m) =>
          m.gangId === gang.id &&
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
      .map(([id, count]) => ({ name: args.nameOf(gang.id, id), count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, DIGEST_TOP_SENDERS);

    const newest = unread[0];
    return {
      gangId: gang.id,
      handle: gang.handle,
      name: gang.name,
      emblem: gang.emblem,
      level: args.level(gang.id),
      lastReadAt: new Date(pointer).toISOString(),
      unreadCount: unread.length,
      senderCount: perSender.size,
      topSenders,
      latest: newest
        ? {
            senderName: args.nameOf(gang.id, newest.senderId),
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
          senderName: args.nameOf(gang.id, m.senderId),
          metadata: m.roomInvite ?? {},
          at: new Date(m.timestamp).toISOString(),
        })),
    };
  });

  // Busiest-first ordering mirrors the SQL: newest activity on top, quiet ones last.
  return digests.sort((a, b) => (b.latest?.at ?? "").localeCompare(a.latest?.at ?? ""));
}
