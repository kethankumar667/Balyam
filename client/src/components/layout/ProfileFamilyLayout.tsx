import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import ProfileLayout from "./ProfileLayout";
import MemberLockedGate from "../auth/MemberLockedGate";
import EditProfileModal from "../../features/profile/EditProfileModal";
import { ProfileErrorState } from "../../features/profile/ProfilePrimitives";
import AvatarPicker from "../profile/AvatarPicker";
import Modal from "../Modal";
import { ProfileSkeleton } from "../../design-system/dls";
import { useRoomStore } from "../../store/roomStore";
import { useAuthStore } from "../../store/authStore";
import { apiFetch, usePlayerId } from "../../lib/playerIdentity";

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { Achievement } from "@shared/profile/Achievements";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory";
import type { RecentMatchItem } from "../../features/profile/CareerMetrics";

export type ProfileResource<T> =
  | { status: "loading"; data: null }
  | { status: "ready"; data: T }
  | { status: "error"; data: T | null; message: string };

interface ProfileResources {
  profile: ProfileResource<PlayerProfile>;
  stats: ProfileResource<PlayerStats>;
  achievements: ProfileResource<Achievement[]>;
  recentMatches: ProfileResource<RecentMatchItem[]>;
}

export interface ProfileFamilyOutletContext {
  profile: PlayerProfile | null;
  stats: PlayerStats | null;
  achievements: Achievement[];
  recentMatches: RecentMatchItem[];
  resources: ProfileResources;
  loading: boolean;
  isMember: boolean;
  currentName: string;
  currentAvatar: string | null;
  effectivePlayerId: string | null;
  retryProfileData: () => void;
  openEditModal: () => void;
  openAvatarModal: () => void;
}

interface ProfilePayload { profile?: PlayerProfile }
interface StatsPayload { stats?: PlayerStats }
interface AchievementsPayload { achievements?: Achievement[] }
interface MatchesPayload { matches?: MatchHistoryItem[] }

const LOADING_RESOURCES: ProfileResources = {
  profile: { status: "loading", data: null },
  stats: { status: "loading", data: null },
  achievements: { status: "loading", data: null },
  recentMatches: { status: "loading", data: null },
};

async function readPayload<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("request_failed");
  return response.json() as Promise<T>;
}

function mapRecentMatches(matches: readonly MatchHistoryItem[]): RecentMatchItem[] {
  return matches.map((match) => ({
    id: match.matchId,
    game: match.game,
    result: match.result === "WIN" ? "won" : match.result === "LOSS" ? "lost" : "draw",
    playedAt: match.finishedAt,
  }));
}

