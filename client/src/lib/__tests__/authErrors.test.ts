import { describe, expect, it } from "vitest";
import { authErrorMessage, isEmailNotConfirmed } from "../supabase/client";

/**
 * Turning auth failures into something a player can act on.
 *
 * These tests exist because of a real incident: confirmation emails stopped
 * arriving once the project's hourly mail allowance was spent, and the
 * message shown to everyone affected was "Too many tries. Wait a minute and
 * try again." Waiting did not help — the cap is hourly and project-wide, not
 * per-player — so people retried, failed, and abandoned accounts that had
 * already been created. Around eighty rows had to be deleted by hand.
 *
 * The distinctions below are the ones that incident turned out to depend on.
 */

describe("the two different 429s", () => {
  it("does not blame the player for the project's exhausted mail quota", () => {
    const msg = authErrorMessage(new Error("email rate limit exceeded"));
    // The important half is that it does not tell them to wait a minute and
    // retry, which is advice that cannot work against an hourly project cap.
    expect(msg).not.toMatch(/wait a minute/i);
    expect(msg).toMatch(/not yours/i);
  });

  it("still tells a genuinely throttled player that waiting works", () => {
    const msg = authErrorMessage(
      new Error("For security purposes, you can only request this after 51 seconds"),
    );
    expect(msg).toMatch(/wait a minute/i);
  });

  it("keeps the two apart even though both say 'rate limit'", () => {
    const quota = authErrorMessage(new Error("email rate limit exceeded"));
    const throttle = authErrorMessage(new Error("Request rate limit reached"));
    expect(quota).not.toBe(throttle);
  });
});

describe("mail that could not be sent", () => {
  it("rewrites the raw SMTP failure rather than showing it", () => {
    const msg = authErrorMessage(new Error("Error sending confirmation email"));
    expect(msg).not.toMatch(/Error sending/);
    expect(msg).toMatch(/not yours/i);
  });

  it("covers the recovery-mail wording too", () => {
    expect(authErrorMessage(new Error("Error sending recovery email"))).toMatch(/not yours/i);
  });
});

describe("isEmailNotConfirmed", () => {
  it("recognises the state a missing confirmation email leaves behind", () => {
    expect(isEmailNotConfirmed(new Error("Email not confirmed"))).toBe(true);
    expect(isEmailNotConfirmed({ message: "email_not_confirmed" })).toBe(true);
  });

  it("does not fire on unrelated failures", () => {
    // A false positive here would bounce someone with a genuinely wrong
    // password to the confirmation screen, where nothing they do can help.
    expect(isEmailNotConfirmed(new Error("Invalid login credentials"))).toBe(false);
    expect(isEmailNotConfirmed(new Error("email rate limit exceeded"))).toBe(false);
    expect(isEmailNotConfirmed(null)).toBe(false);
  });
});

describe("messages that were already right", () => {
  it("refuses to say which half of a bad login was wrong", () => {
    const msg = authErrorMessage(new Error("Invalid login credentials"));
    expect(msg).toMatch(/don't match/i);
    expect(msg).not.toMatch(/no account|unknown email/i);
  });

  it("falls back to something readable when there is no message at all", () => {
    expect(authErrorMessage(new Error(""))).toMatch(/something went wrong/i);
  });
});
