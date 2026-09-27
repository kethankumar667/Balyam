import { lazy, Suspense, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Heart, Award, ChevronDown, Trophy, Flame } from "lucide-react";
import DeleteAccountModal from "../components/auth/DeleteAccountModal";

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
    recentMatches,
    isMember,
    currentAvatar,
    openEditModal,
    openAvatarModal,
  } = useOutletContext<ProfileFamilyOutletContext>();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
          {stats && <CareerMetrics stats={stats} recentMatches={recentMatches} />}
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
            onDeleteAccount={() => setIsDeleteModalOpen(true)}
            playerId={profile.playerId}
          />
        </div>
      </div>

      {/* ── Section 3: Bottom Row (Favorite Games + Trophy Road Achievements) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Favorite Games Panel (Miniclip Deck Showcase) */}
        <div className="relative rounded-3xl p-0.5 bg-linear-to-b from-stone-300 via-stone-400/40 to-stone-500/70 dark:from-slate-700 dark:via-slate-800/40 dark:to-slate-950 shadow-[0_6px_0_rgba(15,23,42,0.8)] h-full flex flex-col">
          <div className="bg-linear-to-b from-[#FFFDF9] to-[#F7EDE0] dark:from-[#172033] dark:to-[#0D1322] rounded-[22px] p-6 sm:p-7 space-y-4 border border-stone-200/80 dark:border-white/10 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/40 flex items-center justify-center shadow-xs">
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-stone-900 dark:text-white uppercase tracking-tight">
                      Favorite Games
                    </h3>
                    <span className="text-[11px] text-stone-500 dark:text-slate-400 font-bold">
                      Your pinned battle stations
                    </span>
                  </div>
                </div>
                <Link
                  to="/favorites"
                  className="text-xs font-black text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition px-3 py-1.5 min-h-[44px] inline-flex items-center uppercase tracking-wider"
                >
                  View all →
                </Link>
              </div>
              <div className="pt-2">
                {stats && <FavoriteGames stats={stats} />}
              </div>
            </div>
          </div>
        </div>

        {/* Achievements Panel (Supercell Trophy Road Showcase) */}
        <div className="relative rounded-3xl p-0.5 bg-linear-to-b from-amber-400/70 via-amber-500/30 to-amber-700/70 dark:from-amber-400/50 dark:via-amber-600/20 dark:to-amber-900/50 shadow-[0_6px_0_rgba(180,83,9,0.7)] h-full flex flex-col">
          <div className="bg-linear-to-b from-[#FFFDF9] to-[#F7EDE0] dark:from-[#172033] dark:to-[#0D1322] rounded-[22px] p-6 sm:p-7 space-y-4 border border-stone-200/80 dark:border-white/10 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center font-black shadow-[0_2px_0_rgba(180,83,9,0.8)] border border-amber-300">
                    <Award className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-stone-900 dark:text-white uppercase tracking-tight">
                      Trophy Road
                    </h3>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">
                      {unlockedCount} of 25 unlocked
                    </span>
                  </div>
                </div>
                <Link
                  to="/profile/achievements"
                  className="text-xs font-black text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition px-3 py-1.5 min-h-[44px] inline-flex items-center uppercase tracking-wider"
                >
                  All badges →
                </Link>
              </div>

              {/* Overall Unlock Progress Bar (Thick XP Capsule) */}
              <div className="pt-3 pb-1">
                <div className="h-2.5 bg-stone-200 dark:bg-slate-900 rounded-full overflow-hidden p-0.5 border border-stone-300/80 dark:border-slate-800">
                  <div
                    className="h-full bg-linear-to-r from-amber-500 via-yellow-400 to-amber-400 rounded-full transition-all duration-500 shadow-inner"
                    style={{ width: `${Math.round((unlockedCount / 25) * 100)}%` }}
                  />
                </div>
              </div>

              {/* List of 3 Preview Achievements */}
              <div className="space-y-2.5 pt-2">
                {recentAchievements.length > 0 ? (
                  recentAchievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="group bg-white/80 dark:bg-slate-900/80 border-2 border-stone-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2 shadow-xs hover:border-amber-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 border border-amber-300 shadow-[0_2px_0_rgba(180,83,9,0.8)] font-black group-hover:scale-105 transition-transform">
                            {ach.id.includes("streak") ? (
                              <Flame className="w-4 h-4 text-stone-950 fill-stone-950" />
                            ) : ach.id.includes("win") ? (
                              <Trophy className="w-4 h-4 text-stone-950" />
                            ) : (
                              <span className="text-sm">🎲</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-black text-xs text-stone-900 dark:text-white">
                              {ach.title}
                            </h4>
                            <p className="text-[11px] text-stone-600 dark:text-slate-400 font-medium leading-snug">
                              {ach.description}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-black text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md shrink-0">
                          {ach.currentProgress} / {ach.targetValue}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1 h-2 bg-stone-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-linear-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300 shadow-xs"
                            style={{ width: `${ach.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-black text-stone-600 dark:text-slate-400 shrink-0">
                          {ach.progressPercent}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-stone-400 dark:text-slate-500 font-bold">
                    No achievements tracked yet.
                  </div>
                )}
              </div>
            </div>

            {/* View All Achievements Button (3D Arcade Press) */}
            <div className="pt-3">
              <Link
                to="/profile/achievements"
                className="w-full py-3 min-h-[44px] inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-xl border-b-4 border-stone-300 dark:border-slate-900 active:border-b-0 active:translate-y-1 transition shadow-xs cursor-pointer"
              >
                <span>View All 25 Badges &amp; Trophies</span>
                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
