import React from "react";
import { Activity, Radio, Clock, Globe, ShieldCheck, Users } from "lucide-react";
import { useIdentityPresentation } from "../../store/authStore";
import { useRoomStore } from "../../store/roomStore";

interface AccountSummaryCardProps {
  isMember?: boolean;
  statusLabel?: string;
  lastSeenAt?: number;
  friendCount?: number;
}

function formatLastSeen(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function AccountSummaryCard({
  isMember,
  statusLabel,
  lastSeenAt,
  friendCount,
}: AccountSummaryCardProps) {
  const presentation = useIdentityPresentation();
  const region = useRoomStore((s) => s.region);
  const effectiveStatus =
    statusLabel ??
    (presentation.isVerifiedMember
      ? "Active Member"
      : presentation.isLocalFallback
        ? "Offline Demo Mode"
        : isMember
          ? "Active Member"
          : "Guest Player");

  const badgeStyle =
    effectiveStatus === "Active Member"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-500/50 shadow-xs dark:shadow-[0_0_8px_rgba(52,211,153,0.3)]"
      : effectiveStatus === "Offline Demo Mode"
        ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-500/50 shadow-xs dark:shadow-[0_0_8px_rgba(245,158,11,0.3)]"
        : "bg-stone-200 text-stone-700 border-stone-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700";

  const iconLetter =
    effectiveStatus === "Active Member"
      ? "M"
      : effectiveStatus === "Offline Demo Mode"
        ? "D"
        : "G";

  const lastActiveText = lastSeenAt
    ? formatLastSeen(lastSeenAt)
    : "Just now";

  return (
    <div className="bg-gradient-to-br from-[#FFFDF9] via-[#FAF3E2] to-[#F5ECE0] dark:from-[#0c1424] dark:via-[#121c33] dark:to-[#090e1c] border-2 border-emerald-500/20 dark:border-emerald-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl dark:shadow-2xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 pb-3.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-stone-950 font-black text-xs flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(4,120,87,1)]">
            {iconLetter}
          </div>
          <h3 className="font-black text-sm text-stone-900 dark:text-white tracking-tight">
            Account Summary
          </h3>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border font-mono ${badgeStyle}`}>
          {effectiveStatus}
        </span>
      </div>

      {/* Metrics List */}
      <div className="space-y-3 text-xs relative z-10">
        {/* Status */}
        <div className="flex items-center justify-between py-1 border-b border-stone-200/60 dark:border-white/5">
          <span className="text-stone-600 dark:text-stone-300 font-bold flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            Account Status
          </span>
          <span className="font-black text-stone-900 dark:text-white">
            {effectiveStatus}
          </span>
        </div>

        {/* Online State */}
        <div className="flex items-center justify-between py-1 border-b border-stone-200/60 dark:border-white/5">
          <span className="text-stone-600 dark:text-stone-300 font-bold flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            Presence
          </span>
          <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            Active in Lounge
          </span>
        </div>

        {/* Last Active */}
        <div className="flex items-center justify-between py-1 border-b border-stone-200/60 dark:border-white/5">
          <span className="text-stone-600 dark:text-stone-300 font-bold flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Last Active
          </span>
          <span className="text-amber-700 dark:text-amber-300 font-black font-mono">
            {lastActiveText}
          </span>
        </div>

        {/* Friends if provided */}
        {friendCount !== undefined && (
          <div className="flex items-center justify-between py-1 border-b border-stone-200/60 dark:border-white/5">
            <span className="text-stone-600 dark:text-stone-300 font-bold flex items-center gap-2.5">
              <Users className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Connected Friends
            </span>
            <span className="font-black text-amber-700 dark:text-amber-400 font-mono">
              {friendCount} Friends
            </span>
          </div>
        )}

        {/* Lounge Region */}
        <div className="flex items-center justify-between py-1">
          <span className="text-stone-600 dark:text-stone-300 font-bold flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            Lounge Region
          </span>
          <span className="font-black text-stone-900 dark:text-white flex items-center gap-1.5 font-mono">
            <span>{region || "India (IN)"}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
