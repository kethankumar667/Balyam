import { describe, it, expect } from "vitest";
import {
  SIGN_IN_INVITE_DELAY_MS,
  isQuietRoute,
  shouldShowSignInInvite,
  type InviteContext,
} from "../signInInvite";

const READY: InviteContext = {
  firstVisit: true,
  engagedMs: SIGN_IN_INVITE_DELAY_MS,
  isMember: false,
  authReady: true,
  authConfigured: true,
  consentPending: false,
  pathname: "/games",
  alreadyShown: false,
};

describe("SIGN_IN_INVITE_DELAY_MS", () => {
  it("is two minutes", () => {
    expect(SIGN_IN_INVITE_DELAY_MS).toBe(2 * 60 * 1000);
  });
});

describe("isQuietRoute", () => {
  it.each(["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"])(
    "stays out of the sign-in pages (%s)",
    (path) => expect(isQuietRoute(path)).toBe(true),
  );

  it.each(["/room/ABC123", "/tv/ABC123", "/watch/ABC123"])("stays out of a live table (%s)", (path) =>
    expect(isQuietRoute(path)).toBe(true),
  );

  it.each(["/privacy", "/terms", "/safety", "/admin/users"])("stays out of %s", (path) =>
    expect(isQuietRoute(path)).toBe(true),
  );

  it.each(["/", "/home", "/games", "/mandali", "/leaderboard", "/profile"])("is fine on %s", (path) =>
    expect(isQuietRoute(path)).toBe(false),
  );

  it("matches whole path segments, not prefixes of other names", () => {
    expect(isQuietRoute("/roomservice")).toBe(false);
    expect(isQuietRoute("/loginhelp")).toBe(false);
  });
});

describe("shouldShowSignInInvite", () => {
  it("shows to a first-time guest after two minutes", () => {
    expect(shouldShowSignInInvite(READY)).toBe(true);
  });

  it("waits until the full two minutes have passed", () => {
    expect(shouldShowSignInInvite({ ...READY, engagedMs: SIGN_IN_INVITE_DELAY_MS - 1 })).toBe(false);
    expect(shouldShowSignInInvite({ ...READY, engagedMs: 0 })).toBe(false);
  });

  it("never shows to someone who is already signed in", () => {
    expect(shouldShowSignInInvite({ ...READY, isMember: true })).toBe(false);
  });

  it("never shows to a returning visitor", () => {
    expect(shouldShowSignInInvite({ ...READY, firstVisit: false })).toBe(false);
  });

  it("shows only once per visit", () => {
    expect(shouldShowSignInInvite({ ...READY, alreadyShown: true })).toBe(false);
  });

  it("does not guess before the session check has finished", () => {
    expect(shouldShowSignInInvite({ ...READY, authReady: false })).toBe(false);
  });

  it("does not invite to sign in where sign-in is not connected", () => {
    expect(shouldShowSignInInvite({ ...READY, authConfigured: false })).toBe(false);
  });

  it("waits while the consent question is still unanswered", () => {
    expect(shouldShowSignInInvite({ ...READY, consentPending: true })).toBe(false);
  });

  it("stays quiet on the sign-in pages and at a live table", () => {
    expect(shouldShowSignInInvite({ ...READY, pathname: "/login" })).toBe(false);
    expect(shouldShowSignInInvite({ ...READY, pathname: "/room/ABC123" })).toBe(false);
  });
});
