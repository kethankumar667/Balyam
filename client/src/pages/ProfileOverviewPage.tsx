import { lazy, Suspense } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Heart, Award, ChevronDown, Trophy, Flame } from "lucide-react";

const MemberLockedGate = lazy(() => import("../components/auth/MemberLockedGate"));

// Profile Features
import StatsOverview from "../features/profile/StatsOverview";
import FavoriteGames from "../features/profile/FavoriteGames";
import CareerMetrics from "../features/profile/CareerMetrics";
import AccountSummaryCard from "../features/profile/AccountSummaryCard";
import ProfileQuickActions from "../features/profile/ProfileQuickActions";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";

/**
 * Data, the Edit Profile / Avatar Picker modals, and the `<ProfileLayout>`
 * sidebar all live one level up now, in ProfileFamilyLayout — see that
 * file's header comment for why. This page only renders its own content and
 * reads what it needs via `useOutletContext`.
 */
export default function ProfileOverviewPage() {
  const {
    profile,
    stats,
    achievements,
    isMember,
    currentAvatar,
    openEditModal,
    openAvatarModal,
  } = useOutletContext<ProfileFamilyOutletContext>();

  if (!isMember) {
    return (
      <Suspense fallback={null}>
        <MemberLockedGate feature="profile" />
      </Suspense>
    );
  }

  // The family layout shows its own skeleton while `profile` is loading, so
  // this only guards the brief gap before that first render settles.
  if (!profile) return null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const recentAchievements = achievements.slice(0, 3);

  const handleExportData = () => {
    const exportPayload = {
      playerId: profile.playerId,
      displayName: profile.displayName,
      avatar: currentAvatar,
      memberSince: new Date(profile.joinedAt).toISOString(),
      stats,
      achievements,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bhalyam_profile_${profile.playerId || "player"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ── Section 1: 4 Stats Cards Row ── */}
      {stats && <StatsOverview stats={stats} />}

      {/* ── Section 2: Middle 2-Column Section (Highlights/Activity + Account/Actions) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column: Your Game Journey & Play Style */}
        <div className="lg:col-span-2 space-y-6">
          {stats && <CareerMetrics stats={stats} />}
        </div>

        {/* Right Rail: Account Summary & Quick Actions */}
        <div className="space-y-6">
          <AccountSummaryCard
            isMember={isMember}
            lastSeenAt={profile.lastSeenAt}
          />

          <ProfileQuickActions
            onExportData={handleExportData}
            onOpenAvatarPicker={openAvatarModal}
          />
        </div>
      </div>

      {/* ── Section 3: Bottom Row (Favorite Games + Achievements) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Favorite Games Panel */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs self-start">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Favorite Games
              </h3>
            </div>
            <Link
              to="/favorites"
              className="text-xs font-bold text-[#6D28D9] hover:underline"
            >
              View all →
            </Link>
          </div>
          {stats && <FavoriteGames stats={stats} />}
        </div>

        {/* Achievements Panel */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs self-start">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Achievements ({unlockedCount}/25)
              </h3>
            </div>
            <Link
              to="/profile/achievements"
              className="text-xs font-bold text-[#EA580C] hover:underline"
            >
              All 25 badges →
            </Link>
          </div>

          {/* List of 3 Preview Achievements */}
          <div className="space-y-3">
            {recentAchievements.length > 0 ? (
              recentAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className="bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] rounded-2xl p-3.5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                        {ach.id.includes("streak") ? (
                          <Flame className="w-4 h-4 text-amber-500" />
                        ) : ach.id.includes("win") ? (
                          <Trophy className="w-4 h-4 text-amber-500" />
                        ) : (
                          <span className="text-sm">🎲</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                          {ach.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {ach.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                      {ach.currentProgress} / {ach.targetValue}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                        style={{ width: `${ach.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                      {ach.progressPercent}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                No achievements tracked yet.
              </div>
            )}
          </div>

          {/* View All Achievements Button */}
          <div className="pt-1">
            <Link
              to="/profile/achievements"
              className="w-full py-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <span>View All Achievements</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
