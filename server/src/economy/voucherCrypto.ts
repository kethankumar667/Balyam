import crypto from "crypto";

/**
 * Bearer voucher code generation and hashing.
 *
 * `docs/economy/economy-v1.md` §3.1 requires a "future server-side
 * generator" that the migration itself explicitly declines to be — this is
 * that generator, and `EconomyService` is its only caller. Nothing in
 * `EconomyRepository`/`InMemoryEconomyRepository`/`SupabaseEconomyRepository`
 * generates a code; they only ever store and compare a hash one of these
 * functions produced.
 *
 * ── Why keyed HMAC, not a bare hash ─────────────────────────────────────
 * A bare SHA-256 of the raw code would let anyone who ever saw a leaked
 * `code_hash` column brute-force the 192-bit code space offline, since
 * `code_hash` alone would be enough to verify a guess. Keying it with a
 * server-held secret (mirroring `auth/guestToken.ts`'s exact convention)
 * means a leaked hash column is useless without the key.
 *
 * ── The ephemeral-key durability tradeoff, made explicit ────────────────
 * Exactly like `auth/guestToken.ts`'s `SESSION_SECRET`: without
 * `VOUCHER_HMAC_SECRET` set, this process signs with a random key generated
 * once at startup. A restart between issuance and redemption means the raw
 * code a guest is holding hashes to a DIFFERENT value than the one stored at
 * issuance — the voucher becomes unfindable, not corrupted (the underlying
 * `reward_vouchers` row and its escrow liability are untouched; only the
 * lookup-by-hash breaks). `voucherHmacDurability()` reports this so a boot
 * warning can be wired up wherever the equivalent guest-token warning is.
 */

const RAW_CODE_BYTES = 24; // 192 bits — far beyond any realistic brute-force budget

/** Generated once per process, exactly like guestToken.ts's ephemeralSecret. */
const ephemeralSecret = crypto.randomBytes(32).toString("hex");

function signingKey(): string {
  return process.env.VOUCHER_HMAC_SECRET?.trim() || ephemeralSecret;
}

/** True when a voucher hashed now will still be findable by its raw code after a restart. */
export function voucherHmacDurability(): { durable: boolean; reason: string } {
  return process.env.VOUCHER_HMAC_SECRET?.trim()
    ? { durable: true, reason: "VOUCHER_HMAC_SECRET is set" }
    : {
        durable: false,
        reason:
          "VOUCHER_HMAC_SECRET is not set, so voucher codes are hashed with a per-process key. " +
          "A restart between issuance and redemption makes an already-issued, unredeemed " +
          "voucher's raw code hash to a different value than the one stored at issuance.",
      };
}

/**
 * A fresh, cryptographically random raw bearer code.
 *
 * Never logged, never persisted in this form by anything in this codebase —
 * `EconomyService` holds it in memory only for the duration of the call that
 * generates it, to hand back exactly once (economy-v1.md §3.1).
 */
export function generateRawVoucherCode(): string {
  return crypto.randomBytes(RAW_CODE_BYTES).toString("base64url");
}

/**
 * The ONLY form of a voucher code anything downstream of this function ever
 * sees: a 64-lowercase-hex keyed HMAC-SHA256, matching
 * `EconomyRepository.ts`'s `codeHash` shape exactly (`^[0-9a-f]{64}$}`).
 */
export function hashVoucherCode(rawCode: string): string {
  return crypto.createHmac("sha256", signingKey()).update(rawCode).digest("hex");
}
