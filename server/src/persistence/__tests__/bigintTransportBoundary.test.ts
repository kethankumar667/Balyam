import { describe, it, expect } from "vitest";

/**
 * Phase 4, Step 7 — the bigint transport decision gate.
 *
 * Every numeric column in Economy V1 is `bigint` (see the inventory in
 * `docs/economy/economy-v1-phase4-contract-verification-report.md` §9).
 * PostgREST generates its JSON responses server-side via Postgres's own
 * `to_jsonb`/`row_to_json`, which emits `bigint` as a bare JSON NUMBER —
 * always, regardless of magnitude (Phase 3's finding). `PostgrestClient`
 * (`server/src/persistence/postgrest.ts`) parses every response body with
 * the standard `JSON.parse`, which produces an IEEE-754 double for every
 * numeric literal.
 *
 * This file proves — empirically, deterministically, with no network and no
 * dependency beyond the JS runtime itself — exactly where that combination
 * stops preserving exact digits. This is NOT a property that a live
 * PostgREST server could disprove: `JSON.parse`'s behavior is fixed by the
 * ECMAScript specification and is identical regardless of what produced the
 * JSON text. A real server changes nothing about this file's conclusion; it
 * would only change whether the INPUT digit strings this file constructs by
 * hand are realistic ones a real Postgres `bigint` could actually emit —
 * and Postgres's real `bigint` range (-9223372036854775808 to
 * 9223372036854775807) is used directly below, not invented.
 */

describe("bigint transport boundary — JSON.parse precision loss", () => {
  /** Exactly what `SupabaseEconomyRepository`'s own `PostgrestClient` does to every response body. */
  function roundTripThroughRealTransport(digits: string): { parsedAsNumber: number; roundTripped: string; exact: boolean } {
    const parsed = JSON.parse(digits) as number;
    const roundTripped = String(parsed);
    return { parsedAsNumber: parsed, roundTripped, exact: roundTripped === digits };
  }

  it("Number.MAX_SAFE_INTEGER (9007199254740991) round-trips exactly — the safe boundary", () => {
    const digits = Number.MAX_SAFE_INTEGER.toString();
    const result = roundTripThroughRealTransport(digits);
    expect(result.exact).toBe(true);
  });

  it("Number.MAX_SAFE_INTEGER + 1 (9007199254740992, = 2^53) ALSO round-trips exactly — a coincidence of being a power of 2, not proof of general safety beyond MAX_SAFE_INTEGER", () => {
    const digits = (Number.MAX_SAFE_INTEGER + 1).toString();
    const result = roundTripThroughRealTransport(digits);
    expect(digits).toBe("9007199254740992");
    expect(result.exact).toBe(true); // true here specifically — do not generalize from this single case
  });

  it("Number.MAX_SAFE_INTEGER + 2 (9007199254740993) LOSES precision — the actual first failure point, one past the coincidental case above", () => {
    const digits = "9007199254740993";
    const result = roundTripThroughRealTransport(digits);
    expect(result.exact).toBe(false);
    expect(result.roundTripped).toBe("9007199254740992"); // rounds DOWN to the nearest representable even integer
  });

  it("a realistic large economy value (18 digits, well within a plausible lifetime-counter range) loses precision", () => {
    const digits = "123456789012345678";
    const result = roundTripThroughRealTransport(digits);
    expect(result.exact).toBe(false);
    expect(result.roundTripped).toBe("123456789012345680");
  });

  it("Postgres bigint's actual maximum value (2^63 - 1 = 9223372036854775807) loses precision catastrophically", () => {
    const digits = "9223372036854775807";
    const result = roundTripThroughRealTransport(digits);
    expect(result.exact).toBe(false);
    // Off by 193 — not a rounding-to-nearest-representable-value nicety,
    // a genuinely different number than what Postgres actually stored.
    expect(result.roundTripped).toBe("9223372036854776000");
    expect(BigInt(result.roundTripped) - BigInt(digits)).toBe(193n);
  });

  it("this precision loss happens at JSON.parse time — before any repository code runs, and is therefore unrecoverable at the repository layer by construction", () => {
    // `bigStr()` in SupabaseEconomyRepository.ts receives the ALREADY-PARSED
    // JS number, not the original JSON text. Demonstrating this directly:
    const alreadyLostBeforeRepositoryCode = JSON.parse("9223372036854775807") as number;
    const bigStrEquivalent = String(alreadyLostBeforeRepositoryCode);
    expect(bigStrEquivalent).not.toBe("9223372036854775807");
    // No string conversion, however careful, can recover a digit sequence
    // that was never preserved past the JSON.parse call that already ran.
  });
});
