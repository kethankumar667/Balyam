import crypto from "crypto";
import { GUEST_IDLE_EXPIRY_DAYS } from "@shared/guestIdentity.js";

/**
 * How many NEW guests one network may create, so a guest account cannot be remade at will.
 *
 * ── Why this and not a device marker ──────────────────────────────────
 * A guest identity costs nothing to make and carries a welcome grant, so "make another guest" is the
 * obvious way to farm coins. Anything stored in the browser is wiped by "clear site data" or a private
 * window, so the only signal that survives is the network the request comes from. That is a privacy
 * decision, and it is taken narrowly here:
 *   • the address is turned into a salted HMAC at once and the raw address is never kept;
 *   • only the hash and a few timestamps live, in memory, never in a database or a log;
 *   • entries age out after the same 7 days a guest account lives, so the limit never outlasts it;
 *   • a restart forgets everything (the limit is a brake, not a ledger).
 *
 * ── Why the limit is not 1 ────────────────────────────────────────────
 * Households, hostels, offices and mobile carriers put many real people behind one address. A limit of
 * one would turn away their friends. The default allows a handful per network per 7 days
 * (`GUEST_PER_NETWORK_LIMIT`); a farm needs far more than that to matter.
 *
 * ── It fails open ─────────────────────────────────────────────────────
 * Behind a reverse proxy the server sees the PROXY's address for everyone unless it has been told how
 * many proxies to trust, and then every visitor would share one bucket and be locked out after a few.
 * So in production the limit only runs once `TRUST_PROXY_HOPS` is set (see `networkLimitIsTrustworthy`);
 * an unknown address is never refused either.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const GUEST_NETWORK_WINDOW_MS = GUEST_IDLE_EXPIRY_DAYS * DAY_MS;
const DEFAULT_LIMIT = 5;
/** Hard bound on remembered networks, so the memory this uses cannot be grown by an attacker. */
const MAX_TRACKED_NETWORKS = 50_000;

/**
 * The configured allowance per network per window. An explicit `0` turns the limit off (the test
 * suite does, because dozens of tests make guests from one address); anything else unusable falls
 * back to the default rather than silently disabling a protection.
 */
export function guestsPerNetworkLimit(): number {
  const text = process.env.GUEST_PER_NETWORK_LIMIT?.trim();
  if (text === "0") return 0;
  const raw = Number(text);
  return Number.isInteger(raw) && raw >= 1 ? raw : DEFAULT_LIMIT;
}

/**
 * Whether the address the server sees is the visitor's, not a proxy's. Always true outside production
 * (there is no proxy); in production only when the operator has said how many proxies sit in front.
 */
export function networkLimitIsTrustworthy(): boolean {
  if ((process.env.NODE_ENV ?? "").trim().toLowerCase() !== "production") return true;
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  return Number.isInteger(hops) && hops >= 1;
}

export type NetworkVerdict = { allowed: true } | { allowed: false; retryAfterMs: number };

export interface GuestNetworkLimiterOptions {
  now?: () => number;
  limit?: () => number;
  windowMs?: number;
  maxNetworks?: number;
  /** Key for the address hash. Defaults to a per-process random value; tests pin it. */
  salt?: string;
}

export class GuestNetworkLimiter {
  private readonly now: () => number;
  private readonly limit: () => number;
  private readonly windowMs: number;
  private readonly maxNetworks: number;
  private readonly salt: string;
  /** Salted hash of the address -> when each guest was created from it. Never the address itself. */
  private readonly creations = new Map<string, number[]>();

  constructor(options: GuestNetworkLimiterOptions = {}) {
    this.now = options.now ?? Date.now;
    this.limit = options.limit ?? guestsPerNetworkLimit;
    this.windowMs = options.windowMs ?? GUEST_NETWORK_WINDOW_MS;
    this.maxNetworks = options.maxNetworks ?? MAX_TRACKED_NETWORKS;
    this.salt = options.salt ?? crypto.randomBytes(32).toString("hex");
  }

  /**
   * Count one new guest against `address`, or refuse it. An unknown address is allowed and uncounted:
   * refusing on a missing value would lock out everyone whose address could not be read.
   */
  consume(address: string | undefined | null): NetworkVerdict {
    const limit = this.limit();
    if (!address || limit <= 0) return { allowed: true };
    const key = this.hash(address);
    const now = this.now();
    const recent = (this.creations.get(key) ?? []).filter((at) => now - at < this.windowMs);

    if (recent.length >= limit) {
      this.creations.set(key, recent);
      return { allowed: false, retryAfterMs: Math.max(0, recent[0] + this.windowMs - now) };
    }

    recent.push(now);
    // Re-insert so the Map's order is "least recently used first", which is what eviction trims.
    this.creations.delete(key);
    this.creations.set(key, recent);
    this.evictIfFull();
    return { allowed: true };
  }

  /** How many networks are currently remembered. For tests and health reporting only. */
  size(): number {
    return this.creations.size;
  }

  /** Forget every network. For tests; a production restart does the same. */
  reset(): void {
    this.creations.clear();
  }

  private hash(address: string): string {
    return crypto.createHmac("sha256", this.salt).update(address).digest("hex").slice(0, 32);
  }

  private evictIfFull(): void {
    while (this.creations.size > this.maxNetworks) {
      const oldest = this.creations.keys().next();
      if (oldest.done) return;
      this.creations.delete(oldest.value);
    }
  }
}

/** The one limiter the server uses. */
export const guestNetworkLimiter = new GuestNetworkLimiter();
