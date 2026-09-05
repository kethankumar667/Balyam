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
    <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-amber-500/20 dark:via-transparent dark:to-orange-500/10 shadow-sm">
      <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-6 sm:p-7 space-y-5 border border-stone-200/60 dark:border-white/5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/60 dark:border-white/5 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white tracking-tight">
                Personal Information
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">
                Manage your public lounge identity and account credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs transition shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 shrink-0 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Information Rows */}
        <div className="space-y-2.5">
          {/* Row 1: Display Name */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-center shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Display Name
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">
                  Visible to all players across multiplayer lounges
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-white sm:text-right pl-11 sm:pl-0">
              {displayName}
            </span>
          </div>

          {/* Row 2: Player ID */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Player ID
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">
                  Unique cryptographic identifier for matchmaking and telemetry
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto pl-11 sm:pl-0">
              <span className="text-xs font-bold font-mono text-stone-800 dark:text-slate-200 tracking-tight bg-stone-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                {profile.playerId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-stone-600 hover:text-stone-900 dark:text-slate-400 border border-stone-200/80 dark:border-slate-700 transition cursor-pointer active:scale-95"
                aria-label="Copy Player ID to clipboard"
                title="Copy Player ID"
              >
                {copiedId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Row 3: Email Address */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/30 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Email Address
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">
                  Used for account recovery and lounge security
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-11 sm:pl-0">
              <span className="text-xs font-bold font-mono text-stone-800 dark:text-slate-200">
                {email ? maskEmail(email) : "No email linked (Guest Session)"}
              </span>
              {email && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/40">
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Row 4: Date Joined */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Date Joined
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">
                  Official BHALYAM member registration date
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-white sm:text-right pl-11 sm:pl-0">
              {memberDate}
            </span>
          </div>

          {/* Row 5: Country / Region */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/30 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Country / Region
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">
                  Regional lounge matchmaking preference
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-white sm:text-right pl-11 sm:pl-0">
              {displayRegion}
            </span>
          </div>

          {/* Row 6: Bio / About Me */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Bio / About Me
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">
                  Tell other players about your favorite 90s games!
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-11 sm:pl-0">
              {bio?.trim() ? (
                <span className="text-xs font-medium text-stone-900 dark:text-white max-w-xs truncate">
                  {bio}
                </span>
              ) : (
                <>
                  <span className="text-xs text-stone-400 italic">No bio added yet</span>
                  <button
                    type="button"
                    onClick={onEditProfile}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
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
    </div>
  );
}
