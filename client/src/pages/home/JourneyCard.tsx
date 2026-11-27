import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export type JourneyTone = "play" | "level" | "social";

/**
 * The three stages of the player's journey share one card. Only the colours differ (mint = play, blue = progress,
 * lavender = connect), so every class string below is written out in full for Tailwind to find it.
 */
const TONE: Record<JourneyTone, { card: string; eyebrow: string; action: string }> = {
  play: {
    card: "border-journey-mint/40 from-journey-play-start/95 to-journey-play-end/95",
    eyebrow: "text-journey-mint",
    action: "border-journey-mint/60 bg-journey-play-action hover:bg-journey-play-hover",
  },
  level: {
    card: "border-journey-cyan/40 from-journey-level-start/95 to-journey-level-end/95",
    eyebrow: "text-journey-cyan",
    action: "border-journey-cyan/60 bg-journey-level-action hover:bg-journey-level-hover",
  },
  social: {
    card: "border-journey-violet/40 from-journey-social-start/95 to-journey-social-end/95",
    eyebrow: "text-journey-violet",
    action: "border-journey-violet/60 bg-journey-social-action hover:bg-journey-social-hover",
  },
};

/** One call to action for all three cards: same height, radius, weight, padding and arrow. */
const ACTION_BASE =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold text-white transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey-gold focus-visible:ring-offset-4 focus-visible:ring-offset-journey-chip disabled:cursor-not-allowed disabled:opacity-60";

export function JourneyLinkAction({ tone, to, children }: { tone: JourneyTone; to: string; children: ReactNode }) {
  return (
    <Link to={to} className={`${ACTION_BASE} ${TONE[tone].action}`}>
      <span>{children}</span>
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  );
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "type">;

export function JourneyButtonAction({ tone, children, ...rest }: { tone: JourneyTone; children: ReactNode } & ButtonProps) {
  return (
    <button type="button" className={`${ACTION_BASE} ${TONE[tone].action}`} {...rest}>
      <span>{children}</span>
      <ArrowRight size={17} aria-hidden="true" />
    </button>
  );
}

interface JourneyCardProps {
  tone: JourneyTone;
  icon: ReactNode;
  eyebrow: string;
  /** Small text at the right end of the eyebrow row, for example how long ago. */
  aside?: ReactNode;
  title: string;
  description: ReactNode;
  /** The picture or status the card is about. It gets the same-sized zone in every card. */
  visual: ReactNode;
  /** Compact supporting information, kept just above the action. */
  details?: ReactNode;
  action: ReactNode;
  className?: string;
}

/**
 * Header, visual zone, details, then the action pinned to the bottom with `mt-auto`, so when the cards sit side by
 * side (where the grid makes them equally tall) the three actions share one baseline without any fixed margins. The
 * zone minimums apply from `xl`, the width at which three columns fit: at 1024px the app sidebar leaves the main area
 * about 680px, so three columns would be 196px wide and the labels would wrap.
 */
export function JourneyCard({ tone, icon, eyebrow, aside, title, description, visual, details, action, className = "" }: JourneyCardProps) {
  const t = TONE[tone];
  return (
    <article data-journey-card={tone} className={`relative flex h-full min-w-0 flex-col rounded-2xl border bg-gradient-to-b p-5 sm:p-6 ${t.card} ${className}`}>
      <header data-journey-zone="header" className="xl:min-h-[9.25rem]">
        <div className="flex min-h-[20px] items-center justify-between gap-2">
          <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] ${t.eyebrow}`}>{icon}{eyebrow}</p>
          {aside}
        </div>
        <h3 className="mt-3 font-display text-2xl leading-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-journey-soft">{description}</p>
      </header>
      <div data-journey-zone="visual" className="flex min-h-[168px] flex-1 items-center justify-center py-4">{visual}</div>
      <div data-journey-zone="details" className="xl:min-h-[7rem]">{details}</div>
      <div data-journey-zone="action" className="mt-auto pt-5">{action}</div>
    </article>
  );
}
