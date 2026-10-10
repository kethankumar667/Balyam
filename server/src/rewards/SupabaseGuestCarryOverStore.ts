import { PostgrestClient, type PostgrestConfig } from "../persistence/postgrest.js";
import {
  CarryOverStoreError,
  type CarryOverStoreErrorCode,
  type ClaimOutcome,
  type GuestCarryOverStore,
  type GuestClaimRecord,
} from "./GuestCarryOverStore.js";

/**
 * The carry-over store in Supabase Postgres. Every guarantee is in
 * `20261025000000_guest_carryover.sql`: the function refuses an unconfirmed mailbox, and
 * the primary key on `guest_id` and the unique `member_id` make "one guest per account,
 * one account per guest" a fact the database holds under any concurrency.
 */

const MIGRATION = "20261025000000_guest_carryover.sql";

/** Postgres raises `CODE: text`; PostgREST wraps that in JSON, so look for the code anywhere in the message. */
const REFUSALS: readonly CarryOverStoreErrorCode[] = [
  "EMAIL_NOT_CONFIRMED",
  "MEMBER_NOT_FOUND",
  "GUEST_ALREADY_CLAIMED",
  "MEMBER_ALREADY_CLAIMED",
  "GUEST_WALLET_NOT_FOUND",
  "NOT_A_GUEST",
  "WALLET_FROZEN",
];

const isMissingObject = (message: string): boolean => /PGRST20[25]|Could not find the (table|function)/.test(message);

interface ClaimRow {
  guest_id: string;
  member_id: string;
  amount: number | string;
  claimed_at: string;
}

export class SupabaseGuestCarryOverStore implements GuestCarryOverStore {
  readonly kind = "supabase" as const;
  private readonly db: PostgrestClient;

  constructor(config: PostgrestConfig) {
    this.db = new PostgrestClient(config);
  }

  /** A deploy that went out before its migration stops at boot, naming the file to run. */
  async ping(): Promise<void> {
    try {
      await this.db.select("guest_wallet_claims", "select=guest_id&limit=1");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isMissingObject(message)) {
        throw new CarryOverStoreError("SCHEMA_MISSING", `table guest_wallet_claims is missing (${MIGRATION})`);
      }
      throw err;
    }
  }

  async claim(guestId: string, memberId: string): Promise<ClaimOutcome> {
    try {
      const out = await this.db.rpc<{ status: "CLAIMED" | "REPLAY"; amount: string }>("claim_guest_wallet", {
        p_guest_id: guestId,
        p_member_id: memberId,
      });
      return { status: out.status, amount: Number(out.amount) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = REFUSALS.find((c) => message.includes(c));
      if (code) throw new CarryOverStoreError(code, message);
      if (isMissingObject(message)) throw new CarryOverStoreError("SCHEMA_MISSING", `claim_guest_wallet is missing (${MIGRATION})`);
      throw err;
    }
  }

  async findByMember(memberId: string): Promise<GuestClaimRecord | null> {
    const rows = await this.db.select<ClaimRow>(
      "guest_wallet_claims",
      `select=guest_id,member_id,amount,claimed_at&member_id=eq.${encodeURIComponent(memberId)}&limit=1`,
    );
    const row = rows[0];
    if (!row) return null;
    return { guestId: row.guest_id, memberId: row.member_id, amount: Number(row.amount), claimedAt: Date.parse(row.claimed_at) };
  }
}
