import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Crosshair,
  LayoutGrid,
  LockKeyhole,
  Medal,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import AchievementsPanel from "../features/profile/AchievementsPanel";
import { AchievementRevealModal } from "../features/profile/AchievementRevealModal";
import {
  ProfileEmptyState,
  ProfileErrorState,
  ProfileMetricTile,
  ProfilePageHeading,
  ProfilePanelSkeleton,
  ProfileProgressBar,
  ProfileSection,
} from "../features/profile/ProfilePrimitives";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";
import type { Achievement } from "@shared/profile/Achievements";

type FilterCategory = "all" | Achievement["category"];

interface CategoryTab {
  id: FilterCategory;
  label: string;
  icon: LucideIcon;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "progression", label: "Journey", icon: TrendingUp },
  { id: "skill", label: "Mastery", icon: Crosshair },
  { id: "resilience", label: "Resilience", icon: ShieldCheck },
  { id: "social", label: "Social", icon: Users },
];

export default function AchievementsPage() {
  const { profile, achievements, resources, isMember, retryProfileData } = useOutletContext<ProfileFamilyOutletContext>();
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const completionPercent = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;
  const filteredAchievements = useMemo(
    () => selectedCategory === "all"
      ? achievements
      : achievements.filter((achievement) => achievement.category === selectedCategory),
    [achievements, selectedCategory],
  );

  if (!isMember) return <MemberLockedGate feature="profile" />;
  if (!profile) return null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProfilePageHeading
        icon={Trophy}
        eyebrow="Milestones & mastery"
        title="Trophy vault"
        description="Track every earned badge, inspect the next unlock, and see how your BHALYAM career is taking shape."
        accent="gold"
        action={(
          <Link
            to="/profile/matches"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-surface-1 px-4 text-sm font-bold text-ink-hi transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 dark:border-slate-600"
          >
            Battle archive
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <ProfileMetricTile label="Unlocked" value={String(unlockedCount)} detail="Badges secured" icon={CheckCircle2} accent="green" />
        <ProfileMetricTile label="Still locked" value={String(Math.max(0, achievements.length - unlockedCount))} detail="Targets remaining" icon={LockKeyhole} accent="violet" />
        <div className="col-span-2 rounded-xl border border-stone-300/80 bg-surface-1 p-4 shadow-[0_18px_40px_-34px_rgba(74,37,8,0.5)] dark:border-slate-700/80 lg:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-ink-mid">Vault progress</p>
              <p className="mt-1 font-mono text-2xl font-black text-ink-hi tabular-nums">{completionPercent}%</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lamp-100 text-lamp-800 dark:bg-lamp-500/15 dark:text-lamp-300">
              <Medal className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3">
            <ProfileProgressBar label="Vault completion" value={completionPercent} accent="gold" showValue={false} />
          </div>
        </div>
      </div>

      <ProfileSection
        title="Achievement collection"
        description="Filter the vault by the type of challenge you want to pursue next."
        icon={Award}
        accent="gold"
      >
        <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Achievement categories">
          {CATEGORY_TABS.map(({ id, label, icon: Icon }) => {
            const active = selectedCategory === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(id)}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 ${
                  active
                    ? "border-lamp-500 bg-lamp-100 text-lamp-900 dark:bg-lamp-500/15 dark:text-lamp-200"
                    : "border-stone-300 bg-surface-0 text-ink-mid hover:bg-surface-2 dark:border-slate-600"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        {resources.achievements.status === "loading" ? <ProfilePanelSkeleton rows={6} /> : null}
        {resources.achievements.status === "error" ? (
          <ProfileErrorState
            title="Trophy vault unavailable"
            description="Your achievement progress could not be loaded right now."
            onRetry={retryProfileData}
          />
        ) : null}
        {resources.achievements.status === "ready" && filteredAchievements.length === 0 ? (
          <ProfileEmptyState
            icon={Award}
            title="No badges in this category"
            description="Choose another category, or keep playing to unlock new milestones."
            actionLabel={selectedCategory === "all" ? undefined : "Show all badges"}
            onAction={selectedCategory === "all" ? undefined : () => setSelectedCategory("all")}
          />
        ) : null}
        {resources.achievements.status === "ready" && filteredAchievements.length > 0 ? (
          <AchievementsPanel
            achievements={filteredAchievements}
            onSelectAchievement={setActiveAchievement}
          />
        ) : null}
      </ProfileSection>

      <AchievementRevealModal
        achievement={activeAchievement}
        isOpen={activeAchievement !== null}
        onClose={() => setActiveAchievement(null)}
      />
    </div>
  );
}
