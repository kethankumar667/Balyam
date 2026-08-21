import React, { useState, useEffect } from "react";
import { Award, Trophy, Sparkles, Filter, Heart, Gamepad2, Users, Shield } from "lucide-react";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
import ProfileLayout from "../components/layout/ProfileLayout";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import AchievementsPanel from "../features/profile/AchievementsPanel";
import { AchievementRevealModal } from "../features/profile/AchievementRevealModal";
import { ProfileSkeleton } from "../design-system/dls";
import { ACHIEVEMENT_CATALOG } from "@shared/profile/Achievements";

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { Achievement } from "@shared/profile/Achievements";

type FilterCategory = "all" | "skill" | "progression" | "resilience" | "social";

const CATEGORY_TABS: { id: FilterCategory; label: string; icon: string }[] = [
  { id: "all", label: "All Badges", icon: "✨" },
  { id: "progression", label: "Nostalgia & Journey", icon: "🌟" },
  { id: "skill", label: "Game Mastery", icon: "🏆" },
  { id: "resilience", label: "Comebacks & Tenacity", icon: "🛡️" },
  { id: "social", label: "Lounge Friends", icon: "🤝" },
];

export default function AchievementsPage() {
  const isMember = useAuthStore((s) => s.isMember);
  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [activeUnlockModal, setActiveUnlockModal] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);

  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  if (!isMember) {
    return <MemberLockedGate feature="profile" />;
  }

  useEffect(() => {
    if (!identityReady || !effectivePlayerId) return;

    async function fetchData() {
      try {
        const [profRes, achRes] = await Promise.all([
          apiFetch(`/api/profile/${effectivePlayerId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          apiFetch(`/api/profile/${effectivePlayerId}/achievements`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (profRes?.profile) {
          setProfile(profRes.profile);
        } else {
          setProfile({
            playerId: effectivePlayerId ?? "",
            displayName: currentName || "Member",
            avatar: currentAvatar || undefined,
            joinedAt: Date.now() - 86400000 * 30,
            lastSeenAt: Date.now(),
            level: 1,
            experiencePoints: 0,
          });
        }

        if (achRes?.achievements) {
          setAchievements(achRes.achievements);
        } else {
          // Fallback catalog
          setAchievements(
            ACHIEVEMENT_CATALOG.map((def, idx) => ({
              ...def,
              unlocked: idx < 2,
              currentProgress: idx < 2 ? def.targetValue : 0,
              progressPercent: idx < 2 ? 100 : 0,
            }))
          );
        }
      } catch (err) {
        console.warn("Could not load achievements:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [identityReady, effectivePlayerId]);

  if (loading || !profile) {
    return (
      <ProfileLayout profile={null}>
        <ProfileSkeleton />
      </ProfileLayout>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const filteredAchievements = selectedCategory === "all"
    ? achievements
    : achievements.filter((a) => a.category === selectedCategory);

  const completionPct = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  return (
    <ProfileLayout
      profile={profile}
      isMember={isMember}
      name={currentName}
      avatar={currentAvatar}
      badgeLabel="Badge Album"
      favoriteGame={`${unlockedCount}/${achievements.length || 25}`}
    >
      <div className="space-y-6">
        {/* Page Header with Childhood Memory Album Tone */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--auth-card-edge)] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--auth-ink)] flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              <span>Childhood Memory & Badge Album</span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--auth-ink-soft)] font-medium mt-0.5">
              Collect nostalgic tokens, school-yard milestones, and unlock XP across BHALYAM games
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] font-mono text-[var(--auth-ink-soft)] block">Album Progress</span>
              <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                {unlockedCount} of {achievements.length || 25} Badges ({completionPct}%)
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-mono font-black text-xs shrink-0">
              {completionPct}%
            </div>
          </div>
        </div>

        {/* ── Category Filter Pills ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <span className="text-xs font-mono font-bold text-[var(--auth-ink-soft)] flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            Category:
          </span>
          {CATEGORY_TABS.map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${
                  active
                    ? "bg-amber-500 text-stone-950 border-amber-600 font-black shadow-2xs"
                    : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] border-[var(--auth-card-edge)] hover:text-[var(--auth-ink)] hover:border-amber-500/40"
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

        {/* ── Modal for Achievement Reveal if clicked ── */}
        <AchievementRevealModal
          achievement={activeUnlockModal}
          isOpen={!!activeUnlockModal}
          onClose={() => setActiveUnlockModal(null)}
        />
      </div>
    </ProfileLayout>
  );
}
