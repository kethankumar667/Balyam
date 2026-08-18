import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/**
 * Operational authorization lives in `./operationalAuth.ts`.
 *
 * It used to live here, and it used to fail OPEN — `if (!secret) return next()`
 * let every request through whenever the environment variable was missing, in
 * production included. It is re-exported rather than moved silently so that
 * existing imports keep working while the gate itself is one reviewable file.
 */
export {
  requireOperationalAuth,
  assertOperationalAuthConfigured,
  operationalAuthStatus,
  operationalAuthConfig,
  operationalConfigProblems,
  type OperationalPrincipal,
} from "./operationalAuth.js";

/**
 * Production Security Headers Middleware.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), interest-cohort=()"
  );
  next();
}

/**
 * Room Code Brute-Force & Enumeration Defense.
 */
class RoomEnumerationGuard {
  private failedAttempts: Map<string, { count: number; blockedUntil: number }> = new Map();
  private maxFailures = 15;
  private blockDurationMs = 60_000; // 1 minute block

  public recordFailure(identifier: string): boolean {
    const now = Date.now();
    const current = this.failedAttempts.get(identifier) || { count: 0, blockedUntil: 0 };

    if (current.blockedUntil > now) {
      return false; // Still blocked
    }

    current.count += 1;
    if (current.count >= this.maxFailures) {
      current.blockedUntil = now + this.blockDurationMs;
      logger.warn({
        message: `Temporary room join block armed for ${identifier} (${this.maxFailures} failed attempts)`,
        module: "SECURITY",
      });
      this.failedAttempts.set(identifier, current);
      return false;
    }

    this.failedAttempts.set(identifier, current);
    return true;
  }

  public isBlocked(identifier: string): boolean {
    const record = this.failedAttempts.get(identifier);
    if (!record) return false;
    if (record.blockedUntil > Date.now()) return true;
    if (record.blockedUntil !== 0) {
      this.failedAttempts.delete(identifier);
    }
    return false;
  }

  public recordSuccess(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  public reset(): void {
    this.failedAttempts.clear();
  }
}

export const roomEnumerationGuard = new RoomEnumerationGuard();
