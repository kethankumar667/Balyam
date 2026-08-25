import { type ReactNode } from "react";

export type StatusType =
  | "active"
  | "inactive"
  | "healthy"
  | "warning"
  | "critical"
  | "pending"
  | "completed"
  | "failed"
  | "archived"
  | "online"
  | "offline";

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusType,
  { bg: string; text: string; border: string; dot: string; defaultLabel: string }
> = {
  active: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    defaultLabel: "Active",
  },
  online: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500 animate-pulse",
    defaultLabel: "Online",
  },
  healthy: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    defaultLabel: "Healthy",
  },
  completed: {
    bg: "bg-amber-500/15 dark:bg-amber-500/25",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    defaultLabel: "Completed",
  },
  pending: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    defaultLabel: "Pending",
  },
  warning: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    defaultLabel: "Warning",
  },
  critical: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-500 animate-ping",
    defaultLabel: "Critical",
  },
  failed: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    defaultLabel: "Failed",
  },
  inactive: {
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-700 dark:text-slate-400",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
    defaultLabel: "Inactive",
  },
  offline: {
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
    defaultLabel: "Offline",
  },
  archived: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
    defaultLabel: "Archived",
  },
};

const SIZE_CONFIG = {
  sm: "px-2 py-0.5 text-[11px] gap-1.5",
  md: "px-2.5 py-1 text-xs gap-2",
  lg: "px-3 py-1.5 text-sm gap-2.5",
};

export default function StatusBadge({
  status,
  label,
  size = "md",
  dot = true,
  icon,
  className = "",
}: StatusBadgeProps) {
  const normKey = status.toLowerCase() as StatusType;
  const cfg = STATUS_CONFIG[normKey] ?? {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-500",
    defaultLabel: status,
  };

  const displayText = label ?? cfg.defaultLabel;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${SIZE_CONFIG[size]} ${className}`}
    >
      {icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : dot ? (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      ) : null}
      <span className="truncate">{displayText}</span>
    </span>
  );
}
