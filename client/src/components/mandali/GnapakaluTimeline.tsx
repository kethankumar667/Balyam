/**
 * BHALYAM Mandali — Futuristic Gnapakalu (జ్ఞాపకాలు) Shared Memories Timeline
 *
 * Visual archive of community milestones, tournament victories, and match comebacks.
 * Supports full Light (`data-theme="light"`) and Dark (`data-theme="dark"`) modes.
 *
 * Rules:
 * - Strictly NO usage of Sparkles from lucide-react. Uses Trophy, Crown, Medal, Flame, Zap.
 * - WCAG 2.1 AA accessible focus rings.
 */

import React from "react";
import { Trophy, Crown, Medal, Flame, Calendar, Award } from "lucide-react";
import type { MandaliMemory, MemorySourceType } from "@shared/mandali/types.js";

export interface GnapakaluTimelineProps {
  memories: MandaliMemory[];
  emptyMessage?: string;
}

function getMemoryIcon(type: MemorySourceType) {
  switch (type) {
    case "GAME_VICTORY":
      return <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
    case "COMMUNITY_MILESTONE":
      return <Crown className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />;
    case "EVENT_MILESTONE":
      return <Flame className="w-5 h-5 text-orange-500 dark:text-orange-400" />;
    case "ANNIVERSARY":
      return <Medal className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />;
    default:
      return <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
  }
}

function getBadgeStyle(type: MemorySourceType): string {
  switch (type) {
    case "GAME_VICTORY":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "COMMUNITY_MILESTONE":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    case "EVENT_MILESTONE":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30";
    case "ANNIVERSARY":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700";
  }
}

export const GnapakaluTimeline: React.FC<GnapakaluTimelineProps> = ({
  memories,
  emptyMessage = "No memories recorded yet. Play matches together to create community history!",
}) => {
  if (!memories || memories.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
          <Trophy className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-slate-800 dark:text-slate-300 text-sm mb-1">
          Gnapakalu (జ్ఞాపకాలు) Archive
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const sorted = [...memories].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-gradient-to-b before:from-amber-500/60 before:via-slate-300 dark:before:via-slate-800 before:to-transparent">
      {sorted.map((mem) => {
        const dateStr = new Date(mem.timestamp).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div key={mem.memoryId} className="relative pl-12 group">
            {/* Holographic Timeline Pin Node */}
            <div className="absolute left-2.5 top-3 -translate-x-1/2 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 border-amber-500 group-hover:border-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 transition-colors">
              <div className="scale-75">{getMemoryIcon(mem.type)}</div>
            </div>

            {/* Memory Card */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 hover:border-amber-500/50 dark:hover:border-amber-500/50 rounded-2xl p-4 transition-all shadow-xs hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getBadgeStyle(
                      mem.type
                    )}`}
                  >
                    {mem.type.replace("_", " ")}
                  </span>
                  {mem.game && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      • {mem.game}
                    </span>
                  )}
                </div>

                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {dateStr}
                </span>
              </div>

              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {mem.title}
              </h4>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {mem.description}
              </p>

              {mem.celebratedBy && mem.celebratedBy.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>
                    Celebrated by {mem.celebratedBy.length}{" "}
                    {mem.celebratedBy.length === 1 ? "member" : "members"}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
