import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Award, Filter, ArrowRight } from "lucide-react";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import AchievementsPanel from "../features/profile/AchievementsPanel";
import { AchievementRevealModal } from "../features/profile/AchievementRevealModal";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";

import type { Achievement } from "@shared/profile/Achievements";

type FilterCategory = "all" | "progression" | "skill" | "resilience" | "social";

const CATEGORY_TABS: { id: FilterCategory; label: string; icon: string }[] = [
  { id: "all", label: "All Badges", icon: "⭐" },
  { id: "progression", label: "Nostalgia & Journey", icon: "☀️" },
  { id: "skill", label: "Game Mastery", icon: "🎖️" },
  { id: "resilience", label: "Comebacks & Tenacity", icon: "🛡️" },
  { id: "social", label: "Lounge Friends", icon: "🤝" },
];

/**
 * Data, the Edit Profile / Avatar Picker modals, and the `<ProfileLayout>`
 * sidebar all live one level up now, in ProfileFamilyLayout — see that
 * file's header comment for why. This page only renders its own content and
 * reads what it needs via `useOutletContext`.
 */
export default function AchievementsPage() {
  const { profile, achievements, isMember } = useOutletContext<ProfileFamilyOutletContext>();

  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [activeUnlockModal, setActiveUnlockModal] = useState<Achievement | null>(null);

  if (!isMember) {
    return <MemberLockedGate feature="profile" />;
  }

  if (!profile) return null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const filteredAchievements = selectedCategory === "all"
    ? achievements
    : achievements.filter((a) => a.category === selectedCategory);

  const completionPct = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header with Childhood Memory Album Tone */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Childhood Memory & Trophy Room</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-slate-400 font-medium mt-0.5">
            Collect nostalgic tokens, school-yard milestones, and unlock XP across BHALYAM games.
          </p>
        </div>

        <div className="relative rounded-2xl p-0.5 bg-gradient-to-b from-amber-500/30 to-amber-500/10 shadow-xs self-start sm:self-auto">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[14px] px-4 py-2 flex items-center gap-3 border border-amber-500/20">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-stone-400 dark:text-slate-400 block">Album Progress</span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                {unlockedCount} of {achievements.length || 25} Badges ({completionPct}%)
              </span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/40 flex items-center justify-center text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 shrink-0 shadow-inner">
              {completionPct}%
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Category:</span>
        </div>
        {CATEGORY_TABS.map((tab) => {
          const active = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                active
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black shadow-md shadow-amber-500/20 scale-[1.02]"
                  : "bg-white/90 dark:bg-[#151c2e] text-stone-600 dark:text-slate-300 border border-stone-200/80 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Achievements Showcase Panel ── */}
      <AchievementsPanel achievements={filteredAchievements} />

      {/* ── Bottom Banner (More badges coming soon!) ── */}
      <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-purple-500/20 dark:via-transparent dark:to-purple-500/10 shadow-xs">
        <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-stone-200/60 dark:border-white/5">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-2xl flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/40 shadow-xs">
              🎁
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                More nostalgic badges coming soon!
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                Play tournament matches, finish daily streaks, and fill your trophy room.
              </p>
            </div>
          </div>

          <Link
            to="/profile/matches"
            className="text-xs font-bold text-stone-900 dark:text-white bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-stone-200 dark:border-slate-700 px-5 py-2.5 rounded-xl transition inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <span>View Match Logs</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
          </Link>
        </div>
      </div>

      {/* ── Modal for Achievement Reveal if clicked ── */}
      <AchievementRevealModal
        achievement={activeUnlockModal}
        isOpen={!!activeUnlockModal}
        onClose={() => setActiveUnlockModal(null)}
      />
    </div>
  );
}
