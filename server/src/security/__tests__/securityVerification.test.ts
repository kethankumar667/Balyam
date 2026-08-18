import { describe, it, expect, beforeEach } from "vitest";
import { roomEnumerationGuard, requireOperationalAuth } from "../SecurityMiddleware.js";
import { PayloadValidator } from "../PayloadValidator.js";

describe("Security Verification Suite", () => {
  beforeEach(() => {
    roomEnumerationGuard.reset();
  });

  describe("1. Operational Endpoint Authorization", () => {
    it("rejects unauthorized requests when OPERATIONAL_SECRET is armed", () => {
      // Mock environment secret
      const originalSecret = process.env.OPERATIONAL_SECRET;
      process.env.OPERATIONAL_SECRET = "super_secure_ops_token_987";

      try {
        const mockReq: any = {
          path: "/api/operational/health",
          headers: {},
          query: {},
        };
        let status = 0;
        let jsonResponse: any = null;
        const mockRes: any = {
          status: (s: number) => {
            status = s;
            return mockRes;
          },
          json: (data: any) => {
            jsonResponse = data;
          },
        };
        let nextCalled = false;
        const next = () => {
          nextCalled = true;
        };

        // Case A: No token provided -> 401
        requireOperationalAuth(mockReq, mockRes, next);
        expect(status).toBe(401);
        expect(jsonResponse.error).toBe("Unauthorized");
        expect(nextCalled).toBe(false);

        // Case B: Valid Bearer token provided -> 200 / next()
        mockReq.headers["authorization"] = "Bearer super_secure_ops_token_987";
        requireOperationalAuth(mockReq, mockRes, next);
        expect(nextCalled).toBe(true);

        // Case C: Valid x-operational-key header -> 200 / next()
        nextCalled = false;
        mockReq.headers["authorization"] = undefined;
        mockReq.headers["x-operational-key"] = "super_secure_ops_token_987";
        requireOperationalAuth(mockReq, mockRes, next);
        expect(nextCalled).toBe(true);
      } finally {
        process.env.OPERATIONAL_SECRET = originalSecret;
      }
    });
  });

  describe("2. Room Code Enumeration & Brute-Force Defense", () => {
    it("blocks an IP/socket identifier after 15 consecutive failed room lookups", () => {
      const attackerIp = "192.168.1.100";

      // 14 failures allowed
      for (let i = 0; i < 14; i++) {
        const allowed = roomEnumerationGuard.recordFailure(attackerIp);
        expect(allowed).toBe(true);
      }

      // 15th failure triggers block
      const blockedAttempt = roomEnumerationGuard.recordFailure(attackerIp);
      expect(blockedAttempt).toBe(false);
      expect(roomEnumerationGuard.isBlocked(attackerIp)).toBe(true);

      // Subsequent lookups blocked immediately
      expect(roomEnumerationGuard.isBlocked(attackerIp)).toBe(true);

      // Successful lookup on a good client clears tracker
      const goodClient = "10.0.0.1";
      roomEnumerationGuard.recordFailure(goodClient);
      roomEnumerationGuard.recordSuccess(goodClient);
      expect(roomEnumerationGuard.isBlocked(goodClient)).toBe(false);
    });
  });

  describe("3. Prototype Pollution & Payload Sanitization", () => {
    it("deeply sanitizes objects to strip prototype pollution vectors", () => {
      const maliciousPayload = JSON.parse(
        '{"name":"Alice","__proto__":{"isAdmin":true},"constructor":{"name":"Bad"},"details":{"valid":true,"prototype":{"hacked":true}}}'
      );

      const sanitized = PayloadValidator.sanitizeObject(maliciousPayload) as any;

      expect(sanitized.name).toBe("Alice");
      expect(sanitized.__proto__).toBeUndefined();
      expect(sanitized.constructor).toBeUndefined();
      expect(sanitized.details.valid).toBe(true);
      expect(sanitized.details.prototype).toBeUndefined();
      expect(({} as any).isAdmin).toBeUndefined();
    });

    it("validates and bounds string lengths on player names and chat messages", () => {
      const longName = "A".repeat(100);
      const nameRes = PayloadValidator.validatePlayerName(longName);
      expect(nameRes.sanitized?.length).toBeLessThanOrEqual(24);

      const longMsg = "B".repeat(1000);
      const msgRes = PayloadValidator.validateChatMessage(longMsg);
      expect(msgRes.sanitized?.length).toBe(500);

      const invalidCode = "abc";
      const codeRes = PayloadValidator.validateRoomCode(invalidCode);
      expect(codeRes.ok).toBe(false);
    });
  });
});
