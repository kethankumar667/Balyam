/**
 * Social subsystem limits and abuse prevention thresholds.
 * Required by Rulebook R5.2.
 */

/** Max friend requests sent per 24 hours. */
export const FRIEND_REQUEST_DAILY_LIMIT = 20;

/** Max friend requests sent per 60 seconds (burst). */
export const FRIEND_REQUEST_MINUTE_BURST = 5;

/** Max pending outgoing friend requests per player. */
export const MAX_PENDING_OUTGOING_REQUESTS = 100;

/** Friend request time-to-live: 30 days in milliseconds. */
export const FRIEND_REQUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Cooldown before a rejected friend request can be resent: 7 days in milliseconds. */
export const FRIEND_REQUEST_DECLINE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Max friends allowed per player. */
export const MAX_FRIENDS_PER_PLAYER = 1000;

/** Max friend request cancel actions per minute (burst). */
export const CANCEL_REQUEST_MINUTE_BURST = 20;

