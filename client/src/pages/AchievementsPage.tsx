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
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-[#EA580C]" />
            <span>Childhood Memory & Badge Album</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Collect nostalgic tokens, school-yard milestones, and unlock XP across BHALYAM games.
          </p>
        </div>

        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-2xl px-4 py-2 flex items-center gap-3 shadow-xs self-start sm:self-auto">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Album Progress</span>
            <span className="text-xs font-bold text-[#EA580C]">
              {unlockedCount} of {achievements.length || 25} Badges ({completionPct}%)
            </span>
          </div>
          <div className="w-10 h-10 rounded-full border border-[#EFEBE4] dark:border-[#222A44] flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 shrink-0">
            {completionPct}%
          </div>
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <div className="text-xs font-bold text-[#EA580C] flex items-center gap-1.5 shrink-0 mr-1">
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
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                active
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"
                  : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50 dark:hover:bg-slate-800"
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
      <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-2xl flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/40">
            🎁
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              More badges coming soon!
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Keep playing, keep winning, and unlock all 25 achievements.
            </p>
          </div>
        </div>

        <Link
          to="/profile/matches"
          className="text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 px-4 py-2 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/50 transition inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
        >
          <span>View Match Logs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
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
