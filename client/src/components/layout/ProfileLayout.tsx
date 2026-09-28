import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";
import ProfileHeader from "../../features/profile/ProfileHeader";
import { PROFILE_NAV_ITEMS } from "../../features/profile/profileNavigation";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

interface ProfileLayoutProps {
  children: ReactNode;
  profile?: PlayerProfile | null;
  isMember?: boolean;
  onEditName?: () => void;
  name?: string;
  avatar?: string | null;
  favoriteGame?: string;
  badgeLabel?: string;
  compactHeader?: boolean;
}

function isProfileRouteActive(pathname: string, path: string): boolean {
  return path === "/profile" ? pathname === path : pathname.startsWith(path);
}

export default function ProfileLayout({
  children,
  profile,
  isMember = true,
  onEditName,
  name,
  avatar,
}: ProfileLayoutProps) {
  const { pathname } = useLocation();
  const { play } = useAudio();

  const handleNavigation = (active: boolean) => {
    if (active) return;
    play(AUDIO.UI_TOGGLE);
    HapticsManager.getInstance().subtle();
  };

  return (
    <div className="relative min-h-full shrink-0 overflow-hidden bg-surface-0 px-3 pb-24 pt-4 text-ink-hi sm:px-5 sm:pt-5 lg:px-8 lg:pb-16 lg:pt-7">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-info/10 blur-3xl dark:bg-info/15" />
        <div className="absolute -left-24 top-64 h-72 w-72 rounded-full bg-lamp-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(var(--text-hi)_1px,transparent_1px),linear-gradient(90deg,var(--text-hi)_1px,transparent_1px)] [background-size:28px_28px] dark:opacity-[0.045]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/games"
            onClick={() => play(AUDIO.UI_CLICK)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-surface-1 px-3 text-sm font-semibold text-ink-mid transition hover:bg-surface-2 hover:text-ink-hi active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 dark:border-slate-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Games</span>
          </Link>
          <Link
            to="/settings/preferences"
            onClick={() => play(AUDIO.UI_CLICK)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-surface-1 px-3 text-sm font-semibold text-ink-mid transition hover:bg-surface-2 hover:text-ink-hi active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 dark:border-slate-700"
            aria-label="Profile preferences"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Preferences</span>
          </Link>
        </div>

        {profile && (
          <ProfileHeader
            profile={profile}
            isMember={isMember}
            onEditName={onEditName}
            name={name}
            avatar={avatar}
          />
        )}

        <nav
          aria-label="Profile sections"
          className="sticky top-0 z-30 -mx-3 border-y border-stone-300/80 bg-surface-0/95 px-3 py-2 backdrop-blur-xl sm:mx-0 sm:rounded-xl sm:border dark:border-slate-700/80"
        >
          <ul className="grid grid-cols-4 gap-1 sm:gap-2">
            {PROFILE_NAV_ITEMS.map((item) => {
              const active = isProfileRouteActive(pathname, item.path);
              const Icon = item.icon;
              return (
                <li key={item.path} className="min-w-0">
                  <Link
                    to={item.path}
                    onClick={() => handleNavigation(active)}
                    aria-current={active ? "page" : undefined}
                    aria-label={`${item.label}: ${item.description}`}
                    className={`group relative flex min-h-[48px] min-w-[44px] items-center justify-center gap-1.5 overflow-hidden rounded-lg px-1.5 text-[10px] font-bold transition sm:gap-2 sm:px-3 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 ${
                      active
                        ? "bg-surface-2 text-ink-hi shadow-sm"
                        : "text-ink-mid hover:bg-surface-1 hover:text-ink-hi active:translate-y-px"
                    }`}
                  >
                    <span className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full ${active ? "bg-lamp-500" : "bg-transparent"}`} aria-hidden="true" />
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-lamp-700 dark:text-lamp-300" : "text-ink-lo"}`} aria-hidden="true" />
                    <span className="truncate sm:hidden">{item.shortLabel}</span>
                    <span className="hidden truncate sm:inline">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div id="profile-route-content" tabIndex={-1} className="min-h-[24rem] scroll-mt-24 focus:outline-none">
          {children}
        </div>
      </div>
    </div>
  );
}
