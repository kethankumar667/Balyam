import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Award, Filter, ArrowRight, Trophy, Flame } from "lucide-react";
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
      {/* Page Header with Supercell Trophy Room Atmosphere */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-[0_2px_0_rgba(180,83,9,1)]">
              <Award className="w-4 h-4 text-stone-950" />
            </div>
            <span>Childhood Memory & Trophy Room</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-300 font-medium mt-1">
            Collect nostalgic tokens, school-yard milestones, and unlock XP across BHALYAM games.
          </p>
        </div>

        {/* Supercell Trophy Road Album Progress Gauge */}
        <div className="rounded-2xl p-1 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 shadow-[0_4px_0_rgba(180,83,9,0.9),0_8px_16px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_0_rgba(180,83,9,0.9),0_8px_16px_rgba(0,0,0,0.4)] self-start sm:self-auto">
          <div className="bg-gradient-to-b from-[#FFFDF9] to-[#F5ECE0] dark:from-[#1c140a] dark:to-[#0c0803] rounded-[14px] px-4 py-2.5 flex items-center gap-3.5 border-t border-amber-300/80 dark:border-amber-300/40">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 dark:text-amber-300/80 font-mono block">
                Album Progress
              </span>
              <span className="text-xs font-black text-stone-900 dark:text-white font-mono">
                {unlockedCount} of {achievements.length || 25} Badges ({completionPct}%)
              </span>
            </div>
            <div className="w-11 h-11 rounded-full border-2 border-amber-400 flex items-center justify-center text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 font-mono shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)] dark:shadow-[0_0_10px_rgba(245,158,11,0.5)]">
              {completionPct}%
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Filter 3D Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
        <div className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 font-mono flex items-center gap-1.5 shrink-0 mr-1">
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
              className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                active
                  ? "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-stone-950 border-b-4 border-amber-800 shadow-[0_3px_0_rgba(180,83,9,1)] active:border-b-0 active:translate-y-1"
                  : "bg-white dark:bg-[#0c1424] text-stone-700 dark:text-stone-300 border-2 border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-[#131d33]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Achievements Showcase Panel ── */}
      <AchievementsPanel
        achievements={filteredAchievements}
        onSelectAchievement={(ach) => setActiveUnlockModal(ach)}
      />

      {/* ── Bottom Banner (More badges coming soon!) ── */}
      <div className="relative rounded-3xl p-1 bg-gradient-to-b from-purple-400/40 to-purple-700/40 dark:from-purple-500/30 dark:to-purple-800/30 shadow-lg">
        <div className="bg-gradient-to-b from-[#FAF5FF] via-[#F3E8FF] to-[#E9D5FF] dark:from-[#141026] dark:via-[#0d0b1a] dark:to-[#07060f] rounded-[22px] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-purple-300 dark:border-purple-500/30">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-purple-500 to-purple-700 text-white text-2xl flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(88,28,135,1)]">
              🎁
            </div>
            <div>
              <h3 className="font-black text-sm text-stone-900 dark:text-white tracking-tight">
                More nostalgic badges coming soon!
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium mt-0.5">
                Play tournament matches, finish daily streaks, and fill your trophy room.
              </p>
            </div>
          </div>

          <Link
            to="/profile/matches"
            className="text-xs font-black uppercase tracking-wider text-stone-950 bg-gradient-to-b from-amber-400 to-amber-600 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 px-5 py-2.5 min-h-[44px] rounded-xl transition inline-flex items-center gap-2 whitespace-nowrap shadow-md cursor-pointer"
          >
            <span>View Match Logs</span>
            <ArrowRight className="w-4 h-4 text-stone-950" />
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
