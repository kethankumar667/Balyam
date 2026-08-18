import React from "react";
import { GLASSMORPHISM } from "./glassmorphism";

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
          icon: "🎮",
          defaultTitle: "No Matches Recorded Yet",
          defaultDesc: "Jump into any multiplayer lounge room to record your first battle and climb the ranks.",
          defaultAction: "Browse Games",
        };
      case "achievements":
        return {
          icon: "🏆",
          defaultTitle: "Trophy Cabinet Awaiting Glory",
          defaultDesc: "Play games, pull off win streaks, and complete seat recoveries to unlock rare badges.",
          defaultAction: "Start Playing",
        };
      case "friends":
        return {
          icon: "👥",
          defaultTitle: "No Friends Added Yet",
          defaultDesc: "Connect with opponents from recent rooms or add fellow players by their ID.",
          defaultAction: "Find Opponents",
        };
      case "tournaments":
        return {
          icon: "🏟️",
          defaultTitle: "No Tournaments Available",
          defaultDesc: "Championship brackets are scheduled regularly. Check back soon for the next kickoff.",
          defaultAction: "View Schedule",
        };
      case "challenges":
      default:
        return {
          icon: "⚡",
          defaultTitle: "All Quests Complete!",
          defaultDesc: "You have conquered all current objectives. New quests will refresh at the next reset.",
          defaultAction: "Back to Lounge",
        };
    }
  };

  const config = getConfig();

  return (
    <div
      className={`rounded-3xl p-8 sm:p-12 ${GLASSMORPHISM.panel} border border-stone-800/80 text-center space-y-4 shadow-xl flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-stone-900/80 border border-stone-700/60 flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
        <span className="select-none">{config.icon}</span>
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base sm:text-lg font-bold text-stone-100 dark:text-zinc-100 tracking-tight">
          {title || config.defaultTitle}
        </h3>
        <p className="text-xs text-stone-400 font-mono leading-relaxed">
          {description || config.defaultDesc}
        </p>
      </div>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs px-5 py-2.5 rounded-xl border border-stone-700 transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
