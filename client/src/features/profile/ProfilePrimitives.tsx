import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight } from "lucide-react";

export type ProfileAccent = "gold" | "cyan" | "violet" | "coral" | "green";

const ACCENT_ICON: Record<ProfileAccent, string> = {
  gold: "bg-lamp-100 text-lamp-800 dark:bg-lamp-500/15 dark:text-lamp-300",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-400/10 dark:text-violet-300",
  coral: "bg-rose-100 text-rose-800 dark:bg-rose-400/10 dark:text-rose-300",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
};

const ACCENT_BAR: Record<ProfileAccent, string> = {
  gold: "bg-lamp-500",
  cyan: "bg-cyan-500",
  violet: "bg-violet-500",
  coral: "bg-rose-500",
  green: "bg-emerald-500",
};

const ACCENT_TEXT: Record<ProfileAccent, string> = {
  gold: "text-lamp-800 dark:text-lamp-300",
  cyan: "text-cyan-800 dark:text-cyan-300",
  violet: "text-violet-800 dark:text-violet-300",
  coral: "text-rose-800 dark:text-rose-300",
  green: "text-emerald-800 dark:text-emerald-300",
};

export interface ProfilePageHeadingProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  accent?: ProfileAccent;
  action?: ReactNode;
}

export function ProfilePageHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent = "gold",
  action,
}: ProfilePageHeadingProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ACCENT_ICON[accent]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${ACCENT_TEXT[accent]}`}>{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black leading-tight tracking-[-0.04em] text-ink-hi sm:text-3xl">{title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-mid">{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export interface ProfileMetricTileProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accent: ProfileAccent;
}

export function ProfileMetricTile({ label, value, detail, icon: Icon, accent }: ProfileMetricTileProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="relative min-h-28 overflow-hidden rounded-xl border border-stone-300/80 bg-surface-1 p-3.5 shadow-[0_18px_40px_-34px_rgba(74,37,8,0.5)] dark:border-slate-700/80 dark:shadow-[0_20px_42px_-34px_rgba(0,0,0,0.95)] sm:p-4"
    >
      <span className={`absolute inset-y-0 left-0 w-0.5 ${ACCENT_BAR[accent]}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-ink-mid">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${ACCENT_ICON[accent]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl font-black tracking-[-0.04em] text-ink-hi tabular-nums sm:text-3xl">{value}</p>
      <p className={`mt-1 text-[11px] font-semibold ${ACCENT_TEXT[accent]}`}>{detail}</p>
    </div>
  );
}

export interface ProfileSectionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  accent: ProfileAccent;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}

export function ProfileSection({
  title,
  description,
  icon: Icon,
  accent,
  action,
  children,
  id,
  className = "",
}: ProfileSectionProps) {
  const headingId = `${id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
  return (
    <section
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-labelledby={headingId}
      className={`overflow-hidden rounded-2xl border border-stone-300/80 bg-surface-1 shadow-[0_22px_50px_-42px_rgba(74,37,8,0.52)] dark:border-slate-700/80 dark:shadow-[0_24px_54px_-42px_rgba(0,0,0,0.98)] ${className}`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-stone-300/70 px-4 py-4 dark:border-slate-700/70 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ACCENT_ICON[accent]}`}>
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id={headingId} className="text-base font-bold text-ink-hi">{title}</h3>
            {description ? <p className="mt-0.5 text-xs leading-relaxed text-ink-mid">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export interface ProfileProgressBarProps {
  label: string;
  value: number;
  accent: ProfileAccent;
  showValue?: boolean;
}

export function ProfileProgressBar({ label, value, accent, showValue = true }: ProfileProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-ink-mid">{label}</span>
        {showValue ? <span className={`font-mono font-bold tabular-nums ${ACCENT_TEXT[accent]}`}>{safeValue}%</span> : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        className="h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={`h-full rounded-full ${ACCENT_BAR[accent]} motion-safe:transition-[width] motion-safe:duration-500`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

export interface ProfileEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ProfileEmptyState({ icon: Icon, title, description, actionLabel, onAction }: ProfileEmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-400 bg-surface-0 px-5 py-9 text-center dark:border-slate-600">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-ink-mid">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h4 className="mt-4 text-base font-bold text-ink-hi">{title}</h4>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-mid">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-chest-600 px-4 text-sm font-bold text-white transition hover:bg-chest-700 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export interface ProfileErrorStateProps {
  title: string;
  description: string;
  onRetry: () => void;
}

export function ProfileErrorState({ title, description, onRetry }: ProfileErrorStateProps) {
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-7 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-danger" aria-hidden="true" />
      <h4 className="mt-3 text-base font-bold text-ink-hi">{title}</h4>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-mid">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-[44px] rounded-xl border border-danger/40 bg-surface-1 px-4 text-sm font-bold text-danger transition hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
      >
        Try again
      </button>
    </div>
  );
}

export function ProfilePanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-label="Loading profile content" className="space-y-3 animate-pulse">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-xl bg-surface-0 p-3">
          <div className="h-10 w-10 rounded-lg bg-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-surface-2" />
            <div className="h-2.5 w-2/3 rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
