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
  ShieldCheck,
  Sparkle,
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
    <div className="bg-gradient-to-br from-[#0c1424] via-[#121c33] to-[#090e1c] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden text-white">
      {/* Background Holographic & Glow Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Decorative Corner Rivets */}
      <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-amber-400/50 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400/50 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
      <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-amber-400/50 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
      <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-amber-400/50 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-[0_3px_0_rgba(180,83,9,1)] shrink-0">
            <User className="w-6 h-6 text-stone-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                Personal Information
              </h2>
              <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded font-mono">
                Supercell ID Pass
              </span>
            </div>
            <p className="text-xs text-stone-300 font-medium mt-0.5">
              Manage your public lounge identity and account credentials.
            </p>
          </div>
        </div>

        {/* 3D Chunky Edit Profile Button */}
        <button
          type="button"
          onClick={onEditProfile}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-stone-950 font-black uppercase tracking-wider text-xs border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 transition shadow-[0_4px_10px_rgba(245,158,11,0.3)] shrink-0 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5 text-stone-950" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Information Rows */}
      <div className="space-y-3 relative z-10">
        {/* Row 1: Display Name */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-amber-400/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white block">
                Display Name
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                Visible to all players across multiplayer lounges
              </span>
            </div>
          </div>
          <span className="text-sm font-black text-amber-300 sm:text-right pl-12 sm:pl-0 font-mono">
            {displayName}
          </span>
        </div>

        {/* Row 2: Player ID */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-blue-400/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white block">
                Player ID
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                Unique cryptographic identifier for matchmaking and telemetry
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto pl-12 sm:pl-0">
            <span className="text-xs font-black font-mono text-white tracking-wider bg-black/60 px-3 py-1.5 rounded-xl border border-white/15 shadow-inner">
              {profile.playerId}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-gradient-to-b from-slate-700 to-slate-900 text-white hover:text-amber-400 border border-white/15 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-md"
              aria-label="Copy Player ID to clipboard"
              title="Copy Player ID"
            >
              {copiedId ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Row 3: Email Address */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-purple-400/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white block">
                Email Address
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                Used for account recovery and lounge security
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-12 sm:pl-0">
            <span className="text-xs font-bold font-mono text-stone-200">
              {email ? maskEmail(email) : "No email linked (Guest Session)"}
            </span>
            {email && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/50 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Verified</span>
              </span>
            )}
          </div>
        </div>

        {/* Row 4: Date Joined */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-emerald-400/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white block">
                Date Joined
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                Official BHALYAM member registration date
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-white sm:text-right pl-12 sm:pl-0 font-mono">
            {memberDate}
          </span>
        </div>

        {/* Row 5: Country / Region */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-teal-400/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white block">
                Country / Region
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                Regional lounge matchmaking preference
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-white sm:text-right pl-12 sm:pl-0 font-mono">
            {displayRegion}
          </span>
        </div>

        {/* Row 6: Bio / About Me */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-rose-400/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white block">
                Bio / About Me
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                Tell other players about your favorite 90s games!
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-12 sm:pl-0">
            {bio?.trim() ? (
              <span className="text-xs font-bold text-amber-200 max-w-sm truncate">
                {bio}
              </span>
            ) : (
              <>
                <span className="text-xs text-stone-400 italic">No bio added yet</span>
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="min-h-[44px] px-3 py-2 text-xs font-black text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
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
