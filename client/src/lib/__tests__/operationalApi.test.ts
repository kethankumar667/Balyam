import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readOperationalKey,
  storeOperationalKey,
  clearOperationalKey,
} from "../operationalApi";

/**
 * ADMIN-SEC-001 regression coverage.
 *
 * The finding: `readOperationalKey()` used to read
 * `import.meta.env.VITE_OPERATIONAL_KEY` unconditionally. Any `VITE_`-
 * prefixed variable is inlined into the public production bundle, so an
 * unconditional read meant a production `.env` that copied the client and
 * server example files' matching credential shipped the shared operational
 * key to every visitor's browser — defeating `requireOperationalAuth`
 * entirely.
 *
 * These tests cover the fast, source-level half of the fix: the
 * `import.meta.env.DEV` gate's logic, in isolation. The slow, authoritative
 * half — that the value is actually absent from a real production bundle —
 * is proven separately against real `vite build` output by
 * `scripts/verify-no-secret-leak.mjs` (`npm run verify:no-secret-leak`),
 * not bundled into this fast unit suite for the same reason
 * `check:mobile-layout` / `check:a11y-rendered` are their own commands:
 * a real build takes real wall-clock time and shouldn't tax every
 * `npm test` run.
 */

const OPS_KEY_STORAGE = "bhalyam.ops.key";
const SENTINEL_ENV_KEY = "sentinel-from-vite-env-do-not-ship";

describe("operationalApi — readOperationalKey DEV gating (ADMIN-SEC-001)", () => {
  const store = new Map<string, string>();
  let originalDev: unknown;
  let originalOpsEnvKey: unknown;

  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  const consoleSpies = [logSpy, warnSpy, errorSpy, infoSpy, debugSpy];

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    });

    // Direct mutation rather than vi.stubEnv: import.meta.env.DEV is a real
    // boolean under Vitest, and this test needs precise boolean control
    // (a stringly-typed "false" is truthy in JS, which would silently
    // invert the negative-path assertions below).
    originalDev = (import.meta.env as Record<string, unknown>).DEV;
    originalOpsEnvKey = (import.meta.env as Record<string, unknown>)
      .VITE_OPERATIONAL_KEY;

    for (const spy of consoleSpies) spy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    (import.meta.env as Record<string, unknown>).DEV = originalDev;
    (import.meta.env as Record<string, unknown>).VITE_OPERATIONAL_KEY =
      originalOpsEnvKey;
  });

  it("reads VITE_OPERATIONAL_KEY when DEV is true and no session key is stored", () => {
    (import.meta.env as Record<string, unknown>).DEV = true;
    (import.meta.env as Record<string, unknown>).VITE_OPERATIONAL_KEY =
      SENTINEL_ENV_KEY;

    expect(readOperationalKey()).toBe(SENTINEL_ENV_KEY);
  });

  it("never reads VITE_OPERATIONAL_KEY when DEV is false — the ADMIN-SEC-001 fix", () => {
    (import.meta.env as Record<string, unknown>).DEV = false;
    (import.meta.env as Record<string, unknown>).VITE_OPERATIONAL_KEY =
      SENTINEL_ENV_KEY;

    expect(readOperationalKey()).toBeNull();
  });

  it("returns null when DEV is true but no VITE_OPERATIONAL_KEY is configured", () => {
    (import.meta.env as Record<string, unknown>).DEV = true;
    (import.meta.env as Record<string, unknown>).VITE_OPERATIONAL_KEY = "";

    expect(readOperationalKey()).toBeNull();
  });

  it("prefers a stored session key over VITE_OPERATIONAL_KEY, in both DEV and non-DEV", () => {
    store.set(OPS_KEY_STORAGE, "session-key-from-operator");

    (import.meta.env as Record<string, unknown>).DEV = true;
    (import.meta.env as Record<string, unknown>).VITE_OPERATIONAL_KEY =
      SENTINEL_ENV_KEY;
    expect(readOperationalKey()).toBe("session-key-from-operator");

    (import.meta.env as Record<string, unknown>).DEV = false;
    expect(readOperationalKey()).toBe("session-key-from-operator");
  });

  it("storeOperationalKey / clearOperationalKey round-trip through sessionStorage regardless of DEV", () => {
    (import.meta.env as Record<string, unknown>).DEV = false;

    storeOperationalKey("operator-pasted-key");
    expect(readOperationalKey()).toBe("operator-pasted-key");

    clearOperationalKey();
    expect(readOperationalKey()).toBeNull();
  });

  it("storeOperationalKey clears the stored key when given an empty/whitespace value", () => {
    // Neutralize the ambient DEV-fallback so this test's assertion is about
    // sessionStorage behaviour specifically, not about whatever
    // VITE_OPERATIONAL_KEY happens to be set to in the machine running it.
    (import.meta.env as Record<string, unknown>).DEV = false;

    storeOperationalKey("something");
    expect(readOperationalKey()).toBe("something");

    storeOperationalKey("   ");
    expect(readOperationalKey()).toBeNull();
  });

  it("never logs the operational key to the console via any credential-handling call", () => {
    (import.meta.env as Record<string, unknown>).DEV = true;
    (import.meta.env as Record<string, unknown>).VITE_OPERATIONAL_KEY =
      SENTINEL_ENV_KEY;

    readOperationalKey();
    storeOperationalKey("operator-pasted-key");
    readOperationalKey();
    clearOperationalKey();

    for (const spy of consoleSpies) {
      for (const call of spy.mock.calls) {
        const serialized = call.map((arg) => String(arg)).join(" ");
        expect(serialized).not.toContain(SENTINEL_ENV_KEY);
        expect(serialized).not.toContain("operator-pasted-key");
      }
    }
  });
});
