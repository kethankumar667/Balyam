import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
import { loadAccountDetails } from "../lib/accountGenerator";
import { downloadPlayerExport } from "../lib/privacy/exportData";
import AppLayout from "../components/layout/AppLayout";
import AvatarPicker from "../components/profile/AvatarPicker";
import { ArrowLeftIcon } from "../components/auth/authIcons";
import MemberLockedGate from "../components/auth/MemberLockedGate";

// Profile Features
import ProfileHeader from "../features/profile/ProfileHeader";
import PersonalInformationCard from "../features/profile/PersonalInformationCard";
import EditProfileModal from "../features/profile/EditProfileModal";
import AccountSummaryCard from "../features/profile/AccountSummaryCard";
import ProfileQuickActions from "../features/profile/ProfileQuickActions";
import DidYouKnowTipsCard from "../features/profile/DidYouKnowTipsCard";

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { Achievement } from "@shared/profile/Achievements";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory";

export default function PersonalInformationPage() {
  const navigate = useNavigate();
  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);
  const setPlayerName = useRoomStore((s) => s.setPlayerName);
  const setAvatarId = useRoomStore((s) => s.setAvatarId);
  // Bio/region live in roomStore (not page-local state) so that, for a
  // signed-in member, they ride the same debounced sync that already keeps
  // display name/avatar in `public.profiles` — see authStore's
  // startProfileSync. Saving here is then just `setBio`/`setRegion`, the
  // same one-liner Settings already uses for name/avatar; no separate
  // network call needed on this page's part.
  const bio = useRoomStore((s) => s.bio);
  const setBio = useRoomStore((s) => s.setBio);
  const region = useRoomStore((s) => s.region);
  const setRegion = useRoomStore((s) => s.setRegion);

  const authEmail = useAuthStore((s) => s.email);
  const isMember = useAuthStore((s) => s.isMember);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  if (!isMember) {
    return <MemberLockedGate feature="personal" />;
  }

  const loadData = async () => {
    if (!effectivePlayerId) return;
    try {
      const [profRes, statsRes, matchRes, achRes] = await Promise.all([
        apiFetch(`/api/profile/${effectivePlayerId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch(`/api/profile/${effectivePlayerId}/stats`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch(`/api/profile/${effectivePlayerId}/matches`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch(`/api/profile/${effectivePlayerId}/achievements`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (profRes?.profile) {
        // NOT pushed into roomStore: `profRes.profile` is `player_profiles`,
        // a denormalized copy kept for stats/leaderboard display (level, XP,
        // joined date) — it can lag behind the real name/avatar, which live
        // in `public.profiles` and stay correct in roomStore via authStore's
        // own sync. Pulling this GET's possibly-stale displayName/avatar
        // back into roomStore used to silently revert a correct name to
        // whatever this table last happened to hold.
        setProfile(profRes.profile);
      } else {
        setProfile({
          playerId: effectivePlayerId ?? "",
          displayName: currentName || (isMember ? "Member" : "Guest"),
          avatar: currentAvatar || undefined,
          joinedAt: Date.now() - 86400000 * 45,
          lastSeenAt: Date.now(),
          level: 1,
          experiencePoints: 0,
        });
      }
      if (statsRes?.stats) setStats(statsRes.stats);
      if (matchRes?.matches) setMatches(matchRes.matches);
      if (achRes?.achievements) setAchievements(achRes.achievements);
    } catch {
      // Fallback local representation
      setProfile({
        playerId: effectivePlayerId ?? "",
        displayName: currentName || (isMember ? "Member" : "Guest"),
        avatar: currentAvatar || undefined,
        joinedAt: Date.now() - 86400000 * 45,
        lastSeenAt: Date.now(),
        level: 1,
        experiencePoints: 0,
      });
    }
  };

  useEffect(() => {
    if (!identityReady) return;
    loadData();
  }, [identityReady, effectivePlayerId]);

  const handleSaveProfile = async (data: { displayName: string; bio: string; region: string }) => {
    // setBio/setRegion persist to localStorage themselves (roomStore, same
    // as setPlayerName always has), and — for a signed-in member — reach
    // public.profiles via authStore's debounced sync, same as name/avatar.
    setPlayerName(data.displayName);
    setBio(data.bio);
    setRegion(data.region);

    try {
      await apiFetch(`/api/profile/${effectivePlayerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: data.displayName }),
      });
      if (profile) setProfile({ ...profile, displayName: data.displayName });
    } catch {
      // Offline fallback
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

  const handleExportData = () => {
    if (profile) {
      downloadPlayerExport(profile, stats, loadAccountDetails());
    }
  };

  const unlockedAchievementsCount = achievements.filter((a) => a.unlocked).length;

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper auth-shell py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Header Breadcrumbs Bar */}
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Lounge
            </Link>
            <div className="flex items-center gap-4 text-xs font-bold">
              <Link
                to="/tournaments"
                className="text-amber-500 hover:text-amber-400 transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center"
              >
                🏟️ Tournaments & Seasons
              </Link>
              <Link
                to="/leaderboard"
                className="text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center"
              >
                🏆 Leaderboards & Quests
              </Link>
            </div>
          </div>

          {/* Profile Hero Card */}
          {profile && (
            <ProfileHeader
              profile={profile}
              name={currentName}
              avatar={currentAvatar}
              isMember={isMember}
              onEditName={() => setIsEditModalOpen(true)}
            />
          )}

          {/* Navigation Category Tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--auth-card-edge)] pb-3 overflow-x-auto text-xs font-bold font-mono">
            <button
              onClick={() => navigate("/profile")}
              className="px-4 py-2.5 rounded-xl transition shrink-0 min-h-[44px] flex items-center gap-2 bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
            >
              📊 Career & Stats
            </button>
            <button
              onClick={() => navigate("/profile?tab=history")}
              className="px-4 py-2.5 rounded-xl transition shrink-0 min-h-[44px] flex items-center gap-2 bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
            >
              📜 Match History ({matches.length})
            </button>
            <button
              onClick={() => navigate("/profile?tab=achievements")}
              className="px-4 py-2.5 rounded-xl transition shrink-0 min-h-[44px] flex items-center gap-2 bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
            >
              🏆 Achievements ({unlockedAchievementsCount}/{achievements.length})
            </button>
            <button
              className="px-4 py-2.5 rounded-xl transition shrink-0 min-h-[44px] flex items-center gap-2 bg-amber-500 text-zinc-950 font-black shadow-md"
            >
              👤 Personal Information
            </button>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Primary Column (Dominant) */}
            <div className="lg:col-span-2 space-y-6">
              {profile && (
                <PersonalInformationCard
                  profile={profile}
                  name={currentName}
                  email={authEmail}
                  isVerifiedEmail={isMember}
                  region={region}
                  bio={bio}
                  onEditProfile={() => setIsEditModalOpen(true)}
                />
              )}
            </div>

            {/* Right Supporting Rail */}
            <div className="space-y-6">
              <AccountSummaryCard
                isMember={isMember}
                lastSeenAt={profile?.lastSeenAt}
                friendCount={3}
              />
              <ProfileQuickActions
                onOpenAvatarPicker={() => setIsAvatarModalOpen(true)}
                onExportData={handleExportData}
              />
              <DidYouKnowTipsCard />
            </div>
          </div>

          {/* Edit Profile Modal */}
          {profile && (
            <EditProfileModal
              isOpen={isEditModalOpen}
              initialDisplayName={currentName}
              initialBio={bio}
              initialRegion={region}
              onClose={() => setIsEditModalOpen(false)}
              onSave={handleSaveProfile}
            />
          )}

          {/* Avatar Customization Modal */}
          {isAvatarModalOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="avatarPickerModalTitle"
            >
              <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-[var(--auth-field-edge)] pb-3">
                  <h3 id="avatarPickerModalTitle" className="font-extrabold text-base text-[var(--auth-ink)]">
                    Choose Your Avatar
                  </h3>
                  <button
                    onClick={() => setIsAvatarModalOpen(false)}
                    className="text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] text-sm font-bold p-1 rounded-lg"
                    aria-label="Close dialog"
                  >
                    ✕
                  </button>
                </div>
                <AvatarPicker value={currentAvatar} onChange={handleSelectAvatar} />
                <button
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
