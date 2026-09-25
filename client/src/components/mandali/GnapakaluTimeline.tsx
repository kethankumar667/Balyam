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
}

const KIND: Record<MemorySourceType, { icon: LucideIcon; labelKey: string }> = {
  GAME_VICTORY: { icon: Trophy, labelKey: "mandali.memories.type.win" },
  COMMUNITY_MILESTONE: { icon: Crown, labelKey: "mandali.memories.type.milestone" },
  EVENT_MILESTONE: { icon: Flame, labelKey: "mandali.memories.type.event" },
  ANNIVERSARY: { icon: Medal, labelKey: "mandali.memories.type.anniversary" },
};

export const GnapakaluTimeline: React.FC<GnapakaluTimelineProps> = ({ memories, emptyMessage }) => {
  const { t, locale } = useTranslation();
  const localeTag = LOCALE_BY_ID[locale]?.tag ?? "en";

  if (!memories || memories.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-album-line px-5 py-10 text-center">
        <p className="album-hand m-0 text-3xl leading-none text-album-foil">{t("mandali.memories.empty.title")}</p>
        <p className="mx-auto mb-0 mt-3 max-w-[18rem] text-[15px] leading-relaxed text-album-ink2">
          {emptyMessage ?? t("mandali.memories.empty.body")}
        </p>
      </div>
    );
  }

  const newestFirst = [...memories].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <ol className="m-0 list-none space-y-4 p-0">
      {newestFirst.map((memory) => {
        const kind = KIND[memory.type];
        const Icon = kind?.icon ?? Award;
        const date = new Date(memory.timestamp).toLocaleDateString(localeTag, { day: "numeric", month: "long", year: "numeric" });
        const celebrated = memory.celebratedBy?.length ?? 0;

        return (
          <li key={memory.memoryId}>
            <article className="album-corners rounded-xl border border-album-line bg-album-raised px-5 pb-4 pt-5">
              <p className="album-hand m-0 text-xl leading-none text-album-ink2">
                <time dateTime={new Date(memory.timestamp).toISOString()}>{date}</time>
              </p>
              <div className="mt-2 flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-album-field text-album-foil">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-base font-semibold leading-snug text-album-ink">{memory.title}</h3>
                  <p className="m-0 mt-1 text-[15px] leading-relaxed text-album-ink2">{memory.description}</p>
                  <p className="m-0 mt-2 text-sm text-album-ink3">
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
