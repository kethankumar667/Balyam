import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  UserCheck,
  BarChart3,
  History,
  Award,
  Settings,
  Sparkles,
} from "lucide-react";
import ProfileHeader from "../../features/profile/ProfileHeader";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";

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

const PROFILE_TABS = [
  { path: "/profile", label: "Overview", icon: LayoutDashboard },
  { path: "/profile/personal", label: "Identity & Bio", icon: UserCheck },
  { path: "/profile/statistics", label: "Statistics", icon: BarChart3 },
  { path: "/profile/matches", label: "Match History", icon: History },
  { path: "/profile/achievements", label: "Badges & Trophies", icon: Award },
];

export default function ProfileLayout({
  children,
  profile,
  isMember = true,
  onEditName,
  name,
  avatar,
  favoriteGame,
  badgeLabel,
  compactHeader,
}: ProfileLayoutProps) {
  const { pathname } = useLocation();
  const isCompact = compactHeader ?? (pathname !== "/profile" && pathname !== "/profile/personal");

  return (
    <div className="min-h-[85vh] bhalyam-paper auth-shell py-6 sm:py-10 px-3.5 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Lounge Bar: Back Link & Settings Link */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/games"
            className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors min-h-[44px] py-2 px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded-xl"
          >
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Game Lounge</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/settings/preferences"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors min-h-[44px] py-2 px-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10"
            >
              <Settings className="w-4 h-4 text-amber-500" />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Profile Hero Header */}
        {profile && (
          <ProfileHeader
            profile={profile}
            isMember={isMember}
            onEditName={onEditName}
            name={name}
            avatar={avatar}
            compact={isCompact}
            favoriteGame={favoriteGame}
            badgeLabel={badgeLabel}
          />
        )}

        {/* ── Segmented Dossier Tab Navigation ── */}
        <nav
          aria-label="Profile dossier sections"
          className="bg-stone-200/50 dark:bg-[#111728]/80 backdrop-blur-md border border-stone-300/60 dark:border-[#222c42] p-1.5 rounded-2xl shadow-xs"
        >
          <ul className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-0.5">
            {PROFILE_TABS.map((tab) => {
              const active = pathname === tab.path;
              const Icon = tab.icon;

              return (
                <li key={tab.path} className="shrink-0">
                  <Link
                    to={tab.path}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 min-h-[44px] select-none cursor-pointer border ${
                      active
                        ? "bg-white dark:bg-[#1a233a] text-amber-700 dark:text-amber-400 border-stone-300/80 dark:border-[#2e3b56] shadow-sm font-black"
                        : "text-stone-600 dark:text-slate-400 border-transparent hover:text-stone-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        active
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-stone-400 dark:text-slate-500 group-hover:text-stone-700"
                      }`}
                    />
                    <span>{tab.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Dedicated Sub-Page Content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
