import { describe, it, expect } from "vitest";
import { readTrustProxyHops } from "../trustProxy.js";

/**
 * `TRUST_PROXY_HOPS` is how many reverse proxies sit in front of the server (Render: 1). Express needs a whole
 * number; anything else used to be dropped without a word, leaving every visitor looking like the proxy and the
 * per-IP limits sharing one bucket. A deploy once had it set to `true`. Reading it now says what is wrong.
 */

describe("readTrustProxyHops", () => {
  it("treats unset or empty as 'no proxy', which is right for local development, without complaint", () => {
    expect(readTrustProxyHops(undefined)).toEqual({ hops: null, warning: null });
    expect(readTrustProxyHops("")).toEqual({ hops: null, warning: null });
    expect(readTrustProxyHops("   ")).toEqual({ hops: null, warning: null });
  });

  it("accepts a positive whole number, ignoring surrounding spaces", () => {
    expect(readTrustProxyHops("1")).toEqual({ hops: 1, warning: null });
    expect(readTrustProxyHops(" 2 ")).toEqual({ hops: 2, warning: null });
  });

  it("treats an explicit 0 as 'no proxy' without complaint", () => {
    expect(readTrustProxyHops("0")).toEqual({ hops: null, warning: null });
  });

  it.each(["true", "false", "yes", "one", "1.5", "-1", "1 hop", "NaN", "1e3x"])(
    "warns about %s, and does not trust any proxy",
    (raw) => {
      const result = readTrustProxyHops(raw);

      expect(result.hops).toBeNull();
      expect(result.warning).toMatch(/TRUST_PROXY_HOPS/);
      expect(result.warning).toMatch(/positive whole number/);
    },
  );

  it("quotes what it was given, so the log says exactly what to fix", () => {
    expect(readTrustProxyHops("true").warning).toContain('"true"');
  });
});
