import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  ChevronDown,
  Menu,
  Sun,
  Moon,
  Gamepad2,
  History,
  Heart,
  ShieldCheck,
} from "lucide-react";
import BhalyamLogo from "../bhalyam/BhalyamLogo";
import SelfAvatar from "../profile/SelfAvatar";
import SeatAvatar from "../profile/SeatAvatar";
import { useTheme } from "../../lib/useTheme";
import { useRoomStore } from "../../store/roomStore";
import { useAuthStore } from "../../store/authStore";
import { type BhalyamGameSlug } from "../bhalyam/data";
import { Button, Tooltip } from "../../design-system/dls";
import { useFavourites } from "../../hooks/useFavourites";
import { useRecentlyPlayed } from "../../hooks/useRecentlyPlayed";
import { bhalyamSpring } from "../../lib/motion";
import { WalletBalanceChip } from "../economy/WalletBalanceChip";
import { useWallet } from "../../hooks/useEconomy";

/**
 * The global header.
 */

interface AppHeaderProps {
  onOpenJoin?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenWallet?: () => void;
  onToggleMobileMenu?: () => void;
  onSelectGame?: (slug: BhalyamGameSlug) => void;
  unreadCount?: number;
}

/** Shared shape for the round icon controls, so the three cannot drift apart. */
const CONTROL =
  "w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border flex items-center justify-center " +
  "transition hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 " +
  "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink)] " +
  "hover:bg-[var(--chrome-control-hi)]";