export default function ProfileFamilyLayout() {
  const isMember = useAuthStore((state) => state.isMember);
  const currentName = useRoomStore((state) => state.playerName);
  const currentAvatar = useRoomStore((state) => state.avatarId);
  const setPlayerName = useRoomStore((state) => state.setPlayerName);
  const setAvatarId = useRoomStore((state) => state.setAvatarId);
  const bio = useRoomStore((state) => state.bio);
  const setBio = useRoomStore((state) => state.setBio);
  const region = useRoomStore((state) => state.region);
  const setRegion = useRoomStore((state) => state.setRegion);
  const location = useLocation();
  const navigate = useNavigate();
  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  const [resources, setResources] = useState<ProfileResources>(LOADING_RESOURCES);
  const [retryCount, setRetryCount] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const handledEditQueryRef = useRef(false);

  const retryProfileData = useCallback(() => {
    setResources(LOADING_RESOURCES);
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    if (!isMember || !identityReady || !effectivePlayerId) return;
    let cancelled = false;

    const loadResources = async () => {
      const results = await Promise.allSettled([
        readPayload<ProfilePayload>(`/api/profile/${effectivePlayerId}`),
        readPayload<StatsPayload>(`/api/profile/${effectivePlayerId}/stats`),
        readPayload<AchievementsPayload>(`/api/profile/${effectivePlayerId}/achievements`),
        readPayload<MatchesPayload>(`/api/profile/${effectivePlayerId}/matches?limit=5`),
      ]);
      if (cancelled) return;

      const [profileResult, statsResult, achievementsResult, matchesResult] = results;
      const nextResources: ProfileResources = {
        profile: profileResult.status === "fulfilled" && profileResult.value.profile
          ? { status: "ready", data: profileResult.value.profile }
          : { status: "error", data: null, message: "We couldn't load your player identity." },
        stats: statsResult.status === "fulfilled" && statsResult.value.stats
          ? { status: "ready", data: statsResult.value.stats }
          : { status: "error", data: null, message: "Career statistics are unavailable right now." },
        achievements: achievementsResult.status === "fulfilled" && Array.isArray(achievementsResult.value.achievements)
          ? { status: "ready", data: achievementsResult.value.achievements }
          : { status: "error", data: null, message: "Achievement progress is unavailable right now." },
        recentMatches: matchesResult.status === "fulfilled" && Array.isArray(matchesResult.value.matches)
          ? { status: "ready", data: mapRecentMatches(matchesResult.value.matches) }
          : { status: "error", data: null, message: "Recent matches are unavailable right now." },
      };
      setResources(nextResources);
    };

    void loadResources();
    return () => {
      cancelled = true;
    };
  }, [effectivePlayerId, identityReady, isMember, retryCount]);

  useEffect(() => {
    const shouldOpenEditor = new URLSearchParams(location.search).get("edit") === "profile";
    if (!shouldOpenEditor) {
      handledEditQueryRef.current = false;
      return;
    }
    if (resources.profile.status === "ready" && !handledEditQueryRef.current) {
      handledEditQueryRef.current = true;
      setIsEditModalOpen(true);
    }
  }, [location.search, resources.profile.status]);

  const openEditModal = useCallback(() => setIsEditModalOpen(true), []);
  const openAvatarModal = useCallback(() => setIsAvatarModalOpen(true), []);
  const closeAvatarModal = useCallback(() => setIsAvatarModalOpen(false), []);
  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    if (new URLSearchParams(location.search).has("edit")) {
      navigate("/profile", { replace: true });
    }
  }, [location.search, navigate]);

  const handleSaveProfile = useCallback(async (data: { displayName: string; bio: string; region: string }) => {
    if (!effectivePlayerId) throw new Error("Your player identity is not ready yet.");
    const response = await apiFetch(`/api/profile/${effectivePlayerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: data.displayName }),
    });
    if (!response.ok) throw new Error("Could not save your display name. Please try again.");

    setPlayerName(data.displayName);
    setBio(data.bio);
    setRegion(data.region);
    setResources((current) => ({
      ...current,
      profile: current.profile.status === "ready"
        ? { status: "ready", data: { ...current.profile.data, displayName: data.displayName } }
        : current.profile,
    }));
    closeEditModal();
  }, [closeEditModal, effectivePlayerId, setBio, setPlayerName, setRegion]);

  const handleSelectAvatar = useCallback(async (nextAvatar: string | null) => {
    if (!effectivePlayerId) return;
    const response = await apiFetch(`/api/profile/${effectivePlayerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar: nextAvatar || undefined }),
    });
    if (!response.ok) return;

    setAvatarId(nextAvatar);
    setResources((current) => ({
      ...current,
      profile: current.profile.status === "ready"
        ? { status: "ready", data: { ...current.profile.data, avatar: nextAvatar || undefined } }
        : current.profile,
    }));
    closeAvatarModal();
  }, [closeAvatarModal, effectivePlayerId, setAvatarId]);

  const profile = resources.profile.status === "ready" ? resources.profile.data : null;
  const stats = resources.stats.status === "ready" ? resources.stats.data : null;
  const achievements = resources.achievements.status === "ready" ? resources.achievements.data : [];
  const recentMatches = resources.recentMatches.status === "ready" ? resources.recentMatches.data : [];
  const loading = resources.profile.status === "loading";

  const context = useMemo<ProfileFamilyOutletContext>(() => ({
    profile,
    stats,
    achievements,
    recentMatches,
    resources,
    loading,
    isMember,
    currentName,
    currentAvatar,
    effectivePlayerId,
    retryProfileData,
    openEditModal,
    openAvatarModal,
  }), [
    achievements,
    currentAvatar,
    currentName,
    effectivePlayerId,
    isMember,
    loading,
    openAvatarModal,
    openEditModal,
    profile,
    recentMatches,
    resources,
    retryProfileData,
    stats,
  ]);

  if (!isMember) return <MemberLockedGate feature="profile" />;

  return (
    <AppLayout showFallingPetals>
      <ProfileLayout
        profile={profile}
        isMember={isMember}
        name={currentName}
        avatar={currentAvatar}
        onEditName={openEditModal}
      >
        {loading ? <ProfileSkeleton /> : null}
        {resources.profile.status === "error" ? (
          <ProfileErrorState
            title="Profile unavailable"
            description={resources.profile.message}
            onRetry={retryProfileData}
          />
        ) : null}
        {profile ? <Outlet context={context} /> : null}
      </ProfileLayout>

      {isEditModalOpen ? (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          initialDisplayName={currentName}
          initialBio={bio || ""}
          initialRegion={region || "India (IN)"}
          onSave={handleSaveProfile}
        />
      ) : null}

      {isAvatarModalOpen ? (
        <Modal
          open={isAvatarModalOpen}
          onClose={closeAvatarModal}
          ariaLabel="Choose your avatar"
          panelClassName="w-full max-w-2xl rounded-3xl border border-stone-300 bg-surface-1 p-5 text-ink-hi shadow-2xl dark:border-slate-700 sm:p-6"
        >
          <AvatarPicker value={currentAvatar} onChange={handleSelectAvatar} onDone={closeAvatarModal} />
        </Modal>
      ) : null}
    </AppLayout>
  );
}
