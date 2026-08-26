import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Fast, database-free structural guards over the Economy V1 migration
 * source. These run as part of the normal `npm test` suite (no embedded
 * Postgres, no network) and exist to catch a REGRESSION of something the
 * independent NO-GO audit already found once — not to prove the migration
 * correct on their own. Correctness under a real Postgres, real privilege
 * state, and real concurrency is scripts/economy/verifyEconomySchema.mjs's
 * job; this file cannot substitute for it.
 *
 * Every `it()` below is traceable to a specific audit finding or remediation
 * phase, named in its own description, so a future change that breaks one of
 * these fails with an explanation of WHICH promise it broke, not just that a
 * string stopped matching.
 */
describe("Economy V1 Database Migration Static Structure", () => {
  const rootDir = path.resolve(__dirname, "../../../..");
  const migrationPath = path.join(rootDir, "supabase/migrations/20260826000000_economy_v1.sql");
  const rollbackPath = path.join(rootDir, "supabase/rollbacks/20260826000000_economy_v1_rollback.sql");
  const docPath = path.join(rootDir, "docs/economy/economy-v1.md");
  const verifyScriptPath = path.join(rootDir, "scripts/economy/verifyEconomySchema.mjs");

  const sql = fs.readFileSync(migrationPath, "utf8");
  const rollbackSql = fs.readFileSync(rollbackPath, "utf8");

  it("ensures all four Economy V1 artifacts exist on disk", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.existsSync(rollbackPath)).toBe(true);
    expect(fs.existsSync(docPath)).toBe(true);
    expect(fs.existsSync(verifyScriptPath)).toBe(true);
  });

  it("verifies forward migration defines all 9 required Economy V1 tables", () => {
    const requiredTables = [
      "economy_configurations", "economy_prize_schedules", "world_bank_accounts", "world_bank_ledger",
      "coin_wallets", "coin_ledger_entries", "reward_vouchers", "match_economy_settlements", "match_economy_participants",
    ];
    for (const table of requiredTables) {
      expect(sql).toContain(`public.${table}`);
    }
  });

  it("verifies all 9 atomic RPC functions are defined with SECURITY DEFINER and service_role grants", () => {
    // list_stale_committed_settlements added for Phase 9 (crash-recovery
    // reporting) — the previous version of this test only knew about 8.
    const requiredFunctions = [
      "ensure_wallet", "grant_starter_coins", "commit_match_entry", "settle_match_economy",
      "refund_match_entry", "issue_guest_voucher", "redeem_reward_voucher",
      "reconcile_match_settlement", "list_stale_committed_settlements",
    ];
    for (const fn of requiredFunctions) {
      expect(sql).toContain(`function public.${fn}`);
      expect(sql).toContain(`revoke all on function public.${fn}`);
      expect(sql).toContain(`grant execute on function public.${fn}`);
    }
  });

  it("verifies RLS is enabled and forced on all tables", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("force row level security");
  });

  it("verifies rollback drops functions before tables to prevent dependency aborts", () => {
    const dropFunctionsIndex = rollbackSql.indexOf("Drop RPC Functions");
    const dropTablesIndex = rollbackSql.indexOf("Drop Tables");
    expect(dropFunctionsIndex).toBeGreaterThan(-1);
    expect(dropTablesIndex).toBeGreaterThan(-1);
    expect(dropFunctionsIndex).toBeLessThan(dropTablesIndex);
  });

  // ── Remediation-specific guards (audit findings B1 through M6) ──────────

  it("[B1/B2] explicitly revokes INSERT/UPDATE/DELETE from service_role on every economy table, not only anon/authenticated", () => {
    // The literal failure mode this guards: a migration that revokes from
    // anon/authenticated but forgets service_role LOOKS complete (RLS is
    // enabled, policies exist) while still leaving the exact privilege gap
    // the audit found. This asserts the specific role name appears in the
    // same revoke statement as the mutation verbs, not merely somewhere in
    // the file.
    expect(sql).toMatch(/revoke insert, update, delete[^;]*from public, anon, authenticated, service_role/);
  });

  it("[B1] does not rely on a blanket 'grant all to service_role' anywhere in the migration", () => {
    expect(sql).not.toMatch(/grant all on (all tables|table public\.\w+) to service_role/i);
  });

  it("[B3] player_identities -> coin_wallets and coin_wallets -> coin_ledger_entries are both ON DELETE RESTRICT, never CASCADE", () => {
    const walletFk = sql.match(/identity_id\s+text primary key references public\.player_identities \(player_id\) on delete (\w+)/);
    expect(walletFk?.[1]).toBe("restrict");
    const ledgerFk = sql.match(/wallet_id\s+text not null references public\.coin_wallets \(identity_id\) on delete (\w+)/);
    expect(ledgerFk?.[1]).toBe("restrict");
  });

  it("[B4] world_bank_accounts has four independent balance columns, not one merged 'balance'", () => {
    expect(sql).toContain("base_fee_revenue");
    expect(sql).toContain("bot_prize_revenue");
    expect(sql).toContain("guest_escrow_liability");
    expect(sql).toContain("total_voucher_redeemed");
    // The specific column name the audited draft used for its single merged
    // balance must not reappear on this table.
    const worldBankTableBlock = sql.slice(sql.indexOf("create table if not exists public.world_bank_accounts"), sql.indexOf("═══════════════════════ 4."));
    expect(worldBankTableBlock).not.toMatch(/^\s*balance\s+bigint/m);
  });

  it("[B5] no admin balance-adjustment or wallet-freeze mutation function exists", () => {
    expect(sql).not.toMatch(/create (or replace )?function public\.\w*adjust\w*/i);
    expect(sql).not.toMatch(/create (or replace )?function public\.\w*freeze\w*/i);
  });

  it("[Phase 2] coin_ledger_entries.entry_type no longer includes GUEST_PRIZE_ESCROW — a guest's wallet never changes when they win", () => {
    const ledgerTableBlock = sql.slice(
      sql.indexOf("create table if not exists public.coin_ledger_entries"),
      sql.indexOf("comment on table public.coin_ledger_entries"),
    );
    expect(ledgerTableBlock).not.toContain("GUEST_PRIZE_ESCROW");
  });

  it("[Phase 2] coin_ledger_entries enforces balance_after = balance_before + amount and a version-transition invariant declaratively", () => {
    expect(sql).toContain("balance_before");
    expect(sql).toContain("wallet_version_before");
    expect(sql).toContain("wallet_version_after");
    expect(sql).toMatch(/check\s*\(\s*balance_after\s*=\s*balance_before\s*\+\s*amount\s*\)/);
    expect(sql).toMatch(/check\s*\(\s*wallet_version_after\s*=\s*wallet_version_before\s*\+\s*1\s*\)/);
  });

  it("[Phase 5] frozen-wallet policy is enforced in commit_match_entry and redeem_reward_voucher, not merely documented", () => {
    const commitFn = sql.slice(sql.indexOf("create or replace function public.commit_match_entry"), sql.indexOf("create or replace function public.settle_match_economy"));
    expect(commitFn).toMatch(/is_frozen/);
    expect(commitFn).toContain("WALLET_FROZEN");

    const redeemFn = sql.slice(sql.indexOf("create or replace function public.redeem_reward_voucher"), sql.indexOf("create or replace function public.reconcile_match_settlement"));
    expect(redeemFn).toMatch(/is_frozen/);
    expect(redeemFn).toContain("WALLET_FROZEN");
  });

  it("[Phase 5] settle_match_economy and refund_match_entry credit paths do NOT block on is_frozen — a frozen wallet may still receive rewards and refunds", () => {
    const settleFn = sql.slice(sql.indexOf("create or replace function public.settle_match_economy"), sql.indexOf("revoke all on function public.settle_match_economy"));
    expect(settleFn).not.toContain("WALLET_FROZEN");
    const refundHelper = sql.slice(sql.indexOf("create or replace function public.economy_apply_refund"), sql.indexOf("revoke all on function public.economy_apply_refund"));
    expect(refundHelper).not.toContain("WALLET_FROZEN");
  });

  it("[Phase 6] every top-level mutating RPC returns the standardized {applied, operation, idempotencyKey, result} shape", () => {
    const mutatingFunctions = ["grant_starter_coins", "commit_match_entry", "settle_match_economy", "refund_match_entry", "issue_guest_voucher", "redeem_reward_voucher"];
    for (const fn of mutatingFunctions) {
      const start = sql.indexOf(`create or replace function public.${fn}`);
      expect(start, `function ${fn} not found`).toBeGreaterThan(-1);
      const end = sql.indexOf(`revoke all on function public.${fn}`, start);
      const body = sql.slice(start, end);
      expect(body, `${fn} missing 'applied' in its jsonb contract`).toMatch(/'applied'/);
      expect(body, `${fn} missing 'operation' in its jsonb contract`).toMatch(/'operation'/);
      expect(body, `${fn} missing 'idempotencyKey' in its jsonb contract`).toMatch(/'idempotencyKey'/);
      expect(body, `${fn} missing 'result' in its jsonb contract`).toMatch(/'result'/);
    }
  });

  it("[Phase 7] issue_guest_voucher never uses 'on conflict ... do update' on code_hash — a collision must fail, never silently overwrite", () => {
    const issueFn = sql.slice(sql.indexOf("create or replace function public.issue_guest_voucher"), sql.indexOf("revoke all on function public.issue_guest_voucher"));
    expect(issueFn).not.toMatch(/on conflict\s*\(\s*code_hash\s*\)\s*do update/i);
  });

  it("[Phase 7] code_hash is constrained to exactly 64 hex characters (a SHA-256/HMAC-SHA256 digest shape), not merely a minimum length", () => {
    expect(sql).toMatch(/code_hash\s+text not null unique check \(code_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/);
  });

  it("[Phase 7] this migration never generates a raw voucher code — voucher IDs use core Postgres gen_random_uuid(), not a random-byte call feeding a stored plaintext code", () => {
    // The word "gen_random_bytes" appears once, in a comment explaining why
    // it was deliberately NOT used (avoids an assumption about which schema
    // pgcrypto lives in on the real project) — this checks for an actual
    // INVOCATION, not the word appearing anywhere in prose.
    expect(sql).not.toMatch(/[a-z_]*encode\(\s*gen_random_bytes/i);
    expect(sql).toMatch(/gen_random_uuid\(\)/);
    expect(sql).not.toMatch(/raw_code|plaintext_code/i);
  });

  it("[Phase 8] advisory locks use hashtextextended (64-bit), never bare hashtext (32-bit)", () => {
    expect(sql).not.toMatch(/pg_advisory_xact_lock\(hashtext\(/);
    expect(sql).toMatch(/pg_advisory_xact_lock\(hashtextextended\(/);
  });

  it("[Phase 9] a read-only stale-settlement lister exists, and nothing in the migration calls it automatically", () => {
    expect(sql).toContain("list_stale_committed_settlements");
    const fnBlock = sql.slice(sql.indexOf("create or replace function public.list_stale_committed_settlements"), sql.indexOf("revoke all on function public.list_stale_committed_settlements"));
    expect(fnBlock).toMatch(/language sql/);
    expect(fnBlock).toMatch(/stable/);
    // A read-only reporting function must not itself write anywhere.
    expect(fnBlock).not.toMatch(/\b(insert into|update |delete from)\b/i);
  });

  it("[Phase 10] this migration does not define quote_match_checkout — it is documented as application-level, not a database RPC", () => {
    expect(sql).not.toMatch(/function public\.quote_match_checkout/);
  });

  it("[Phase 12] lifetime_spent is never decremented anywhere in the migration — refunds credit a separate lifetime_refunded column", () => {
    expect(sql).not.toMatch(/lifetime_spent\s*=\s*(greatest\(0,\s*)?lifetime_spent\s*-/);
    expect(sql).toContain("lifetime_refunded");
  });

  it("[Phase 12] settle_match_economy tags a solo (1-seat) settlement's World Bank collection SOLO_ENTRY_COLLECTION, distinct from BASE_FEE_REVENUE", () => {
    expect(sql).toContain("SOLO_ENTRY_COLLECTION");
    const settleFn = sql.slice(sql.indexOf("create or replace function public.settle_match_economy"), sql.indexOf("revoke all on function public.settle_match_economy"));
    expect(settleFn).toMatch(/case when v_solo then 'SOLO_ENTRY_COLLECTION' else 'BASE_FEE_REVENUE' end/);
  });

  it("[M6] settle_match_economy accepts a validity flag and refunds internally when the ranking is invalid, rather than requiring the caller to call a different function", () => {
    const settleFn = sql.slice(sql.indexOf("create or replace function public.settle_match_economy"), sql.indexOf("revoke all on function public.settle_match_economy"));
    expect(settleFn).toContain("p_is_valid_ranking");
    expect(settleFn).toMatch(/economy_apply_refund/);
  });

  it("[Phase 4] the migration header documents Economy V1's identity-deletion policy explicitly", () => {
    // [\s\S] rather than `.` — the phrase spans a line break in the header's
    // wrapped SQL comment prose, and `.` does not match newlines in JS regex.
    expect(sql).toMatch(/identity[\s\S]{0,60}never[\s\S]{0,20}physically deleted/i);
  });

  // ── Final certification pass guards ──────────────────────────────────────

  it("[Correction 1] settle_match_economy explicitly rejects an unrecognized participant identityKind instead of silently skipping it", () => {
    const settleFn = sql.slice(sql.indexOf("create or replace function public.settle_match_economy"), sql.indexOf("revoke all on function public.settle_match_economy"));
    expect(settleFn).toContain("INVALID_IDENTITY_KIND");
    // The rejection must be the OUTER `else` arm closing the member/guest/bot
    // if-elsif chain (i.e. immediately after the bot branch's own `end if;`),
    // not a separate, possibly-unreached check — this asserts the branch
    // shape, not just that the string appears somewhere in the function.
    expect(settleFn).toMatch(/end if;\s*else\s*[\s\S]{0,900}INVALID_IDENTITY_KIND/);
  });

  it("[Correction 4] ensure_wallet no longer auto-provisions a player_identities row for any identity, guest or member", () => {
    const ensureFn = sql.slice(sql.indexOf("create or replace function public.ensure_wallet"), sql.indexOf("revoke all on function public.ensure_wallet"));
    // The specific pattern the audited draft used to special-case guests.
    expect(ensureFn).not.toMatch(/guest\\_%/);
    expect(ensureFn).not.toMatch(/insert into public\.player_identities/);
    expect(ensureFn).toContain("IDENTITY_NOT_FOUND");
  });
});
