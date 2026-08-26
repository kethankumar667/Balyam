import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info, RotateCcw } from "lucide-react";

export type EconomyBannerStatus =
  | "pending"
  | "failed"
  | "refunded"
  | "insufficient_funds"
  | "synthetic_notice"
  | "info";

export interface EconomyStatusBannerProps {
  status: EconomyBannerStatus;
  title?: string;
  description: string | React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

const BANNER_CONFIG: Record<
  EconomyBannerStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    containerClass: string;
    iconClass: string;
    titleClass: string;
    defaultTitle: string;
    role: "alert" | "status";
    ariaLive: "assertive" | "polite";
  }
> = {
  pending: {
    icon: Clock,
    containerClass: "bg-sky-500/10 border-sky-500/30 text-sky-950 dark:text-sky-100",
    iconClass: "text-sky-500 animate-spin-slow",
    titleClass: "text-sky-900 dark:text-sky-300 font-bold",
    defaultTitle: "Settlement Pending",
    role: "status",
    ariaLive: "polite",
  },
  failed: {
    icon: AlertCircle,
    containerClass: "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-100",
    iconClass: "text-red-500",
    titleClass: "text-red-900 dark:text-red-300 font-bold",
    defaultTitle: "Action Failed",
    role: "alert",
    ariaLive: "assertive",
  },
  refunded: {
    icon: RotateCcw,
    containerClass: "bg-pink-500/10 border-pink-500/30 text-pink-950 dark:text-pink-100",
    iconClass: "text-pink-500",
    titleClass: "text-pink-900 dark:text-pink-300 font-bold",
    defaultTitle: "Match Commitment Restored",
    role: "status",
    ariaLive: "polite",
  },
  insufficient_funds: {
    icon: AlertTriangle,
    containerClass: "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100",
    iconClass: "text-amber-500",
    titleClass: "text-amber-900 dark:text-amber-300 font-bold",
    defaultTitle: "Insufficient Balance",
    role: "alert",
    ariaLive: "assertive",
  },
  synthetic_notice: {
    icon: Info,
    containerClass: "bg-indigo-500/10 border-indigo-500/30 text-indigo-950 dark:text-indigo-100",
    iconClass: "text-indigo-500",
    titleClass: "text-indigo-900 dark:text-indigo-300 font-bold",
    defaultTitle: "Synthetic Demonstration Notice",
    role: "status",
    ariaLive: "polite",
  },
  info: {
    icon: CheckCircle2,
    containerClass: "bg-slate-500/10 border-slate-500/30 text-slate-900 dark:text-slate-100",
    iconClass: "text-slate-500",
    titleClass: "text-slate-800 dark:text-slate-200 font-bold",
    defaultTitle: "Information",
    role: "status",
    ariaLive: "polite",
  },
};

/**
 * Accessible Economy Status Banner for alerts, pending statuses, and synthetic notices.
 */
export const EconomyStatusBanner: React.FC<EconomyStatusBannerProps> = ({
  status,
  title,
  description,
  actionText,
  onAction,
  className = "",
}) => {
  const config = BANNER_CONFIG[status];
  const IconComponent = config.icon;
  const displayTitle = title || config.defaultTitle;

  return (
    <div
      role={config.role}
      aria-live={config.ariaLive}
      className={`flex items-start gap-3 p-3.5 rounded-xl border font-sans text-xs sm:text-sm ${config.containerClass} ${className}`}
    >
      <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconClass}`} />
      <div className="flex-1 min-w-0">
        {displayTitle && <h4 className={`text-xs uppercase tracking-wider mb-0.5 ${config.titleClass}`}>{displayTitle}</h4>}
        <div className="leading-relaxed opacity-95 break-words">{description}</div>
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex-shrink-0 text-xs font-bold underline hover:opacity-80 focus-visible:ring-2 focus-visible:ring-amber-500 rounded px-1.5 py-0.5"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EconomyStatusBanner;
