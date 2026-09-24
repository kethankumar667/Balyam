import { apiFetch } from "../playerIdentity";
import type { FriendRequest } from "@shared/social/FriendRequest";
import type { Friend, SharedHistory } from "@shared/social/Friend";
import type { BlockedPlayer } from "@shared/social/Block";
import type { ReportReason } from "@shared/social/Report";

/**
 * Social subsystem client API helpers.
 * All requests carry credentials via apiFetch and resolve identity server-side.
 */

/**
 * The body of a successful response, or an `Error` carrying the server's own
 * words. Rate-limit and auth refusals put the readable text in `message` and a
 * code in `error`; ordinary refusals only have `error` — so `message` wins.
 */
async function readJson<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const errorData: { message?: string; error?: string } = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || fallback);
  }
  return res.json();
}

export async function cancelFriendRequest(
  requestId: string,
): Promise<{ success: boolean; request: FriendRequest }> {
  const res = await apiFetch(`/api/social/requests/${requestId}/cancel`, { method: "POST" });
  return readJson(res, "Failed to cancel friend request");
}

/**
 * The name and avatar the recipient sees are the server's copy of YOUR
 * profile; the server ignores any display text sent here, so none is sent.
 */
export async function sendFriendRequest(
  recipientId: string,
): Promise<{ success: boolean; request: FriendRequest }> {
  const res = await apiFetch("/api/social/requests/send", {
    method: "POST",
    body: JSON.stringify({ recipientId }),
  });
  return readJson(res, "Failed to send friend request");
}

export async function acceptFriendRequest(
  requestId: string,
): Promise<{ success: boolean; request: FriendRequest }> {
  const res = await apiFetch(`/api/social/requests/${requestId}/accept`, { method: "POST" });
  return readJson(res, "Failed to accept friend request");
}

export async function declineFriendRequest(
  requestId: string,
): Promise<{ success: boolean; request: FriendRequest }> {
  const res = await apiFetch(`/api/social/requests/${requestId}/decline`, { method: "POST" });
  return readJson(res, "Failed to decline friend request");
}

export async function getFriendRequests(
  playerId: string,
): Promise<{ success: boolean; incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
  const res = await apiFetch(`/api/social/requests/${playerId}`);
  return readJson(res, "Failed to fetch friend requests");
}

export async function getFriends(playerId: string): Promise<{ success: boolean; friends: Friend[] }> {
  const res = await apiFetch(`/api/social/friends/${playerId}`);
  return readJson(res, "Failed to fetch friends");
}

export async function removeFriend(
  playerId: string,
  friendPlayerId: string,
): Promise<{ success: boolean; removed: boolean }> {
  const res = await apiFetch(`/api/social/friends/${playerId}/remove`, {
    method: "POST",
    body: JSON.stringify({ friendPlayerId }),
  });
  return readJson(res, "Failed to remove friend");
}

/**
 * The shared history and timeline of you and a friend. Refused (403) unless you
 * are friends, so the caller only asks about someone in their friends list.
 */
export async function getSharedHistory(
  playerId: string,
  friendPlayerId: string,
): Promise<{ success: boolean; history: SharedHistory }> {
  const res = await apiFetch(
    `/api/social/shared-history/${encodeURIComponent(playerId)}/${encodeURIComponent(friendPlayerId)}`,
  );
  return readJson(res, "Failed to load your shared history");
}

/** Blocks a player. Only the target's id is sent — the blocker is whoever is signed in. */
export async function blockPlayer(
  targetId: string,
): Promise<{ success: boolean; alreadyBlocked: boolean }> {
  const res = await apiFetch("/api/social/blocks", {
    method: "POST",
    body: JSON.stringify({ targetId }),
  });
  return readJson(res, "Failed to block this player");
}

export async function unblockPlayer(targetId: string): Promise<{ success: boolean; removed: boolean }> {
  const res = await apiFetch(`/api/social/blocks/${encodeURIComponent(targetId)}`, { method: "DELETE" });
  return readJson(res, "Failed to unblock this player");
}

export async function getBlockedPlayers(
  playerId: string,
): Promise<{ success: boolean; blocked: BlockedPlayer[] }> {
  const res = await apiFetch(`/api/social/blocks/${encodeURIComponent(playerId)}`);
  return readJson(res, "Failed to fetch your blocked players");
}

/** Reports a player for one of the fixed reasons. There is no free text. */
export async function reportPlayer(targetId: string, reason: ReportReason): Promise<{ success: boolean }> {
  const res = await apiFetch("/api/social/reports", {
    method: "POST",
    body: JSON.stringify({ targetId, reason }),
  });
  return readJson(res, "Failed to send your report");
}
