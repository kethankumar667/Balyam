import React, { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Trophy, BarChart3, Lock } from "lucide-react";
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
  const isCompact = compactHeader ?? (pathname !== "/profile" && pathname !== "/profile/personal");

  return (
    <div className="min-h-[85vh] bhalyam-paper auth-shell py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
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

            <div className="flex items-center gap-3 text-xs font-bold text-[var(--auth-ink-soft)] opacity-60">
              <span className="inline-flex items-center gap-1.5 cursor-not-allowed py-2">
                <Trophy className="w-3.5 h-3.5" />
                <span>Tournaments</span>
                <Lock className="w-3 h-3" />
              </span>
              <span className="inline-flex items-center gap-1.5 cursor-not-allowed py-2">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Leaderboard</span>
                <Lock className="w-3 h-3" />
              </span>
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
