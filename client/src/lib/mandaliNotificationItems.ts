import type { MandaliDigest } from "@shared/mandali/notifications.js";
import type { NotificationItem } from "./profileNotifications";
import { formatTimeAgo } from "./formatTimeAgo";

/**
 * Turns what a member missed into notification rows.
 *
 * A busy Mandali is ONE row that tells the whole story (how many messages,
 * from whom, the latest line) — never a row per message. A room someone shared
 * is different: it is something to act on, so each one is its own row.
 *
 * What a Mandali is allowed to show depends on the member's setting for it:
 *   ALL           the digest row and the invite rows
 *   INVITES_ONLY  the invite rows only
 *   MUTED         nothing
 */

const PREVIEW_LENGTH = 80;
const CAPPED_COUNT = 1000;

export const digestItemId = (mandaliId: string): string => `mandali:${mandaliId}`;
export const inviteItemId = (messageId: string): string => `mandali-invite:${messageId}`;

function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** "Rajesh (23), Sai (11) +5 more" — who was talking, most active first. */
export function describeSenders(digest: Pick<MandaliDigest, "topSenders" | "senderCount">): string {
  const shown = digest.topSenders.slice(0, 2);
  const parts = shown.map((s) => (digest.senderCount > 1 ? `${s.name} (${s.count})` : s.name));
  const others = Math.max(0, digest.senderCount - shown.length);
  return others > 0 ? `${parts.join(", ")} +${others} more` : parts.join(", ");
}

function describeLatest(latest: NonNullable<MandaliDigest["latest"]>): string {
  if (latest.kind === "COIN_REQUEST") return "a coin request";
  if (latest.kind === "ROOM_INVITE") return "a room invitation";
  return `“${truncate(latest.preview, PREVIEW_LENGTH)}”`;
}

/** The number of chat messages, apart from the invitations that get their own rows. */
export function chatMessageCount(digest: Pick<MandaliDigest, "unreadCount" | "invites">): number {
  return Math.max(0, digest.unreadCount - digest.invites.length);
}

function formatCount(count: number): string {
  return count >= CAPPED_COUNT ? "999+" : String(count);
}

function timeOf(iso: string | undefined): string {
  const at = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(at) ? "" : formatTimeAgo(at);
}

export function digestToItems(
  digest: MandaliDigest,
  dismissedInvites: ReadonlySet<string>
): NotificationItem[] {
  if (digest.level === "MUTED") return [];

  const items: NotificationItem[] = [];
  const chatCount = chatMessageCount(digest);

  if (digest.level === "ALL" && chatCount > 0) {
    const who = describeSenders(digest);
    const latest = digest.latest ? ` · Latest: ${describeLatest(digest.latest)}` : "";
    items.push({
      id: digestItemId(digest.mandaliId),
      type: "mandali",
      title: `${formatCount(chatCount)} new ${plural(chatCount, "message", "messages")} in ${digest.name}`,
      desc: `${who}${latest}`,
      time: timeOf(digest.latest?.at),
      unread: true,
      mandaliId: digest.mandaliId,
      mandaliHandle: digest.handle,
    });
  }

  for (const invite of digest.invites) {
    if (dismissedInvites.has(invite.messageId)) continue;
    const game = invite.metadata.gameName ?? "a game";
    items.push({
      id: inviteItemId(invite.messageId),
      type: "mandali_invite",
      title: `${invite.senderName} invited you to play ${game}`,
      desc: `Room ${invite.roomCode} · ${digest.name}`,
      time: timeOf(invite.at),
      unread: true,
      roomCode: invite.roomCode,
      mandaliId: digest.mandaliId,
      mandaliHandle: digest.handle,
      inviteMessageId: invite.messageId,
    });
  }

  return items;
}

/** Every Mandali's rows, newest activity first. */
export function digestsToItems(
  digests: readonly MandaliDigest[],
  dismissedInvites: ReadonlySet<string>
): NotificationItem[] {
  const newestFirst = [...digests].sort((a, b) => Date.parse(b.latest?.at ?? "") - Date.parse(a.latest?.at ?? "") || 0);
  return newestFirst.flatMap((digest) => digestToItems(digest, dismissedInvites));
}
