import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import {
  requireOperationalAuth,
  assertOperationalAuthConfigured,
  operationalConfigProblems,
  operationalAuthStatus,
} from "../operationalAuth.js";
import { createOperationalRouter } from "../../observability/OperationalController.js";
import { RoomManager } from "../../rooms/RoomManager.js";
import { healthMonitor } from "../../observability/HealthMonitor.js";
import { telemetryAggregator } from "../../observability/TelemetryAggregator.js";
import { clearVerificationCache } from "../../lib/supabaseAuth.js";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";

/**
 * P0-1 — operational surface protection.
 *
 * The finding these tests close: `/api/operational/*` returned 200 to an
 * anonymous caller whenever `OPERATIONAL_SECRET` was unset, including under
 * `NODE_ENV=production`. Recorded before the fix in
 * docs/remediation/P0-00-BASELINE.md §4.
 *
 * Everything here goes over a real socket. A test that called the middleware
 * with a fake `req` could pass while the middleware was mounted on the wrong
 * prefix, or after the handler, and the finding would still be live.
 */

const OPS_KEY = "ops-key-of-sufficient-length-1234";
const JWT_SECRET = "test-jwt-secret-for-hs256-signing";
const PROJECT_URL = "https://example.supabase.co";
const ADMIN_ID = "11111111-2222-3333-4444-555555555555";
const OTHER_ID = "99999999-8888-7777-6666-555555555555";

const ENV_KEYS = [
  "OPERATIONAL_SECRET",
  "ADMIN_API_KEY",
  "ADMIN_USER_IDS",
  "NODE_ENV",
  "SUPABASE_URL",
  "SUPABASE_JWT_SECRET",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
];
let saved: Record<string, string | undefined> = {};

