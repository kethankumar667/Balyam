import React from "react";
import { SURFACES, SecondaryButton, TYPOGRAPHY } from "../dls";
import { TriangleAlert } from "lucide-react";

interface PremiumErrorStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  onRetry?: () => void;
  className?: string;
}

export const PremiumErrorState: React.FC<PremiumErrorStateProps> = ({
  title = "Connection Interrupted",
  message = "We encountered a temporary network hiccup communicating with the lounge servers.",
  actionText = "Try Again",
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`${SURFACES.cardElevated} p-6 sm:p-8 text-center space-y-4 max-w-md mx-auto border border-rose-500/40 shadow-2xl ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner text-rose-400">
        <TriangleAlert className="w-8 h-8 text-rose-700 dark:text-rose-300" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <h3 className={TYPOGRAPHY.sectionHeader}>
          {title}
        </h3>
        <p className={TYPOGRAPHY.body}>
          {message}
        </p>
      </div>

      {onRetry && (
        <SecondaryButton
          onClick={onRetry}
          size="sm"
        >
          {actionText}
        </SecondaryButton>
      )}
    </div>
  );
};
