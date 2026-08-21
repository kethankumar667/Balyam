import { Link } from "react-router-dom";
import { ChevronLeft, X, Sun, Moon } from "lucide-react";
import { useNavigation } from "../../navigation/useNavigation";
import type { NavBadge, ResolvedNavigationItem } from "../../navigation/types";
import { useRoomStore } from "../../store/roomStore";
import { useAuthStore } from "../../store/authStore";
import SeatAvatar from "../profile/SeatAvatar";
import { Tooltip } from "../../design-system/dls";
import BhalyamLogo from "../bhalyam/BhalyamLogo";
import { useTheme } from "../../lib/useTheme";

interface AppSidebarProps {
  onOpenJoin?: () => void;
  onOpenCreateRoom?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenGameSheet?: (slug: string) => void;
  onCloseMobile?: () => void;
}

function getBadgeStyles(variant?: NavBadge["variant"]): string {
  switch (variant) {
    case "emerald":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "amber":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
    case "rose":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "purple":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
    case "accent":
      return "bg-[var(--chrome-accent)]/15 text-[var(--chrome-accent)] border-[var(--chrome-accent)]/30";
    case "muted":
      return "bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/25";
    default:
      return "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] border-[var(--chrome-border)]";
  }
}

export default function AppSidebar({
  onOpenJoin,
  onOpenCreateRoom,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  onOpenGameSheet,
  onCloseMobile,
}: AppSidebarProps) {
  const { section, handleAction } = useNavigation({
    openJoin: onOpenJoin,
    openCreateRoom: onOpenCreateRoom,
    openProfile: onOpenProfile,
    openSettings: onOpenSettings,
    openNotifications: onOpenNotifications,
    openGameSheet: onOpenGameSheet,
  });

  const { playerName, avatarId } = useRoomStore();
  const isMember = useAuthStore((s) => s.isMember);
  const currentDisplayName = playerName.trim() || (isMember ? "Member" : "Guest");
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";

  const renderItem = (item: ResolvedNavigationItem) => {
    const Icon = item.icon;
    const content = (
      <div
        className={`relative w-full flex items-center justify-between gap-2.5 px-3.5 min-h-[44px] rounded-2xl
                    font-bold text-sm transition-all cursor-pointer select-none ${
                      item.active
                        ? "bg-[var(--chrome-active-bg)] text-[var(--chrome-active-ink)] font-extrabold shadow-2xs"
                        : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)]"
                    }`}
      >
        {/* Active state indicator rail bar */}
        {item.active && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[var(--chrome-accent)]"
          />
        )}

        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Icon
            className={`w-5 h-5 flex-shrink-0 transition-colors ${
              item.active ? "text-[var(--chrome-accent)]" : ""
            }`}
          />
          <span className="font-bold text-sm truncate">{item.label}</span>
        </div>

        {/* Badge Indicator */}
        {item.badge && (
          <span
            className={`px-2 py-0.5 text-[9.5px] font-mono font-bold uppercase tracking-wider rounded-md border shrink-0 ${getBadgeStyles(
              item.badge.variant,
            )}`}
          >
            {item.badge.text}
          </span>
        )}
      </div>
    );

    const listItem = item.fullHref ? (
      <li key={item.id} role="listitem">
        <Tooltip content={item.label} side="right" align="center">
          <Link
            to={item.fullHref}
            onClick={onCloseMobile}
            aria-current={item.active ? "page" : undefined}
            className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--chrome-accent)]/50"
          >
            {content}
          </Link>
        </Tooltip>
      </li>
    ) : (
      <li key={item.id} role="listitem">
        <Tooltip content={item.label} side="right" align="center">
          <button
            type="button"
            onClick={() => {
              handleAction(item.action, item.actionParam);
              onCloseMobile?.();
            }}
            className="w-full text-left block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--chrome-accent)]/50"
          >
            {content}
          </button>
        </Tooltip>
      </li>
    );

    if (item.dividerBefore) {
      return (
        <div key={`group-${item.id}`} className="space-y-1">
          <li aria-hidden="true" className="my-2 border-t border-[var(--chrome-hairline)] list-none" />
          {listItem}
        </div>
      );
    }

    return listItem;
  };

  return (
    <aside
      className="flex flex-col w-full h-full lg:w-68 xl:w-72 lg:h-[calc(100vh-5rem)] lg:sticky lg:top-20 flex-shrink-0
                 border-r border-[var(--chrome-hairline)] bg-[var(--chrome-panel)]
                 p-3.5 sm:p-4 overflow-y-auto"
      aria-label="Main Navigation"
    >
      <div className="space-y-3 flex-1 flex flex-col">
        {/* Top Brand Mark — Mobile Drawer Only (Desktop has AppHeader logo above) */}
        <div className="lg:hidden pb-3 mb-1 border-b border-[var(--chrome-hairline)] flex items-center justify-between">
          <Link
            to="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 group min-w-0 select-none"
            aria-label="BHALYAM — go to the lounge home"
          >
            <BhalyamLogo size={36} decorative />
            <div className="flex flex-col min-w-0">
              <span className="font-display font-black text-lg leading-none tracking-wider text-[var(--chrome-ink)] group-hover:text-[var(--chrome-accent)] transition-colors">
                BHALYAM
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--chrome-ink-soft)] leading-tight">
                Game Lounge
              </span>
            </div>
          </Link>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] transition cursor-pointer"
              aria-label="Close Navigation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Section Context Header with Back Link */}
        {section.header && (
          <div className="px-3 py-2.5 rounded-2xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] space-y-1.5 shadow-2xs">
            {section.header.parentPath && (
              <Link
                to={section.header.parentPath}
                onClick={onCloseMobile}
                className="inline-flex items-center gap-1 min-h-[24px] text-[11px] font-extrabold text-[var(--chrome-accent)] hover:underline group"
              >
                <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>{section.header.parentLabel || "Back to Home"}</span>
              </Link>
            )}
            <div className="flex items-center gap-2.5 pt-0.5">
              {section.id === "profile" ? (
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-[var(--chrome-border)] flex items-center justify-center flex-shrink-0 bg-[var(--chrome-active-bg)]">
                  <SeatAvatar
                    avatar={avatarId ?? undefined}
                    name={currentDisplayName}
                    className="w-full h-full"
                    textClassName="text-xs font-black"
                  />
                </div>
              ) : section.header.icon ? (
                <div className="w-7 h-7 rounded-xl bg-[var(--chrome-active-bg)] text-[var(--chrome-accent)] flex items-center justify-center flex-shrink-0">
                  <section.header.icon className="w-4 h-4" />
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink)] truncate">
                  {section.id === "profile" ? currentDisplayName : section.header.title}
                </h2>
                {section.header.subtitle && (
                  <p className="text-[10px] font-semibold text-[var(--chrome-ink-soft)] truncate">
                    {section.header.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav aria-label={section.header?.title || "Sidebar"} className="flex-1">
          <ul role="list" className="space-y-1">
            {section.items.map(renderItem)}
          </ul>
        </nav>

        {/* Theme toggle — mobile drawer only; desktop already carries one in
            AppHeader. This was the gap the header's own comment ("mobile has
            it in drawer/menu") assumed was covered and wasn't — dark/light is
            a local device preference, not a membership feature, so it needs
            no `isMember` gate and works the same for a guest as for anyone
            signed in. */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="relative w-full flex items-center gap-3 px-3.5 min-h-[44px] rounded-2xl
                       font-bold text-sm transition-all cursor-pointer select-none
                       text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)]"
          >
            {isDark ? (
              <Sun className="w-5 h-5 flex-shrink-0" />
            ) : (
              <Moon className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="truncate">{isDark ? "Switch to light mode" : "Switch to dark mode"}</span>
          </button>
        </div>

        {/* Pinned Nostalgic Quote Card */}
        {section.showPromoNote && (
          <div className="mt-auto pt-3">
            <div className="relative p-2.5 rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-center transition-all shadow-xs select-none">
              {/* Washi tape */}
              <div className="absolute -top-1.5 left-3 w-7 h-2.5 bg-[var(--chrome-active-bg)] border-y border-[var(--chrome-border)] shadow-2xs rotate-[-6deg]" />
              <div className="absolute -top-1.5 right-3 w-7 h-2.5 bg-[var(--chrome-active-bg)] border-y border-[var(--chrome-border)] shadow-2xs rotate-[6deg]" />

              <p className="font-script text-[14px] font-bold text-[var(--chrome-accent)] leading-snug">
                Play Together.
              </p>
              <p className="font-script text-[14px] font-bold text-[var(--chrome-accent)] leading-snug">
                Remember Forever. <span className="text-xs">♡</span>
              </p>

              {/* Dotted flight loop with paper plane */}
              <div className="flex justify-center mt-0.5 text-[var(--chrome-accent)]">
                <svg
                  viewBox="0 0 50 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-11 h-4"
                  aria-hidden
                >
                  <path
                    d="M 2 13 Q 18 2 32 11 Q 40 16 46 4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeDasharray="2.5 2.5"
                  />
                  <g transform="translate(38, 1) rotate(15) scale(0.48)">
                    <polygon points="0,15 25,0 12,25 9,16" fill="currentColor" />
                    <polygon points="25,0 9,16 12,25" fill="currentColor" opacity="0.7" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
