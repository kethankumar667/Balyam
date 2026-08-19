import React from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Radio, ShieldCheck } from "lucide-react";

interface StatusIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export const StatusConnectedIcon: React.FC<StatusIconProps> = ({ size = 16, className = "text-emerald-400", ...props }) => (
  <CheckCircle2 size={size} className={className} aria-hidden="true" {...props} />
);

export const StatusDisconnectedIcon: React.FC<StatusIconProps> = ({ size = 16, className = "text-rose-400", ...props }) => (
  <AlertCircle size={size} className={className} aria-hidden="true" {...props} />
);

export const StatusRecoveringIcon: React.FC<StatusIconProps> = ({ size = 16, className = "text-amber-400 animate-spin", ...props }) => (
  <RefreshCw size={size} className={className} aria-hidden="true" {...props} />
);

export const StatusLiveIcon: React.FC<StatusIconProps> = ({ size = 16, className = "text-rose-500 animate-pulse", ...props }) => (
  <Radio size={size} className={className} aria-hidden="true" {...props} />
);

export const StatusVerifiedIcon: React.FC<StatusIconProps> = ({ size = 16, className = "text-sky-400", ...props }) => (
  <ShieldCheck size={size} className={className} aria-hidden="true" {...props} />
);
