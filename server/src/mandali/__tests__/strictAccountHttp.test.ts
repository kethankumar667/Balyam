import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { requireStrictMandaliAccount } from "../strictAccount.js";
import { bearerFrom } from "../account.js";
import type { Request } from "express";

const URL_KEY = "SUPABASE_URL";
const ANON_KEYS = ["SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"] as const;
const ALL_KEYS = [URL_KEY, ...ANON_KEYS, "MANDALI_ENABLED"] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of ALL_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ALL_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

/**
 * Real HTTP boundary tests for the Mandali strict guard.
 *
 * As with the P0-2 player-authorization suite, the point is what a real
 * client receives from a real server — not that a function branches.
 * Supabase calls are intercepted at `fetch` (matching the project URL) so the
 * loopback requests these tests make are untouched.
 */
describe("requireStrictMandaliAccount — HTTP boundary", () => {
  let server: TestServer;
  let supabaseCalls: Array<{ url: string; headers: Record<string, string> }>;
  let userResponse: { status: number; body: unknown } | null;
  let userError: Error | null;

  beforeEach(() => {
    supabaseCalls = [];
    userResponse = null;
    userError = null;
  });

  async function boot(): Promise<void> {
    const realFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = String(input);
        if (url.includes("/auth/v1/user")) {
          supabaseCalls.push({
            url,
            headers: (init?.headers ?? {}) as Record<string, string>,
          });
          if (userError) throw userError;
          return new Response(
            userResponse === null ? null : JSON.stringify(userResponse.body),
            { status: userResponse?.status ?? 500 },
          );
        }
        return realFetch(input, init);
      },
    );
    server = await startTestServer((app) => {
      app.all(
        "/api/mandali/probe",
        requireStrictMandaliAccount(() => process.env.MANDALI_ENABLED === "true"),
        (_req, res) => {
          res.json({ ok: true, actor: res.locals.mandaliAccount });
        },
      );
    });
  }

  afterEach(async () => {
    await server.close();
    vi.unstubAllGlobals();
  });

  const CONFIRMED_USER = {
    id: "provider-user-id",
    email: "member@example.com",
    is_anonymous: false,
    email_confirmed_at: "2026-01-01T00:00:00Z",
  };

  it("answers 503 FeatureDisabled before any provider lookup when flags are off", async () => {
    await boot();
    const res = await server.request("/api/mandali/probe", { token: "some-jwt" });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: "FeatureDisabled" });
    expect(supabaseCalls).toHaveLength(0);
  });

  it("answers 401 without a bearer credential", async () => {
    process.env.MANDALI_ENABLED = "true";
    await boot();
    const res = await server.request("/api/mandali/probe");
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: "Unauthorized" });
  });

  it("answers 503 when the provider is not configured — nothing was proven about the caller", async () => {
    process.env.MANDALI_ENABLED = "true";
    await boot();
    const res = await server.request("/api/mandali/probe", { token: "any-token" });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: "Unavailable" });
    expect(supabaseCalls).toHaveLength(0);
  });

  it("accepts a confirmed, non-anonymous, active account with the provider-derived actor", async () => {
    process.env.MANDALI_ENABLED = "true";
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    userResponse = { status: 200, body: CONFIRMED_USER };
    await boot();
    const res = await server.request("/api/mandali/probe", { token: "valid-token" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, actor: { userId: "provider-user-id" } });
    expect(supabaseCalls).toHaveLength(1);
    expect(supabaseCalls[0].headers.Authorization).toBe("Bearer valid-token");
    expect(supabaseCalls[0].headers.apikey).toBe("anon-key");
  });

  it("rejects an anonymous account", async () => {
    process.env.MANDALI_ENABLED = "true";
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    userResponse = { status: 200, body: { ...CONFIRMED_USER, is_anonymous: true } };
    await boot();
    const res = await server.request("/api/mandali/probe", { token: "t" });
    expect(res.status).toBe(403);
  });

  it("rejects an unconfirmed account — no confirmation timestamp of either kind", async () => {
    process.env.MANDALI_ENABLED = "true";
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    userResponse = { status: 200, body: { id: "u", is_anonymous: false } };
    await boot();
    const res = await server.request("/api/mandali/probe", { token: "t" });
    expect(res.status).toBe(403);
  });

  it("rejects a banned account", async () => {
    process.env.MANDALI_ENABLED = "true";
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    userResponse = {
      status: 200,
      body: { ...CONFIRMED_USER, banned_until: new Date(Date.now() + 3_600_000).toISOString() },
    };
    await boot();
    const res = await server.request("/api/mandali/probe", { token: "t" });
    expect(res.status).toBe(403);
  });

  it("rejects a deleted account", async () => {
    process.env.MANDALI_ENABLED = "true";
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    userResponse = { status: 200, body: { ...CONFIRMED_USER, deleted_at: "2026-02-01T00:00:00Z" } };
    await boot();
    const res = await server.request("/api/mandali/probe", { token: "t" });
    expect(res.status).toBe(403);
  });

  it("answers 503, not 403, when the provider is unreachable", async () => {
    process.env.MANDALI_ENABLED = "true";
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    userError = new Error("network down");
    await boot();
    const res = await server.request("/api/mandali/probe", { token: "t" });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: "Unavailable" });
  });

  it("does not trust caller-supplied identity claims", async () => {
    process.env.MANDALI_ENABLED = "true";
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    userResponse = { status: 200, body: CONFIRMED_USER };
    await boot();
    // A forged "member" claim in the body must not matter; the actor comes
    // only from the provider answer above.
    const res = await server.request("/api/mandali/probe", {
      method: "POST",
      body: JSON.stringify({ playerId: "attacker", kind: "member" }),
      token: "valid-token",
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ actor: { userId: "provider-user-id" } });
  });
});

describe("bearerFrom", () => {
  function reqWith(authorization?: string): Request {
    return { headers: authorization ? { authorization } : {} } as unknown as Request;
  }

  it("extracts a bearer token", () => {
    expect(bearerFrom(reqWith("Bearer abc.def"))).toBe("abc.def");
  });

  it("is case-insensitive on the scheme and trims", () => {
    expect(bearerFrom(reqWith("bearer  spaced  "))).toBe("spaced");
  });

  it("refuses missing, non-bearer, and empty credentials", () => {
    expect(bearerFrom(reqWith())).toBeNull();
    expect(bearerFrom(reqWith("Basic abc"))).toBeNull();
    expect(bearerFrom(reqWith("Bearer   "))).toBeNull();
  });
});
