import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useNavigation } from "../../navigation/useNavigation";
import type { NavBadge, ResolvedNavigationItem } from "../../navigation/types";
import { useRoomStore } from "../../store/roomStore";
import { useAuthStore } from "../../store/authStore";
import SeatAvatar from "../profile/SeatAvatar";

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

  const renderItem = (item: ResolvedNavigationItem) => {
    const Icon = item.icon;
    const content = (
      <div
        className={`relative w-full flex items-center justify-between gap-2.5 pl-4 pr-3.5 min-h-[44px] rounded-2xl
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

        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={`w-5 h-5 flex-shrink-0 transition-colors ${
              item.active ? "text-[var(--chrome-accent)]" : ""
            }`}
          />
          <span className="truncate">{item.label}</span>
        </div>

        {/* Badge Indicator */}
        {item.badge && (
          <span
            className={`px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border flex-shrink-0 ${getBadgeStyles(
              item.badge.variant,
            )}`}
          >
            {item.badge.text}
          </span>
        )}
      </div>
    );

    if (item.fullHref) {
      return (
        <li key={item.id} role="listitem">
          <Link
            to={item.fullHref}
            onClick={onCloseMobile}
            aria-current={item.active ? "page" : undefined}
            className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--chrome-accent)]/50"
          >
            {content}
          </Link>
        </li>
      );
    }

    return (
      <li key={item.id} role="listitem">
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
      </li>
    );
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-64 h-[calc(100vh-5rem)] sticky top-20 flex-shrink-0
                 border-r border-[var(--chrome-hairline)] bg-[var(--chrome-panel)]
                 p-4 overflow-y-auto"
      aria-label="Main Navigation"
    >
      <div className="space-y-3">
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
        <nav aria-label={section.header?.title || "Sidebar"}>
          <ul role="list" className="space-y-1">
            {section.items.map(renderItem)}
          </ul>
        </nav>
      </div>

      {/* Optional Sticky / Pinned Promo Note */}
      {section.showPromoNote && (
        <div className="mt-4 pt-2">
          <div className="relative p-3.5 rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-center transition-all shadow-sm select-none">
            {/* Washi tape */}
            <div className="absolute -top-2 left-2 w-9 h-3.5 bg-[var(--chrome-active-bg)] border-y border-[var(--chrome-border)] shadow-xs rotate-[-8deg]" />
            <div className="absolute -top-2 right-2 w-9 h-3.5 bg-[var(--chrome-active-bg)] border-y border-[var(--chrome-border)] shadow-xs rotate-[8deg]" />

            <p className="font-script text-[17px] font-bold text-[var(--chrome-accent)] leading-tight">
              Play Together.
            </p>
            <p className="font-script text-[17px] font-bold text-[var(--chrome-accent)] leading-tight">
              Remember
            </p>
            <p className="font-script text-[17px] font-bold text-[var(--chrome-accent)] leading-tight">
              Forever.
            </p>
            <p className="font-script text-[15px] font-bold text-[var(--chrome-accent)]" aria-hidden>
              ♡
            </p>

            {/* Dotted flight loop */}
            <div className="flex justify-center mt-1 text-[var(--chrome-accent)]">
              <svg
                viewBox="0 0 70 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-16 h-6"
                aria-hidden
              >
                <path
                  d="M 2 18 Q 25 2 45 15 Q 55 22 65 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <g transform="translate(54, 2) rotate(15) scale(0.65)">
                  <polygon points="0,15 25,0 12,25 9,16" fill="currentColor" />
                  <polygon points="25,0 9,16 12,25" fill="currentColor" opacity="0.7" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
