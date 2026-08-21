import React, { useEffect, useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, ArrowRight, Gamepad2, Award } from "lucide-react";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
import AvatarPicker from "../components/profile/AvatarPicker";
import Modal from "../components/Modal";
import ProfileLayout from "../components/layout/ProfileLayout";
import { ProfileSkeleton } from "../design-system/dls";

const MemberLockedGate = lazy(() => import("../components/auth/MemberLockedGate"));

// Profile Features
import StatsOverview from "../features/profile/StatsOverview";
import FavoriteGames from "../features/profile/FavoriteGames";
import CareerMetrics from "../features/profile/CareerMetrics";
import EditProfileModal from "../features/profile/EditProfileModal";
import { AchievementCard } from "../features/profile/AchievementCard";
import { ACHIEVEMENT_CATALOG } from "@shared/profile/Achievements";

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { Achievement } from "@shared/profile/Achievements";

export default function ProfileOverviewPage() {
  const navigate = useNavigate();
  const isMember = useAuthStore((s) => s.isMember);
  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);
  const setPlayerName = useRoomStore((s) => s.setPlayerName);
  const setAvatarId = useRoomStore((s) => s.setAvatarId);

  // Profile data state
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  if (!isMember) {
    return (
      <Suspense fallback={null}>
        <MemberLockedGate feature="profile" />
      </Suspense>
    );
  }

  const loadProfileData = async () => {
    if (!effectivePlayerId) return;
    try {
      const [profRes, statsRes, achRes] = await Promise.all([
        apiFetch(`/api/profile/${effectivePlayerId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch(`/api/profile/${effectivePlayerId}/stats`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch(`/api/profile/${effectivePlayerId}/achievements`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (profRes?.profile) {
        setProfile(profRes.profile);
      } else {
        setProfile({
          playerId: effectivePlayerId ?? "",
          displayName: currentName || (isMember ? "Member" : "Guest"),
          avatar: currentAvatar || undefined,
          joinedAt: Date.now() - 86400000 * 7,
          lastSeenAt: Date.now(),
          level: 1,
          experiencePoints: 0,
        });
      }
      if (statsRes?.stats) setStats(statsRes.stats);
      if (achRes?.achievements) {
        setAchievements(achRes.achievements);
      } else {
        setAchievements(
          ACHIEVEMENT_CATALOG.slice(0, 6).map((def, idx) => ({
            ...def,
            unlocked: idx === 0,
            currentProgress: idx === 0 ? 1 : 0,
            progressPercent: idx === 0 ? 100 : 0,
          }))
        );
      }
      setLoading(false);
    } catch (err) {
      console.warn("Could not load backend profile, using local defaults:", err);
      setProfile({
        playerId: effectivePlayerId ?? "",
        displayName: currentName || (isMember ? "Member" : "Guest"),
        avatar: currentAvatar || undefined,
        joinedAt: Date.now() - 86400000 * 7,
        lastSeenAt: Date.now(),
        level: 1,
        experiencePoints: 0,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!identityReady) return;
    loadProfileData();
  }, [identityReady, effectivePlayerId]);

  const handleSaveProfile = async (data: { displayName: string; bio: string; region: string }) => {
    setPlayerName(data.displayName);
    try {
      await apiFetch(`/api/profile/${effectivePlayerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: data.displayName }),
      });
      if (profile) setProfile({ ...profile, displayName: data.displayName });
      setIsEditModalOpen(false);
    } catch {
      setIsEditModalOpen(false);
    }
  };

  const handleSelectAvatar = async (av: string | null) => {
    setAvatarId(av);
    try {
      await apiFetch(`/api/profile/${effectivePlayerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: av || undefined }),
      });
      if (profile) setProfile({ ...profile, avatar: av || undefined });
      setIsAvatarModalOpen(false);
    } catch {
      setIsAvatarModalOpen(false);
    }
  };

  if (loading || !profile) {
    return (
      <ProfileLayout profile={null}>
        <ProfileSkeleton />
      </ProfileLayout>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const recentAchievements = achievements.slice(0, 3);
  const favoriteGame = stats?.favoriteGame && stats.favoriteGame !== "none" ? stats.favoriteGame : undefined;

  return (
    <ProfileLayout
      profile={profile}
      isMember={isMember}
      name={currentName}
      avatar={currentAvatar}
      onEditName={() => setIsEditModalOpen(true)}
      favoriteGame={favoriteGame}
    >
      <div className="space-y-6">
        {/* ── Section 1: Quick Performance Overview ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--auth-ink)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>Performance Overview</span>
            </h2>
            <Link
              to="/profile/statistics"
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Full Statistics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats ? (
            <StatsOverview stats={stats} />
          ) : (
            <div className="p-8 rounded-3xl bg-[var(--auth-card)] border border-[var(--auth-card-edge)] text-center space-y-3">
              <Gamepad2 className="w-10 h-10 text-amber-500 mx-auto opacity-70" />
              <h3 className="font-extrabold text-base text-[var(--auth-ink)]">Your gaming story starts here</h3>
              <p className="text-xs text-[var(--auth-ink-soft)] max-w-sm mx-auto">
                Play your first round of Ludo, Rummy, or Hand Cricket to start tracking your win rate and milestones.
              </p>
              <Link
                to="/games"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider hover:bg-amber-400 transition shadow-md"
              >
                <span>Explore Games</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Section 2: Playing Journey & Highlights ── */}
        {stats && <CareerMetrics stats={stats} />}

        {/* ── Section 3: Two Column Layout (Favorite Games + Recent Achievements) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Favorite Games Panel (Shrinks to content) */}
          <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-3.5 shadow-sm self-start">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[var(--auth-ink)] flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-amber-500" />
                <span>Favorite Games</span>
              </h2>
              <Link
                to="/favorites"
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                View all →
              </Link>
            </div>
            {stats && <FavoriteGames stats={stats} />}
          </div>

          {/* Recent Achievements Panel */}
          <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-3.5 shadow-sm self-start">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[var(--auth-ink)] flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Achievements ({unlockedCount}/{achievements.length || 25})</span>
              </h2>
              <Link
                to="/profile/achievements"
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                All 25 badges →
              </Link>
            </div>

            <div className="space-y-3">
              {recentAchievements.map((ach) => (
                <AchievementCard key={ach.id} achievement={ach} />
              ))}
            </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            initialDisplayName={currentName}
            initialBio=""
            initialRegion="India 🇮🇳"
            onSave={handleSaveProfile}
          />
        )}

        {/* Avatar Picker Modal */}
        {isAvatarModalOpen && (
          <Modal
            open={isAvatarModalOpen}
            onClose={() => setIsAvatarModalOpen(false)}
            ariaLabel="Choose Your Avatar"
            panelClassName="bg-[#FAF3E2] dark:bg-[#0E1526] border-2 border-[#E8D8BE] rounded-3xl p-6 shadow-2xl max-w-2xl w-full"
          >
            <AvatarPicker
              value={currentAvatar}
              onChange={handleSelectAvatar}
              onDone={() => setIsAvatarModalOpen(false)}
            />
          </Modal>
        )}
      </div>
    </ProfileLayout>
  );
}
