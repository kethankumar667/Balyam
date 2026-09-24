import type { MandaliMessage } from "@shared/mandali/types.js";

/**
 * "New messages" marker for a chat someone is catching up on.
 *
 * Returned as an ordinary SYSTEM line so both hub layouts draw it with the
 * centred pill they already use for system events — no renderer needed to know
 * about it. Only what arrived after `unreadSince` from other people counts.
 */

export const UNREAD_DIVIDER_ID = "__unread_divider__";

export function insertUnreadDivider(
  messages: readonly MandaliMessage[],
  unreadSince: number | null,
  selfId: string | null
): readonly MandaliMessage[] {
  if (unreadSince === null) return messages;

  const isUnread = (m: MandaliMessage): boolean =>
    m.timestamp > unreadSince && m.senderId !== selfId && m.kind !== "SYSTEM";

  const first = messages.findIndex(isUnread);
  if (first < 0) return messages;

  const count = messages.slice(first).filter(isUnread).length;
  const anchor = messages[first];
  const divider = {
    messageId: UNREAD_DIVIDER_ID,
    channelId: anchor.channelId,
    mandaliId: anchor.mandaliId,
    senderId: "",
    senderName: "",
    senderAvatar: "",
    senderRole: "MEMBER",
    content: `${count} new ${count === 1 ? "message" : "messages"}`,
    reactions: {},
    timestamp: anchor.timestamp - 1,
    kind: "SYSTEM",
  } as MandaliMessage;

  return [...messages.slice(0, first), divider, ...messages.slice(first)];
}
