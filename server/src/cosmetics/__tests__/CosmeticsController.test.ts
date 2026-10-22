import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Request } from "express";
import { isCallerAdmin } from "../CosmeticsController.js";
import { setUserRole } from "../../security/operationalAuth.js";

/**
 * `isCallerAdmin()` guards a real privilege-escalation surface: it decides
 * whether a caller gets every paid cosmetic for free. It had zero direct
 * test coverage before this — this closes two audit findings:
 *   1. The ops-key check used a plain `===` string comparison instead of
 *      the codebase's own constant-time `secretsMatch()`.
 *   2. The dev-mode fallback pattern-matched "admin" as a substring of the
 *      caller's email/playerId, which could false-positive on a legitimate
 *      non-admin identity.
 */

const ENV_KEYS = ["OPERATIONAL_SECRET", "ADMIN_API_KEY", "ADMIN_USER_IDS", "SUPABASE_JWT_SECRET", "NODE_ENV"];
let saved: Record<string, string | undefined> = {};

function mockReq(overrides: Partial<Request> & { headers?: Record<string, string> }): Request {
  return {
    headers: {},
    player: undefined,
    ...overrides,
  } as unknown as Request;
}

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("isCallerAdmin — operational secret path", () => {
  it("grants admin for a matching x-operational-key", () => {
    process.env.OPERATIONAL_SECRET = "correct-ops-secret-value";
    const req = mockReq({ headers: { "x-operational-key": "correct-ops-secret-value" } });
    expect(isCallerAdmin(req)).toBe(true);
  });

  it("refuses a non-matching x-operational-key", () => {
    process.env.OPERATIONAL_SECRET = "correct-ops-secret-value";
    const req = mockReq({ headers: { "x-operational-key": "wrong-guess" } });
    expect(isCallerAdmin(req)).toBe(false);
  });

  it("refuses any key when no operational secret is configured", () => {
    const req = mockReq({ headers: { "x-operational-key": "anything" } });
    expect(isCallerAdmin(req)).toBe(false);
  });
});

describe("isCallerAdmin — verified identity role path", () => {
  it("grants admin for a userId on ADMIN_USER_IDS", () => {
    process.env.ADMIN_USER_IDS = "admin_user_env_1,admin_user_env_2";
    const req = mockReq({ player: { kind: "member", playerId: "admin_user_env_1", email: null } as never });
    expect(isCallerAdmin(req)).toBe(true);
  });

  it("grants admin for a member with a dynamically assigned admin role", () => {
    setUserRole("dynamic_admin_role_user", "admin");
    const req = mockReq({ player: { kind: "member", playerId: "dynamic_admin_role_user", email: null } as never });
    expect(isCallerAdmin(req)).toBe(true);
  });

  it("refuses a plain member with no admin role", () => {
    const req = mockReq({ player: { kind: "member", playerId: "regular_member_1", email: "player@example.com" } as never });
    expect(isCallerAdmin(req)).toBe(false);
  });

  it("refuses a guest regardless of playerId", () => {
    const req = mockReq({ player: { kind: "guest", playerId: "guest_abc123" } as never });
    expect(isCallerAdmin(req)).toBe(false);
  });
});

describe("isCallerAdmin — dev-mode assertion path (verificationMode === \"off\")", () => {
  it("grants admin via the explicit x-account-kind header in dev mode", () => {
    const req = mockReq({ headers: { "x-account-kind": "admin" } });
    expect(isCallerAdmin(req)).toBe(true);
  });

  it("grants admin for super_admin via the header too", () => {
    const req = mockReq({ headers: { "x-account-kind": "super_admin" } });
    expect(isCallerAdmin(req)).toBe(true);
  });

  it("does NOT grant admin to a legitimate non-admin member whose email merely contains the substring \"admin\" (regression for the removed heuristic)", () => {
    const req = mockReq({
      player: { kind: "member", playerId: "player_777", email: "notanadmin.alias@example.com" } as never,
    });
    expect(isCallerAdmin(req)).toBe(false);
  });

  it("does NOT grant admin to a member whose playerId merely contains the substring \"admin\"", () => {
    const req = mockReq({
      player: { kind: "member", playerId: "team-administration-lead", email: null } as never,
    });
    expect(isCallerAdmin(req)).toBe(false);
  });

  it("never activates the header fallback once real verification is configured", () => {
    process.env.SUPABASE_JWT_SECRET = "a-real-jwt-secret";
    const req = mockReq({ headers: { "x-account-kind": "admin" } });
    expect(isCallerAdmin(req)).toBe(false);
  });

  it("never activates the header fallback in production, even with verification off", () => {
    // A deploy that forgot its Supabase variables must not let a request header declare itself an admin.
    process.env.NODE_ENV = "production";
    expect(isCallerAdmin(mockReq({ headers: { "x-account-kind": "admin" } }))).toBe(false);
    expect(isCallerAdmin(mockReq({ headers: { "x-account-kind": "super_admin" } }))).toBe(false);
  });
});

describe("isCallerAdmin — an email address is never evidence of a role", () => {
  // The role used to be inferred from the email string. Anyone can sign up with any address and the server
  // does not check it is confirmed, so "superadmin@" + any domain meant every paid cosmetic for free.
  it.each([
    "superadmin@attacker.example",
    "SuperAdmin@Gmail.com",
    "admin@bhalyam.io",
    "x-admin@bhalyam.io.attacker.example",
    "superadmin@bhalyam.io",
  ])("refuses a member whose email is %s", (email) => {
    const req = mockReq({ player: { kind: "member", playerId: "self_signed_up_1", email } as never });
    expect(isCallerAdmin(req)).toBe(false);
  });

  it("still grants admin by the real mechanisms, whatever the email says", () => {
    setUserRole("promoted_member_1", "super_admin");
    const req = mockReq({ player: { kind: "member", playerId: "promoted_member_1", email: "someone@example.com" } as never });
    expect(isCallerAdmin(req)).toBe(true);
  });
});
