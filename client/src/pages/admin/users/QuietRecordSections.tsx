import type { AdminRecordSection } from "@shared/adminUsers";
import Panel from "../../../components/admin/panel";
import { sectionTitle } from "./recordFormat";

/** A section with nothing to page through: no rows, and no further pages to fetch. */
export function isQuietSection(section: AdminRecordSection): boolean {
  // A deferred section has no rows yet only because they have not been fetched; the server counted some.
  if (section.deferred) return false;
  return section.records.length === 0 && !section.hasMore;
}

function statusOf(section: AdminRecordSection): string {
  if (section.unavailable) return section.unavailable;
  return "None recorded";
}

/**
 * The sections with nothing in them, as one list rather than a panel each.
 *
 * A player can have sixteen kinds of record and most are empty or not kept at all. Giving each its own
 * empty panel buried the few that hold something under screens of blank cards.
 */
export default function QuietRecordSections({ sections }: { sections: AdminRecordSection[] }) {
  if (sections.length === 0) return null;
  return (
    <Panel title="Nothing recorded" description="Sections with no rows to show.">
      <ul className="divide-y divide-[var(--chrome-hairline)]">
        {sections.map((section) => (
          <li key={section.key} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="text-sm font-medium text-[var(--chrome-ink)]">{sectionTitle(section.title)}</span>
            <span className="text-sm text-[var(--chrome-ink-soft)]">{statusOf(section)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
