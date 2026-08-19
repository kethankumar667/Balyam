import { useEffect, useRef, useState } from "react";

/**
 * The profile page's section rail.
 *
 * One page, not six. Every entry scrolls to a section that is actually on
 * screen below, and the highlight follows the scroll rather than being set on
 * click — clicking and then scrolling away with the old item still lit is the
 * failure mode that makes a rail like this feel broken.
 *
 * The rail lists only sections that exist. A design comp will happily show
 * "Devices" and "Notifications" because a comp costs nothing to draw; wiring
 * them here would put two entries in a menu that lead to a page telling you
 * the feature is not built, which is worse than not offering them.
 */
export interface ProfileSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export default function ProfileNav({ sections }: { sections: ProfileSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  // Set on click and cleared once the smooth scroll settles. Without it the
  // observer fires for every section the page flies past on the way down, and
  // the highlight strobes through the whole list before landing.
  const seeking = useRef<string | null>(null);

  useEffect(() => {
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.intersectionRatio);
        if (seeking.current) return;
        let best = "";
        let bestRatio = 0;
        for (const [id, ratio] of seen) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        if (best) setActive(best);
      },
      // A band across the upper-middle of the viewport, so the lit entry is
      // whatever you are actually reading rather than whatever is technically
      // topmost behind the header.
      { rootMargin: "-12% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [sections]);

  function go(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    seeking.current = id;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      seeking.current = null;
    }, 700);
    // Move the reading position too, not just the pixels — otherwise the next
    // Tab press continues from the rail and walks back through the menu.
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }

  return (
    <nav aria-label="Profile sections" className="lg:sticky lg:top-6">
      <ul
        className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible
                   -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((s) => {
          const on = s.id === active;
          return (
            <li key={s.id} className="flex-shrink-0">
              <a
                href={`#${s.id}`}
                onClick={(e) => go(e, s.id)}
                aria-current={on ? "true" : undefined}
                className={`group flex items-center gap-2.5 whitespace-nowrap
                            min-h-[44px] px-3 rounded-xl text-sm font-bold
                            transition-colors duration-200
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                            ${
                              on
                                ? "bg-[var(--auth-note-bg)] text-[var(--auth-ink)]"
                                : "text-[var(--auth-ink-soft)] hover:bg-[var(--auth-rule)]/45 hover:text-[var(--auth-ink)]"
                            }`}
              >
                <span
                  className={`transition-colors duration-200 ${
                    on ? "text-[var(--auth-accent)]" : "text-[var(--auth-ink-mute)]"
                  }`}
                >
                  {s.icon}
                </span>
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
