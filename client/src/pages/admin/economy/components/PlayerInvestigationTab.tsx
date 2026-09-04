import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Coins,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Clock,
  UserCheck,
  User,
  Sparkles,
  History,
  Lock,
  Code,
} from "lucide-react";
import SectionHeader from "../../../../components/admin/section-header";
import StatusBadge from "../../../../components/admin/status-badge";
import {
  lookupPlayerWallet,
  adminAdjustWallet,
  type CoinWalletRecord,
  type CoinLedgerEntryRecord,
  type WalletLedgerEntryType,
} from "../../../../lib/economyApi";
import { useAuthStore } from "../../../../store/authStore";
import { getSupabase } from "../../../../lib/supabase/client";

const QUICK_AMOUNTS = ["500", "1000", "2500", "5000", "10000", "50000"];
const REASON_PRESETS = [
  "Admin manual top-up via console",
  "Support compensation for disconnected match",
  "VIP player promotional bonus",
  "Community event tournament prize",
];

const MIGRATION_SQL = `-- Migration: 20260906000000_admin_adjust_wallet.sql
-- Description: Creates public.admin_adjust_wallet(text, bigint, text, text, text)
-- Run this in Supabase SQL Editor (SQL Editor -> New query -> Paste & Run)

create or replace function public.admin_adjust_wallet(
  p_identity_id text,
  p_amount bigint,
  p_admin_id text,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_wallet         public.coin_wallets;
  v_balance_before bigint;
  v_version_before bigint;
  v_existing_entry public.coin_ledger_entries;
begin
  -- 1. Argument validation
  if p_identity_id is null or char_length(trim(p_identity_id)) = 0 then
    raise exception 'INVALID_IDENTITY_ID: identity_id cannot be null or empty';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT: top-up amount must be strictly greater than 0';
  end if;

  if p_admin_id is null or char_length(trim(p_admin_id)) = 0 then
    raise exception 'INVALID_ADMIN_ID: admin_id cannot be null or empty';
  end if;

  if p_idempotency_key is null or char_length(trim(p_idempotency_key)) = 0 then
    raise exception 'INVALID_IDEMPOTENCY_KEY: idempotency_key cannot be null or empty';
  end if;

  -- 2. Ensure wallet exists (provisions starter grant if new identity)
  perform public.ensure_wallet(p_identity_id);

  -- 3. Idempotency check: has this idempotency_key already been applied?
  select * into v_existing_entry
  from public.coin_ledger_entries
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    select * into v_wallet from public.coin_wallets where identity_id = p_identity_id;
    return jsonb_build_object(
      'applied', false,
      'operation', 'admin_adjust_wallet',
      'idempotencyKey', p_idempotency_key,
      'result', public.wallet_to_safe_jsonb(v_wallet)
    );
  end if;

  -- 4. Lock the wallet row
  select * into v_wallet
  from public.coin_wallets
  where identity_id = p_identity_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND: wallet for % does not exist', p_identity_id;
  end if;

  if v_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: wallet for % is frozen', p_identity_id;
  end if;

  v_balance_before := v_wallet.balance;
  v_version_before := v_wallet.version;

  -- 5. Atomic balance update
  update public.coin_wallets
  set balance = balance + p_amount,
      lifetime_granted = lifetime_granted + p_amount,
      version = version + 1,
      updated_at = now()
  where identity_id = p_identity_id
  returning * into v_wallet;

  -- 6. Insert audit ledger row
  insert into public.coin_ledger_entries (
    wallet_id,
    amount,
    balance_before,
    balance_after,
    wallet_version_before,
    wallet_version_after,
    entry_type,
    source_kind,
    source_id,
    idempotency_key,
    description
  ) values (
    p_identity_id,
    p_amount,
    v_balance_before,
    v_wallet.balance,
    v_version_before,
    v_wallet.version,
    'ADMIN_ADJUSTMENT',
    'admin',
    p_admin_id,
    p_idempotency_key,
    coalesce(nullif(trim(p_reason), ''), 'Admin manual top-up')
  );

  return jsonb_build_object(
    'applied', true,
    'operation', 'admin_adjust_wallet',
    'idempotencyKey', p_idempotency_key,
    'result', public.wallet_to_safe_jsonb(v_wallet)
  );
end;
$$;

revoke all on function public.admin_adjust_wallet(text, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_adjust_wallet(text, bigint, text, text, text) to service_role;`;

