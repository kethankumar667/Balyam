/**
 * Token Bucket Rate Limiter for Socket.IO connection event protection.
 * Prevents socket move-flooding, DOS attacks, and event spam.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class SocketRateLimiter {
  private buckets = new Map<string, Bucket>();
  private readonly capacity: number;
  private readonly refillRatePerSec: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(capacity = 15, refillRatePerSec = 10) {
    this.capacity = capacity;
    this.refillRatePerSec = refillRatePerSec;

    // Prune stale socket buckets every 5 minutes
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanupStaleBuckets(), 5 * 60 * 1000);
    }
  }

  /**
   * Consumes points from the socket's rate limit bucket.
   * Returns true if allowed, or false if rate limit is exceeded.
   */
  consume(socketId: string, cost = 1): { allowed: boolean; remainingTokens: number } {
    const now = Date.now();
    let bucket = this.buckets.get(socketId);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(socketId, bucket);
    } else {
      // Calculate token refill since last request
      const elapsedSec = (now - bucket.lastRefill) / 1000;
      const refilledTokens = elapsedSec * this.refillRatePerSec;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + refilledTokens);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return { allowed: true, remainingTokens: Math.floor(bucket.tokens) };
    }

    return { allowed: false, remainingTokens: Math.floor(bucket.tokens) };
  }

  removeSocket(socketId: string): void {
    this.buckets.delete(socketId);
  }

  private cleanupStaleBuckets(): void {
    const now = Date.now();
    const staleThresholdMs = 5 * 60 * 1000;
    for (const [socketId, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > staleThresholdMs) {
        this.buckets.delete(socketId);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.buckets.clear();
  }
}

export const globalRateLimiter = new SocketRateLimiter(15, 10);
