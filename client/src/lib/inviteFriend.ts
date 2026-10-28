/**
 * Who a room was made for, remembered only while the page is open.
 *
 * "Play with Meera" creates a normal room and then names Meera in the share message. The name has to
 * get from the create-room sheet to the lobby's share card, two components with a page change between
 * them. It is held in memory on purpose: a stored copy would be a new browser-storage key that the
 * privacy inventory must declare, and losing it on a refresh only means the share message falls back to
 * the usual wording.
 */
const MAX_NAME_LENGTH = 20;
const friendByRoom = new Map<string, string>();

export function rememberInviteFriend(roomCode: string, friendName: string): void {
  const name = friendName.trim().slice(0, MAX_NAME_LENGTH);
  if (roomCode && name) friendByRoom.set(roomCode.toUpperCase(), name);
}

export function inviteFriendFor(roomCode: string): string | null {
  return friendByRoom.get(roomCode.toUpperCase()) ?? null;
}

/** Test hook: forget everyone so each test starts clean. */
export function resetInviteFriends(): void {
  friendByRoom.clear();
}
