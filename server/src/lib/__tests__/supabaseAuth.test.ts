import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import {
  clearVerificationCache,
  resolveAccountKind,
  verificationMode,
  verifyAccessToken,
} from "../supabaseAuth.js";

/**
 * Session verification.
 *
 * What is actually under test is a permission decision, so the cases are
 * written as "who does the server think this is", not "does the JWT parse".
 * Three of them matter more than the rest:
 *
 *  1. A forged `alg` must not verify. Reading the algorithm out of the token
 *     and trusting it is the textbook JWT forgery, and the version of this
 *     code that gets it wrong passes every happy-path test.
 *
 *  2. Unconfigured must stay permissive. `off` mode is what every existing
 *     RoomManager test and every `npm run dev` runs in, and a change that
 *     quietly made it fail-closed would strip multiplayer from the default
 *     setup while looking like a security improvement.
 *
 *  3. Configured must be fail-closed in the other direction — an unverifiable
 *     claim of membership is a guest, which is the whole point of the file.
 */

const SECRET = "test-jwt-secret-for-hs256-signing";
const PROJECT_URL = "https://example.supabase.co";
const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_JWT_SECRET", "SUPABASE_ANON_KEY"];

let saved: Record<string, string | undefined> = {};

function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** Mint a token the way GoTrue does, so the tests exercise the real shape. */
function mintToken(
  overrides: {
    sub?: string;
    email?: string;
    exp?: number;
    iss?: string;
    aud?: string;
    alg?: string;
    secret?: string;
  } = {},
): string {
  const header = b64({ alg: overrides.alg ?? "HS256", typ: "JWT" });
  const payload = b64({
    sub: overrides.sub ?? "8f14e45f-ceea-467a-9a5b-1c0d5a6a1b23",
    email: overrides.email ?? "player@example.com",
    aud: overrides.aud ?? "authenticated",
    iss: overrides.iss ?? `${PROJECT_URL}/auth/v1`,
    exp: overrides.exp ?? Math.floor(Date.now() / 1000) + 3600,
  });
  const signature = crypto
    .createHmac("sha256", overrides.secret ?? SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  clearVerificationCache();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
  clearVerificationCache();
});

describe("verificationMode", () => {
  it("is off with nothing configured", () => {
    expect(verificationMode()).toBe("off");
  });

  it("prefers the local secret over a round trip", () => {
    process.env.SUPABASE_URL = PROJECT_URL;
    process.env.SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_JWT_SECRET = SECRET;
    expect(verificationMode()).toBe("jwt-secret");
  });

  it("falls back to the auth API when only the project keys are set", () => {
    process.env.SUPABASE_URL = PROJECT_URL;
    process.env.SUPABASE_ANON_KEY = "anon";
    expect(verificationMode()).toBe("auth-api");
  });

  it("ignores blank env values, which are what an unset Render var looks like", () => {
    process.env.SUPABASE_JWT_SECRET = "   ";
    process.env.SUPABASE_URL = "";
    expect(verificationMode()).toBe("off");
  });
});

describe("unconfigured servers keep trusting the claim", () => {
  it("takes the client at its word", async () => {
    await expect(resolveAccountKind("member", undefined)).resolves.toBe("member");
    await expect(resolveAccountKind("guest", undefined)).resolves.toBe("guest");
  });

  it("treats a missing claim as open, matching the rest of the codebase", async () => {
    // Only an explicit "guest" seals a room — see createRoom's comment. A
    // caller that has not been taught the field must not lose multiplayer.
    await expect(resolveAccountKind(undefined, undefined)).resolves.toBe("member");
  });

  it("never claims to have verified anything", async () => {
    await expect(verifyAccessToken(mintToken())).resolves.toBeNull();
  });
});

