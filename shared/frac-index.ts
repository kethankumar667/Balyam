/**
 * Tiny dependency-free fractional indexing.
 *
 * A fractional index is a string key you can always wedge a NEW key between
 * two existing ones (or before the first / after the last) without renumbering
 * anything — the activity feed uses it so historical inserts, replay, and a
 * future spectator catch-up keep one stable lexicographic order.
 *
 * Keys are base-62 digit strings interpreted as the fraction 0.d1d2d3…, so a
 * plain `a < b` string compare already gives chronological order. The midpoint
 * algorithm is the well-known one (David Greenspan / rocicorp `fractional-
 * indexing`), pared down to the (0,1) range we need. Optional jitter appends
 * random low digits on append so two clients generating "after the same key"
 * very rarely collide.
 */

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = DIGITS.length;

/**
 * Strictly-between key for two base-62 fraction strings where `a < b`
 * lexicographically and `b === ""` means 1.0 (no upper bound). Never returns a
 * key ending in "0" (which would break a later midpoint).
 */
function midpoint(a: string, b: string): string {
  if (b !== "" && a >= b) throw new Error(`frac-index: ${a} >= ${b}`);
  if (a.endsWith("0") || (b !== "" && b.endsWith("0"))) {
    throw new Error("frac-index: trailing zero");
  }
  if (b !== "") {
    let n = 0;
    while ((a[n] ?? "0") === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const digitA = a === "" ? 0 : DIGITS.indexOf(a[0]);
  const digitB = b === "" ? BASE : DIGITS.indexOf(b[0]);
  if (digitB - digitA > 1) {
    return DIGITS[Math.round(0.5 * (digitA + digitB))];
  }
  if (b.length > 1) return b.slice(0, 1);
  return DIGITS[digitA] + midpoint(a.slice(1), "");
}

/**
 * Return a key ordered strictly between `a` and `b`. Pass `null` for either
 * bound to mean "before the first" / "after the last". With `jitter`, an append
 * (`b == null`) gets a short random suffix to avoid concurrent-append clashes.
 */
export function keyBetween(a: string | null, b: string | null, jitter = false): string {
  if (a !== null && b !== null && a >= b) throw new Error(`frac-index: ${a} >= ${b}`);
  let key: string;
  if (a === null && b === null) key = DIGITS[Math.floor(BASE / 2)];
  else if (a === null) key = midpoint("", b as string);
  else if (b === null) key = midpoint(a, "");
  else key = midpoint(a, b);

  if (jitter && b === null) {
    let suffix = "";
    const extra = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < extra; i++) {
      // 1..BASE-1 keeps the last digit non-zero (valid midpoint input later).
      suffix += DIGITS[1 + Math.floor(Math.random() * (BASE - 1))];
    }
    key += suffix;
  }
  return key;
}
