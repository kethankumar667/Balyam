import { Link } from "react-router-dom";
import {
  Bell,
  Settings as SettingsIcon,
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
import { useAuthStore } from "../../store/authStore";
import { type BhalyamGameSlug } from "../bhalyam/data";
import { Button } from "../../design-system/dls/Buttons";

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
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onToggleMobileMenu?: () => void;
  onSelectGame?: (slug: BhalyamGameSlug) => void;
  /**
   * Unread notifications, from the state AppLayout already owns.
   *
   * Was hardcoded to `3` here while the real list lived one component up —
   * a red dot that could never be cleared, and a tooltip that repeated the
   * same invented number. Absent or zero renders no badge at all.
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
  onOpenNotifications,
  onToggleMobileMenu,
  unreadCount = 0,
}: AppHeaderProps) {
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";
  const { playerName, avatarId } = useRoomStore();
  const { isMember } = useAuthStore();
  const displayName = playerName.trim() || (isMember ? "Member" : "Guest");

  return (
    <header className="h-20 w-full flex-shrink-0 z-30 border-b border-[var(--chrome-hairline)] bg-[var(--chrome-panel)] transition-colors">
      <div className="h-full w-full flex items-center overflow-hidden">
        {/* Left: Sidebar-Aligned Brand Area */}
        <div className="w-auto lg:w-64 min-w-0 lg:flex-shrink-0 px-3 sm:px-6 flex items-center gap-2.5 sm:gap-3">
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

          <Link
            to="/"
            /* The logo is `decorative` (aria-hidden) and the wordmark beside it
               is `hidden sm:flex`, so below 640px this link had no accessible
               name whatsoever — axe reported it on every route in both themes.
               The label is unconditional so it cannot depend on a breakpoint. */
            aria-label="BHALYAM — go to the lounge home"
            className="flex items-center gap-2.5 sm:gap-3 group min-w-0 select-none"
          >
            <span className="flex-shrink-0">
              <BhalyamLogo size={44} decorative />
            </span>
            {/* Phones get the logo mark alone. Measured: the fixed chrome costs
                278px and this block ~117px — driven by the tagline, which at
                9px with 0.2em tracking is wider than BHALYAM above it. 405px
                total overflows every common phone up to 412px. */}
            <span className="hidden sm:flex flex-col leading-none min-w-0">
              <span className="bhalyam-display text-[22px] sm:text-[26px] tracking-tight truncate text-[var(--chrome-ink)] group-hover:text-[var(--chrome-accent)] transition-colors">
                BHALYAM
              </span>
              <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.2em] font-extrabold text-[var(--chrome-accent)] mt-0.5 truncate">
                Relive Childhood
              </span>
            </span>
          </Link>
        </div>

        {/* Center: Hero Claim / Tagline */}
        <div className="hidden lg:flex flex-1 items-center justify-center px-4">
          <span className="text-center font-black tracking-widest text-[11px] uppercase text-[var(--chrome-ink-soft)] select-none">
            nostalgic 90s gaming • 100% free forever
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex-1 lg:flex-none flex items-center justify-end px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 1. Notifications */}
            <Button
              type="button"
              variant="chrome"
              size="iconOnly"
              onClick={onOpenNotifications}
              title="Notifications"
              aria-label={
                unreadCount > 0
                  ? `Notifications (${unreadCount} unread)`
                  : "Notifications (none unread)"
              }
              className="relative"
              leftIcon={<Bell className="w-5 h-5" />}
              rightIcon={
                unreadCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : undefined
              }
            />

            {/* 2. User Profile Chip */}
            <button
              type="button"
              onClick={onOpenProfile}
              title="Your profile"
              aria-label={`Profile — ${displayName}`}
              className="min-h-[44px] min-w-[44px] w-11 md:w-auto flex items-center gap-0 md:gap-2.5 px-0 md:px-3
                         justify-center rounded-full border transition hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0
                         bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink)]
                         hover:bg-[var(--chrome-control-hi)]"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--chrome-border)] flex items-center justify-center flex-shrink-0 bg-[var(--chrome-active-bg)]">
                <SeatAvatar
                  avatar={avatarId ?? undefined}
                  name={displayName}
                  className="w-full h-full"
                  textClassName="text-[11px]"
                />
              </div>
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
            </button>

            {/* 3. Theme toggle. `isDark` earns its place here — the glyph and
                   the label are genuinely different content, not two colours
                   for one thing. */}
            <Button
              type="button"
              variant="chrome"
              size="iconOnly"
              onClick={toggleTheme}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              leftIcon={isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            />

            {/* 4. Settings — members only, matching the sidebar's own gate. */}
            {isMember && (
              <Link to="/settings" title="Settings" aria-label="Settings" className={CONTROL}>
                <SettingsIcon className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
