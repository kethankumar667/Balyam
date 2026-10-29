import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Wallet,
  X,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Gift,
  Undo2,
} from "lucide-react";
import { CoinAmount, AshthaKonaCoinIcon } from "./CoinAmount";
import { CoinDelta, type CoinDeltaType } from "./CoinDelta";
import { EconomySkeleton } from "./EconomySkeleton";
import { EconomyActionButton } from "./EconomyActionButton";
import { useWallet, useLedger } from "../../hooks/useEconomy";
import { CarryOverCard } from "../carryover/CarryOverCard";
import { InvitePromo } from "../../features/referrals/InvitePromo";
import { FaucetClaimRow } from "../faucet/FaucetClaimRow";
import { type CoinLedgerEntryRecord } from "../../lib/economyApi";
import { formatTimeAgo } from "../../lib/formatTimeAgo";
import { useAuthStore, useIdentityPresentation } from "../../store/authStore";
import PlayerIdentityFooter from "../layout/PlayerIdentityFooter";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import type { GameKind } from "@shared/types";
import { GoldCoin } from "../faucet/CoinRain";
import { WalletActivityChart } from "./WalletActivityChart";
import { useFaucetStore } from "../../store/faucetStore";
import Modal from "../Modal";

/** `entry.gameKind` is a raw string from the server, not narrowed to `GameKind` — falls back to the raw value for a kind this client build doesn't recognize, rather than hiding it. */
function friendlyGameName(gameKind: string | null): string | null {
  if (!gameKind) return null;
  return GAME_DISPLAY_NAMES[gameKind as GameKind] ?? gameKind;
}

/** The `sourceId` the reward gateway stamps on a faucet payout (RewardGateway `payoutShape`). */
const HOURLY_FAUCET_PRINCIPAL = "system:hourly_faucet";
/** The same, for the coins a guest brought to a new account and the welcome bonus that follows. */
const GUEST_CARRYOVER_PRINCIPAL = "system:guest_carryover";
const GUEST_UPGRADE_BONUS_PRINCIPAL = "system:guest_upgrade_bonus";
/** The coins a friend's invitation earned, from either side (`ReferralBonusService`, reward type `REFERRAL`). */
const REFERRAL_PRINCIPAL = "system:referral";

export interface WalletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Direction and label for a ledger row.
 *
 * `amount` is the ledger's SIGNED amount (a debit is stored negative). It is
 * the fallback for any entry type not listed below: an unknown type used to
 * default to CREDIT, so a new kind of debit would silently render as coins
 * coming in — the exact bug P2P sends had. Sign is the source of truth; the
 * named cases only supply friendlier labels.
 */
export function mapEntryToDeltaType(
  entryType: string,
  amount: string,
  sourceId?: string,
): { type: CoinDeltaType; label: string } {
  // The free-coins faucet pays through the generic adjustment entry type (the
  // ledger's type list is a database constraint), so the principal that paid it
  // is what tells it apart from a real admin top-up.
  if (entryType === "ADMIN_ADJUSTMENT" && sourceId === HOURLY_FAUCET_PRINCIPAL) {
    return { type: "CREDIT", label: "Hourly Reward" };
  }
  if (entryType === "ADMIN_ADJUSTMENT" && sourceId === GUEST_CARRYOVER_PRINCIPAL) {
    return { type: "CREDIT", label: "Brought Over From Guest" };
  }
  if (entryType === "ADMIN_ADJUSTMENT" && sourceId === GUEST_UPGRADE_BONUS_PRINCIPAL) {
    return { type: "CREDIT", label: "Welcome Bonus" };
  }
  if (entryType === "ADMIN_ADJUSTMENT" && sourceId === REFERRAL_PRINCIPAL) {
    return { type: "CREDIT", label: "Friend Bonus" };
  }
  switch (entryType) {
    case "GUEST_CARRYOVER_DEBIT":
      return { type: "DEBIT", label: "Moved To Your Account" };
    case "P2P_TRANSFER_SEND":
      return { type: "DEBIT", label: "Coins Sent" };
    case "P2P_TRANSFER_RECEIVE":
      return { type: "CREDIT", label: "Coins Received" };
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
    case "DAILY_REWARD_CREDIT":
      return { type: "CREDIT", label: "Daily Reward" };
    default:
      return { type: amount.trim().startsWith("-") ? "DEBIT" : "CREDIT", label: entryType };
  }
}

/**
 * Slide-in Global Wallet & Ledger Drawer.
 * Server-authoritative view of the player's balance, lifetime stats, and transaction history.
 */
