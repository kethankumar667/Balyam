import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  ChevronDown,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import BhalyamLogo from "../bhalyam/BhalyamLogo";
import SelfAvatar from "../profile/SelfAvatar";
import SeatAvatar from "../profile/SeatAvatar";
import { useTheme } from "../../lib/useTheme";
import { useRoomStore } from "../../store/roomStore";
import { useResolvedCosmetics } from "../../lib/cosmeticsResolver";
import { peekGuestDisplayName } from "../../lib/playerIdentity";
import { useAuthStore, useIdentityPresentation } from "../../store/authStore";
import { type BhalyamGameSlug } from "../bhalyam/data";
import { Button, Tooltip } from "../../design-system/dls";
import { bhalyamSpring } from "../../lib/motion";
import { WalletBalanceChip } from "../economy/WalletBalanceChip";
import { useWallet } from "../../hooks/useEconomy";
import { DailyStreakEntryChip } from "../streak/DailyStreakEntryChip";
import { FaucetChip } from "../faucet/FaucetChip";
import { FaucetReadyDot } from "../faucet/FaucetReadyDot";
import { CosmeticsStoreEntryChip } from "../cosmetics/CosmeticsStoreEntryChip";
import { MiniclipLevelBadge } from "../progression/MiniclipLevelBadge";
import { usePlayerSnapshot } from "../../hooks/usePlayerSnapshot";
import { useMediaQuery } from "../../lib/useMediaQuery";

/**
 * The global header.
 */

