import React from "react";
import { GLASSMORPHISM } from "./glassmorphism";
import { SecondaryButton, TYPOGRAPHY } from "../dls";
import { Gamepad2, Trophy, Users, Flag, Zap } from "lucide-react";

export type EmptyStateType = "matches" | "achievements" | "friends" | "tournaments" | "challenges";

interface EmptyStateIllustrationProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyStateIllustration: React.FC<EmptyStateIllustrationProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  className = "",
}) => {
  const getConfig = () => {
    switch (type) {
      case "matches":
        return {
          icon: Gamepad2,
          defaultTitle: "No Matches Recorded Yet",
          defaultDesc: "Jump into any multiplayer lounge room to record your first battle and climb the ranks.",
          defaultAction: "Browse Games",
        };
      case "achievements":
        return {
          icon: Trophy,
          defaultTitle: "Trophy Cabinet Awaiting Glory",
          defaultDesc: "Play games, pull off win streaks, and complete seat recoveries to unlock rare badges.",
          defaultAction: "Start Playing",
        };
      case "friends":
        return {
          icon: Users,
          defaultTitle: "No Friends Added Yet",
          defaultDesc: "Connect with opponents from recent rooms or add fellow players by their ID.",
          defaultAction: "Find Opponents",
        };
      case "tournaments":
        return {
          icon: Flag,
          defaultTitle: "No Tournaments Available",
          defaultDesc: "Championship brackets are scheduled regularly. Check back soon for the next kickoff.",
          defaultAction: "View Schedule",
        };
      case "challenges":
      default:
        return {
          icon: Zap,
          defaultTitle: "All Quests Complete!",
          defaultDesc: "You have conquered all current objectives. New quests will refresh at the next reset.",
          defaultAction: "Back to Lounge",
        };
    }
  };

  const config = getConfig();

  return (
    <div
      className={`rounded-3xl p-6 sm:p-10 ${GLASSMORPHISM.panel} text-center space-y-4 shadow-sm flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-hairline)] text-[var(--chrome-accent)] flex items-center justify-center">
        <config.icon className="w-8 h-8" aria-hidden="true" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className={TYPOGRAPHY.sectionHeader}>
          {title || config.defaultTitle}
        </h3>
        <p className={TYPOGRAPHY.body}>
          {description || config.defaultDesc}
        </p>
      </div>

      {actionText && onAction && (
        <SecondaryButton
          onClick={onAction}
          size="sm"
          className="mt-2"
        >
          {actionText}
        </SecondaryButton>
      )}
    </div>
  );
};
