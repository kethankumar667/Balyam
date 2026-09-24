import { apiFetch } from "../playerIdentity";
import type { FriendRequest } from "@shared/social/FriendRequest";
import type { Friend } from "@shared/social/Friend";

/**
 * Social subsystem client API helpers.
 * All requests carry credentials via apiFetch and resolve identity server-side.
 */

export async function cancelFriendRequest(
  requestId: string,
): Promise<{ success: boolean; request: FriendRequest }> {
  const res = await apiFetch(`/api/social/requests/${requestId}/cancel`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Failed to cancel friend request");
  }
  return res.json();
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
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Failed to send friend request");
  }
  return res.json();
}

export async function acceptFriendRequest(
  requestId: string,
): Promise<{ success: boolean; request: FriendRequest }> {
  const res = await apiFetch(`/api/social/requests/${requestId}/accept`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Failed to accept friend request");
  }
  return res.json();
}

export async function declineFriendRequest(
  requestId: string,
): Promise<{ success: boolean; request: FriendRequest }> {
  const res = await apiFetch(`/api/social/requests/${requestId}/decline`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Failed to decline friend request");
  }
  return res.json();
}

export async function getFriendRequests(
  playerId: string,
): Promise<{ success: boolean; incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
  const res = await apiFetch(`/api/social/requests/${playerId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Failed to fetch friend requests");
  }
  return res.json();
}

export async function getFriends(
  playerId: string,
): Promise<{ success: boolean; friends: Friend[] }> {
  const res = await apiFetch(`/api/social/friends/${playerId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Failed to fetch friends");
  }
  return res.json();
}

export async function removeFriend(
  playerId: string,
  friendPlayerId: string,
): Promise<{ success: boolean; removed: boolean }> {
  const res = await apiFetch(`/api/social/friends/${playerId}/remove`, {
    method: "POST",
    body: JSON.stringify({ friendPlayerId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Failed to remove friend");
  }
  return res.json();
}
