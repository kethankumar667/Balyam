import React from "react";
import { Shield, Activity, Users, Radio, CheckCircle } from "lucide-react";

interface AccountSummaryCardProps {
  isMember: boolean;
  lastSeenAt?: number;
  friendCount?: number;
  squadName?: string;
}

export default function AccountSummaryCard({
  isMember,
  lastSeenAt,
  friendCount = 3,
  squadName = "Lounge Champions",
}: AccountSummaryCardProps) {
  const lastActiveText = lastSeenAt
    ? formatLastSeen(lastSeenAt)
    : "Just now";

  return (
    <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[var(--auth-field-edge)] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-sm text-[var(--auth-ink)]">
            Account Summary
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-black font-mono px-2 py-0.5 rounded-full border ${
            isMember
              ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
              : "bg-amber-500/15 text-amber-500 border-amber-500/30"
          }`}
        >
          <CheckCircle className="w-3 h-3" />
          {isMember ? "MEMBER" : "GUEST"}
        </span>
      </div>

      {/* Metrics List */}
      <div className="space-y-3 text-xs font-mono">
        {/* Status */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
          <span className="text-[var(--auth-ink-soft)] font-bold flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            Account Status
          </span>
          <span className="font-black text-emerald-500">
            {isMember ? "Active Member" : "Guest Player"}
          </span>
        </div>

        {/* Online State */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
          <span className="text-[var(--auth-ink-soft)] font-bold flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
            Live Presence
          </span>
          <span className="font-bold text-[var(--auth-ink)]">
            Online • In Lounge
          </span>
        </div>

        {/* Last Active */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
          <span className="text-[var(--auth-ink-soft)] font-bold">
            Last Active
          </span>
          <span className="font-bold text-[var(--auth-ink)]">
            {lastActiveText}
          </span>
        </div>

        {/* Friend Count */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
          <span className="text-[var(--auth-ink-soft)] font-bold flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-amber-500" />
            Connected Friends
          </span>
          <span className="font-bold text-amber-500">
            {friendCount} Friends
          </span>
        </div>
      </div>
    </div>
  );
}

function formatLastSeen(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
