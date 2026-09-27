import { lazy, Suspense, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowUpRight, Flame, Heart, Medal, Trophy } from "lucide-react";
import DeleteAccountModal from "../components/auth/DeleteAccountModal";
import AccountSummaryCard from "../features/profile/AccountSummaryCard";
import CareerMetrics from "../features/profile/CareerMetrics";
import FavoriteGames from "../features/profile/FavoriteGames";
import ProfileQuickActions from "../features/profile/ProfileQuickActions";
import StatsOverview from "../features/profile/StatsOverview";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";

const MemberLockedGate = lazy(() => import("../components/auth/MemberLockedGate"));

export default function ProfileOverviewPage() {
  const {
    profile,
    stats,
    achievements,
    recentMatches,
    isMember,
    currentAvatar,
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

  if (!profile) return null;

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const achievementTotal = achievements.length;
  const achievementProgress = achievementTotal === 0 ? 0 : Math.round((unlockedCount / achievementTotal) * 100);
  const featuredAchievements = achievements.slice(0, 3);

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
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bhalyam_profile_${profile.playerId || "player"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {stats && <StatsOverview stats={stats} />}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {stats && <CareerMetrics stats={stats} recentMatches={recentMatches} />}
        </div>

        <section
          aria-labelledby="trophy-road-heading"
          className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_18px_45px_-34px_rgba(41,37,36,0.45)] lg:col-span-4 dark:border-slate-700/70 dark:bg-[#0D1424] dark:shadow-[0_24px_56px_-36px_rgba(0,0,0,0.9)]"
        >
          <header className="border-b border-stone-200/80 px-5 py-5 dark:border-slate-700/70">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                  <Trophy className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="trophy-road-heading" className="text-base font-bold text-stone-950 dark:text-white">Trophy road</h2>
                  <p className="text-sm text-stone-500 dark:text-slate-400">{unlockedCount} of {achievementTotal} unlocked</p>
                </div>
              </div>
              <Link
                to="/profile/achievements"
                aria-label="View all achievements"
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-300 dark:hover:bg-amber-400/10"
              >
                All
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div
                role="progressbar"
                aria-label="Achievement completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={achievementProgress}
                className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800"
              >
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${achievementProgress}%` }} />
              </div>
              <span className="text-sm font-semibold tabular-nums text-stone-700 dark:text-slate-200">{achievementProgress}%</span>
            </div>
          </header>

          <div className="divide-y divide-stone-200/80 px-5 dark:divide-slate-700/70">
            {featuredAchievements.length > 0 ? featuredAchievements.map((achievement) => {
              const AchievementIcon = achievement.id.includes("streak") ? Flame : achievement.id.includes("win") ? Trophy : Medal;
              return (
                <div key={achievement.id} className="flex items-center gap-3 py-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${achievement.unlocked ? "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300" : "bg-stone-100 text-stone-400 dark:bg-slate-800 dark:text-slate-500"}`}>
                    <AchievementIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="truncate text-sm font-semibold text-stone-950 dark:text-white">{achievement.title}</h3>
                      <span className="shrink-0 text-sm text-stone-500 dark:text-slate-400">
                        {achievement.unlocked ? "Unlocked" : "Locked"} · {achievement.currentProgress}/{achievement.targetValue}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-stone-500 dark:text-slate-400">{achievement.description}</p>
                  </div>
                </div>
              );
            }) : (
              <p className="py-8 text-sm text-stone-500 dark:text-slate-400">No achievement progress yet.</p>
            )}
          </div>
        </section>

        <section
          aria-labelledby="favorite-games-heading"
          className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_18px_45px_-34px_rgba(41,37,36,0.45)] lg:col-span-8 dark:border-slate-700/70 dark:bg-[#0D1424] dark:shadow-[0_24px_56px_-36px_rgba(0,0,0,0.9)]"
        >
          <header className="flex items-end justify-between gap-4 border-b border-stone-200/80 px-5 py-5 sm:px-6 dark:border-slate-700/70">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">
                <Heart className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="favorite-games-heading" className="text-base font-bold text-stone-950 dark:text-white">Favorite games</h2>
                <p className="text-sm text-stone-500 dark:text-slate-400">Your most-played tables and mastery</p>
              </div>
            </div>
            <Link
              to="/favorites"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-300 dark:hover:bg-amber-400/10"
            >
              Manage
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </header>
          {stats && <FavoriteGames stats={stats} />}
        </section>

        <aside aria-label="Account settings" className="space-y-6 lg:col-span-4">
          <AccountSummaryCard isMember={isMember} lastSeenAt={profile.lastSeenAt} />
          <ProfileQuickActions
            onExportData={handleExportData}
            onOpenAvatarPicker={openAvatarModal}
            onDeleteAccount={() => setIsDeleteModalOpen(true)}
            playerId={profile.playerId}
          />
        </aside>
      </div>

      <DeleteAccountModal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
    </div>
  );
}