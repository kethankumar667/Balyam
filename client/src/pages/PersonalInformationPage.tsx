import { useOutletContext } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { loadAccountDetails } from "../lib/accountGenerator";
import { downloadPlayerExport } from "../lib/privacy/exportData";
import MemberLockedGate from "../components/auth/MemberLockedGate";

// Profile Features
import PersonalInformationCard from "../features/profile/PersonalInformationCard";
import AccountSummaryCard from "../features/profile/AccountSummaryCard";
import ProfileQuickActions from "../features/profile/ProfileQuickActions";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";

/**
 * Data, the Edit Profile / Avatar Picker modals, and the `<ProfileLayout>`
 * sidebar all live one level up now, in ProfileFamilyLayout — see that
 * file's header comment for why. This page only renders its own content and
 * reads what it needs via `useOutletContext`.
 */
export default function PersonalInformationPage() {
  const currentName = useRoomStore((s) => s.playerName);
  const bio = useRoomStore((s) => s.bio);
  const region = useRoomStore((s) => s.region);
  const authEmail = useAuthStore((s) => s.email);

  const { profile, stats, isMember, openEditModal, openAvatarModal } =
    useOutletContext<ProfileFamilyOutletContext>();

  if (!isMember) {
    return <MemberLockedGate feature="personal" />;
  }

  if (!profile) return null;

  const handleExportData = () => {
    downloadPlayerExport(profile, stats, loadAccountDetails());
  };

  return (
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
            region={region || "India (IN)"}
            bio={bio}
            onEditProfile={openEditModal}
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
            onOpenAvatarPicker={openAvatarModal}
          />
        </div>
      </div>
    </div>
  );
}
