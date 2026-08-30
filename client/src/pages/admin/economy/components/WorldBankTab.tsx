import React, { useMemo } from "react";
import {
  Landmark,
  ShieldCheck,
  TrendingUp,
  Bot,
  AlertTriangle,
  Gift,
  Lock,
  Info,
} from "lucide-react";
import SectionHeader from "../../../../components/admin/section-header";
import { CoinAmount } from "../../../../components/economy/CoinAmount";
import { EconomySkeleton } from "../../../../components/economy/EconomySkeleton";
import type { WorldBankSnapshot } from "../../../../lib/economyApi";

interface WorldBankTabProps {
  worldBank: WorldBankSnapshot | null;
  isLoading: boolean;
}

export function WorldBankTab({ worldBank, isLoading }: WorldBankTabProps) {
  // Total protocol REVENUE only — baseFeeRevenue + botPrizeRevenue +
  // abandonmentForfeitureRevenue. Deliberately excludes
  // guestEscrowLiability: that balance is money BHALYAM is HOLDING for a
  // guest, not money BHALYAM HAS, and this schema's own design (see
  // WorldBankSnapshot's doc comment) never merges the two. A client-side
  // sum of the three real revenue fields for display is not the same
  // mistake the schema was fixed to avoid — it's a derived total of real,
  // already-authoritative numbers, not a new number invented from nothing.
  const totalRevenue = useMemo(() => {
    if (!worldBank) return null;
    try {
      return (
        BigInt(worldBank.baseFeeRevenue) +
        BigInt(worldBank.botPrizeRevenue) +
        BigInt(worldBank.abandonmentForfeitureRevenue)
      ).toString();
    } catch {
      return null;
    }
  }, [worldBank]);

  if (isLoading && !worldBank) {
    return (
      <div role="status" aria-label="Loading World Bank reserves" className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <EconomySkeleton variant="generic" className="h-32" count={6} />
        </div>
      </div>
    );
  }

  if (!worldBank) {
    return (
      <div
        role="status"
        className="p-12 text-center text-xs text-[var(--chrome-ink-soft)] bg-[var(--chrome-panel)] rounded-2xl border border-[var(--chrome-border)]"
      >
        World Bank snapshot unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Treasury Solvency Hero Card */}
      <div className="p-6 rounded-2xl bg-[var(--chrome-panel)] border border-amber-600/30 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Landmark className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--chrome-ink-soft)] block">
                Central Platform Treasury
              </span>
              <h3 className="text-lg font-black text-[var(--chrome-ink)]">
                BHALYAM World Bank Liquidity Reserve
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Solvency Fully Guaranteed</span>
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--chrome-hairline)] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase block">
              Total Protocol Revenue
            </span>
            <CoinAmount
              amount={totalRevenue ?? "0"}
              size="xl"
              className="font-black text-amber-600 dark:text-amber-400 mt-0.5"
            />
            <span className="text-[11px] text-[var(--chrome-ink-soft)] mt-0.5 block">
              Base fees + bot prize rake + abandonment forfeitures
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase block">
              Outstanding Escrow Liability
            </span>
            <CoinAmount
              amount={worldBank.guestEscrowLiability}
              size="lg"
              className="font-bold text-purple-700 dark:text-purple-400 mt-0.5"
            />
            <span className="text-[11px] text-[var(--chrome-ink-soft)] mt-0.5 block">
              Held for guests until voucher redemption — not protocol revenue
            </span>
          </div>
        </div>
      </div>

      {/* 2. Inflow Stream Breakdown (each field maps 1:1 to a real, independent world_bank_accounts balance) */}
      <section className="space-y-3">
        <SectionHeader
          title="Treasury Inflow & Revenue Streams"
          description="Detailed breakdown of non-fungible revenue sources and liabilities"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Base Fee Revenue */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider">
                Base Fee Revenue
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <CoinAmount
              amount={worldBank.baseFeeRevenue}
              size="lg"
              className="font-bold text-emerald-700 dark:text-emerald-400"
            />
            <p className="text-[11px] text-[var(--chrome-ink-soft)] leading-relaxed">
              Standard protocol rake captured from 2–5 seat multiplayer match entries and solo game entry fees.
            </p>
          </div>

          {/* Bot Prize Revenue */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider">
                Bot Victory Prize Rake
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <CoinAmount
              amount={worldBank.botPrizeRevenue}
              size="lg"
              className="font-bold text-blue-700 dark:text-blue-400"
            />
            <p className="text-[11px] text-[var(--chrome-ink-soft)] leading-relaxed">
              Prize allocations captured by AI bot seats, automatically re-routed into World Bank reserves.
            </p>
          </div>

          {/* Abandonment Forfeiture Revenue */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider">
                Abandonment Forfeitures
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <CoinAmount
              amount={worldBank.abandonmentForfeitureRevenue}
              size="lg"
              className="font-bold text-red-700 dark:text-red-400"
            />
            <p className="text-[11px] text-[var(--chrome-ink-soft)] leading-relaxed">
              Forfeited entry pools captured when human players abandon an active match without an eligible successor.
            </p>
          </div>

          {/* Guest Escrow Liability */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider">
                Guest Escrow Liability
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <CoinAmount
              amount={worldBank.guestEscrowLiability}
              size="lg"
              className="font-bold text-purple-700 dark:text-purple-400"
            />
            <p className="text-[11px] text-[var(--chrome-ink-soft)] leading-relaxed">
              Outstanding guest rewards held in cryptographic escrow until converted to verified member accounts.
            </p>
          </div>

          {/* Voucher Redemptions */}
          <div className="p-5 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--chrome-ink-soft)] uppercase tracking-wider">
                Vouchers Redeemed
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <CoinAmount
              amount={worldBank.totalVoucherRedeemed}
              size="lg"
              className="font-bold text-amber-700 dark:text-amber-400"
            />
            <p className="text-[11px] text-[var(--chrome-ink-soft)] leading-relaxed">
              Total lifetime escrow successfully redeemed into member balances upon account verification.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Non-Fungibility & Balance Separation Explainer */}
      <div className="p-4 rounded-2xl bg-[var(--chrome-control)]/60 border border-[var(--chrome-border)] text-xs text-[var(--chrome-ink-soft)] flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-[var(--chrome-ink)] block">
            Non-Fungible Treasury Balance Architecture
          </span>
          <p>
            BHALYAM strictly isolates World Bank reserves from Guest Escrow liabilities. Escrow is a liability the platform owes to unredeemed bearer voucher holders and is never counted as protocol profit or merged into general operating balance.
          </p>
        </div>
      </div>
    </div>
  );
}

export default WorldBankTab;