export default function AppHeader({
  onOpenProfile,
  onOpenSettings,
  onOpenWallet,
  onToggleMobileMenu,
  unreadCount = 0,
}: AppHeaderProps) {
  const { pathname } = useLocation();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const { playerName, avatarId } = useRoomStore();
  const { isMember, isSuperAdmin, capabilities } = useAuthStore();
  const { favourites } = useFavourites();
  const { recentItems } = useRecentlyPlayed();
  const { balance, isLoading: walletLoading, status: walletStatus } = useWallet();
  const walletSyncStatus =
    walletStatus === "error" || walletStatus === "unavailable"
      ? "error"
      : walletLoading && walletStatus !== "loading"
        ? "syncing"
        : "synced";
  const displayName = playerName.trim() || (isSuperAdmin ? "Super Admin" : isMember ? "Member" : "Guest");

  const isGamesActive = pathname.startsWith("/games");
  const isRecentActive = pathname.startsWith("/recently-played");
  const isFavoritesActive = pathname.startsWith("/favorites");

  return (
    <header className="h-20 w-full flex-shrink-0 z-30 border-b border-[var(--chrome-hairline)] bg-[var(--chrome-panel)] transition-colors">
      <div className="h-full w-full flex items-center overflow-hidden">
        {/* Left: Sidebar-Aligned Brand Area */}
        <div className="w-auto lg:w-68 xl:w-72 min-w-0 lg:flex-shrink-0 px-3 sm:px-6 flex items-center gap-2.5 sm:gap-3">
          <Tooltip content="Toggle Navigation Menu" side="bottom">
            <Button
              type="button"
              variant="chrome"
              size="iconOnly"
              onClick={onToggleMobileMenu}
              className="lg:hidden"
              title="Toggle Menu"
              aria-label="Toggle Menu"
              leftIcon={<Menu className="w-5 h-5" />}
            />
          </Tooltip>

          <Tooltip content="BHALYAM — Go to Lounge Home" side="bottom">
            <Link
              to="/"
              aria-label="BHALYAM — go to the lounge home"
              className="flex items-center gap-2.5 sm:gap-3 group min-w-0 select-none"
            >
              <span className="flex-shrink-0">
                <BhalyamLogo size={44} decorative />
              </span>
              <span className="hidden sm:flex flex-col leading-none min-w-0">
                <span className="bhalyam-display text-[22px] sm:text-[26px] tracking-tight truncate text-[var(--chrome-ink)] group-hover:text-[var(--chrome-accent)] transition-colors">
                  BHALYAM
                </span>
                <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.2em] font-extrabold text-[var(--chrome-accent)] mt-0.5 truncate">
                  Relive Childhood
                </span>
              </span>
            </Link>
          </Tooltip>
        </div>

        {/* Center: Navigation Bar (Desktop & Tablet) */}
        <div className="hidden md:flex flex-1 items-center justify-center px-2 lg:px-4">
          <nav
            className="flex items-center gap-1 lg:gap-1.5 p-1 rounded-full bg-[var(--chrome-control)] border border-[var(--chrome-border)] shadow-2xs"
            aria-label="Lounge Navigation"
          >
            <Tooltip content="Browse all multiplayer & solo games" side="bottom">
              <Link
                to="/games"
                aria-current={isGamesActive ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 select-none ${
                  isGamesActive
                    ? "bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] font-extrabold shadow-2xs border border-[var(--chrome-border)]"
                    : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)]"
                }`}
              >
                <Gamepad2 className="w-4 h-4 flex-shrink-0" />
                <span>All Games</span>
              </Link>
            </Tooltip>

            <Tooltip content="View your recently played sessions" side="bottom">
              <Link
                to="/recently-played"
                aria-current={isRecentActive ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 select-none ${
                  isRecentActive
                    ? "bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] font-extrabold shadow-2xs border border-[var(--chrome-border)]"
                    : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)]"
                }`}
              >
                <History className="w-4 h-4 flex-shrink-0" />
                <span>Recently Played</span>
                {recentItems.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300">
                    {recentItems.length}
                  </span>
                )}
              </Link>
            </Tooltip>

            <Tooltip content="View your starred favourite games" side="bottom">
              <Link
                to="/favorites"
                aria-current={isFavoritesActive ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 select-none ${
                  isFavoritesActive
                    ? "bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] font-extrabold shadow-2xs border border-[var(--chrome-border)]"
                    : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)]"
                }`}
              >
                <Heart
                  className={`w-4 h-4 flex-shrink-0 ${
                    isFavoritesActive || favourites.length > 0
                      ? "fill-rose-500 text-rose-500"
                      : ""
                  }`}
                />
                <span>Favorites</span>
                {favourites.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300">
                    {favourites.length}
                  </span>
                )}
              </Link>
            </Tooltip>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex-1 md:flex-none flex items-center justify-end px-3 sm:px-6">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Global Wallet Balance Chip */}
            <WalletBalanceChip
              balance={balance}
              isLoading={walletLoading}
              syncStatus={walletSyncStatus}
              isMember={isMember}
              onClick={onOpenWallet}
            />

            {/* User Profile Chip — notifications live inside this sheet now
                instead of a standalone bell button, so the unread count
                surfaces here as a small badge instead of its own control. */}
            <Tooltip
              content={
                unreadCount > 0
                  ? `Signed in as ${displayName} — ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : `Signed in as ${displayName}`
              }
              side="bottom"
            >
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={bhalyamSpring}
                onClick={onOpenProfile}
                title="Your profile"
                aria-label={
                  unreadCount > 0
                    ? `Profile — ${displayName} (${unreadCount} unread notifications)`
                    : `Profile — ${displayName}`
                }
                className="relative min-h-[44px] min-w-[44px] w-11 md:w-auto flex items-center gap-0 md:gap-2.5 px-0 md:px-3
                           justify-center rounded-full border transition-colors cursor-pointer flex-shrink-0
                           bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink)]
                           hover:bg-[var(--chrome-control-hi)] focus-visible:outline-hidden focus-visible:ring-2
                           focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111927]"
              >
                <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[var(--chrome-border)] flex items-center justify-center flex-shrink-0 bg-[var(--chrome-active-bg)]">
                  <SeatAvatar
                    avatar={avatarId ?? undefined}
                    name={displayName}
                    className="w-full h-full"
                    textClassName="text-[11px]"
                  />
                </div>
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span
                      key="unread-badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={bhalyamSpring}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm ring-2 ring-[var(--chrome-panel)]"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className="hidden md:flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-black tracking-tight max-w-[130px] truncate">
                    {displayName}
                  </span>
                  {isSuperAdmin ? (
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-xs">
                      Super Admin
                    </span>
                  ) : !isMember ? (
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-lamp-800 dark:text-lamp-300">
                      Guest
                    </span>
                  ) : null}
                </div>
                <ChevronDown className="hidden md:block w-3.5 h-3.5 text-[var(--chrome-ink-soft)] flex-shrink-0" />
              </motion.button>
            </Tooltip>

            {/* Super Admin Quick Console Link */}
            {(isSuperAdmin || capabilities.accessAdminPanel) && (
              <Tooltip content="Super Admin Operations Console" side="bottom">
                <Link
                  to="/admin/dashboard"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-500 dark:text-amber-400 font-black text-xs uppercase tracking-wider transition active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>Admin</span>
                </Link>
              </Tooltip>
            )}

            {/* 3. Theme toggle — desktop only (mobile has it in drawer/menu) */}
            <Tooltip
              content={isDark ? "Switch to light mode" : "Switch to dark mode"}
              side="bottom"
            >
              <Button
                type="button"
                variant="chrome"
                size="iconOnly"
                onClick={toggleTheme}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="hidden md:inline-flex"
                leftIcon={isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
}
