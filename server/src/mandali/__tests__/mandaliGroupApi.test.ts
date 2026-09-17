import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { createMandaliRouter } from "../MandaliController.js";
import { MandaliService } from "../MandaliService.js";
import { requireStrictMandaliAccount } from "../strictAccount.js";
import type { MandaliRepository } from "../MandaliRepository.js";
import type { Mandali, MandaliMembership, MandaliRole } from "@shared/mandali/Mandali.js";

const URL_KEY = "SUPABASE_URL";
const ALL_KEYS = [URL_KEY, "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "MANDALI_ENABLED", "MANDALI_GROUPS"] as const;

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
 * Mandali group API — real HTTP boundary tests.
 *
 * The eligibility provider is intercepted at fetch (confirmed user), so the
 * tests exercise guard + controller + service + (in-memory, explicitly
 * named) repository double over a real socket.
 */
describe("Mandali group API", () => {
  let server: TestServer;
  const ALICE = "member_alice";

  const GROUP: Mandali = {
    id: "m-1",
    name: "Test Mandali",
    description: null,
    ownerId: ALICE,
    maxMembers: 32,
    createdAt: "2026-09-17T00:00:00Z",
    updatedAt: "2026-09-17T00:00:00Z",
  };

  /** Explicitly named in-memory double — the plan's test-double discipline. */
  function memoryRepo(): MandaliRepository {
    const groups = new Map<string, Mandali>();
    const episodes = new Map<string, Array<{ mandaliId: string; userId: string; role: MandaliRole; status: string; joinedAt: string | null; leftAt: string | null }>>();
    return {
      async createGroupWithOwner(input) {
        const g: Mandali = {
          id: `m-${groups.size + 1}`,
          name: input.name,
          description: input.description,
          ownerId: input.ownerId,
          maxMembers: input.maxMembers,
          createdAt: "2026-09-17T00:00:00Z",
          updatedAt: "2026-09-17T00:00:00Z",
        };
        groups.set(g.id, g);
        episodes.set(g.id, [{ mandaliId: g.id, userId: input.ownerId, role: "OWNER", status: "APPROVED", joinedAt: "2026-09-17T00:00:00Z", leftAt: null }]);
        return g;
      },
      async listGroupsForUser(userId) {
        const out: Array<{ mandali: Mandali; role: MandaliRole }> = [];
        for (const eps of episodes.values()) {
          for (const e of eps) {
            if (e.userId === userId && e.status === "APPROVED" && e.leftAt === null) {
              const g = groups.get(e.mandaliId);
              if (g) out.push({ mandali: g, role: e.role });
            }
          }
        }
        return out;
      },
      async getGroup(id) {
        return groups.get(id) ?? null;
      },
      async getLiveMembership(mandaliId, userId) {
        const eps = episodes.get(mandaliId) ?? [];
        const live = eps.find((e) => e.userId === userId && e.leftAt === null && (e.status === "PENDING" || e.status === "APPROVED"));
        return live
          ? { id: `${mandaliId}:${userId}`, mandaliId, userId, role: live.role, status: live.status as "APPROVED", joinedAt: live.joinedAt }
          : null;
      },
      async listMembers(mandaliId) {
        const eps = episodes.get(mandaliId) ?? [];
        return eps
          .filter((e) => e.status === "APPROVED" && e.leftAt === null)
          .map((e, i) => ({ id: `ep-${i}`, mandaliId: e.mandaliId, userId: e.userId, role: e.role, status: "APPROVED" as const, joinedAt: e.joinedAt }));
      },
    };
  }

  let repo: MandaliRepository;
  let storageBroken: boolean;

  async function boot(): Promise<void> {
    repo = memoryRepo();
    storageBroken = false;
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.includes("/auth/v1/user")) {
        return new Response(
          JSON.stringify({ id: ALICE, email: "a@example.com", is_anonymous: false, email_confirmed_at: "2026-01-01T00:00:00Z" }),
          { status: 200 },
        );
      }
      return realFetch(input, init);
    });
    const service = new MandaliService(new Proxy(repo, {
      get(target, prop) {
        if (storageBroken) return async () => { throw new Error("storage down"); };
        const v = Reflect.get(target, prop);
        return typeof v === "function" ? v.bind(target) : v;
      },
    }));
    server = await startTestServer((app) => {
      app.use(
        "/api/mandali",
        createMandaliRouter(service, () => process.env.MANDALI_GROUPS === "true", requireStrictMandaliAccount),
      );
    });
  }

  afterEach(async () => {
    await server.close();
    vi.unstubAllGlobals();
  });

  async function enableGroups(): Promise<void> {
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.MANDALI_ENABLED = "true";
    process.env.MANDALI_GROUPS = "true";
  }

  it("503s with FeatureDisabled when the groups flag is off, before any lookup", async () => {
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.MANDALI_ENABLED = "true";
    await boot();
    const res = await server.request("/api/mandali", { method: "POST", token: ALICE, body: JSON.stringify({ name: "X" }) });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: "FeatureDisabled" });
  });

  it("creates a group with the caller as owner, derived from the verified account", async () => {
    await enableGroups();
    await boot();
    const res = await server.request("/api/mandali", {
      method: "POST",
      token: ALICE,
      body: JSON.stringify({ name: "  My Mandali  ", description: "hi" }),
    });
    expect(res.status).toBe(201);
    const body = res.body as { group: Mandali };
    expect(body.group.name).toBe("My Mandali");
    expect(body.group.ownerId).toBe(ALICE);
  });

  it("refuses an invalid name with 400", async () => {
    await enableGroups();
    await boot();
    const res = await server.request("/api/mandali", { method: "POST", token: ALICE, body: JSON.stringify({ name: "   " }) });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: "InvalidInput" });
  });

  it("lists the caller's groups", async () => {
    await enableGroups();
    await boot();
    await server.request("/api/mandali", { method: "POST", token: ALICE, body: JSON.stringify({ name: "First" }) });
    const res = await server.request("/api/mandali", { token: ALICE });
    expect(res.status).toBe(200);
    const body = res.body as { groups: Array<{ mandali: Mandali; role: MandaliRole }> };
    expect(body.groups).toHaveLength(1);
    expect(body.groups[0].mandali.ownerId).toBe(ALICE);
    expect(body.groups[0].role).toBe("OWNER");
  });

  it("returns 404 for a group the caller cannot see and never leaks existence", async () => {
    await enableGroups();
    await boot();
    const res = await server.request("/api/mandali/does-not-exist", { token: ALICE });
    expect(res.status).toBe(404);
  });

  it("answers 503 when durable storage fails, not a fabricated 404/403", async () => {
    await enableGroups();
    await boot();
    storageBroken = true;
    const res = await server.request("/api/mandali", { token: ALICE });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: "Unavailable" });
  });
});

