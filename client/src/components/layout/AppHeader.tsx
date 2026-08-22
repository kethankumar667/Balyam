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
  Search,
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

/**
 * The global header.
 *
 * ── Colour comes from tokens, not from `isDark` ───────────────────────
 * Every colour here used to be a raw hex inside an `isDark` ternary, two
 * per element. That is how the chrome drifted one digit off the home page
 * (#0E1527 against its #0E1526) and how dark mode ended up on a bespoke
 * blue-black ramp belonging to no palette in the project.
 *
 * The `--chrome-*` tokens in index.css hold both themes, so the markup
 * states intent once and the theme resolves it. `isDark` survives only
 * where the *content* genuinely differs — the sun/moon glyph and its label.
 *
 * ── The 3:1 border is doing real work ─────────────────────────────────
 * `--chrome-border` measures 3.75:1 against the panel rather than the 1.35:1
 * it replaced. Parchment cannot separate a control from its ground by fill
 * lightness — cream on cream tops out near 1.1:1 — so the boundary is what
 * makes a button read as a button here, and it has to clear WCAG 1.4.11 on
 * its own.
 */

interface AppHeaderProps {
  onOpenJoin?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onToggleMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
  onSelectGame?: (slug: BhalyamGameSlug) => void;
  /**
   * Unread notifications, from the state AppLayout already owns.
   *
   * Notifications no longer get their own header button — they live inside
   * the Profile sheet now — so this drives a small badge on the profile
   * chip itself instead of a standalone bell. Absent or zero renders no
   * badge at all.
   */
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
  onToggleMobileMenu,
  onOpenCommandPalette,
  unreadCount = 0,
}: AppHeaderProps) {
  const { pathname } = useLocation();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const { playerName, avatarId } = useRoomStore();
  const { isMember } = useAuthStore();
  const { favourites } = useFavourites();
  const { recentItems } = useRecentlyPlayed();
  const displayName = playerName.trim() || (isMember ? "Member" : "Guest");

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
            {/* Quick Command Palette Launcher */}
            <Tooltip content="Quick Search & Commands (Ctrl + K)" side="bottom">
              <button
                type="button"
                onClick={onOpenCommandPalette}
                aria-label="Open Command Palette (Ctrl+K)"
                className="hidden sm:inline-flex items-center gap-2 h-11 px-3.5 rounded-full border transition hover:scale-102 active:scale-98 cursor-pointer flex-shrink-0 bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)]"
              >
                <Search className="w-4 h-4 text-[var(--chrome-ink-soft)]" />
                <span className="text-xs font-semibold">Search</span>
                <kbd className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]">
                  ⌘K
                </kbd>
              </button>
            </Tooltip>

            <Tooltip content="Quick Search" side="bottom">
              <Button
                type="button"
                variant="chrome"
                size="iconOnly"
                onClick={onOpenCommandPalette}
                className="sm:hidden"
                aria-label="Open Search"
                leftIcon={<Search className="w-5 h-5" />}
              />
            </Tooltip>
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
                           hover:bg-[var(--chrome-control-hi)]"
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
                  {!isMember && (
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-lamp-800 dark:text-lamp-300">
                      Guest
                    </span>
                  )}
                </div>
                <ChevronDown className="hidden md:block w-3.5 h-3.5 text-[var(--chrome-ink-soft)] flex-shrink-0" />
              </motion.button>
            </Tooltip>

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
