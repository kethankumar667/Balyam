import type { AdminRecordSection } from "@shared/adminUsers";
import { isQuietSection } from "./QuietRecordSections";
import { sectionTitle } from "./recordFormat";

/** Below this many sections there is nothing to jump between. */
const MIN_SECTIONS = 3;

const SETTLE_MS = 400;
const DRIFT_TOLERANCE_PX = 4;

/**
 * Takes the page straight to a section. The jump is instant, not animated: sections load as they come near
 * the screen, and a long animated scroll would pass (and so load) every section on the way. Once the target's
 * own rows have arrived it may have moved a little, so it is brought back to the top once if it has.
 */
function jumpTo(key: string): void {
  const target = document.getElementById(`record-${key}`);
  if (!target) return;
  target.scrollIntoView({ behavior: "instant", block: "start" });
  target.focus({ preventScroll: true });
  const landedAt = target.getBoundingClientRect().top;
  window.setTimeout(() => {
    if (Math.abs(target.getBoundingClientRect().top - landedAt) > DRIFT_TOLERANCE_PX) target.scrollIntoView({ behavior: "instant", block: "start" });
  }, SETTLE_MS);
}

/**
 * A bar to jump to a record section, with how many rows each holds.
 *
 * The page can carry a dozen sections; this saves scrolling past the ones that are not wanted. Sections
 * with nothing in them are left out (they are listed together at the bottom). It sticks to the top of the
 * page on wide screens, and on a phone sits in the flow as a grid, because a pinned bar there would eat
 * the screen.
 */
export default function SectionNav({ sections }: { sections: AdminRecordSection[] }) {
  const items = sections.filter((section) => !isQuietSection(section));
  if (items.length < MIN_SECTIONS) return null;
  return (
    <nav
      aria-label="Record sections"
      className="z-10 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-2 shadow-2xs sm:flex sm:flex-wrap lg:sticky lg:top-0"
    >
      {items.map((section) => (
        <button
          key={section.key}
          type="button"
          onClick={() => jumpTo(section.key)}
          className="min-h-[44px] inline-flex items-center justify-between gap-2 rounded-xl px-3 text-sm font-medium text-[var(--chrome-ink)] transition-colors hover:bg-[var(--chrome-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <span>{sectionTitle(section.title)}</span>
          {section.total !== null && <span className="text-xs tabular-nums text-[var(--chrome-ink-soft)]">{section.total}</span>}
        </button>
      ))}
    </nav>
  );
}
