import { useEffect, useRef, useState } from "react";
import { Check, Copy, Pencil, ShieldCheck } from "lucide-react";
import SeatAvatar from "../../components/profile/SeatAvatar";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";

interface ProfileHeaderProps {
  profile: PlayerProfile;
  isMember?: boolean;
  onEditName?: () => void;
  name?: string;
  avatar?: string | null;
  compact?: boolean;
  favoriteGame?: string;
  badgeLabel?: string;
}

function formatMemberDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

export default function ProfileHeader({
  profile,
  isMember = true,
  onEditName,
  name,
  avatar,
}: ProfileHeaderProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveName = (name ?? profile.displayName).trim() || "Player";
  const effectiveAvatar = avatar !== undefined ? avatar ?? undefined : profile.avatar;
  const currentLevelStart = Math.max(0, (profile.level - 1) * 100);
  const levelProgress = Math.min(100, Math.max(0, profile.experiencePoints - currentLevelStart));

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const handleCopyPlayerId = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(profile.playerId);
      setCopied(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <header className="relative overflow-hidden rounded-[1.35rem] border border-stone-300/80 bg-sand-100 shadow-[0_22px_60px_-42px_rgba(74,37,8,0.55)] dark:border-slate-700/80 dark:bg-sand-900 dark:shadow-[0_28px_70px_-42px_rgba(0,0,0,0.95)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-lamp-500" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-info/10 blur-3xl dark:bg-info/15" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-48 w-48 rounded-full bg-lamp-500/10 blur-3xl" aria-hidden="true" />

      <div className="relative flex flex-col gap-5 p-4 pb-5 sm:p-5 md:flex-row md:items-center md:justify-between lg:p-6">
        <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
          <div className="relative shrink-0">
            <div className="h-[4.5rem] w-[4.5rem] rounded-[1.15rem] border-2 border-info/70 bg-surface-1 p-1 shadow-[0_0_30px_-12px_var(--color-info)] sm:h-24 sm:w-24 sm:rounded-[1.4rem]">
              <SeatAvatar
                avatar={effectiveAvatar}
                name={effectiveName}
                className="h-full w-full rounded-[0.9rem] sm:rounded-[1.1rem]"
                textClassName="text-xl sm:text-3xl font-black text-ink-hi"
              />
            </div>
            <span className="absolute -bottom-2 left-1/2 min-w-12 -translate-x-1/2 rounded-md border border-lamp-600 bg-lamp-500 px-2 py-1 text-center font-mono text-[10px] font-black text-sand-950 shadow-sm">
              LVL {profile.level}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-lamp-700 dark:text-lamp-300">
              Player profile
            </p>
            <h1 className="truncate text-2xl font-black leading-none tracking-[-0.045em] text-ink-hi sm:text-3xl lg:text-4xl">
              {effectiveName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-stone-300 bg-surface-1 px-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-mid dark:border-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                {isMember ? "Member" : "Guest"}
              </span>
              <span className="inline-flex min-h-7 items-center rounded-md border border-stone-300 bg-surface-1 px-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-mid dark:border-slate-700">
                Joined {formatMemberDate(profile.joinedAt)}
              </span>
              <span className="inline-flex min-h-7 items-center rounded-md border border-stone-300 bg-surface-1 px-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-mid dark:border-slate-700">
                Lifetime XP {profile.experiencePoints.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-64 md:shrink-0">
          <div>
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wide text-ink-mid">
              <span>Level {profile.level} progress</span>
              <span className="tabular-nums text-lamp-700 dark:text-lamp-300">{levelProgress}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-label={`Level ${profile.level} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={levelProgress}
            >
              <div className="h-full rounded-full bg-lamp-500 motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${levelProgress}%` }} />
            </div>
          </div>

          <div className="flex gap-2">
            {onEditName && (
              <button
                type="button"
                onClick={onEditName}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-chest-600 px-3 text-sm font-bold text-white shadow-[0_8px_18px_-12px_rgba(126,49,3,0.8)] transition hover:bg-chest-700 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
                aria-label="Edit display name"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit profile
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyPlayerId}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-stone-300 bg-surface-1 text-ink-mid transition hover:bg-surface-2 hover:text-ink-hi active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:border-slate-700"
              aria-label={copied ? "Player ID copied" : "Copy player ID"}
            >
              {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
