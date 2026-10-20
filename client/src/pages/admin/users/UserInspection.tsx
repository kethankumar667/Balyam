import type { ReactNode } from "react";
import type { AdminRecordSection, AdminUserSummary } from "@shared/adminUsers";
import { RefreshCw } from "lucide-react";
import LoadingState from "../../../components/admin/loading-state";
import Panel from "../../../components/admin/panel";
import ModerationPanel from "./ModerationPanel";
import { CoveragePanel, PlayerIdentity, PlayerStats, type PlayerStatsExtras } from "./PlayerPanels";
import SectionNav from "./SectionNav";
import QuietRecordSections, { isQuietSection } from "./QuietRecordSections";
import UserRecordSection from "./UserRecordSection";
import { useSuspensionFlow } from "./useSuspensionFlow";
import { useUserDetails } from "./useUserDetails";

const RETRY =
  "min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--chrome-border)] px-3 text-sm text-[var(--chrome-ink)] transition-colors hover:bg-[var(--chrome-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";

export type ModerationOutcome = { message: string; isError: boolean };

/** A number out of a section's first record, when that section shipped one (profile level, wallet balance). */
function firstNumber(sections: AdminRecordSection[], key: string, field: string): number | undefined {
  const value = sections.find((section) => section.key === key)?.records[0]?.[field];
  return typeof value === "number" ? value : undefined;
}

/** The extra figures for the statistics panel, read from sections the details already carry. */
function statsExtras(sections: AdminRecordSection[]): PlayerStatsExtras {
  return { level: firstNumber(sections, "profile", "level"), balance: firstNumber(sections, "wallet", "balance") };
}

type InspectionProps = {
  userId: string;
  role: AdminUserSummary["role"];
  onUpdate: (user: AdminUserSummary) => void;
  onOutcome: (outcome: ModerationOutcome | null) => void;
  /** Extra panels for the side column, below moderation (console role, wallet). */
  children: ReactNode;
};

/**
 * The dashboard body for one player.
 *
 * The wide column holds what was recorded about how they played: the figures, then each record table.
 * The narrow column holds who they are and what an operator can do about it. On a phone the two stack,
 * figures first, so the first screen is always the summary.
 */
export default function UserInspection({ userId, role, onUpdate, onOutcome, children }: InspectionProps) {
  const { details, error, isLoading, reload, reloads, replaceUser } = useUserDetails(userId, onUpdate);
  const user = details?.user;
  const flow = useSuspensionFlow({ userId, user, role, onUpdate, onOutcome, onSaved: replaceUser, reload });

  if (isLoading) return <LoadingState label="Loading recorded identity data" />;

  if (error) {
    return (
      <Panel>
        <div role="alert" className="space-y-3 text-sm text-[var(--chrome-ink)]">
          <p>User details unavailable: {error}</p>
          <button type="button" className={RETRY} onClick={reload}>
            <RefreshCw size={16} aria-hidden="true" />
            Retry details
          </button>
        </div>
      </Panel>
    );
  }

  if (!user || !details) return null;

  return (
    <div className="space-y-6">
    <SectionNav sections={details.sections} />
    {/* Source order is the phone order (figures, who and what to do, then the long tables); from `lg` the
        side column is pinned to the right and spans both rows. */}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr] lg:items-start">
      <PlayerStats user={user} extras={statsExtras(details.sections)} />
      <div className="space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <PlayerIdentity user={user} />
        <ModerationPanel user={user} flow={flow} onReload={reload} />
        {children}
        <CoveragePanel notes={details.coverage} />
      </div>
      <div className="min-w-0 space-y-6 lg:col-start-1">
        {details.sections.length ? (
          <>
            {details.sections
              .filter((section) => !isQuietSection(section))
              .map((section) => (
                <UserRecordSection key={`${reloads}-${section.key}`} userId={userId} initial={section} />
              ))}
            <QuietRecordSections sections={details.sections.filter(isQuietSection)} />
          </>
        ) : (
          <Panel title="Retained records">
            <p className="text-sm text-[var(--chrome-ink-soft)]">No record sections supplied.</p>
          </Panel>
        )}
      </div>
    </div>
    </div>
  );
}
