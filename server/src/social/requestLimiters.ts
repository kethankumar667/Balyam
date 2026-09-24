import type { RequestHandler } from "express";
import { rateLimitByCaller } from "../lib/httpRateLimiter.js";
import { callerId } from "../auth/identity.js";
import { FRIEND_REQUEST_DAILY_LIMIT, FRIEND_REQUEST_MINUTE_BURST } from "./limits.js";

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_DAY = 86_400;

/**
 * The friend-request send limits, built ONCE.
 *
 * Two routes create friend requests: `POST /api/social/requests/send` and the
 * older `POST /api/ranking/friends/:playerId`. Each `rateLimitByCaller` call
 * owns its own buckets, so limits declared inline on one route were simply
 * absent on the other — a caller could spam requests through whichever route
 * was unguarded. Both routes mount THESE instances, which means one caller has
 * one 5-per-minute bucket and one 20-per-day bucket no matter which route each
 * request arrives on. Must run after an identity guard, because `callerId`
 * throws without one.
 */
export const friendRequestSendLimiters: readonly RequestHandler[] = [
  rateLimitByCaller({
    capacity: FRIEND_REQUEST_MINUTE_BURST,
    refillPerSec: FRIEND_REQUEST_MINUTE_BURST / SECONDS_PER_MINUTE,
    keyOf: (req) => callerId(req),
  }),
  rateLimitByCaller({
    capacity: FRIEND_REQUEST_DAILY_LIMIT,
    refillPerSec: FRIEND_REQUEST_DAILY_LIMIT / SECONDS_PER_DAY,
    keyOf: (req) => callerId(req),
  }),
];
