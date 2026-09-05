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
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-rose-500/20 dark:via-transparent dark:to-purple-500/10 shadow-sm self-start">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-6 sm:p-7 space-y-4 border border-stone-200/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 border border-rose-200/60 dark:border-rose-500/30 flex items-center justify-center shadow-xs">
                  <Heart className="w-4 h-4 fill-rose-500" />
                </div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  Favorite Games
                </h3>
              </div>
              <Link
                to="/favorites"
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
              >
                View all →
              </Link>
            </div>
            {stats && <FavoriteGames stats={stats} />}
          </div>
        </div>

        {/* Achievements Panel */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-amber-500/20 dark:via-transparent dark:to-amber-500/10 shadow-sm self-start">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-6 sm:p-7 space-y-4 border border-stone-200/60 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-center shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                    Achievements
                  </h3>
                  <span className="text-[11px] text-stone-400 dark:text-slate-400 font-medium">
                    {unlockedCount} of 25 unlocked
                  </span>
                </div>
              </div>
              <Link
                to="/profile/achievements"
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition"
              >
                All badges →
              </Link>
            </div>

            {/* List of 3 Preview Achievements */}
            <div className="space-y-2.5">
              {recentAchievements.length > 0 ? (
                recentAchievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="group bg-stone-50/80 dark:bg-[#151c2e] border border-stone-200/60 dark:border-white/5 rounded-2xl p-3.5 space-y-2 hover:border-amber-500/30 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1c243c] border border-stone-200/80 dark:border-white/10 text-stone-600 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                          {ach.id.includes("streak") ? (
                            <Flame className="w-4 h-4 text-amber-500" />
                          ) : ach.id.includes("win") ? (
                            <Trophy className="w-4 h-4 text-amber-500" />
                          ) : (
                            <span className="text-sm">🎲</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                            {ach.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-snug">
                            {ach.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-stone-600 dark:text-slate-300 bg-stone-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                        {ach.currentProgress} / {ach.targetValue}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 h-1.5 bg-stone-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                          style={{ width: `${ach.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-stone-400 dark:text-slate-400 shrink-0">
                        {ach.progressPercent}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-stone-400 dark:text-slate-500">
                  No achievements tracked yet.
                </div>
              )}
            </div>

            {/* View All Achievements Button */}
            <div className="pt-1">
              <Link
                to="/profile/achievements"
                className="w-full py-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-stone-700 dark:text-slate-200 bg-stone-100/80 dark:bg-slate-800/60 rounded-xl border border-stone-200 dark:border-slate-700 hover:bg-stone-200/80 dark:hover:bg-slate-800 transition"
              >
                <span>View All Achievements</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