export function PlayerInvestigationTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get("identityId") || "";

  const authEmail = useAuthStore((s) => s.email);
  const authUserId = useAuthStore((s) => s.userId);

  const [searchIdentityId, setSearchIdentityId] = useState<string>(initialId);
  const [wallet, setWallet] = useState<CoinWalletRecord | null>(null);
  const [ledger, setLedger] = useState<CoinLedgerEntryRecord[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);

  // Top-Up Form State
  const [topupAmount, setTopupAmount] = useState<string>("1000");
  const [topupReason, setTopupReason] = useState<string>(REASON_PRESETS[0]);
  const [isSubmittingTopup, setIsSubmittingTopup] = useState<boolean>(false);
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [showMigrationSql, setShowMigrationSql] = useState<boolean>(false);

  const fetchPlayerData = useCallback(async (identityIdToFetch: string) => {
    let id = identityIdToFetch.trim();
    if (!id) return;

    setIsSearching(true);
    setSearchError(null);
    setTopupSuccess(null);
    setTopupError(null);

    // Resolve email if user entered an email address
    let currentResolvedEmail: string | null = null;
    if (id.includes("@")) {
      currentResolvedEmail = id;
      if (authEmail && id.toLowerCase() === authEmail.toLowerCase() && authUserId) {
        id = authUserId;
      } else {
        const supabase = getSupabase();
        if (supabase) {
          try {
            const { data } = await supabase
              .from("profiles")
              .select("id")
              .ilike("email", id)
              .maybeSingle();
            if (data?.id) {
              id = data.id;
            }
          } catch {
            // ignore, backend will also try to resolve email
          }
        }
      }
    } else if (authUserId && id === authUserId && authEmail) {
      currentResolvedEmail = authEmail;
    }
    setResolvedEmail(currentResolvedEmail);

    try {
      const data = await lookupPlayerWallet(id);
      setWallet(data.wallet);
      setLedger(data.ledger);
    } catch (err: unknown) {
      setWallet(null);
      setLedger([]);
      const msg = err instanceof Error ? err.message : "Failed to load player wallet";
      setSearchError(msg);
    } finally {
      setIsSearching(false);
    }
  }, [authEmail, authUserId]);

  // Auto-search if identityId query param is present on mount
  useEffect(() => {
    if (initialId) {
      void fetchPlayerData(initialId);
    }
  }, [initialId, fetchPlayerData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchIdentityId.trim()) return;

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("identityId", searchIdentityId.trim());
      return next;
    });

    void fetchPlayerData(searchIdentityId);
  };

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;

    const amountNum = parseInt(topupAmount.trim(), 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTopupError("Please specify a positive coin amount greater than 0");
      return;
    }

    setIsSubmittingTopup(true);
    setTopupSuccess(null);
    setTopupError(null);

    try {
      const ik = `admin-adjust:${wallet.identityId}:${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const res = await adminAdjustWallet({
        identityId: wallet.identityId,
        amountCoins: topupAmount.trim(),
        reason: topupReason.trim() || "Admin manual top-up via console",
        idempotencyKey: ik,
      });

      if (res.applied) {
        setTopupSuccess(
          `Successfully credited ${Number(topupAmount).toLocaleString()} coins! New balance: ${Number(
            res.result.balance,
          ).toLocaleString()} coins. (Tx: ${res.idempotencyKey})`,
        );
      } else {
        setTopupSuccess(
          `Transaction previously applied. Current balance: ${Number(
            res.result.balance,
          ).toLocaleString()} coins.`,
        );
      }

      // Refresh wallet & ledger fresh from server
      await fetchPlayerData(wallet.identityId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to top up player wallet";
      setTopupError(msg);
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  const renderEntryBadge = (entryType: WalletLedgerEntryType) => {
    switch (entryType) {
      case "ADMIN_ADJUSTMENT":
        return <StatusBadge status="warning" label="Admin Adjustment" />;
      case "STARTER_GRANT":
        return <StatusBadge status="active" label="Starter Grant" />;
      case "MATCH_PRIZE_CREDIT":
        return <StatusBadge status="active" label="Prize Credit" />;
      case "VOUCHER_REDEMPTION":
        return <StatusBadge status="active" label="Voucher Redeemed" />;
      case "MATCH_REFUND":
        return <StatusBadge status="info" label="Match Refund" />;
      case "ROOM_ENTRY_DEBIT":
      case "SOLO_ENTRY_DEBIT":
      case "BOT_ENTRY_DEBIT":
        return <StatusBadge status="critical" label="Entry Debit" />;
      default:
        return <StatusBadge status="inactive" label={entryType} />;
    }
  };

  // Mathematical balance reconciliation formula:
  // balance = lifetimeGranted + lifetimeEarned + lifetimeRefunded - lifetimeSpent
  const isReconciled = wallet
    ? BigInt(wallet.balance) ===
      BigInt(wallet.lifetimeGranted) +
        BigInt(wallet.lifetimeEarned) +
        BigInt(wallet.lifetimeRefunded) -
        BigInt(wallet.lifetimeSpent)
    : false;

  return (
    <div className="space-y-6">
      {/* 1. Identity Search Bar Card */}
      <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-3">
        <SectionHeader
          title="Player Economy Investigation & Wallet Management"
          description="Look up any member or guest player's live wallet, starter grant status, and transaction history, or authoritatively credit coins."
        />

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--chrome-ink-soft)] absolute left-3.5 top-3.5" aria-hidden="true" />
            <input
              id="player-search-input"
              type="text"
              value={searchIdentityId}
              onChange={(e) => setSearchIdentityId(e.target.value)}
              placeholder="Enter Player Identity ID (UUID, email, or guest_4a91b)..."
              aria-label="Player identity ID or email"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-xs font-mono text-[var(--chrome-ink)] focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={!searchIdentityId.trim() || isSearching}
            className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs disabled:opacity-50 transition cursor-pointer shrink-0 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Lookup Player</span>
              </>
            )}
          </button>
        </form>

        {/* Quick helper shortcuts */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--chrome-ink-soft)] pt-1">
          <span className="font-medium">Quick Lookup:</span>
          {authEmail && (
            <button
              type="button"
              onClick={() => {
                const targetId = authUserId || authEmail;
                setSearchIdentityId(targetId);
                void fetchPlayerData(targetId);
              }}
              className="px-2.5 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 font-mono font-bold text-amber-700 dark:text-amber-300 transition cursor-pointer flex items-center gap-1"
              title={`Lookup logged-in account (${authEmail})`}
            >
              <UserCheck className="w-3 h-3" />
              <span>My Account ({authEmail.split("@")[0]})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSearchIdentityId("guest_sample_user");
              void fetchPlayerData("guest_sample_user");
            }}
            className="px-2 py-0.5 rounded-md bg-[var(--chrome-control)] hover:bg-[var(--chrome-border)] font-mono transition text-[var(--chrome-ink)] cursor-pointer"
          >
            guest_sample_user
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {searchError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold">Player Lookup Failed</p>
            <p>{searchError}</p>
          </div>
        </div>
      )}

      {/* Empty State before any search is performed */}
      {!wallet && !isSearching && !searchError && (
        <div className="p-10 text-center text-xs text-[var(--chrome-ink-soft)] bg-[var(--chrome-panel)] rounded-2xl border border-[var(--chrome-border)] space-y-3">
          <Coins className="w-10 h-10 text-amber-500/60 mx-auto" aria-hidden="true" />
          <h4 className="font-bold text-sm text-[var(--chrome-ink)]">No Player Selected</h4>
          <p className="max-w-md mx-auto leading-relaxed">
            Enter a player's identity ID above to inspect their live coin wallet, view the transaction ledger, and
            manually top up coins.
          </p>
        </div>
      )}

      {/* 2. Wallet & Top-Up Dashboard (Rendered when wallet is found) */}
      {wallet && (
        <div className="space-y-6">
          {/* Main Wallet Card */}
          <div className="p-6 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-xs space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--chrome-border)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)]">
                    Player Identity
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--chrome-control)] font-mono text-xs font-bold text-[var(--chrome-ink)]">
                    <span>{wallet.identityId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(wallet.identityId)}
                      aria-label="Copy identity ID"
                      className="text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {resolvedEmail && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-medium" title="Account Email">
                      {resolvedEmail}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      wallet.identityKind === "member"
                        ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {wallet.identityKind === "member" ? (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Member
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> Guest
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-xs text-[var(--chrome-ink-soft)]">
                  Last active: {new Date(wallet.updatedAt).toLocaleString()} • Audit Version: v{wallet.version}
                </p>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {wallet.isFrozen ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold">
                    <Lock className="w-3.5 h-3.5" /> Frozen Wallet
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Active
                  </span>
                )}

                {wallet.starterGranted ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Starter Claimed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" /> Starter Pending
                  </span>
                )}
              </div>
            </div>

            {/* Balance Hero & Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Primary Balance */}
              <div className="sm:col-span-2 lg:col-span-1 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Current Balance
                  </span>
                  <Coins className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black font-mono text-[var(--chrome-ink)]">
                  {Number(wallet.balance).toLocaleString()}
                </div>
                <div className="text-[11px] text-[var(--chrome-ink-soft)]">Spendable virtual coins</div>
              </div>

              {/* Lifetime Granted */}
              <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-1">
                <span className="text-[11px] font-bold uppercase text-[var(--chrome-ink-soft)]">Lifetime Granted</span>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{Number(wallet.lifetimeGranted).toLocaleString()}
                </div>
                <div className="text-[10px] text-[var(--chrome-ink-soft)]">Starter & Admin grants</div>
              </div>

              {/* Lifetime Earned */}
              <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-1">
                <span className="text-[11px] font-bold uppercase text-[var(--chrome-ink-soft)]">Lifetime Earned</span>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{Number(wallet.lifetimeEarned).toLocaleString()}
                </div>
                <div className="text-[10px] text-[var(--chrome-ink-soft)]">Prizes & Vouchers</div>
              </div>

              {/* Lifetime Spent */}
              <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-1">
                <span className="text-[11px] font-bold uppercase text-[var(--chrome-ink-soft)]">Lifetime Spent</span>
                <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                  -{Number(wallet.lifetimeSpent).toLocaleString()}
                </div>
                <div className="text-[10px] text-[var(--chrome-ink-soft)]">Match entry fees</div>
              </div>

              {/* Lifetime Refunded */}
              <div className="p-4 rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-1">
                <span className="text-[11px] font-bold uppercase text-[var(--chrome-ink-soft)]">Lifetime Refunded</span>
                <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                  +{Number(wallet.lifetimeRefunded).toLocaleString()}
                </div>
                <div className="text-[10px] text-[var(--chrome-ink-soft)]">Cancelled match refunds</div>
              </div>
            </div>

            {/* Reconciliation Check Banner */}
            <div
              className={`p-3 rounded-xl flex items-center justify-between text-xs font-mono border ${
                isReconciled
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {isReconciled ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
                <span>
                  Reconciliation Equation: Granted ({wallet.lifetimeGranted}) + Earned ({wallet.lifetimeEarned}) + Refunded ({wallet.lifetimeRefunded}) - Spent ({wallet.lifetimeSpent}) = Balance ({wallet.balance})
                </span>
              </div>
              <span className="font-bold uppercase tracking-wider text-[10px]">
                {isReconciled ? "✓ Verified Balanced" : "⚠ Invariant Breach"}
              </span>
            </div>
          </div>

          {/* 3. Super Admin Manual Top-Up Panel */}
          <div className="p-6 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--chrome-ink)]">Manual Wallet Top-Up (Super Admin)</h3>
                  <p className="text-xs text-[var(--chrome-ink-soft)]">
                    Directly grant virtual coins to this player's wallet. Stored in PostgreSQL with audit ledger tracking.
                  </p>
                </div>
              </div>
            </div>

            {topupSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{topupSuccess}</span>
              </div>
            )}

            {topupError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span className="font-bold">{topupError}</span>
                </div>

                {(topupError.includes("admin_adjust_wallet") ||
                  topupError.includes("PGRST202") ||
                  topupError.includes("EconomyTemporarilyUnavailable") ||
                  topupError.includes("difficulties")) && (
                  <div className="mt-2 pt-2 border-t border-rose-500/20 text-xs space-y-2">
                    <p className="text-[var(--chrome-ink)]">
                      <strong>Database Migration Required:</strong> The{" "}
                      <code className="px-1 py-0.5 rounded bg-zinc-900 text-amber-300 font-mono text-[11px]">
                        admin_adjust_wallet
                      </code>{" "}
                      function is not yet installed in your Supabase database. Run the migration in your Supabase SQL
                      Editor to enable wallet adjustments.
                    </p>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(MIGRATION_SQL);
                          setCopiedSql(true);
                          setTimeout(() => setCopiedSql(false), 2500);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSql ? "Copied Migration SQL!" : "Copy Migration SQL"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMigrationSql(!showMigrationSql)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--chrome-border)] bg-[var(--chrome-control)] hover:bg-[var(--chrome-panel)] text-[var(--chrome-ink)] text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
                      >
                        <Code className="w-3.5 h-3.5 text-amber-500" />
                        <span>{showMigrationSql ? "Hide SQL" : "View SQL"}</span>
                      </button>
                    </div>
                    {showMigrationSql && (
                      <pre className="mt-2 p-3 rounded-lg bg-zinc-950 text-zinc-200 font-mono text-[10px] overflow-x-auto max-h-60 border border-zinc-800">
                        {MIGRATION_SQL}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleTopupSubmit} className="space-y-4">
              {/* Quick preset amount chips */}
              <div>
                <label className="block text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider mb-1.5">
                  Select Quick Amount
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopupAmount(amt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        topupAmount === amt
                          ? "bg-amber-500 text-zinc-950 shadow-xs"
                          : "bg-[var(--chrome-control)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-border)]"
                      }`}
                    >
                      +{Number(amt).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Reason Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="topup-amount-input" className="block text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider mb-1">
                    Coins Amount to Top-Up
                  </label>
                  <div className="relative">
                    <Coins className="w-4 h-4 text-[var(--chrome-ink-soft)] absolute left-3 top-3" />
                    <input
                      id="topup-amount-input"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-xs font-mono font-bold text-[var(--chrome-ink)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="topup-reason-input" className="block text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider mb-1">
                    Audit Reason / Note
                  </label>
                  <input
                    id="topup-reason-input"
                    type="text"
                    required
                    value={topupReason}
                    onChange={(e) => setTopupReason(e.target.value)}
                    placeholder="e.g. Support compensation or tournament reward..."
                    className="w-full h-10 px-3 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-xs text-[var(--chrome-ink)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Reason preset chips */}
              <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--chrome-ink-soft)]">
                <span className="font-medium mr-1">Preset reasons:</span>
                {REASON_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTopupReason(p)}
                    className="px-2 py-0.5 rounded-md bg-[var(--chrome-control)] hover:bg-[var(--chrome-border)] transition text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] cursor-pointer truncate max-w-[240px]"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Top-up CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingTopup || !topupAmount.trim() || parseInt(topupAmount, 10) <= 0}
                  className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {isSubmittingTopup ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing Top-Up...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Confirm Top-Up (+{Number(topupAmount || 0).toLocaleString()} Coins)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 4. Ledger Entries Table */}
          <div className="p-6 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-[var(--chrome-ink)]">
                  Transaction Audit Ledger ({ledger.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => fetchPlayerData(wallet.identityId)}
                className="h-8 px-3 rounded-lg border border-[var(--chrome-border)] bg-[var(--chrome-control)] hover:bg-[var(--chrome-border)] text-xs text-[var(--chrome-ink)] font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {ledger.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--chrome-ink-soft)]">
                No ledger transactions found for this wallet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--chrome-border)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] uppercase tracking-wider text-[10px] font-bold border-b border-[var(--chrome-border)]">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Balance Progression</th>
                      <th className="p-3">Version</th>
                      <th className="p-3">Audit Reason / Description</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--chrome-border)] font-mono">
                    {ledger.map((entry) => {
                      const isCredit = BigInt(entry.balanceAfter) >= BigInt(entry.balanceBefore);
                      return (
                        <tr key={entry.id} className="hover:bg-[var(--chrome-control)]/50 transition">
                          <td className="p-3 whitespace-nowrap">
                            {renderEntryBadge(entry.entryType)}
                          </td>
                          <td className="p-3 whitespace-nowrap font-bold">
                            <span
                              className={`flex items-center gap-1 ${
                                isCredit
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                              {isCredit ? "+" : "-"}
                              {Number(entry.amount).toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-[11px] text-[var(--chrome-ink-soft)]">
                            <span>{Number(entry.balanceBefore).toLocaleString()}</span>
                            <span className="mx-1.5 text-[var(--chrome-ink-soft)]">→</span>
                            <span className="font-bold text-[var(--chrome-ink)]">
                              {Number(entry.balanceAfter).toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-[11px] text-[var(--chrome-ink-soft)]">
                            v{entry.walletVersionBefore} → v{entry.walletVersionAfter}
                          </td>
                          <td className="p-3 max-w-xs font-sans text-xs text-[var(--chrome-ink)] truncate" title={entry.description}>
                            <span className="font-medium">{entry.description}</span>
                            <span className="block text-[10px] font-mono text-[var(--chrome-ink-soft)] truncate">
                              src: {entry.sourceKind} ({entry.sourceId})
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-[11px] text-[var(--chrome-ink-soft)] font-sans">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerInvestigationTab;