describe("HS256 verification", () => {
  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    process.env.SUPABASE_URL = PROJECT_URL;
  });

  it("accepts a token this project signed", async () => {
    const account = await verifyAccessToken(mintToken({ sub: "user-1", email: "a@b.com" }));
    expect(account).toEqual({ userId: "user-1", email: "a@b.com" });
  });

  it("makes a verified holder a member", async () => {
    await expect(resolveAccountKind("member", mintToken())).resolves.toBe("member");
  });

  it("downgrades a member claim with no token", async () => {
    await expect(resolveAccountKind("member", undefined)).resolves.toBe("guest");
  });

  it("rejects a token signed with a different secret", async () => {
    const forged = mintToken({ secret: "not-our-secret" });
    await expect(verifyAccessToken(forged)).resolves.toBeNull();
    await expect(resolveAccountKind("member", forged)).resolves.toBe("guest");
  });

  it("rejects a token whose signature was edited", async () => {
    const token = mintToken();
    const tampered = `${token.slice(0, -2)}xy`;
    await expect(verifyAccessToken(tampered)).resolves.toBeNull();
  });

  it("rejects a payload edited after signing", async () => {
    const [header, , signature] = mintToken().split(".");
    const swapped = b64({
      sub: "somebody-else",
      aud: "authenticated",
      iss: `${PROJECT_URL}/auth/v1`,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    await expect(verifyAccessToken(`${header}.${swapped}.${signature}`)).resolves.toBeNull();
  });

  it("refuses an unsigned token claiming alg none", async () => {
    // The classic forgery: strip the signature and tell the verifier not to
    // check one. Believing the token's own header is how it succeeds.
    const header = b64({ alg: "none", typ: "JWT" });
    const payload = b64({
      sub: "user-1",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    await expect(verifyAccessToken(`${header}.${payload}.`)).resolves.toBeNull();
  });

  it("rejects an expired session, allowing for clock drift", async () => {
    const wellExpired = mintToken({ exp: Math.floor(Date.now() / 1000) - 600 });
    await expect(verifyAccessToken(wellExpired)).resolves.toBeNull();

    // A server whose clock runs slightly ahead of Supabase's must not reject
    // a token minted seconds ago.
    const justExpired = mintToken({ exp: Math.floor(Date.now() / 1000) - 5 });
    await expect(verifyAccessToken(justExpired)).resolves.not.toBeNull();
  });

  it("rejects a token from a different Supabase project", async () => {
    const other = mintToken({ iss: "https://someone-else.supabase.co/auth/v1" });
    await expect(verifyAccessToken(other)).resolves.toBeNull();
  });

  it("rejects an anon-key token, which is a valid JWT for nobody", async () => {
    await expect(verifyAccessToken(mintToken({ aud: "anon" }))).resolves.toBeNull();
  });

  it("rejects malformed input without throwing", async () => {
    for (const bad of ["", "not-a-jwt", "a.b", "a.b.c.d", "...", "%%%.%%%.%%%"]) {
      await expect(verifyAccessToken(bad)).resolves.toBeNull();
    }
  });
});

describe("auth-API verification", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = PROJECT_URL;
    process.env.SUPABASE_ANON_KEY = "anon-key";
  });

  function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response> | Response) {
    const spy = vi.fn(impl);
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  function userResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("asks Supabase who the token belongs to", async () => {
    const spy = stubFetch(() => userResponse({ id: "user-9", email: "x@y.com" }));
    await expect(verifyAccessToken("opaque-token")).resolves.toEqual({
      userId: "user-9",
      email: "x@y.com",
    });

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${PROJECT_URL}/auth/v1/user`);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer opaque-token");
    expect(headers.apikey).toBe("anon-key");
  });

  it("verifies a token signed with a key we do not hold", async () => {
    // The reason this mode exists: projects on asymmetric signing keys never
    // expose a secret we could verify with locally.
    stubFetch(() => userResponse({ id: "user-9" }));
    await expect(resolveAccountKind("member", "es256-style-token")).resolves.toBe("member");
  });

  it("treats a rejected token as a guest", async () => {
    stubFetch(() => userResponse({ msg: "invalid claim" }, 401));
    await expect(resolveAccountKind("member", "stale-token")).resolves.toBe("guest");
  });

  it("treats an unreachable auth service as a guest rather than throwing", async () => {
    stubFetch(() => Promise.reject(new Error("ECONNREFUSED")));
    await expect(resolveAccountKind("member", "any-token")).resolves.toBe("guest");
  });

  it("does not ask twice for the same token", async () => {
    const spy = stubFetch(() => userResponse({ id: "user-9" }));
    await verifyAccessToken("repeat-token");
    await verifyAccessToken("repeat-token");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("caches a rejection too, so a retry loop cannot stampede", async () => {
    const spy = stubFetch(() => userResponse({}, 401));
    await verifyAccessToken("bad-token");
    await verifyAccessToken("bad-token");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("never calls out for an empty token", async () => {
    const spy = stubFetch(() => userResponse({ id: "user-9" }));
    await expect(verifyAccessToken("")).resolves.toBeNull();
    await expect(verifyAccessToken(undefined)).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
