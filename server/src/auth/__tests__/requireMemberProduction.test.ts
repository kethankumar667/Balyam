import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Request, Response } from "express";
import { requireMember } from "../identity.js";

/**
 * With account verification switched off (no SUPABASE_* configured), `requireMember` used to wave EVERY caller
 * through as a member: no credential became a shared `dev_member`, and a guest was promoted to a member. That is
 * a convenience for `npm run dev` and a hole in a deploy that forgot its Supabase variables, because nothing
 * stopped such a deploy from booting. The shortcut is now development-only; production refuses instead.
 */

const ENV_KEYS = ["NODE_ENV", "SUPABASE_URL", "SUPABASE_JWT_SECRET", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"];
let saved: Record<string, string | undefined> = {};

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

function run(player: Request["player"]) {
  const req = { player, headers: {} } as unknown as Request;
  const json = vi.fn();
  const res = { status: vi.fn().mockReturnThis(), json } as unknown as Response;
  const next = vi.fn();
  requireMember(req, res, next);
  return { req, res, next, json };
}

describe("requireMember with account verification off", () => {
  it("in development, lets a caller with no credential through as the shared dev member", () => {
    process.env.NODE_ENV = "development";

    const { req, next } = run(undefined);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.player).toMatchObject({ kind: "member", playerId: "dev_member" });
  });

  it("in development, still promotes a guest so local testing needs no Supabase project", () => {
    process.env.NODE_ENV = "development";

    const { req, next } = run({ kind: "guest", playerId: "guest_abc" } as never);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.player).toMatchObject({ kind: "member", playerId: "guest_abc" });
  });

  it("in production, refuses a caller with no credential instead of inventing a member", () => {
    process.env.NODE_ENV = "production";

    const { res, next, req } = run(undefined);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(req.player).toBeUndefined();
  });

  it("in production, refuses a guest instead of promoting them to a member", () => {
    process.env.NODE_ENV = "production";

    const { res, next, req } = run({ kind: "guest", playerId: "guest_abc" } as never);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(req.player).toMatchObject({ kind: "guest" });
  });

  it("in production, never admits the dev_member identity", () => {
    process.env.NODE_ENV = "production";

    const { next, req } = run(undefined);

    expect(next).not.toHaveBeenCalled();
    expect((req.player as { playerId?: string } | undefined)?.playerId).not.toBe("dev_member");
  });
});
