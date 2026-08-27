import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  X,
  RefreshCw,
  Ticket,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { CoinAmount, AshthaKonaCoinIcon } from "./CoinAmount";
import { CoinDelta, type CoinDeltaType } from "./CoinDelta";
import { EconomySkeleton } from "./EconomySkeleton";
import { EconomyActionButton } from "./EconomyActionButton";
import { VoucherRedemptionModal } from "./VoucherRedemptionModal";
import { useWallet, useLedger } from "../../hooks/useEconomy";
import { type CoinLedgerEntryRecord } from "../../lib/economyApi";
import { formatTimeAgo } from "../../lib/formatTimeAgo";
import { useAuthStore } from "../../store/authStore";

export interface WalletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapEntryToDeltaType(entryType: string): { type: CoinDeltaType; label: string } {
  switch (entryType) {
    case "STARTER_GRANT":
      return { type: "CREDIT", label: "Starter Grant" };
    case "MATCH_PRIZE_CREDIT":
      return { type: "CREDIT", label: "Match Prize" };
    case "VOUCHER_REDEMPTION":
      return { type: "CREDIT", label: "Voucher Claim" };
    case "MATCH_REFUND":
      return { type: "REFUND", label: "Match Refund" };
    case "ROOM_ENTRY_DEBIT":
      return { type: "DEBIT", label: "Room Entry" };
    case "SOLO_ENTRY_DEBIT":
      return { type: "DEBIT", label: "Practice Entry" };
    case "BOT_ENTRY_DEBIT":
      return { type: "DEBIT", label: "Bot Entry" };
    case "ADMIN_ADJUSTMENT":
      return { type: "CREDIT", label: "Adjustment" };
    default:
      return { type: "CREDIT", label: entryType };
  }
}

/**
 * Slide-in Global Wallet & Ledger Drawer.
 * Server-authoritative view of the player's balance, lifetime stats, and transaction history.
 */
