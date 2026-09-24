import type { RequestHandler } from "express";
import { rateLimitByCaller } from "../lib/httpRateLimiter.js";
import { callerId } from "../auth/identity.js";
import {
  BLOCK_ACTIONS_HOURLY_LIMIT,
  REPORTS_DAILY_LIMIT,
  REPORTS_HOURLY_LIMIT,
} from "./limits.js";

const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;

/**
 * Blocking and unblocking share ONE bucket: 30 actions an hour between them.
 * Two separate buckets would let someone alternate block/unblock at double the
 * rate — the pattern that makes a block list a way to signal another player.
 * Must run after an identity guard, because `callerId` throws without one.
 */
export const blockActionLimiter: RequestHandler = rateLimitByCaller({
  capacity: BLOCK_ACTIONS_HOURLY_LIMIT,
  refillPerSec: BLOCK_ACTIONS_HOURLY_LIMIT / SECONDS_PER_HOUR,
  keyOf: (req) => callerId(req),
});

/** Reports: 5 an hour AND 20 a day, so a burst and a steady drip are both bounded. */
export const reportLimiters: readonly RequestHandler[] = [
  rateLimitByCaller({
    capacity: REPORTS_HOURLY_LIMIT,
    refillPerSec: REPORTS_HOURLY_LIMIT / SECONDS_PER_HOUR,
    keyOf: (req) => callerId(req),
  }),
  rateLimitByCaller({
    capacity: REPORTS_DAILY_LIMIT,
    refillPerSec: REPORTS_DAILY_LIMIT / SECONDS_PER_DAY,
    keyOf: (req) => callerId(req),
  }),
];
