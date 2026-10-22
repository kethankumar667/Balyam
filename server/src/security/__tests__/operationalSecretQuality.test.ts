import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { assertOperationalAuthConfigured, operationalConfigProblems } from "../operationalAuth.js";

/**
 * A secret can be present and long enough and still be one the whole internet knows: the value in
 * `.env.example`, or one committed to this repository's own scripts. "Long enough" (16 characters) cannot tell
 * those from a random key, so production now also refuses anything that reads as a published placeholder.
 */

const ENV_KEYS = ["NODE_ENV", "OPERATIONAL_SECRET", "ADMIN_API_KEY", "ADMIN_USER_IDS", "SUPABASE_JWT_SECRET"];
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

const randomSecret = () => crypto.randomBytes(24).toString("hex");

describe("OPERATIONAL_SECRET that is a published placeholder", () => {
  it.each([
    ["the value shipped in server/.env.example", "replace-with-a-freshly-generated-random-secret"],
    ["the key committed in the pre-deployment script", "bhalyam_admin_secret_key_2026"],
    ["the client's local-development sample", "local-dev-only-not-a-real-secret"],
    ["a change-me style value, however long", "please-change-me-before-you-go-live-ok"],
  ])("is a fatal problem in production: %s", (_label, secret) => {
    process.env.NODE_ENV = "production";
    process.env.OPERATIONAL_SECRET = secret;

    const problems = operationalConfigProblems();

    expect(problems.some((p) => p.fatal && /placeholder|published/i.test(p.message))).toBe(true);
    expect(() => assertOperationalAuthConfigured()).toThrow(/Refusing to start in production/);
  });

  it("matches the known leaked values whatever their letter case", () => {
    process.env.NODE_ENV = "production";
    process.env.OPERATIONAL_SECRET = "BHALYAM_ADMIN_SECRET_KEY_2026";

    expect(operationalConfigProblems().some((p) => p.fatal)).toBe(true);
  });

  it("is only a warning outside production, so local development keeps working", () => {
    process.env.NODE_ENV = "development";
    process.env.OPERATIONAL_SECRET = "replace-with-a-freshly-generated-random-secret";

    const problems = operationalConfigProblems();

    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => !p.fatal)).toBe(true);
    expect(() => assertOperationalAuthConfigured()).not.toThrow();
  });

  it("never repeats the secret itself in the message", () => {
    process.env.NODE_ENV = "production";
    process.env.OPERATIONAL_SECRET = "bhalyam_admin_secret_key_2026";

    for (const problem of operationalConfigProblems()) {
      expect(problem.message).not.toContain("bhalyam_admin_secret_key_2026");
    }
  });
});

describe("OPERATIONAL_SECRET that is a real random key", () => {
  it("raises no problem in production", () => {
    process.env.NODE_ENV = "production";
    process.env.OPERATIONAL_SECRET = randomSecret();

    expect(operationalConfigProblems()).toEqual([]);
    expect(() => assertOperationalAuthConfigured()).not.toThrow();
  });
});
