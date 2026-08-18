import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/**
 * Authentication middleware for operational endpoints (/api/operational/*).
 * If OPERATIONAL_SECRET is configured, requests must supply either:
 * - Header: `x-operational-key: <secret>`
 * - Header: `Authorization: Bearer <secret>`
 * - Query param: `?key=<secret>` (for simple browser inspection)
 */
export function requireOperationalAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.OPERATIONAL_SECRET || process.env.ADMIN_API_KEY || "";
  // If no secret configured, allow with diagnostic warning in non-production
  if (!secret) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const customHeader = req.headers["x-operational-key"] as string | undefined;
  const queryKey = req.query.key as string | undefined;

  const provided = bearerToken || customHeader || queryKey;

  if (!provided || provided !== secret) {
    logger.warn({
      message: `Unauthorized operational API access attempt to ${req.path}`,
      module: "SECURITY",
    });
    res.status(401).json({
      error: "Unauthorized",
      message: "Valid operational credentials required to access this endpoint.",
    });
    return;
  }

  next();
}

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
