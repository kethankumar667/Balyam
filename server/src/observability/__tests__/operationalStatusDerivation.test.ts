import { describe, it, expect } from "vitest";
import {
  deriveRecoveryStatus,
  deriveSeatStatus,
  type RecoveryStatus,
} from "@shared/operational.js";

describe("operationalStatusDerivation — Exhaustive Precedence & Boundary Suite", () => {
  describe("deriveRecoveryStatus", () => {
    it("returns EXPIRED when remainingGraceMs is 0", () => {
      expect(deriveRecoveryStatus({ remainingGraceMs: 0, isAutoPlaying: false })).toBe("EXPIRED");
      expect(deriveRecoveryStatus({ remainingGraceMs: 0, isAutoPlaying: true })).toBe("EXPIRED");
    });

    it("returns EXPIRED when remainingGraceMs is negative", () => {
      expect(deriveRecoveryStatus({ remainingGraceMs: -1, isAutoPlaying: false })).toBe("EXPIRED");
      expect(deriveRecoveryStatus({ remainingGraceMs: -5000, isAutoPlaying: true })).toBe("EXPIRED");
    });

    it("returns EXPIRING_SOON when remainingGraceMs is between 1ms and 14,999ms", () => {
      expect(deriveRecoveryStatus({ remainingGraceMs: 1, isAutoPlaying: false })).toBe("EXPIRING_SOON");
      expect(deriveRecoveryStatus({ remainingGraceMs: 10_000, isAutoPlaying: false })).toBe("EXPIRING_SOON");
      expect(deriveRecoveryStatus({ remainingGraceMs: 14_999, isAutoPlaying: false })).toBe("EXPIRING_SOON");
      expect(deriveRecoveryStatus({ remainingGraceMs: 14_999, isAutoPlaying: true })).toBe("EXPIRING_SOON");
    });

    it("returns NEAR_EXPIRY at exact 15,000ms boundary and up to 29,999ms", () => {
      expect(deriveRecoveryStatus({ remainingGraceMs: 15_000, isAutoPlaying: false })).toBe("NEAR_EXPIRY");
      expect(deriveRecoveryStatus({ remainingGraceMs: 20_000, isAutoPlaying: false })).toBe("NEAR_EXPIRY");
      expect(deriveRecoveryStatus({ remainingGraceMs: 29_999, isAutoPlaying: false })).toBe("NEAR_EXPIRY");
      expect(deriveRecoveryStatus({ remainingGraceMs: 15_000, isAutoPlaying: true })).toBe("NEAR_EXPIRY");
    });

    it("returns AUTO_PLAYING when remainingGraceMs >= 30,000ms and isAutoPlaying is true", () => {
      expect(deriveRecoveryStatus({ remainingGraceMs: 30_000, isAutoPlaying: true })).toBe("AUTO_PLAYING");
      expect(deriveRecoveryStatus({ remainingGraceMs: 60_000, isAutoPlaying: true })).toBe("AUTO_PLAYING");
      expect(deriveRecoveryStatus({ remainingGraceMs: 90_000, isAutoPlaying: true })).toBe("AUTO_PLAYING");
    });

    it("returns REJOIN_ELIGIBLE when remainingGraceMs >= 30,000ms and isAutoPlaying is false", () => {
      expect(deriveRecoveryStatus({ remainingGraceMs: 30_000, isAutoPlaying: false })).toBe("REJOIN_ELIGIBLE");
      expect(deriveRecoveryStatus({ remainingGraceMs: 45_000, isAutoPlaying: false })).toBe("REJOIN_ELIGIBLE");
      expect(deriveRecoveryStatus({ remainingGraceMs: 90_000, isAutoPlaying: false })).toBe("REJOIN_ELIGIBLE");
    });

    it("NEVER returns EXPIRED when remainingGraceMs is positive, even under contradictory inputs", () => {
      // Prior bug: isEligibleForRejoin: false caused positive grace to fall through to EXPIRED
      const positiveGrace = 50_000;
      const result = deriveRecoveryStatus({
        remainingGraceMs: positiveGrace,
        isAutoPlaying: false,
        isEligibleForRejoin: false,
      });
      expect(result).not.toBe("EXPIRED");
      expect(result).toBe("REJOIN_ELIGIBLE");
    });
  });

  describe("deriveSeatStatus", () => {
    it("returns 'quit' when hasQuit is true regardless of connection state", () => {
      expect(deriveSeatStatus({ isConnected: true, hasQuit: true })).toBe("quit");
      expect(deriveSeatStatus({ isConnected: false, hasQuit: true })).toBe("quit");
    });

    it("returns 'disconnected_grace' when player is disconnected and has not quit", () => {
      expect(deriveSeatStatus({ isConnected: false })).toBe("disconnected_grace");
    });

    it("returns 'auto_playing' when player is connected and isAutoPlaying is true", () => {
      expect(deriveSeatStatus({ isConnected: true, isAutoPlaying: true })).toBe("auto_playing");
    });

    it("returns 'idle' when player has idle strikes > 0 and is not auto-playing", () => {
      expect(deriveSeatStatus({ isConnected: true, idleStrikes: 1 })).toBe("idle");
      expect(deriveSeatStatus({ isConnected: true, idleStrikes: 2 })).toBe("idle");
    });

    it("returns 'active' when player is connected, healthy, with zero strikes and not auto-playing", () => {
      expect(deriveSeatStatus({ isConnected: true, isAutoPlaying: false, idleStrikes: 0 })).toBe("active");
    });
  });
});
