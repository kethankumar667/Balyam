import type { Request, RequestHandler } from "express";

/**
 * Token-bucket rate limiting for HTTP routes, keyed by caller.
 *
 * There is no existing HTTP-level limiter in this codebase —
 * `SocketRateLimiter` (`./rateLimiter.ts`) protects socket.io events only,
 * keyed by `socketId`. This is the same capacity/refill shape, applied to
 * Express requests instead, for routes open to guests or fully anonymous
 * callers where the database's own constraints (e.g. reviews' one-per-scope
 * unique index) stop a single bad WRITE but not a caller hammering the
 * endpoint itself.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitOptions {
  /** Max tokens (= max burst size). */
  capacity: number;
  /** Tokens restored per second. */
  refillPerSec: number;
  /** How to derive the bucket key for a request — e.g. identity id, or IP for anonymous routes. */
  keyOf: (req: Request) => string;
  /** Cost of one request against the bucket. Defaults to 1. */
  cost?: number;
}

/**
 * Returns 429 with a `Retry-After` hint once a caller's bucket is empty.
 * Buckets are pruned lazily (on access) rather than on a timer — this
 * limiter is expected to guard a handful of low-traffic write endpoints,
 * not the whole API, so an unbounded-looking map is fine at this volume;
 * revisit with an active sweep only if a route using this sees real scale.
 */
export function rateLimitByCaller(opts: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();
  const cost = opts.cost ?? 1;

  return (req, res, next) => {
    const key = opts.keyOf(req);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = { tokens: opts.capacity, lastRefill: now };
      buckets.set(key, bucket);
    } else {
      const elapsedSec = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(opts.capacity, bucket.tokens + elapsedSec * opts.refillPerSec);
      bucket.lastRefill = now;
    }

    if (bucket.tokens < cost) {
      const secondsToNextToken = Math.max(1, Math.ceil((cost - bucket.tokens) / opts.refillPerSec));
      res.setHeader("Retry-After", String(secondsToNextToken));
      res.status(429).json({ error: "TooManyRequests", message: "Slow down and try again shortly." });
      return;
    }

    bucket.tokens -= cost;
    next();
  };
}

/** `req.socket.remoteAddress`, falling back to a constant so a missing address still buckets together rather than throwing. */
export function callerIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}
