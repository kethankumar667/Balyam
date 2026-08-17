import { Link } from "react-router-dom";
import {
  Bell,
  Settings as SettingsIcon,
  User as UserIcon,
  ChevronDown,
  Menu,
} from "lucide-react";
import BhalyamLogo from "../bhalyam/BhalyamLogo";
import SelfAvatar from "../profile/SelfAvatar";
import { useTheme } from "../../lib/useTheme";
import { useRoomStore } from "../../store/roomStore";

interface AppHeaderProps {
  onOpenJoin?: () => void;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onToggleMobileMenu?: () => void;
  onSelectGame?: (slug: any) => void;
}

export default function AppHeader({
  onOpenProfile,
  onOpenNotifications,
  onOpenSettings,
  onToggleMobileMenu,
}: AppHeaderProps) {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const { playerName } = useRoomStore();
  const displayName = playerName.trim() || "Kethan";

  return (
    <header
      className={`h-20 w-full flex-shrink-0 z-30 border-b transition-colors ${
        isDark
          ? "bg-[#0A0F1D]/95 border-white/10 backdrop-blur-md"
          : "bg-[#FFFDF8]/95 border-[#ECD9BA] backdrop-blur-md"
      }`}
    >
      {/* `min-w-0` on both halves is what stops the right-hand controls being
          pushed off a 375px screen. The brand block used to be
          `flex-shrink-0`, so on a phone it claimed its full natural width and
          the settings gear simply rendered past the viewport edge — invisible
          and untappable, with no horizontal scroll to reach it. */}
      <div className="h-full w-full flex items-center overflow-hidden">
        {/* Left: Sidebar-Aligned Brand Area */}
        <div className="w-auto lg:w-64 min-w-0 lg:flex-shrink-0 px-3 sm:px-6 flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className={`lg:hidden w-10 h-10 rounded-2xl border flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
              isDark
                ? "bg-[#101728] border-white/10 text-zinc-300 hover:bg-white/10"
                : "bg-[#FAF2DF] border-[#ECD9BA] text-[#5C3B1E] hover:bg-[#F2E4CB]"
            }`}
            title="Toggle Menu"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0 select-none">
            <span className="flex-shrink-0">
              <BhalyamLogo size={44} decorative />
            </span>
            {/* Phones get the logo mark alone.

                Measured, not guessed: the fixed chrome (menu + logo + three
                40px controls + padding) costs 278px, and this block costs
                ~117px — driven by "Relive Childhood", which at 9px with 0.2em
                tracking is WIDER than "BHALYAM" above it. That totals 405px,
                which overflows every common phone up to 412px. Showing it and
                letting it truncate just moves the damage from the controls to
                the brand. The logo still identifies the app; a clipped
                settings gear identifies nothing. */}
            <span className="hidden sm:flex flex-col leading-none min-w-0">
              <span
                className={`bhalyam-display text-[22px] sm:text-[26px] tracking-tight truncate ${
                  isDark ? "text-white group-hover:text-amber-400" : "text-[#2A221B] group-hover:text-amber-700"
                } transition-colors`}
              >
                BHALYAM
              </span>
              <span className="text-[9px] sm:text-[10.5px] uppercase tracking-[0.2em] font-extrabold text-[#FF8F00] mt-0.5 truncate">
                Relive Childhood
              </span>
            </span>
          </Link>
        </div>

        {/* Right: Area aligned with the scrollable body content (max-w-[1100px]) */}
        <div className="flex-1 min-w-0 h-full px-3 sm:px-6 flex items-center">
          <div className="w-full max-w-[1100px] mx-auto flex items-center justify-end gap-2 sm:gap-3">
            {/* 1. Notification Bell with Badge */}
            <button
              type="button"
              onClick={onOpenNotifications}
              title="Notifications (3 unread)"
              aria-label="Notifications"
              className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 ${
                isDark
                  ? "bg-[#0E1527] border-white/10 text-zinc-300 hover:bg-white/10"
                  : "bg-[#FAF2DF] border-[#ECD9BA] text-[#5C3B1E] hover:bg-[#F2E4CB]"
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            {/* 2. User Profile Chip */}
            <button
              type="button"
              onClick={onOpenProfile}
              title="User Profile & XP"
              /* Carries the name for screen readers because the visible label
                 is gone below sm — the icon-only chip must still announce
                 whose profile it opens. */
              aria-label={`Profile — ${displayName}`}
              /* Below md the chip is the avatar alone — a 40px circle that
                 matches the bell and gear beside it. The name, level and
                 chevron are what made this the widest thing in the header
                 (~217px, which is what pushed the settings gear off-screen),
                 and all three are repeated inside the profile sheet the chip
                 opens, so nothing is lost by dropping them.

                 md rather than sm because sm is exactly where the wordmark
                 comes back: expanding both at 640px puts the header at ~642px
                 of content in a 640px window, which is the same overflow one
                 breakpoint higher. They take turns instead. */
              className={`h-10 flex items-center gap-0 md:gap-2.5 px-0 md:px-3 justify-center rounded-full border transition hover:scale-102 active:scale-98 cursor-pointer flex-shrink-0 w-10 md:w-auto ${
                isDark
                  ? "bg-[#0E1527] border-white/10 text-white hover:bg-white/10"
                  : "bg-[#FAF2DF] border-[#ECD9BA] text-[#2A221B] hover:bg-[#F2E4CB]"
              }`}
            >
              <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-400 flex items-center justify-center flex-shrink-0 bg-amber-100 dark:bg-amber-900/40">
                <SelfAvatar className="w-full h-full" fallback={<UserIcon className="w-4 h-4 text-amber-500" />} />
              </div>
              <div className="hidden md:flex items-center gap-1.5 min-w-0">
                <span className="text-[13px] font-black tracking-tight max-w-[95px] truncate">
                  {displayName}!
                </span>
                <span className="px-1.5 py-0.2 rounded-md text-[9.5px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-400/40 flex-shrink-0">
                  Lv 12
                </span>
              </div>
              <ChevronDown className="hidden md:block w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            </button>

            {/* 3. Settings Gear Icon */}
            <button
              type="button"
              onClick={onOpenSettings}
              title="Settings"
              aria-label="Settings"
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 ${
                isDark
                  ? "bg-[#0E1527] border-white/10 text-zinc-200 hover:text-amber-400 hover:bg-white/10"
                : "bg-[#FAF2DF] border-[#ECD9BA] text-[#2A221B] hover:text-amber-700 hover:bg-[#F2E4CB]"
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