interface AppHeaderProps {
  onOpenJoin?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenWallet?: () => void;
  onToggleMobileMenu?: () => void;
  mobileMenuOpen?: boolean;
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
  mobileMenuOpen = false,
  unreadCount = 0,
}: AppHeaderProps) {
  const isPhone = useMediaQuery("(max-width: 639px)");
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const { playerName, avatarId } = useRoomStore();
  const { avatarAura } = useResolvedCosmetics();
  // The frame the player has equipped, if any. "aura_none" is the registry's "nothing equipped", not a frame.
  const equippedFrame = avatarAura && avatarAura !== "aura_none" ? avatarAura : undefined;
  const { isMember } = useAuthStore();
  const identity = useIdentityPresentation();
  const { balance, isLoading: walletLoading, status: walletStatus } = useWallet();
  const walletSyncStatus =
    walletStatus === "error" || walletStatus === "unavailable"
      ? "error"
      : walletLoading && walletStatus !== "loading"
        ? "syncing"
        : "synced";
  const displayName =
    playerName.trim() || (identity.mode === "guest" ? peekGuestDisplayName() : null) || identity.label;
  const { profile } = usePlayerSnapshot(true);
  const playerLevel = profile?.level ?? 1;

  return (
    // 64px on a phone, 80px from `sm` up. The row used to be a fixed 80px with a 44px logo and four 44px-tall
    // chips, which on a ~360px screen was wider than the screen: `overflow-hidden` clipped the avatar off the
    // right edge, and the left group (allowed to shrink) squeezed the logo until it overlapped the streak chip.
    <header className="h-16 sm:h-20 w-full flex-shrink-0 z-30 border-b border-[var(--chrome-hairline)] bg-[var(--chrome-panel)] transition-colors">
      <div className="h-full w-full flex items-center overflow-hidden">
        {/* Left: Sidebar-Aligned Brand Area. `flex-shrink-0` at every width: it is the right-hand chips that
            give way on a narrow screen, never the menu button and logo (which then drew over their neighbour). */}
        <div className="w-auto lg:w-68 xl:w-72 min-w-0 flex-shrink-0 px-2 sm:px-6 flex items-center gap-1.5 sm:gap-3">
          <Tooltip content="Toggle Navigation Menu" side="bottom">
            <Button
              type="button"
              variant="chrome"
              size="iconOnly"
              onClick={onToggleMobileMenu}
              aria-expanded={mobileMenuOpen}
              aria-controls={mobileMenuOpen ? "mobile-navigation" : undefined}
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
              className="flex max-[359px]:hidden items-center justify-center gap-2.5 sm:gap-3 group min-w-[44px] min-h-[44px] select-none"
            >
              {/* Keep the artwork compact inside a full touch target; the menu has Home below 360px. */}
              <span className="flex-shrink-0">
                <BhalyamLogo size={isPhone ? 36 : 44} decorative />
              </span>
              <span className="hidden sm:flex flex-col leading-none min-w-0">
                <span className="bhalyam-display text-[22px] sm:text-[26px] tracking-tight truncate text-[var(--chrome-ink)] group-hover:text-[var(--chrome-accent)] transition-colors">
                  BHALYAM
                </span>
                <span className="text-xs font-bold text-[var(--chrome-accent)] mt-0.5 truncate">
                  Relive Childhood
                </span>
              </span>
            </Link>
          </Tooltip>
        </div>

        {/* Right: actions, in three groups so the row reads as three things rather than nine:
            coins (free coins when ready, then the balance), progress (streak, shop) and you (profile, theme).
            Navigation lives in the sidebar and the admin console is its footer entry, so neither is repeated here. */}
        <div className="flex-1 flex items-center justify-end px-2 sm:px-6 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2.5 lg:gap-5">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Free coins: signed-in members only, and only WHILE a claim is ready. The countdown lives in the wallet drawer. */}
              {isMember && <FaucetChip />}

              {/* Wallet balance. Below `md` the free-coins chip has no room, so a dot here says a claim is ready. */}
              {walletStatus !== "none" && (
                <div className="relative flex-shrink-0">
                  <WalletBalanceChip
                    balance={balance}
                    isLoading={walletLoading}
                    syncStatus={walletSyncStatus}
                    isMember={isMember}
                    onClick={onOpenWallet}
                  />
                  {isMember && <FaucetReadyDot />}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <DailyStreakEntryChip />
              <CosmeticsStoreEntryChip />
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
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
                  // The name + chevron appear from 1400px. At `md` (768px) the expanded pill pushed the header past
                  // the screen edge; at `lg` it still did for a signed-in member (the free-coins chip is the sixth
                  // control), clipping the dark-mode toggle at 1024px (iPad landscape) and 1280px (a laptop).
                  className="relative min-h-[44px] min-w-[44px] w-11 min-[1400px]:w-auto flex items-center gap-0 min-[1400px]:gap-2.5 px-0 min-[1400px]:px-3
                             justify-center rounded-full border transition-colors cursor-pointer flex-shrink-0
                             bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink)]
                             hover:bg-[var(--chrome-control-hi)] focus-visible:outline-hidden focus-visible:ring-2
                             focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111927]"
                >
                  {/* No `overflow-hidden` here: an equipped frame draws OUTSIDE the avatar (124% of it) and was
                      being clipped away. SeatAvatar already clips the picture itself to a circle. A framed avatar
                      is a touch larger (32px) so the frame's detail reads; its 124% still fits the 44px chip. */}
                  <div
                    className={`relative ${equippedFrame ? "w-8 h-8" : "w-7 h-7"} rounded-full border border-[var(--chrome-border)] flex items-center justify-center flex-shrink-0 bg-[var(--chrome-active-bg)]`}
                  >
                    <SeatAvatar
                      avatar={avatarId ?? undefined}
                      aura={equippedFrame}
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
                  {/* Phone: the name and badge are hidden, so the level rides on the avatar itself. */}
                  <span aria-hidden="true" className="min-[1400px]:hidden absolute -bottom-1.5 -right-1.5">
                    <MiniclipLevelBadge level={playerLevel} size="xs" showTooltip={false} />
                  </span>
                  <div className="hidden min-[1400px]:flex items-center gap-1.5 min-w-0">
                    <span className="text-[13px] font-bold tracking-tight max-w-[130px] truncate">
                      {displayName}
                    </span>
                    <MiniclipLevelBadge level={playerLevel} size="xs" showTooltip={false} className="shrink-0" />
                  </div>
                  <ChevronDown className="hidden min-[1400px]:block w-3.5 h-3.5 text-[var(--chrome-ink-soft)] flex-shrink-0" />
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
                  className="hidden lg:inline-flex"
                  leftIcon={isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                />
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
