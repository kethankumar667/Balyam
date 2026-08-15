import { describe, it, expect } from "vitest";
import { generateActionId, getConnectionState, subscribeConnectionState } from "../socket";
import { telemetry } from "../observability";
import { formatNetworkError } from "../networkErrorHandler";

describe("Production Hardening — Client Suite", () => {
  describe("Idempotency Engine", () => {
    it("generates unique action IDs with proper formatting", () => {
      const id1 = generateActionId();
      const id2 = generateActionId();
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toEqual(id2);
      expect(typeof id1).toBe("string");
    });
  });

  describe("Observability & Sensitive Key Redaction", () => {
    it("redacts passwords, tokens, and secrets from telemetry logs", () => {
      telemetry.auth("user_login_attempt", {
        email: "player@example.com",
        password: "SuperSecretPassword123!",
        accessToken: "eyJhbGciOiJIUzI1NiIsIn...",
        game: "ludo",
      });

      const events = telemetry.getRecentEvents();
      const lastEvent = events[events.length - 1];
      expect(lastEvent).toBeDefined();
      expect(lastEvent.name).toBe("user_login_attempt");
      expect(lastEvent.data?.email).toBe("player@example.com");
      expect(lastEvent.data?.password).toBe("[REDACTED]");
      expect(lastEvent.data?.accessToken).toBe("[REDACTED]");
      expect(lastEvent.data?.game).toBe("ludo");
    });

    it("maintains a rolling ring buffer of recent events", () => {
      for (let i = 0; i < 70; i++) {
        telemetry.network("ping_event", { seq: i });
      }
      const events = telemetry.getRecentEvents();
      expect(events.length).toBeLessThanOrEqual(60);
    });
  });

  describe("Network Error Formatter", () => {
    it("handles 401 Unauthorized as session expired", () => {
      const err = formatNetworkError({ status: 401, message: "Unauthorized" });
      expect(err.title).toBe("Session Expired");
      expect(err.statusCode).toBe(401);
      expect(err.recoverable).toBe(true);
    });

    it("handles 409 Conflict with clear retry guidance", () => {
      const err = formatNetworkError({ status: 409, message: "Profile update conflict" });
      expect(err.title).toBe("Conflict");
      expect(err.statusCode).toBe(409);
      expect(err.recoverable).toBe(true);
    });

    it("handles 429 Rate Limit", () => {
      const err = formatNetworkError({ status: 429, message: "Too many requests" });
      expect(err.title).toBe("Too Many Requests");
      expect(err.statusCode).toBe(429);
    });

    it("handles 500 server unavailable", () => {
      const err = formatNetworkError({ status: 500, message: "Internal server error" });
      expect(err.title).toBe("Server Unavailable");
      expect(err.statusCode).toBe(500);
      expect(err.recoverable).toBe(true);
    });
  });

  describe("Connection Lifecycle State", () => {
    it("exposes connection state and notifies subscribers", () => {
      const state = getConnectionState();
      expect(["CONNECTED", "CONNECTING", "DISCONNECTED", "RECONNECTING", "RECOVERED", "FAILED"]).toContain(state);

      let notified = false;
      const unsubscribe = subscribeConnectionState((s) => {
        if (s) notified = true;
      });
      expect(notified).toBe(true);
      unsubscribe();
    });
  });
});
