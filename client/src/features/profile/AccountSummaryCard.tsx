import { Clock3, Globe2, Radio, ShieldCheck, Users } from "lucide-react";
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
  const region = useRoomStore((state) => state.region);
  const effectiveStatus = statusLabel ?? (presentation.isVerifiedMember
    ? "Active Member"
    : presentation.isLocalFallback
      ? "Offline Demo Mode"
      : isMember
        ? "Active Member"
        : "Guest Player");
  const statusStyle = effectiveStatus === "Active Member"
    ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20"
    : effectiveStatus === "Offline Demo Mode"
      ? "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20"
      : "bg-stone-100 text-stone-700 ring-stone-500/20 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600";

  const details = [
    { label: "Presence", value: "Active in lounge", icon: Radio },
    { label: "Last active", value: lastSeenAt ? formatLastSeen(lastSeenAt) : "Just now", icon: Clock3 },
    ...(friendCount === undefined ? [] : [{ label: "Friends", value: `${friendCount} Friends`, icon: Users }]),
    { label: "Region", value: region || "India (IN)", icon: Globe2 },
  ];

  return (
    <section
      aria-labelledby="account-status-heading"
      className="rounded-2xl border border-stone-200/90 bg-white shadow-[0_18px_45px_-34px_rgba(41,37,36,0.45)] dark:border-slate-700/70 dark:bg-[#0D1424] dark:shadow-[0_24px_56px_-36px_rgba(0,0,0,0.9)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-stone-200/80 px-5 py-5 dark:border-slate-700/70">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="account-status-heading" className="text-base font-bold text-stone-950 dark:text-white">Account</h2>
            <p className="text-sm text-stone-500 dark:text-slate-400">Identity and connection</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${statusStyle}`}>
          {effectiveStatus}
        </span>
      </header>

      <dl className="divide-y divide-stone-200/80 px-5 dark:divide-slate-700/70">
        {details.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex min-h-14 items-center justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-sm text-stone-500 dark:text-slate-400">
              <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              {label}
            </dt>
            <dd className="text-right text-sm font-semibold text-stone-950 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}