import React from "react";
import { Activity, Radio, Clock, Globe } from "lucide-react";
import { useIdentityPresentation } from "../../store/authStore";

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
      ? "bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]"
      : effectiveStatus === "Offline Demo Mode"
        ? "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]"
        : "bg-[#F1F5F9] dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border-[#E2E8F0] dark:border-[#334155]";

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
    <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs relative overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#F3EFE9] dark:border-[#202740] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
            {iconLetter}
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Account Summary
          </h3>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}>
          {effectiveStatus}
        </span>
      </div>

      {/* Metrics List */}
      <div className="space-y-3 text-xs">
        {/* Status */}
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-[#16A34A]" />
            Account Status
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            {effectiveStatus}
          </span>
        </div>

        {/* Online State */}
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-[#0EA5E9]" />
            Presence
          </span>
          <span className="font-bold text-[#16A34A]">
            Active in Lounge
          </span>
        </div>

        {/* Last Active */}
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#F59E0B]" />
            Last Active
          </span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {lastActiveText}
          </span>
        </div>

        {/* Friends if provided */}
        {friendCount !== undefined && (
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2.5">
              <span className="text-amber-500 font-bold">👥</span>
              Connected Friends
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {friendCount} Friends
            </span>
          </div>
        )}

        {/* Lounge Server */}
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-[#D946EF]" />
            Lounge Server
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            India (IN-South)
          </span>
        </div>
      </div>
    </div>
  );
}