export const WalletDrawer: React.FC<WalletDrawerProps> = ({ isOpen, onClose }) => {
  const isMember = useAuthStore((s) => s.isMember);
  const {
    wallet,
    balance,
    status: walletStatus,
    isLoading: walletLoading,
    error: walletError,
    correlationId,
    refetch: refetchWallet,
  } = useWallet();
  const {
    entries,
    isLoading: ledgerLoading,
    hasMore,
    error: ledgerError,
    refetch: refetchLedger,
    loadMore,
  } = useLedger();

  const [selectedEntry, setSelectedEntry] = useState<CoinLedgerEntryRecord | null>(null);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);

  const drawerRef = React.useRef<HTMLElement | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  // Focus management: capture previous focus, set initial focus on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        previousActiveElementRef.current?.focus();
      };
    }
  }, [isOpen]);

  // Keyboard trap and Escape key listener for WCAG 2.1 AA dialog compliance
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedEntry) {
          setSelectedEntry(null);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, selectedEntry]);

  const handleRefreshAll = () => {
    void refetchWallet();
    void refetchLedger();
  };

  const isRefreshing = walletLoading || ledgerLoading;
  const isWalletError = walletStatus === "error" || walletStatus === "unavailable" || Boolean(walletError);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Slide-in Drawer */}
            <motion.aside
              ref={drawerRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="wallet-drawer-title"
              aria-describedby="wallet-drawer-subtitle"
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-[#FAF8F5] dark:bg-[#0D121F] border-l border-amber-600/20 dark:border-amber-400/15 shadow-2xl flex flex-col font-sans text-ink-hi dark:text-text-hi"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2
                      id="wallet-drawer-title"
                      className="text-base font-extrabold text-ink-hi dark:text-text-hi flex items-center gap-2"
                    >
                      Coin Wallet
                      {isMember && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          Member
                        </span>
                      )}
                    </h2>
                    <span id="wallet-drawer-subtitle" className="text-[11px] text-ink-lo dark:text-text-lo">
                      Server-Authoritative Ledger
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleRefreshAll}
                    aria-label="Refresh wallet data"
                    disabled={isRefreshing}
                    className="p-2 rounded-full text-ink-lo hover:text-ink-hi dark:text-text-lo dark:hover:text-text-hi hover:bg-black/5 dark:hover:bg-white/5 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
                    />
                  </button>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Close wallet drawer"
                    className="p-2 rounded-full text-ink-lo hover:text-ink-hi dark:text-text-lo dark:hover:text-text-hi hover:bg-black/5 dark:hover:bg-white/5 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Balance Hero Card */}
                <div className="relative p-5 rounded-3xl border border-amber-600/30 dark:border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-[#1A2234] dark:to-[#101524] shadow-lg shadow-amber-950/10 overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Available Balance
                    </span>
                    {wallet?.isFrozen && (
                      <span className="text-[10px] font-black uppercase text-red-600 bg-red-500/20 px-2 py-0.5 rounded-full">
                        Frozen
                      </span>
                    )}
                  </div>

                  {walletLoading ? (
                    <EconomySkeleton variant="wallet" className="my-2" />
                  ) : isWalletError ? (
                    <div className="my-2 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-ink-hi dark:text-text-hi space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Wallet Unavailable</span>
                      </div>
                      <p className="text-xs text-ink-mid dark:text-text-mid">
                        {walletError || "Unable to retrieve server-authoritative balance. Please check your connection."}
                      </p>
                      {correlationId && (
                        <div className="text-[10px] font-mono text-ink-lo dark:text-text-lo bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md inline-block">
                          Ref: {correlationId}
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={handleRefreshAll}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 text-xs font-bold transition active:scale-95 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry Connection</span>
                        </button>
                      </div>
                    </div>
                  ) : balance === "0" ? (
                    <div className="my-1">
                      <CoinAmount amount="0" size="hero" className="font-black text-ink-hi dark:text-text-hi" />
                      <p className="mt-1.5 text-[11px] text-ink-lo dark:text-text-lo">
                        Your wallet balance is 0. Play matches or redeem a reward voucher to earn coins.
                      </p>
                    </div>
                  ) : (
                    <div className="my-1">
                      <CoinAmount amount={balance} size="hero" className="font-black text-ink-hi dark:text-text-hi" />
                    </div>
                  )}

                  {/* Actions & Vouchers */}
                  <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setVoucherModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Redeem Voucher</span>
                    </button>

                    <div className="text-[11px] text-ink-lo dark:text-text-lo flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                      <span>Cryptographic Audit v{wallet?.version ?? 1}</span>
                    </div>
                  </div>
                </div>

                {/* Lifetime Stats */}
                {wallet && !isWalletError && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
                      <span className="text-[10px] text-ink-lo dark:text-text-lo block">Granted</span>
                      <CoinAmount amount={wallet.lifetimeGranted} size="sm" className="font-bold text-xs" />
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
                      <span className="text-[10px] text-ink-lo dark:text-text-lo block">Earned</span>
                      <CoinAmount
                        amount={wallet.lifetimeEarned}
                        size="sm"
                        className="font-bold text-xs text-emerald-700 dark:text-emerald-400"
                      />
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
                      <span className="text-[10px] text-ink-lo dark:text-text-lo block">Spent</span>
                      <CoinAmount
                        amount={wallet.lifetimeSpent}
                        size="sm"
                        className="font-bold text-xs text-amber-700 dark:text-amber-400"
                      />
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
                      <span className="text-[10px] text-ink-lo dark:text-text-lo block">Refunded</span>
                      <CoinAmount
                        amount={wallet.lifetimeRefunded}
                        size="sm"
                        className="font-bold text-xs text-pink-700 dark:text-pink-400"
                      />
                    </div>
                  </div>
                )}

                {/* Ledger Timeline Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-mid dark:text-text-mid flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      Transaction Ledger
                    </h3>
                    <span className="text-[11px] text-ink-lo dark:text-text-lo">Immutable Audit</span>
                  </div>

                  {ledgerLoading && entries.length === 0 ? (
                    <div className="space-y-2">
                      <EconomySkeleton variant="generic" className="h-16" count={3} />
                    </div>
                  ) : ledgerError ? (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 text-center space-y-2">
                      <p>{ledgerError}</p>
                      <button
                        type="button"
                        onClick={() => void refetchLedger()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 text-xs font-bold transition active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry Ledger</span>
                      </button>
                    </div>
                  ) : entries.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <AshthaKonaCoinIcon size={20} />
                      </div>
                      <p className="text-xs font-bold text-ink-hi dark:text-text-hi">No Transactions Yet</p>
                      <p className="text-[11px] text-ink-lo dark:text-text-lo max-w-xs mx-auto">
                        Your match fees, victory payouts, and redeemed vouchers will appear in this ledger.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {entries.map((entry) => {
                        const { type, label } = mapEntryToDeltaType(entry.entryType);
                        return (
                          <div
                            key={entry.id}
                            onClick={() => setSelectedEntry(entry)}
                            className="p-3 rounded-2xl bg-white/70 dark:bg-[#131824] border border-black/5 dark:border-white/5 hover:border-amber-500/30 transition shadow-xs flex items-center justify-between cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0 text-ink-mid dark:text-text-mid group-hover:text-amber-500 transition">
                                {type === "DEBIT" ? (
                                  <ArrowUpRight className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-ink-hi dark:text-text-hi block truncate">
                                  {label}
                                </span>
                                <span className="text-[10px] text-ink-lo dark:text-text-lo block">
                                  {formatTimeAgo(entry.createdAt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <CoinDelta delta={entry.amount} type={type} size="sm" />
                              <ChevronRight className="w-3.5 h-3.5 text-ink-lo dark:text-text-lo group-hover:translate-x-0.5 transition" />
                            </div>
                          </div>
                        );
                      })}

                      {hasMore && (
                        <div className="pt-2 text-center">
                          <EconomyActionButton
                            variant="secondary"
                            size="sm"
                            onClick={loadMore}
                            isLoading={ledgerLoading}
                            className="w-full"
                          >
                            Load Older Entries
                          </EconomyActionButton>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Modal for Selected Entry */}
              <AnimatePresence>
                {selectedEntry && (
                  <div
                    className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Ledger Entry Details"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full max-w-sm bg-white dark:bg-[#131824] border border-amber-600/30 rounded-3xl p-5 space-y-4 shadow-2xl"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-black/10 dark:border-white/10">
                        <h4 className="text-sm font-bold text-ink-hi dark:text-text-hi">
                          Ledger Audit #{selectedEntry.id}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(null)}
                          className="p-1 rounded-full text-ink-lo hover:text-ink-hi dark:text-text-lo dark:hover:text-text-hi focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                          <span className="text-ink-lo dark:text-text-lo">Entry Type:</span>
                          <span className="font-bold text-ink-hi dark:text-text-hi">{selectedEntry.entryType}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                          <span className="text-ink-lo dark:text-text-lo">Amount:</span>
                          <CoinDelta
                            delta={selectedEntry.amount}
                            type={mapEntryToDeltaType(selectedEntry.entryType).type}
                            size="sm"
                          />
                        </div>
                        <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                          <span className="text-ink-lo dark:text-text-lo">Balance Before:</span>
                          <CoinAmount amount={selectedEntry.balanceBefore} size="sm" />
                        </div>
                        <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                          <span className="text-ink-lo dark:text-text-lo">Balance After:</span>
                          <CoinAmount amount={selectedEntry.balanceAfter} size="sm" />
                        </div>
                        <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                          <span className="text-ink-lo dark:text-text-lo">Wallet Version:</span>
                          <span className="font-mono text-ink-hi dark:text-text-hi">v{selectedEntry.walletVersionAfter}</span>
                        </div>
                        {selectedEntry.sourceId && (
                          <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                            <span className="text-ink-lo dark:text-text-lo">Source ID:</span>
                            <span className="font-mono text-ink-hi dark:text-text-hi truncate max-w-[160px]">
                              {selectedEntry.sourceId}
                            </span>
                          </div>
                        )}
                        <div className="pt-1 text-[11px] text-ink-lo dark:text-text-lo">
                          {selectedEntry.description || "Authoritative platform ledger mutation."}
                        </div>
                      </div>

                      <EconomyActionButton
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedEntry(null)}
                        className="w-full"
                      >
                        Close
                      </EconomyActionButton>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <VoucherRedemptionModal
        isOpen={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        onSuccess={() => {
          handleRefreshAll();
        }}
      />
    </>
  );
};

export default WalletDrawer;
