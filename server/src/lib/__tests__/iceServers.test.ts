import { afterEach, beforeEach, describe, expect, it } from "vitest";
import crypto from "crypto";
import { buildIceConfig, makeEphemeralCredential } from "../iceServers.js";

/**
 * ICE server issuance.
 *
 * Two things are under test, and the first matters more than it looks.
 *
 *  1. The credential format is a PROTOCOL CONTRACT with coturn, not an
 *     internal detail. coturn recomputes `base64(HMAC-SHA1(secret, username))`
 *     itself and rejects anything that does not match, so a "harmless"
 *     refactor of the username layout silently breaks every relayed call
 *     while every unit test that only checked "a credential exists" passes.
 *
 *  2. `hasRelay` must never claim a relay that cannot actually relay. The
 *     client shows "couldn't reach some players" based on it, and a false
 *     positive turns a fixable misconfiguration into a mystery.
 */

const ENV_KEYS = [
  "TURN_URLS",
  "TURN_URL",
  "TURN_SECRET",
  "TURN_USERNAME",
  "TURN_PASSWORD",
  "TURN_TTL_SECONDS",
  "STUN_URLS",
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("ephemeral credentials", () => {
  it("matches what coturn will recompute", () => {
    const now = 1_700_000_000_000;
    const { username, credential } = makeEphemeralCredential("s3cret", "sock_1", 3600, now);

    // This is exactly the check coturn performs against static-auth-secret.
    const expected = crypto
      .createHmac("sha1", "s3cret")
      .update(username)
      .digest("base64");
    expect(credential).toBe(expected);
  });

  it("stamps the username with an expiry in the future", () => {
    const now = 1_700_000_000_000;
    const { username } = makeEphemeralCredential("s3cret", "sock_1", 3600, now);
    const [expiry, identity] = username.split(":");
    expect(Number(expiry)).toBe(Math.floor(now / 1000) + 3600);
    expect(identity).toBe("sock_1");
  });

  it("gives different players different credentials", () => {
    const a = makeEphemeralCredential("s3cret", "sock_a", 3600, 1_700_000_000_000);
    const b = makeEphemeralCredential("s3cret", "sock_b", 3600, 1_700_000_000_000);
    expect(a.credential).not.toBe(b.credential);
  });
});

describe("buildIceConfig", () => {
  it("serves STUN only when no relay is configured", () => {
    const config = buildIceConfig("sock_1");
    expect(config.hasRelay).toBe(false);
    expect(config.iceServers).toHaveLength(1);
    expect(JSON.stringify(config.iceServers)).toContain("stun:");
  });

  it("never leaks a credential when there is nothing to authenticate with", () => {
    // A TURN url with no secret and no password cannot allocate anything.
    // Reporting hasRelay:true here would tell the client it has a relay while
    // every allocation gets rejected — the worst of both.
    process.env.TURN_URLS = "turn:turn.example.com:3478";
    const config = buildIceConfig("sock_1");
    expect(config.hasRelay).toBe(false);
    expect(JSON.stringify(config.iceServers)).not.toContain("turn:");
  });

  it("issues ephemeral credentials when a secret is set", () => {
    process.env.TURN_URLS = "turn:turn.example.com:3478";
    process.env.TURN_SECRET = "s3cret";
    const config = buildIceConfig("sock_1");

    expect(config.hasRelay).toBe(true);
    const relay = config.iceServers.find((s) => JSON.stringify(s.urls).includes("turn:"));
    expect(relay?.username).toMatch(/^\d+:sock_1$/);
    expect(relay?.credential).toBeTruthy();
  });

  it("accepts multiple TURN urls for udp/tcp/tls fallback", () => {
    process.env.TURN_URLS =
      "turn:turn.example.com:3478?transport=udp, turn:turn.example.com:3478?transport=tcp, turns:turn.example.com:5349";
    process.env.TURN_SECRET = "s3cret";
    const relay = buildIceConfig("sock_1").iceServers.find((s) => Array.isArray(s.urls) && s.urls.length === 3);
    // TCP and TLS fallbacks are what get a player through a firewall that
    // drops UDP entirely, which is common on corporate wifi.
    expect(relay).toBeDefined();
  });

  it("falls back to static credentials for providers without HMAC", () => {
    process.env.TURN_URLS = "turn:turn.example.com:3478";
    process.env.TURN_USERNAME = "user";
    process.env.TURN_PASSWORD = "pass";
    const config = buildIceConfig("sock_1");

    expect(config.hasRelay).toBe(true);
    const relay = config.iceServers.find((s) => s.username === "user");
    expect(relay?.credential).toBe("pass");
  });

  it("prefers the secret over static credentials when both are set", () => {
    process.env.TURN_URLS = "turn:turn.example.com:3478";
    process.env.TURN_SECRET = "s3cret";
    process.env.TURN_USERNAME = "user";
    process.env.TURN_PASSWORD = "pass";
    const relay = buildIceConfig("sock_1").iceServers.find((s) => s.username !== undefined);
    // Short-lived beats shared-forever whenever there is a choice.
    expect(relay?.username).not.toBe("user");
  });

  it("honours a custom TTL", () => {
    process.env.TURN_URLS = "turn:turn.example.com:3478";
    process.env.TURN_SECRET = "s3cret";
    process.env.TURN_TTL_SECONDS = "120";
    const config = buildIceConfig("sock_1", 1_700_000_000_000);
    expect(config.ttlSeconds).toBe(120);
    const relay = config.iceServers.find((s) => s.username);
    expect(Number(relay!.username!.split(":")[0])).toBe(1_700_000_000 + 120);
  });

  it("allows overriding the STUN list", () => {
    process.env.STUN_URLS = "stun:stun.custom.net:3478";
    const config = buildIceConfig("sock_1");
    expect(JSON.stringify(config.iceServers)).toContain("stun.custom.net");
    expect(JSON.stringify(config.iceServers)).not.toContain("google");
  });
});
