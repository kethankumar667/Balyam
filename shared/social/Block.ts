/**
 * One entry in the caller's own block list.
 *
 * `displayName` and `avatar` are the server's copy of that player's profile,
 * not anything a client supplied. Only the blocker ever receives this — the
 * blocked player is never told, and no response to them mentions it.
 */
export interface BlockedPlayer {
  playerId: string;
  displayName: string;
  avatar?: string;
  blockedAt: number;
}
