import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { authRouter } from "../AuthController.js";
import {
  GUEST_NETWORK_WINDOW_MS,
  GuestNetworkLimiter,
  guestNetworkLimiter,
  guestsPerNetworkLimit,
  networkLimitIsTrustworthy,
} from "../guestNetworkLimiter.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const ENV_KEYS = ["GUEST_PER_NETWORK_LIMIT", "NODE_ENV", "TRUST_PROXY_HOPS"];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) saved[key] = process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("GuestNetworkLimiter", () => {
  const clock = { now: 1_800_000_000_000 };
  const make = (limit = 3, extra: ConstructorParameters<typeof GuestNetworkLimiter>[0] = {}) =>
    new GuestNetworkLimiter({ now: () => clock.now, limit: () => limit, salt: "test-salt", ...extra });

  beforeEach(() => {
    clock.now = 1_800_000_000_000;
  });

  it("lets a network make guests up to the limit, then refuses the next", () => {
    const limiter = make(3);

    expect([1, 2, 3].map(() => limiter.consume("203.0.113.9").allowed)).toEqual([true, true, true]);
    expect(limiter.consume("203.0.113.9").allowed).toBe(false);
  });

  it("tells a refused network how long until its oldest guest ages out", () => {
    const limiter = make(1);
    limiter.consume("203.0.113.9");
    clock.now += 2 * DAY_MS;

    const verdict = limiter.consume("203.0.113.9");

    expect(verdict).toEqual({ allowed: false, retryAfterMs: GUEST_NETWORK_WINDOW_MS - 2 * DAY_MS });
  });

  it("keeps different networks apart", () => {
    const limiter = make(1);
    limiter.consume("203.0.113.9");

    expect(limiter.consume("203.0.113.9").allowed).toBe(false);
    expect(limiter.consume("198.51.100.4").allowed).toBe(true);
  });

  it("frees a network once its guests are older than a guest lives (7 days)", () => {
    const limiter = make(1);
    limiter.consume("203.0.113.9");
    clock.now += GUEST_NETWORK_WINDOW_MS - 1;
    expect(limiter.consume("203.0.113.9").allowed).toBe(false);

    clock.now += 2;

    expect(limiter.consume("203.0.113.9").allowed).toBe(true);
  });

  it("never keeps the address: only a salted hash of it is held", () => {
    const limiter = make(3);
    limiter.consume("203.0.113.9");
    const keys = [...(limiter as unknown as { creations: Map<string, number[]> }).creations.keys()];

    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(keys)).not.toContain("203.0.113.9");
  });

  it("hashes the same address differently under a different salt, so a leaked table cannot be replayed", () => {
    const a = make(3, { salt: "salt-a" });
    const b = make(3, { salt: "salt-b" });
    a.consume("203.0.113.9");
    b.consume("203.0.113.9");
    const keyOf = (l: GuestNetworkLimiter) => [...(l as unknown as { creations: Map<string, number[]> }).creations.keys()][0];

    expect(keyOf(a)).not.toBe(keyOf(b));
  });

  it("never refuses, and never counts, a request whose address is unknown", () => {
    const limiter = make(1);

    for (let i = 0; i < 10; i += 1) expect(limiter.consume(undefined).allowed).toBe(true);
    expect(limiter.consume("").allowed).toBe(true);
    expect(limiter.size()).toBe(0);
  });

  it("is switched off by a limit of zero", () => {
    const limiter = make(0);

    for (let i = 0; i < 20; i += 1) expect(limiter.consume("203.0.113.9").allowed).toBe(true);
    expect(limiter.size()).toBe(0);
  });

  it("cannot be made to grow without bound: the oldest networks are forgotten", () => {
    const limiter = make(3, { maxNetworks: 100 });

    for (let i = 0; i < 1_000; i += 1) limiter.consume(`10.0.${Math.floor(i / 250)}.${i % 250}`);

    expect(limiter.size()).toBeLessThanOrEqual(100);
  });
});

describe("configuration", () => {
  it("defaults to five new guests per network", () => {
    delete process.env.GUEST_PER_NETWORK_LIMIT;
    expect(guestsPerNetworkLimit()).toBe(5);
  });

  it("reads a valid setting, and treats an explicit 0 as off", () => {
    process.env.GUEST_PER_NETWORK_LIMIT = "3";
    expect(guestsPerNetworkLimit()).toBe(3);
    process.env.GUEST_PER_NETWORK_LIMIT = "0";
    expect(guestsPerNetworkLimit()).toBe(0);
  });

  it("falls back to the default for nonsense rather than silently disabling the protection", () => {
    for (const bad of ["banana", "-2", "1.5", ""]) {
      process.env.GUEST_PER_NETWORK_LIMIT = bad;
      expect(guestsPerNetworkLimit(), bad).toBe(5);
    }
  });

  it("trusts the address outside production, where there is no proxy", () => {
    process.env.NODE_ENV = "development";
    delete process.env.TRUST_PROXY_HOPS;
    expect(networkLimitIsTrustworthy()).toBe(true);
  });

  it("does not trust the address in production until the proxy count is configured", () => {
    process.env.NODE_ENV = "production";
    delete process.env.TRUST_PROXY_HOPS;
    expect(networkLimitIsTrustworthy()).toBe(false);
    process.env.TRUST_PROXY_HOPS = "0";
    expect(networkLimitIsTrustworthy()).toBe(false);
    process.env.TRUST_PROXY_HOPS = "1";
    expect(networkLimitIsTrustworthy()).toBe(true);
  });
});

describe("POST /api/auth/guest", () => {
  let server: TestServer;

  beforeEach(async () => {
    guestNetworkLimiter.reset();
    server = await startTestServer(mountRouter("/api/auth", authRouter));
  });

  afterEach(async () => {
    await server.close();
    guestNetworkLimiter.reset();
  });

  const makeGuest = () => server.request("/api/auth/guest", { method: "POST" });

  it("refuses the guest past the limit with a clear answer and a Retry-After", async () => {
    process.env.GUEST_PER_NETWORK_LIMIT = "2";

    const statuses = [(await makeGuest()).status, (await makeGuest()).status];
    const refused = await makeGuest();

    expect(statuses).toEqual([201, 201]);
    expect(refused.status).toBe(429);
    expect(refused.body).toMatchObject({ error: "TOO_MANY_GUESTS_FROM_NETWORK" });
    expect((refused.body as { message: string }).message).toMatch(/sign in/i);
    expect(Number(refused.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("does not limit renewal: a guest who already exists is never turned away", async () => {
    process.env.GUEST_PER_NETWORK_LIMIT = "1";
    const first = (await makeGuest()).body as { token: string };
    expect((await makeGuest()).status).toBe(429);

    const renewed = await server.request("/api/auth/guest/renew", { method: "POST", token: first.token });

    expect(renewed.status).toBe(200);
  });

  it("creates guests freely when the limit is off", async () => {
    process.env.GUEST_PER_NETWORK_LIMIT = "0";

    for (let i = 0; i < 8; i += 1) expect((await makeGuest()).status).toBe(201);
  });

  it("does not limit in production until the proxy count is configured, so a proxy cannot lock everyone out", async () => {
    process.env.GUEST_PER_NETWORK_LIMIT = "1";
    process.env.NODE_ENV = "production";
    delete process.env.TRUST_PROXY_HOPS;

    for (let i = 0; i < 4; i += 1) expect((await makeGuest()).status).toBe(201);
  });
});
