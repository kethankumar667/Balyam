import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const VIEW_ALL =
  "inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-bold text-[var(--command-cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--command-gold)]";

export interface PhoneSectionProps {
  title: string;
  /** Where "View all" goes, and what it is for (read aloud, since the visible text is only "View all"). */
  viewAll?: { to: string; label: string };
  /** Keeps deep links such as `/profile#mastery` working: the page scrolls to this id. */
  id?: string;
  children: ReactNode;
}

/**
 * One shallow container: a small caps title with "View all" on the right, then rows. No icon tile, no
 * description line, no nested cards, so a section costs a heading's height rather than a card's.
 */
export default function PhoneSection({ title, viewAll, id, children }: PhoneSectionProps) {
  const headingId = useId();
  return (
    <section
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-labelledby={headingId}
      className="scroll-mt-4 overflow-hidden rounded-2xl border border-stone-300/80 bg-surface-1 shadow-[0_22px_50px_-42px_rgba(74,37,8,0.52)] focus:outline-none dark:border-slate-700/80 dark:shadow-[0_24px_54px_-42px_rgba(0,0,0,0.98)]"
    >
      <header className="flex items-center justify-between gap-3 px-4 pt-1.5">
        <h3 id={headingId} className="text-[11px] font-bold uppercase tracking-[.16em] text-[var(--command-cyan)]">{title}</h3>
        {viewAll ? (
          <Link to={viewAll.to} aria-label={viewAll.label} className={VIEW_ALL}>
            View all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : null}
      </header>
      <div className="px-4 pb-3">{children}</div>
    </section>
  );
}
