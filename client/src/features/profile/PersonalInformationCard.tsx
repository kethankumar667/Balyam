import { useState } from "react";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import {
  User,
  Hash,
  Mail,
  Calendar,
  Globe,
  Bookmark,
  Copy,
  Check,
  Pencil,
  Plus,
  Gamepad2,
} from "lucide-react";

interface PersonalInformationCardProps {
  profile: PlayerProfile;
  /** Live name from `roomStore` — overrides `profile.displayName` when
   *  given, so this row doesn't go stale if the name changes via a
   *  different save surface while this page stays mounted. */
  name?: string;
  email?: string | null;
  isVerifiedEmail?: boolean;
  region?: string;
  bio?: string;
  onEditProfile: () => void;
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export default function PersonalInformationCard({
  profile,
  name,
  email,
  isVerifiedEmail = false,
  region = "India 🇮🇳",
  bio,
  onEditProfile,
}: PersonalInformationCardProps) {
  const [copiedId, setCopiedId] = useState(false);
  const displayName = name ?? profile.displayName;

  const memberDate = new Date(profile.joinedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleCopyId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(profile.playerId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const displayRegion = region ?? "India (IN)";

  return (
    <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xs relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3EFE9] dark:border-[#202740] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5] flex items-center justify-center shrink-0 shadow-2xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Personal Information
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Manage your personal details and account preferences.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onEditProfile}
          className="inline-flex items-center justify-center gap-2 min-h-[40px] px-5 py-2 rounded-full bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#DC2626] hover:to-[#EA580C] text-white font-bold text-xs transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/50 shrink-0 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Information Rows */}
      <div className="space-y-3">
        {/* Row 1: Display Name */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131728] border border-[#F3EFE9] dark:border-[#202740] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-[#E8E2D8] dark:hover:border-[#2E3758]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] text-[#CA8A04] border border-[#FEF08A] flex items-center justify-center shrink-0">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Display Name
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                Visible to all players across multiplayer lounges
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white sm:text-right pl-11 sm:pl-0">
            {displayName}
          </span>
        </div>

        {/* Row 2: Player ID */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131728] border border-[#F3EFE9] dark:border-[#202740] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-[#E8E2D8] dark:hover:border-[#2E3758]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] flex items-center justify-center shrink-0">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Player ID
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                Unique ID for matchmaking and stats
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto pl-11 sm:pl-0">
            <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 tracking-tight">
              {profile.playerId}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              aria-label="Copy Player ID to clipboard"
              title="Copy Player ID"
            >
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Row 3: Email Address */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131728] border border-[#F3EFE9] dark:border-[#202740] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-[#E8E2D8] dark:hover:border-[#2E3758]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FAF5FF] text-[#9333EA] border border-[#F3E8FF] flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Email Address
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                Used for account recovery and lounge security
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-11 sm:pl-0">
            <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
              {email ? maskEmail(email) : "No email linked (Guest Session)"}
            </span>
            {email && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#16A34A] text-[10px] font-bold border border-[#BBF7D0]">
                Verified
              </span>
            )}
          </div>
        </div>

        {/* Row 4: Date Joined */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131728] border border-[#F3EFE9] dark:border-[#202740] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-[#E8E2D8] dark:hover:border-[#2E3758]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Date Joined
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                Official BHALYAM member registration date
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white sm:text-right pl-11 sm:pl-0">
            {memberDate}
          </span>
        </div>

        {/* Row 5: Country / Region */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131728] border border-[#F3EFE9] dark:border-[#202740] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-[#E8E2D8] dark:hover:border-[#2E3758]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Country / Region
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                Regional lounge matchmaking preference
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white sm:text-right pl-11 sm:pl-0">
            {displayRegion}
          </span>
        </div>

        {/* Row 6: Bio / About Me */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131728] border border-[#F3EFE9] dark:border-[#202740] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-[#E8E2D8] dark:hover:border-[#2E3758]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6] flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Bio / About Me
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                Tell other players about your favorite 90s games!
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-11 sm:pl-0">
            {bio?.trim() ? (
              <span className="text-xs font-medium text-slate-900 dark:text-white max-w-xs truncate">
                {bio}
              </span>
            ) : (
              <>
                <span className="text-xs text-slate-400 italic">No bio added yet</span>
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Bio</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