export const WalletDrawer: React.FC<WalletDrawerProps> = ({ isOpen, onClose }) => {
  const reduceMotion = useReducedMotion();
  const [refreshKey, setRefreshKey] = useState(0);
  const isMember = useAuthStore((s) => s.isMember);
  const presentation = useIdentityPresentation();
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
  useEffect(() => { setSelectedEntry(null); }, [isOpen, wallet?.identityId]);

  const drawerRef = React.useRef<HTMLElement | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

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
      // A portalled claim dialog owns the keyboard while it is above this drawer.
      if (useFaucetStore.getState().isClaimModalOpen || selectedEntry) return;
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
    setRefreshKey((value) => value + 1);
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
              initial={{ x: reduceMotion ? 0 : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: reduceMotion ? 0 : "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="wallet-drawer-title"
              aria-describedby="wallet-drawer-subtitle"
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[420px] sm:rounded-l-3xl bg-[#FFF9EF] dark:bg-[#15171C] border-l border-amber-600/20 dark:border-amber-400/15 shadow-2xl flex flex-col font-sans text-ink-hi dark:text-text-hi overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-amber-900/10 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-500/40 text-amber-950 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Wallet className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2
                      id="wallet-drawer-title"
                      className="text-base font-extrabold text-ink-hi dark:text-text-hi flex flex-wrap items-center gap-x-2 gap-y-1"
                    >
                      Coin Wallet
                      {presentation.isVerifiedMember && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          {presentation.label}
                        </span>
                      )}
                      {presentation.isLocalFallback && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          Offline Demo
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
                    className="min-w-11 min-h-11 flex items-center justify-center rounded-full text-ink-lo hover:text-ink-hi dark:text-text-lo dark:hover:text-text-hi hover:bg-black/5 dark:hover:bg-white/5 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
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
                    className="min-w-11 min-h-11 flex items-center justify-center rounded-full text-ink-lo hover:text-ink-hi dark:text-text-lo dark:hover:text-text-hi hover:bg-black/5 dark:hover:bg-white/5 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Balance Hero Card */}
                <div className="relative p-5 rounded-3xl border border-amber-400/50 bg-[radial-gradient(ellipse_at_95%_0%,#59401c_0%,#242321_38%,#141618_85%)] shadow-lg shadow-amber-950/20 overflow-hidden text-amber-50">
                  <div aria-hidden="true" className="pointer-events-none absolute right-4 top-12 opacity-60">
                    <GoldCoin size={90} className="-rotate-12 drop-shadow-[0_8px_12px_#000]" />
                    <div className="mt-1 h-3 rounded-[50%] bg-gradient-to-b from-amber-300/70 to-amber-900/20 shadow-lg" />
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="relative text-[10px] font-bold uppercase tracking-[.16em] text-amber-200">
                      Available Balance
                    </span>
                    {wallet?.isFrozen && (
                      <span className="text-[10px] font-black uppercase text-red-200 bg-red-500/20 px-2 py-0.5 rounded-full">
                        Frozen
                      </span>
                    )}
                  </div>

                  {walletLoading ? (
                    <EconomySkeleton variant="wallet" className="my-2" />
                  ) : isWalletError ? (
                    <div className="relative my-2 p-3.5 rounded-2xl bg-[#292322] border border-red-300/30 text-white space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Wallet Unavailable</span>
                      </div>
                      <p className="text-xs text-stone-200">
                        {walletError || "Unable to retrieve server-authoritative balance. Please check your connection."}
                      </p>
                      {correlationId && (
                        <div className="max-w-full [overflow-wrap:anywhere] text-[10px] font-mono text-stone-200 bg-white/5 px-2 py-0.5 rounded-md inline-block">
                          Ref: {correlationId}
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={handleRefreshAll}
                          className="inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold transition active:scale-95 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry Connection</span>
                        </button>
                      </div>
                    </div>
                  ) : balance === "0" ? (
                    <div className="my-1">
                      <CoinAmount amount="0" size="hero" className="relative font-black !text-amber-200" />
                      <p className="relative mt-1.5 text-[11px] text-stone-200">
                        Your wallet balance is 0. Play matches or claim your free coins to earn more.
                      </p>
                    </div>
                  ) : (
                    <div className="relative my-1">
                      <CoinAmount amount={balance} size="hero" className="max-w-full break-all font-black !text-amber-200 [&>span]:min-w-0 [&>span]:break-all" />
                    </div>
                  )}

                  <p className="relative mt-2 text-[9px] tracking-[.22em] text-amber-100/80">BHALYAM COINS</p>
                  <p aria-hidden="true" className="relative mt-3 font-script text-xl text-amber-200">Play More Memories</p>
                  <div className="relative mt-4 pt-3 border-t border-amber-100/15 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-stone-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                      <span>{wallet && !isWalletError ? "Server ledger" : "Awaiting server"}</span>
                    </div>
                    {wallet && !isWalletError && <span className="font-mono text-[10px] text-amber-200/80">Wallet v{wallet.version}</span>}
                  </div>
                </div>

                {/* Free coins. On a phone the header has no room for a faucet chip, so the claim lives here. */}
                <FaucetClaimRow variant="wallet" />

                {/* Coins brought over from a guest account and the welcome bonus; renders nothing unless there is something to say. */}
                <CarryOverCard />

                {/* An invitation to bring friends; renders nothing while loading, on error, or once dismissed for this visit. */}
                <InvitePromo placement="wallet" />

                {/* Lifetime Stats */}
                {wallet && !isWalletError && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-x-2 [&>svg]:row-span-2 [&>svg]:mb-0 [&>span]:col-start-2 min-w-0 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 [&_span]:break-all">
                      <ArrowDownLeft aria-hidden="true" className="mb-2 h-7 w-7 rounded-full bg-emerald-200/70 p-1.5 text-emerald-800" />
                      <span className="text-[10px] text-ink-lo dark:text-text-lo block">Earned</span>
                      <CoinAmount
                        amount={wallet.lifetimeEarned}
                        size="sm"
                        className="font-bold text-xs text-emerald-700 dark:text-emerald-400"
                      />
                    </div>
                    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-x-2 [&>svg]:row-span-2 [&>svg]:mb-0 [&>span]:col-start-2 min-w-0 p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 [&_span]:break-all">
                      <ArrowUpRight aria-hidden="true" className="mb-2 h-7 w-7 rounded-full bg-orange-200/70 p-1.5 text-orange-800" />
                      <span className="text-[10px] text-ink-lo dark:text-text-lo block">Spent</span>
                      <CoinAmount
                        amount={wallet.lifetimeSpent}
                        size="sm"
                        className="font-bold text-xs text-amber-700 dark:text-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-x-2 [&>svg]:row-span-2 [&>svg]:mb-0 [&>span]:col-start-2 min-w-0 p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 [&_span]:break-all">
                      <Gift aria-hidden="true" className="mb-2 h-7 w-7 rounded-full bg-purple-200/70 p-1.5 text-purple-800" />
                      <span className="text-[10px] text-ink-lo dark:text-text-lo block">Granted</span>
                      <CoinAmount amount={wallet.lifetimeGranted} size="sm" className="font-bold text-xs" />
                    </div>
                    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-x-2 [&>svg]:row-span-2 [&>svg]:mb-0 [&>span]:col-start-2 min-w-0 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 [&_span]:break-all">
                      <Undo2 aria-hidden="true" className="mb-2 h-7 w-7 rounded-full bg-blue-200/70 p-1.5 text-blue-800" />
                      <span className="text-[10px] text-ink-lo dark:text-text-lo block">Refunded</span>
                      <CoinAmount
                        amount={wallet.lifetimeRefunded}
                        size="sm"
                        className="font-bold text-xs text-blue-700 dark:text-blue-300"
                      />
                    </div>
                  </div>
                )}

                {wallet && !isWalletError && <WalletActivityChart key={wallet.identityId} version={wallet.version} refreshKey={refreshKey} />}

                {/* Ledger Timeline Section */}
                <div className="space-y-3 rounded-2xl border border-amber-900/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
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
                    <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-800 dark:text-red-300 text-center space-y-2">
                      <p>{ledgerError}</p>
                      <button
                        type="button"
                        onClick={() => void refetchLedger()}
                        className="inline-flex min-h-11 items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-800 dark:text-red-200 text-xs font-bold transition active:scale-95 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
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
                        Your match fees, victory payouts, and free coins will appear in this ledger.
                      </p>
                    </div>
                  ) : (
                    <div className="relative space-y-1 before:absolute before:left-6 before:top-4 before:bottom-4 before:w-px before:bg-stone-200 dark:before:bg-stone-700">
                      {entries.map((entry) => {
                        const { type, label } = mapEntryToDeltaType(entry.entryType, entry.amount, entry.sourceId);
                        const gameName = friendlyGameName(entry.gameKind);
                        const isGrant = entry.entryType === "STARTER_GRANT" || (entry.entryType === "ADMIN_ADJUSTMENT" && entry.sourceId !== HOURLY_FAUCET_PRINCIPAL && entry.sourceId !== GUEST_CARRYOVER_PRINCIPAL && entry.sourceId !== GUEST_UPGRADE_BONUS_PRINCIPAL && entry.sourceId !== REFERRAL_PRINCIPAL);
                        return (
                          <button
                            type="button"
                            key={entry.id}
                            onClick={() => setSelectedEntry(entry)}
                            className="relative min-h-16 w-full p-2 rounded-xl border border-transparent hover:border-amber-500/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-600 transition flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer group"
                          >
                            <div className="flex min-w-0 flex-1 basis-40 items-center gap-3">
                              <div className={`relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isGrant ? "bg-purple-100 text-purple-700" : type === "DEBIT" ? "bg-orange-100 text-orange-800" : "bg-emerald-100 text-emerald-800"}`}>
                                {isGrant ? <Gift className="h-4 w-4" aria-hidden="true" /> : type === "DEBIT" ? (
                                  <ArrowUpRight className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-ink-hi dark:text-text-hi block truncate">
                                  {gameName ? `${label} — ${gameName}` : label}
                                </span>
                                <span className="text-[10px] text-ink-lo dark:text-text-lo block">
                                  {formatTimeAgo(entry.createdAt)}
                                </span>
                              </div>
                            </div>

                            <div className="ml-auto flex shrink-0 items-center gap-2">
                              <div className="text-right">
                                <CoinDelta delta={entry.amount} type={type} size="sm" showIcon={false} showBadgeText={false} className="whitespace-nowrap" />
                                <span className={`mt-1 block text-[8px] font-bold tracking-wider ${isGrant ? "text-purple-700 dark:text-purple-300" : "text-stone-600 dark:text-stone-300"}`}>{isGrant ? "GRANT" : type}</span>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-lo dark:text-text-lo group-hover:translate-x-0.5 transition" />
                            </div>
                          </button>
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

              {/* Drawer Footer - Player ID for support & wallet auditing */}
              <div className="px-5 py-2.5 border-t border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#0D121F]/90 backdrop-blur-sm flex-shrink-0">
                <PlayerIdentityFooter borderTop={false} className="rounded-xl border border-amber-900/10 bg-amber-50/60 dark:border-white/10 dark:bg-white/5 [&_button]:min-h-11" />
                <p className="mt-1 text-center text-[9px] text-stone-500 dark:text-stone-400">Your transactions are recorded in the server ledger.</p>
              </div>

              {/* Detail Modal for Selected Entry */}
              <AnimatePresence>
                {selectedEntry && (
                  <Modal open onClose={() => setSelectedEntry(null)} zIndex={60} ariaLabel="Ledger Entry Details" panelClassName="w-full max-w-sm">
                    <motion.div
                      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
                      className="w-full max-w-sm bg-white dark:bg-[#131824] border border-amber-600/30 rounded-3xl p-5 space-y-4 shadow-2xl"
                    >
                      <div className="flex justify-between items-center gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                        <h4 className="min-w-0 [overflow-wrap:anywhere] text-sm font-bold text-ink-hi dark:text-text-hi">
                          Ledger Audit #{selectedEntry.id}
                        </h4>
                        <button
                          type="button"
                          aria-label="Close ledger entry details"
                          onClick={() => setSelectedEntry(null)}
                          className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-full text-ink-lo hover:text-ink-hi dark:text-text-lo dark:hover:text-text-hi focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div data-ledger-details className="space-y-2 text-xs [overflow-wrap:anywhere] [&_span]:min-w-0 [&_span]:flex-wrap [&_span]:max-w-full [&>div:not(:last-child)]:grid [&>div:not(:last-child)]:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] [&>div:not(:last-child)]:gap-3">
                        <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                          <span className="text-ink-lo dark:text-text-lo">Entry Type:</span>
                          <span className="font-bold text-ink-hi dark:text-text-hi">{selectedEntry.entryType}</span>
                        </div>
                        {friendlyGameName(selectedEntry.gameKind) && (
                          <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                            <span className="text-ink-lo dark:text-text-lo">Game:</span>
                            <span className="font-bold text-ink-hi dark:text-text-hi">
                              {friendlyGameName(selectedEntry.gameKind)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                          <span className="text-ink-lo dark:text-text-lo">Amount:</span>
                          <CoinDelta
                            delta={selectedEntry.amount}
                            type={mapEntryToDeltaType(selectedEntry.entryType, selectedEntry.amount, selectedEntry.sourceId).type}
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
                            <span className="font-mono text-ink-hi dark:text-text-hi">
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
                  </Modal>
                )}
              </AnimatePresence>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

    </>
  );
};

export default WalletDrawer;
