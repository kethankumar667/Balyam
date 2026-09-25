/**
 * BHALYAM Mandali — Gnapakalu (జ్ఞాపకాలు), the group's memories.
 *
 * Each memory is a keepsake pinned to an album page: photo corners at its
 * edges, the date written by hand above it. Newest first. When there is
 * nothing yet, it says so kindly, instead of asking people to go and earn one.
 *
 * Requirements:
 * - Light and dark themes both flip fully (panels and ink together).
 * - Zero usage of Sparkles from lucide-react.
 */

import React from "react";
import { Award, Crown, Flame, Medal, Trophy, type LucideIcon } from "lucide-react";
import type { MandaliMemory, MemorySourceType } from "@shared/mandali/types.js";
import { useTranslation } from "../../hooks/useTranslation";
import { LOCALE_BY_ID } from "../../i18n/types";

export interface GnapakaluTimelineProps {
  memories: MandaliMemory[];
  /** Overrides the default empty-state sentence. */
  emptyMessage?: string;
  /** Uses a shorter treatment when the timeline appears in a side rail. */
  compact?: boolean;
}

const KIND: Record<MemorySourceType, { icon: LucideIcon; labelKey: string }> = {
  GAME_VICTORY: { icon: Trophy, labelKey: "mandali.memories.type.win" },
  COMMUNITY_MILESTONE: { icon: Crown, labelKey: "mandali.memories.type.milestone" },
  EVENT_MILESTONE: { icon: Flame, labelKey: "mandali.memories.type.event" },
  ANNIVERSARY: { icon: Medal, labelKey: "mandali.memories.type.anniversary" },
};

export const GnapakaluTimeline: React.FC<GnapakaluTimelineProps> = ({ memories, emptyMessage, compact = false }) => {
  const { t, locale } = useTranslation();
  const localeTag = LOCALE_BY_ID[locale]?.tag ?? "en";

  if (!memories || memories.length === 0) {
    return (
      <div className={`rounded-xl border border-dashed border-album-line px-4 text-center ${compact ? "py-6" : "py-10"}`}>
        <p className={`album-hand m-0 leading-none text-album-foil ${compact ? "text-2xl" : "text-3xl"}`}>{t("mandali.memories.empty.title")}</p>
        <p className={`mx-auto mb-0 mt-3 max-w-[18rem] leading-relaxed text-album-ink2 ${compact ? "text-sm" : "text-[15px]"}`}>
          {emptyMessage ?? t("mandali.memories.empty.body")}
        </p>
      </div>
    );
  }

  const newestFirst = [...memories].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <ol className={`m-0 list-none p-0 ${compact ? "space-y-3" : "space-y-4"}`}>
      {newestFirst.map((memory) => {
        const kind = KIND[memory.type];
        const Icon = kind?.icon ?? Award;
        const date = new Date(memory.timestamp).toLocaleDateString(localeTag, { day: "numeric", month: "long", year: "numeric" });
        const celebrated = memory.celebratedBy?.length ?? 0;

        return (
          <li key={memory.memoryId}>
            <article className={`album-corners rounded-xl border border-album-line bg-album-raised ${compact ? "px-4 pb-3 pt-4" : "px-5 pb-4 pt-5"}`}>
              <p className={`album-hand m-0 leading-none text-album-ink2 ${compact ? "text-lg" : "text-xl"}`}>
                <time dateTime={new Date(memory.timestamp).toISOString()}>{date}</time>
              </p>
              <div className={`${compact ? "mt-1.5 gap-2.5" : "mt-2 gap-3"} flex items-start`}>
                <span className={`mt-0.5 flex flex-shrink-0 items-center justify-center rounded-full bg-album-field text-album-foil ${compact ? "h-8 w-8" : "h-9 w-9"}`}>
                  <Icon className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className={`m-0 font-semibold leading-snug text-album-ink ${compact ? "text-[15px]" : "text-base"}`}>{memory.title}</h3>
                  <p className={`m-0 mt-1 leading-relaxed text-album-ink2 ${compact ? "text-sm" : "text-[15px]"}`}>{memory.description}</p>
                  <p className={`m-0 mt-2 text-album-ink3 ${compact ? "text-xs" : "text-sm"}`}>
                    {kind ? t(kind.labelKey) : ""}
                    {memory.highlightStat ? ` · ${memory.highlightStat}` : ""}
                    {celebrated > 0 ? ` · ${t("mandali.memories.celebrated", { count: celebrated })}` : ""}
                  </p>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
};
