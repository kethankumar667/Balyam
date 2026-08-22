import React, { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Trophy, BarChart3 } from "lucide-react";
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
  const isOverview = pathname === "/profile" || pathname === "/profile/overview";
  const isPersonal = pathname === "/profile/personal";
  const isStatistics = pathname === "/profile/statistics";
  const isAchievements = pathname === "/profile/achievements";
  const isMatches = pathname === "/profile/matches" || pathname === "/profile/history";
  const isCompact = compactHeader !== undefined ? compactHeader : (!isOverview && !isPersonal && !isStatistics && !isAchievements && !isMatches);

  return (
    <div className="min-h-screen bhalyam-paper py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Breadcrumb & Lounge Navigation */}
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Lounge</span>
            </Link>

            <div className="flex items-center gap-4 text-xs font-bold">
              <Link
                to="/tournaments"
                className="text-amber-600 dark:text-amber-400 hover:underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Tournaments</span>
              </Link>
              <Link
                to="/leaderboard"
                className="text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Leaderboard</span>
              </Link>
            </div>
          </div>

          {/* Profile Header (Full Hero on Overview and Personal pages) */}
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

          {/* Dedicated Sub-Page Content */}
          <main>{children}</main>
        </div>
      </div>
  );
}
