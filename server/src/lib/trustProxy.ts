/**
 * How many reverse proxies sit in front of this server, from `TRUST_PROXY_HOPS` (Render: 1).
 *
 * Express and the per-IP limiters need a positive whole number. Anything else used to be dropped without a word,
 * which looks exactly like "working": every visitor then appears to come from the proxy, the per-IP limits share
 * one bucket, and the per-network limit on new guests switches itself off. A deploy once had `true`. So a value
 * that is set but unusable is reported, not ignored.
 *
 * Unset, empty and `0` all mean "no proxy" and are fine: that is what local development looks like.
 */

export interface TrustProxyReading {
  /** The number of proxies to trust, or null for none. */
  hops: number | null;
  /** What to log when the value is set but unusable; null when there is nothing to say. */
  warning: string | null;
}

export function readTrustProxyHops(raw: string | undefined): TrustProxyReading {
  const text = (raw ?? "").trim();
  if (text === "") return { hops: null, warning: null };

  if (/^\d+$/.test(text)) {
    const hops = Number(text);
    return { hops: hops >= 1 ? hops : null, warning: null };
  }

  return {
    hops: null,
    warning:
      `TRUST_PROXY_HOPS is "${text}", which is not a positive whole number, so NO proxy is trusted: every visitor ` +
      "will look like the proxy, the per-IP rate limits will share one bucket, and the per-network limit on new " +
      "guests will stay off. Set it to the number of proxies in front of this server (Render: 1).",
  };
}