function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** A Supabase-shaped session token, minted the way GoTrue does. */
function mintSessionToken(sub: string): string {
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    sub,
    email: "admin@example.com",
    aud: "authenticated",
    iss: `${PROJECT_URL}/auth/v1`,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function makeMockIo() {
  const sockets = new Map<string, unknown>();
  return {
    sockets: { sockets },
    to: vi.fn(() => ({ emit: vi.fn() })),
    engine: { clientsCount: 0 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

let server: TestServer | null = null;

async function startOperationalServer(): Promise<TestServer> {
  const io = makeMockIo();
  const roomManager = new RoomManager(io);
  return startTestServer((app) => {
    app.use(
      "/api/operational",
      createOperationalRouter({ roomManager, io, startTime: Date.now() }),
    );
  });
}

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  clearVerificationCache();
});

afterEach(async () => {
  await server?.close();
  server = null;
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
  clearVerificationCache();
});

/* ────────────────── The regression itself ────────────────── */

describe("P0-1 — unconfigured no longer means unprotected", () => {
  it("refuses every operational endpoint when no credential is configured", async () => {
    // Exactly the baseline condition: no OPERATIONAL_SECRET, no allowlist.
    server = await startOperationalServer();

    const paths = [
      "/api/operational/health",
      "/api/operational/metrics",
      "/api/operational/performance",
      "/api/operational/recovery",
      "/api/operational/games",
      "/api/operational/rooms",
      "/api/operational/leaks",
      "/api/operational/timeline/ABC123",
      "/api/operational/whoami",
    ];

    for (const p of paths) {
      const res = await server.request(p);
      expect(res.status, `${p} must not be readable without configuration`).toBe(401);
      expect(res.body).toEqual({
        error: "Unauthorized",
        message: "Valid operational credentials are required for this endpoint.",
      });
    }
  });

  it("still refuses when NODE_ENV=production and the secret is missing", async () => {
    process.env.NODE_ENV = "production";
    server = await startOperationalServer();

    const res = await server.request("/api/operational/metrics");
    expect(res.status).toBe(401);
  });

  it("gathers no telemetry before authorization succeeds", async () => {
    const evaluate = vi.spyOn(healthMonitor, "evaluate");
    const snapshot = vi.spyOn(telemetryAggregator, "getSnapshot");
    server = await startOperationalServer();

    await server.request("/api/operational/health");
    await server.request("/api/operational/metrics");
    await server.request("/api/operational/recovery");

    // The refusal is a string comparison. Nothing walked the room table.
    expect(evaluate).not.toHaveBeenCalled();
    expect(snapshot).not.toHaveBeenCalled();
  });
});

/* ────────────────── Credential handling ────────────────── */

describe("P0-1 — operational credential handling", () => {
  beforeEach(() => {
    process.env.OPERATIONAL_SECRET = OPS_KEY;
  });

  it("missing credentials → 401", async () => {
    server = await startOperationalServer();
    const res = await server.request("/api/operational/metrics");
    expect(res.status).toBe(401);
  });

  it("invalid credentials → 401", async () => {
    server = await startOperationalServer();

    for (const bad of [
      "wrong",
      OPS_KEY.slice(0, -1), // right length minus one byte
      OPS_KEY + "x", // correct prefix, wrong length
      OPS_KEY.toUpperCase(),
      "",
    ]) {
      const res = await server.request("/api/operational/metrics", {
        headers: { "x-operational-key": bad },
      });
      expect(res.status, `"${bad}" must be refused`).toBe(401);
    }
  });

  it("valid admin credentials → 200, via either header", async () => {
    server = await startOperationalServer();

    const bearer = await server.request("/api/operational/metrics", { token: OPS_KEY });
    expect(bearer.status).toBe(200);
    expect(bearer.body).toHaveProperty("rooms");

    const custom = await server.request("/api/operational/metrics", {
      headers: { "x-operational-key": OPS_KEY },
    });
    expect(custom.status).toBe(200);

    // When both Authorization bearer AND x-operational-key are sent (e.g. a signed-in user entering key)
    const combined = await server.request("/api/operational/whoami", {
      headers: {
        authorization: "Bearer some_unauthorized_user_session_jwt",
        "x-operational-key": OPS_KEY,
      },
    });
    expect(combined.status).toBe(200);
    expect(combined.body).toEqual({ principal: { kind: "ops-key" } });
  });

  it("names the principal it authorized", async () => {
    server = await startOperationalServer();
    const res = await server.request("/api/operational/whoami", { token: OPS_KEY });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ principal: { kind: "ops-key" } });
  });

  it("no longer accepts the key in the query string", async () => {
    // Removed deliberately: a credential in a URL lands in access logs, proxy
    // logs, browser history and Referer headers.
    server = await startOperationalServer();
    const res = await server.request(`/api/operational/metrics?key=${OPS_KEY}`);
    expect(res.status).toBe(401);
  });

  it("returns one indistinguishable body for every refusal", async () => {
    server = await startOperationalServer();

    const noCred = await server.request("/api/operational/metrics");
    const badCred = await server.request("/api/operational/metrics", { token: "nope" });
    // No oracle: "wrong key" must not be distinguishable from "no key".
    expect(badCred.body).toEqual(noCred.body);
    expect(badCred.status).toBe(noCred.status);
  });

  it("does not cache operational answers anywhere", async () => {
    server = await startOperationalServer();
    const res = await server.request("/api/operational/metrics", { token: OPS_KEY });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("compares in constant time without throwing on a length mismatch", () => {
    // timingSafeEqual throws on unequal lengths; a credential of the wrong
    // size must be a 401, never a 500.
    const req = { method: "GET", path: "/x", headers: { "x-operational-key": "a" }, query: {} };
    let status = 0;
    const res = {
      status: (s: number) => {
        status = s;
        return res;
      },
      json: () => undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    let nexted = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => requireOperationalAuth(req as any, res, () => { nexted = true; })).not.toThrow();
    expect(status).toBe(401);
    expect(nexted).toBe(false);
  });

  it("keeps honouring the legacy ADMIN_API_KEY name", async () => {
    delete process.env.OPERATIONAL_SECRET;
    process.env.ADMIN_API_KEY = OPS_KEY;
    server = await startOperationalServer();
    const res = await server.request("/api/operational/metrics", { token: OPS_KEY });
    expect(res.status).toBe(200);
  });
});

/* ────────────────── Role check on a verified session ────────────────── */

describe("P0-1 — admin authorization from a verified session", () => {
  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    process.env.SUPABASE_URL = PROJECT_URL;
    process.env.ADMIN_USER_IDS = `${ADMIN_ID}, someone-else`;
  });

  it("admits a verified session whose id is on the allowlist", async () => {
    server = await startOperationalServer();
    const res = await server.request("/api/operational/whoami", {
      token: mintSessionToken(ADMIN_ID),
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      principal: { kind: "admin-user", userId: ADMIN_ID, email: "admin@example.com" },
    });
  });

  it("refuses a verified session that is not on the allowlist", async () => {
    server = await startOperationalServer();
    const res = await server.request("/api/operational/metrics", {
      token: mintSessionToken(OTHER_ID),
    });
    expect(res.status).toBe(401);
  });

  it("refuses a token signed with the wrong key", async () => {
    server = await startOperationalServer();
    const header = b64({ alg: "HS256", typ: "JWT" });
    const payload = b64({
      sub: ADMIN_ID,
      aud: "authenticated",
      iss: `${PROJECT_URL}/auth/v1`,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const forged = `${header}.${payload}.${crypto
      .createHmac("sha256", "attacker-secret")
      .update(`${header}.${payload}`)
      .digest("base64url")}`;

    const res = await server.request("/api/operational/metrics", { token: forged });
    expect(res.status).toBe(401);
  });

  it("refuses an expired session even when the id is on the allowlist", async () => {
    server = await startOperationalServer();
    const header = b64({ alg: "HS256", typ: "JWT" });
    const payload = b64({
      sub: ADMIN_ID,
      aud: "authenticated",
      iss: `${PROJECT_URL}/auth/v1`,
      exp: Math.floor(Date.now() / 1000) - 7200,
    });
    const stale = `${header}.${payload}.${crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url")}`;

    const res = await server.request("/api/operational/metrics", { token: stale });
    expect(res.status).toBe(401);
  });

  it("refuses a session token when no allowlist is configured", async () => {
    delete process.env.ADMIN_USER_IDS;
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    server = await startOperationalServer();
    const res = await server.request("/api/operational/metrics", {
      token: mintSessionToken(ADMIN_ID),
    });
    expect(res.status).toBe(401);
  });
});

/* ────────────────── Startup posture ────────────────── */

describe("P0-1 — production startup guard", () => {
  it("reports a fatal problem in production with nothing configured", () => {
    process.env.NODE_ENV = "production";
    const problems = operationalConfigProblems();
    expect(problems.some((p) => p.fatal)).toBe(true);
    expect(() => assertOperationalAuthConfigured()).toThrow(/Refusing to start in production/);
  });

  it("treats the same gap as non-fatal outside production", () => {
    process.env.NODE_ENV = "development";
    expect(operationalConfigProblems().every((p) => !p.fatal)).toBe(true);
    expect(() => assertOperationalAuthConfigured()).not.toThrow();
  });

  it("rejects a short production secret", () => {
    process.env.NODE_ENV = "production";
    process.env.OPERATIONAL_SECRET = "admin";
    expect(() => assertOperationalAuthConfigured()).toThrow(/at least 16/);
  });

  it("accepts a strong production secret", () => {
    process.env.NODE_ENV = "production";
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    expect(() => assertOperationalAuthConfigured()).not.toThrow();
    expect(operationalAuthStatus()).toEqual({ configured: true, opsKey: true, adminUsers: 0 });
  });

  it("warns but boots when an allowlist has no way to verify sessions", () => {
    process.env.NODE_ENV = "production";
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    process.env.ADMIN_USER_IDS = ADMIN_ID;
    const problems = operationalConfigProblems();
    expect(problems).toHaveLength(1);
    expect(problems[0]!.fatal).toBe(false);
    expect(() => assertOperationalAuthConfigured()).not.toThrow();
  });

  it("never reports the secret itself in the health status", () => {
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    process.env.ADMIN_USER_IDS = `${ADMIN_ID},${OTHER_ID}`;
    expect(JSON.stringify(operationalAuthStatus())).not.toContain(OPS_KEY);
    expect(operationalAuthStatus()).toEqual({ configured: true, opsKey: true, adminUsers: 2 });
  });
});

/* ────────────────── The guard, in a real process ────────────────── */

describe("P0-1 — the real server refuses to boot misconfigured", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const serverRoot = path.resolve(here, "../../..");
  /**
   * The tsx CLI as a plain JS entry, run by this same node binary.
   *
   * NOT `node_modules/.bin/tsx` with `shell: true`. On Windows that spawns
   * cmd.exe, which spawns tsx.cmd, which spawns node — and `child.kill()`
   * reaches only the cmd.exe at the top. The real server survives, keeps its
   * port, and the NEXT run of this test fails with EADDRINUSE against a
   * process nothing is tracking. Spawning node directly makes the handle we
   * hold the process we mean to kill.
   */
  const tsxCli = path.join(serverRoot, "node_modules", "tsx", "dist", "cli.mjs");

  function boot(env: Record<string, string>): Promise<{ code: number | null; output: string }> {
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [tsxCli, "src/index.ts"], {
        cwd: serverRoot,
        env: {
          ...process.env,
          OPERATIONAL_SECRET: "",
          ADMIN_API_KEY: "",
          ADMIN_USER_IDS: "",
          // This suite is about the OPERATIONAL guard. Production now also
          // refuses to boot without durable progression (P0-3) or durable
          // Economy V1 persistence (Phase 7), and leaving either on would
          // make every case here fail for the wrong reason.
          ALLOW_EPHEMERAL_PROGRESSION: "true",
          ALLOW_EPHEMERAL_ECONOMY: "true",
          ...env,
        },
      });
      let output = "";
      let settled = false;
      const finish = (code: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ code, output });
      };

      // A healthy boot never exits, so "it announced its port" is the pass
      // condition — resolved as soon as the line appears rather than by
      // waiting out a fixed timeout, which would put 20s into every CI run.
      const onData = (d: unknown) => {
        output += String(d);
        if (/Server listening/.test(output)) {
          child.kill();
          finish(null);
        }
      };
      child.stdout.on("data", onData);
      child.stderr.on("data", onData);

      // Backstop for a process that neither exits nor announces itself.
      const timer = setTimeout(() => {
        child.kill();
        finish(null);
      }, 20_000);

      child.on("exit", (code) => finish(code));
    });
  }

  it(
    "exits non-zero in production with no operational credential configured",
    async () => {
      const { code, output } = await boot({ NODE_ENV: "production", PORT: "4931" });
      expect(code, `server should not have started. Output:\n${output}`).toBe(1);
      expect(output).toMatch(/Refusing to start in production/);
      expect(output).toMatch(/OPERATIONAL_SECRET/);
    },
    30_000,
  );

  it(
    "also refuses in production when progression has nowhere durable to live",
    async () => {
      // The second production guard, asserted here because it shares the same
      // boot path: an operational secret alone is no longer enough.
      const { code, output } = await boot({
        NODE_ENV: "production",
        PORT: "4933",
        OPERATIONAL_SECRET: OPS_KEY,
        ALLOW_EPHEMERAL_PROGRESSION: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      });
      expect(code, `server should not have started. Output:
${output}`).toBe(1);
      expect(output).toMatch(/without durable progression/);
    },
    30_000,
  );

  it(
    "starts in production once a credential is configured",
    async () => {
      const { code, output } = await boot({
        NODE_ENV: "production",
        PORT: "4932",
        OPERATIONAL_SECRET: OPS_KEY,
      });
      // null == we killed a running server, which is the pass condition here.
      expect(code, `server should have stayed up. Output:\n${output}`).toBe(null);
      expect(output).toMatch(/Server listening/);
    },
    30_000,
  );
});
