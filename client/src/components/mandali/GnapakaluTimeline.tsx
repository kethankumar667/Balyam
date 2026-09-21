/**
 * BHALYAM Mandali — Gnapakalu (జ్ఞాపకాలు) Shared Memories Timeline
 *
 * Visual archive of community milestones, tournament wins, and epic match comebacks.
 *
 * Rules:
 * - Strictly NO usage of Sparkles from lucide-react. Uses Trophy, Crown, Medal, Flame.
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
      return <Trophy className="w-5 h-5 text-amber-400" />;
    case "COMMUNITY_MILESTONE":
      return <Crown className="w-5 h-5 text-yellow-400" />;
    case "EVENT_MILESTONE":
      return <Flame className="w-5 h-5 text-orange-400" />;
    case "ANNIVERSARY":
      return <Medal className="w-5 h-5 text-emerald-400" />;
    default:
      return <Award className="w-5 h-5 text-amber-400" />;
  }
}

function getBadgeStyle(type: MemorySourceType): string {
  switch (type) {
    case "GAME_VICTORY":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "COMMUNITY_MILESTONE":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "EVENT_MILESTONE":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "ANNIVERSARY":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    default:
      return "bg-slate-800 text-slate-400 border-slate-700";
  }
}

export const GnapakaluTimeline: React.FC<GnapakaluTimelineProps> = ({
  memories,
  emptyMessage = "No memories recorded yet. Play matches together to create community history!",
}) => {
  if (!memories || memories.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
          <Trophy className="w-6 h-6" />
        </div>
        <h4 className="font-semibold text-slate-300 text-sm mb-1">Gnapakalu (జ్ఞాపకాలు) Archive</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{emptyMessage}</p>
      </div>
    );
  }

  // Sort descending by timestamp
  const sorted = [...memories].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-800/80">
      {sorted.map((mem) => {
        const dateStr = new Date(mem.timestamp).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div key={mem.memoryId} className="relative pl-12 group">
            {/* Timeline pin node */}
            <div className="absolute left-2.5 top-3 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-900 border-2 border-amber-500/60 group-hover:border-amber-400 flex items-center justify-center shadow-md transition-colors">
              <div className="scale-75">{getMemoryIcon(mem.type)}</div>
            </div>

            {/* Memory Card */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                      mem.type
                    )}`}
                  >
                    {mem.type.replace("_", " ")}
                  </span>
                  {mem.game && (
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                      • {mem.game}
                    </span>
                  )}
                </div>

                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {dateStr}
                </span>
              </div>

              <h4 className="font-bold text-white text-sm sm:text-base group-hover:text-amber-400 transition-colors">
                {mem.title}
              </h4>

              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {mem.description}
              </p>

              {mem.celebratedBy && mem.celebratedBy.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
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
