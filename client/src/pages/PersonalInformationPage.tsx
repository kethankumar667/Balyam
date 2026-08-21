import React, { useEffect, useState } from "react";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
import { loadAccountDetails } from "../lib/accountGenerator";
import { downloadPlayerExport } from "../lib/privacy/exportData";
import ProfileLayout from "../components/layout/ProfileLayout";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import AvatarPicker from "../components/profile/AvatarPicker";
import Modal from "../components/Modal";
import { ProfileSkeleton } from "../design-system/dls";

// Profile Features
import PersonalInformationCard from "../features/profile/PersonalInformationCard";
import EditProfileModal from "../features/profile/EditProfileModal";
import AccountSummaryCard from "../features/profile/AccountSummaryCard";
import ProfileQuickActions from "../features/profile/ProfileQuickActions";

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { PlayerStats } from "@shared/profile/PlayerStats";

export default function PersonalInformationPage() {
  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);
  const setPlayerName = useRoomStore((s) => s.setPlayerName);
  const setAvatarId = useRoomStore((s) => s.setAvatarId);
  const bio = useRoomStore((s) => s.bio);
  const setBio = useRoomStore((s) => s.setBio);
  const region = useRoomStore((s) => s.region);
  const setRegion = useRoomStore((s) => s.setRegion);

  const authEmail = useAuthStore((s) => s.email);
  const isMember = useAuthStore((s) => s.isMember);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  if (!isMember) {
    return <MemberLockedGate feature="personal" />;
  }

  const loadData = async () => {
    if (!effectivePlayerId) return;
    try {
      const [profRes, statsRes] = await Promise.all([
        apiFetch(`/api/profile/${effectivePlayerId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch(`/api/profile/${effectivePlayerId}/stats`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (profRes?.profile) {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!identityReady) return;
    loadData();
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

  const handleExportData = () => {
    if (profile) {
      downloadPlayerExport(profile, stats, loadAccountDetails());
    }
  };

  if (loading || !profile) {
    return (
      <ProfileLayout profile={null}>
        <ProfileSkeleton />
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout
      profile={profile}
      isMember={isMember}
      name={currentName}
      avatar={currentAvatar}
      onEditName={() => setIsEditModalOpen(true)}
    >
      <div className="space-y-6">
        {/* Two Column Layout: Main Identity Card + Right Rail (Account Summary & Actions) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Personal Information Card */}
          <div className="lg:col-span-2 space-y-6">
            <PersonalInformationCard
              profile={profile}
              name={currentName}
              email={authEmail}
              isVerifiedEmail={isMember}
              region={region ? (region.includes("🇮🇳") ? region : `🇮🇳 ${region}`) : "🇮🇳 India"}
              bio={bio}
              onEditProfile={() => setIsEditModalOpen(true)}
            />
          </div>

          {/* Right Rail: Account Summary & Quick Actions */}
          <div className="space-y-6">
            <AccountSummaryCard
              isMember={isMember}
              lastSeenAt={profile.lastSeenAt}
            />

            <ProfileQuickActions
              onExportData={handleExportData}
              onOpenAvatarPicker={() => setIsAvatarModalOpen(true)}
            />
          </div>
        </div>

        {/* Edit Profile Modal */}
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
