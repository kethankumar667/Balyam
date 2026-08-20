import { useState } from "react";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import {
  User,
  Hash,
  Mail,
  Calendar,
  Globe,
  MessageSquare,
  Copy,
  Check,
  Edit3,
  ShieldCheck,
  Sparkles,
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

  return (
    <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
      {/* Subtle Ambient Light Flare */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--auth-field-edge)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[var(--auth-ink)] tracking-tight">
              Personal Information
            </h2>
            <p className="text-xs text-[var(--auth-ink-soft)] font-medium">
              Manage your personal details, contact info, and public profile visibility.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onEditProfile}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs font-mono uppercase tracking-wider transition shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500/60 shrink-0"
        >
          <Edit3 className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Information Rows */}
      <div className="space-y-4">
        {/* Row 1: Display Name */}
        <div className="p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] uppercase block">
                Display Name
              </span>
              <span className="text-sm font-extrabold text-[var(--auth-ink)]">
                {displayName}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono sm:text-right">
            Visible to all players across multiplayer lounges
          </span>
        </div>

        {/* Row 2: Player ID */}
        <div className="p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] uppercase block">
                Player ID
              </span>
              <span className="text-sm font-black font-mono text-[var(--auth-ink)] tracking-wider">
                {profile.playerId}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-xl bg-[var(--auth-card)] border border-[var(--auth-card-edge)] hover:border-amber-500 text-xs font-bold font-mono text-[var(--auth-ink)] transition shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              aria-label="Copy Player ID to clipboard"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[var(--auth-ink-soft)]" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Row 3: Email Address */}
        <div className="p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] uppercase block">
                Email Address
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-[var(--auth-ink)] font-mono">
                  {email ? maskEmail(email) : "No email linked (Guest Session)"}
                </span>
                {email && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-black font-mono px-2 py-0.5 rounded-md border ${
                      isVerifiedEmail
                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {isVerifiedEmail ? "Verified" : "Unverified"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono sm:text-right">
            Used for account recovery and lounge security
          </span>
        </div>

        {/* Row 4: Date Joined */}
        <div className="p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] uppercase block">
                Date Joined
              </span>
              <span className="text-sm font-extrabold text-[var(--auth-ink)] font-mono">
                {memberDate}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono sm:text-right">
            Official BHALYAM member registration date
          </span>
        </div>

        {/* Row 5: Country / Region */}
        <div className="p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] uppercase block">
                Country / Region
              </span>
              <span className="text-sm font-extrabold text-[var(--auth-ink)]">
                {region}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono sm:text-right">
            Regional lounge matchmaking preference
          </span>
        </div>

        {/* Row 6: Bio / About */}
        <div className="p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] space-y-2 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] uppercase">
                Bio / About Me
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Public
            </span>
          </div>
          <p className="text-xs text-[var(--auth-ink)] pl-11 leading-relaxed">
            {bio?.trim() ? (
              bio
            ) : (
              <span className="text-[var(--auth-ink-soft)] italic font-mono">
                No bio added yet. Tell other players about your favorite 90s games!
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
