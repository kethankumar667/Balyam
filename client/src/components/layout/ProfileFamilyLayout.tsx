import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppLayout from "./AppLayout";
import ProfileLayout from "./ProfileLayout";
import MemberLockedGate from "../auth/MemberLockedGate";
import EditProfileModal from "../../features/profile/EditProfileModal";
import AvatarPicker from "../profile/AvatarPicker";
import Modal from "../Modal";
import { ProfileSkeleton } from "../../design-system/dls";
import { useRoomStore } from "../../store/roomStore";
import { useAuthStore } from "../../store/authStore";
import { apiFetch, usePlayerId } from "../../lib/playerIdentity";
import { ACHIEVEMENT_CATALOG } from "@shared/profile/Achievements";

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { Achievement } from "@shared/profile/Achievements";

export interface ProfileFamilyOutletContext {
  profile: PlayerProfile | null;
  stats: PlayerStats | null;
  achievements: Achievement[];
  loading: boolean;
  isMember: boolean;
  currentName: string;
  currentAvatar: string | null;
  effectivePlayerId: string | null;
  openEditModal: () => void;
  openAvatarModal: () => void;
}

/**
 * Shared chrome for /profile, /profile/personal, /profile/statistics,
 * /profile/matches, /profile/achievements.
 *
 * Each of those five pages used to render its own `<ProfileLayout>` (sidebar,
 * member card, tournament CTA) AND independently fetch the same
 * `/api/profile/:id`, `/api/profile/:id/stats` and `/api/profile/:id/achievements`
 * data. React Router treats a route change as a brand-new element tree, so
 * every hop between them — the sidebar links go straight between these five —
 * fully unmounted one page's `ProfileLayout` and mounted a fresh one for the
 * next: a visible re-render of the whole sidebar/header on every click, lost
 * scroll position, and five separate copies of the same fetch. Same root
 * cause GamesFamilyLayout.tsx fixed for /games, /favorites, /recently-played
 * — hoisting the layout AND the shared data fetch to one persistent layout
 * route means only the `<Outlet/>` content swaps; the sidebar and the
 * profile/stats/achievements data stay put across all five.
 *
 * The Edit Profile / Avatar Picker modals lived in each page too (identical
 * JSX, identical handlers) — also hoisted here, reached by children through
 * `useOutletContext`. Pulling `handleSaveProfile` into one copy also fixes a
 * real bug the duplication had introduced: `ProfileOverviewPage`'s copy
 * never called `setBio`/`setRegion`, so bio/region edits made from that page
 * silently didn't save even though `PersonalInformationPage`'s copy did.
 */
export default function ProfileFamilyLayout() {
  const isMember = useAuthStore((s) => s.isMember);
  const { pathname } = useLocation();

  if (!isMember) {
    const feature = pathname.startsWith("/profile/personal") ? "personal" : "profile";
    return <MemberLockedGate feature={feature} />;
  }

  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);
  const setPlayerName = useRoomStore((s) => s.setPlayerName);
  const setAvatarId = useRoomStore((s) => s.setAvatarId);
  const bio = useRoomStore((s) => s.bio);
  const setBio = useRoomStore((s) => s.setBio);
  const region = useRoomStore((s) => s.region);
  const setRegion = useRoomStore((s) => s.setRegion);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  // Per-route customization of the hero banner's badge label. Only
  // /profile/achievements wants a non-default one ("Badge Album") — a
  // static per-route value, not real page state, so it's simplest derived
  // straight from the pathname rather than threaded up through context.
  const badgeLabel = pathname === "/profile/achievements" ? "Badge Album" : undefined;

  useEffect(() => {
    if (!identityReady || !effectivePlayerId) return;

    let cancelled = false;

    async function fetchData() {
      try {
        const [profRes, statsRes, achRes] = await Promise.all([
          apiFetch(`/api/profile/${effectivePlayerId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          apiFetch(`/api/profile/${effectivePlayerId}/stats`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          apiFetch(`/api/profile/${effectivePlayerId}/achievements`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (cancelled) return;

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
            ACHIEVEMENT_CATALOG.map((def) => ({
              ...def,
              unlocked: false,
              currentProgress: 0,
              progressPercent: 0,
            }))
          );
        }
      } catch (err) {
        console.warn("Could not load backend profile, using local defaults:", err);
        if (!cancelled) {
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityReady, effectivePlayerId]);

  const handleSaveProfile = async (data: { displayName: string; bio: string; region: string }) => {
    setPlayerName(data.displayName);
    setBio(data.bio);
    setRegion(data.region);
    try {
      await apiFetch(`/api/profile/${effectivePlayerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: data.displayName }),
      });
      setProfile((prev) => (prev ? { ...prev, displayName: data.displayName } : prev));
    } finally {
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
      setProfile((prev) => (prev ? { ...prev, avatar: av || undefined } : prev));
    } finally {
      setIsAvatarModalOpen(false);
    }
  };

  const favoriteGame = stats?.favoriteGame && stats.favoriteGame !== "none" ? stats.favoriteGame : undefined;

  const context: ProfileFamilyOutletContext = {
    profile,
    stats,
    achievements,
    loading,
    isMember,
    currentName,
    currentAvatar,
    effectivePlayerId,
    openEditModal: () => setIsEditModalOpen(true),
    openAvatarModal: () => setIsAvatarModalOpen(true),
  };

  return (
    <AppLayout showFallingPetals>
      <ProfileLayout
        profile={profile}
        isMember={isMember}
        name={currentName}
        avatar={currentAvatar}
        onEditName={() => setIsEditModalOpen(true)}
        favoriteGame={favoriteGame}
        badgeLabel={badgeLabel}
      >
        {loading || !profile ? <ProfileSkeleton /> : <Outlet context={context} />}
      </ProfileLayout>

      {isEditModalOpen && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialDisplayName={currentName}
          initialBio={bio || ""}
          initialRegion={region || "India 🇮🇳"}
          onSave={handleSaveProfile}
        />
      )}

      {isAvatarModalOpen && (
        <Modal
          open={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          ariaLabel="Choose Your Avatar"
          panelClassName="bg-[#FAF3E2] dark:bg-[#0E1526] border-2 border-[#E8D8BE] rounded-3xl p-6 shadow-2xl max-w-2xl w-full"
        >
          <AvatarPicker value={currentAvatar} onChange={handleSelectAvatar} onDone={() => setIsAvatarModalOpen(false)} />
        </Modal>
      )}
    </AppLayout>
  );
}
