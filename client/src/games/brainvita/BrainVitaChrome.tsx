import type { ReactNode } from "react";
import { Crown, Footprints, Timer } from "lucide-react";
import { GOLD, GOLD_SOFT, PLANK_BACKGROUND, PLANK_BORDER, PLANK_SHADOW, TABLE_BACKGROUND } from "./brainvitaTheme";

/** The pieces round the board: the table, the hanging sign, the stats plank and the action pills. */

const MARBLE_DOT = "radial-gradient(circle at 34% 27%, #f4feff 0%, #7fd9ef 17%, #2aa0dd 46%, #146cb4 74%, #0a3f78 100%)";
const TABLE_PLANKS =
  "repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 188px, rgba(0,0,0,0.3) 188px, rgba(0,0,0,0.3) 190px), " +
  "repeating-linear-gradient(90deg, rgba(255,214,150,0.04) 0px, rgba(255,214,150,0.04) 1px, transparent 1px, transparent 6px)";

/** The walnut tabletop. Pure decoration: hidden from assistive tech and never in the way of a tap. */
export function BrainVitaScene() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden" style={{ background: TABLE_BACKGROUND }}>
      <div className="absolute inset-0" style={{ backgroundImage: TABLE_PLANKS }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,0.55) 100%)" }} />
    </div>
  );
}

function Marble({ className }: { className: string }) {
  return <span aria-hidden className={`absolute rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.5)] ${className}`} style={{ background: MARBLE_DOT }} />;
}

function Sprig({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 36" className={`pointer-events-none ${className}`}>
      <path d="M2 30 C 14 4 44 -2 62 8 C 50 12 40 22 34 34 C 24 28 12 28 2 30 Z" fill="#4d9a42" />
      <path d="M6 28 C 22 20 40 14 58 9" stroke="#1e5a22" strokeWidth="1.6" fill="none" opacity="0.6" strokeLinecap="round" />
    </svg>
  );
}

export interface BrainVitaSignProps {
  /** A slim sign for a short screen: no crown, no marbles, no leaves. */
  isCompact?: boolean;
  className?: string;
}

/** The game's name in gold lettering on a hanging wooden board, with a crown and two marbles perched on it. */
export function BrainVitaTitleSign({ isCompact = false, className = "" }: BrainVitaSignProps) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {!isCompact && <Crown aria-hidden className="absolute -top-4 left-1/2 h-7 w-7 -translate-x-1/2 md:-top-5 md:h-9 md:w-9" style={{ color: GOLD }} fill="currentColor" />}
      <div
        className={`relative rounded-xl text-center ${isCompact ? "px-3 py-0.5" : "px-5 py-1.5 min-[360px]:px-7 md:px-10 md:py-2"}`}
        style={{
          background: "linear-gradient(180deg, #8a5629 0%, #5f3615 100%)",
          border: "2px solid #c99a4a",
          boxShadow: "0 6px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,226,170,0.35)",
        }}
      >
        {!isCompact && (
          <>
            <Marble className="-left-2 -top-3 h-5 w-5 md:h-6 md:w-6" />
            <Marble className="-right-2 -top-3 h-5 w-5 md:h-6 md:w-6" />
            <Sprig className="absolute -left-5 -top-2 hidden h-6 w-9 min-[360px]:block md:-left-7 md:h-8 md:w-12" />
            <Sprig className="absolute -right-5 -top-2 hidden h-6 w-9 -scale-x-100 min-[360px]:block md:-right-7 md:h-8 md:w-12" />
          </>
        )}
        <h1
          className="font-display font-black uppercase leading-none tracking-wide"
          style={{
            color: GOLD_SOFT,
            fontSize: isCompact ? "1rem" : "clamp(1.25rem, 6.2vw, 2.2rem)",
            textShadow: "0 2px 0 #4a2608, 0 3px 8px rgba(0,0,0,0.55)",
            WebkitTextStroke: "0.6px #5a3210",
          }}
        >
          Brain Vita
        </h1>
      </div>
    </div>
  );
}

function MarbleIcon({ className }: { className: string }) {
  return <span aria-hidden className={`inline-block flex-shrink-0 rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.5)] ${className}`} style={{ background: MARBLE_DOT }} />;
}

export interface BrainVitaStatsProps {
  marbles: number;
  jumps: number;
  /** Already formatted, e.g. "1:15". */
  time: string;
  /** A row of three along a phone's width, or a list down a side panel. */
  layout: "bar" | "list";
  /** Tighter spacing for a short screen. */
  isCompact?: boolean;
  className?: string;
}

/** Marbles left, jumps made, and time, on one wooden plank. The labels are real text, shown small and capitalised. */
export function BrainVitaStats({ marbles, jumps, time, layout, isCompact = false, className = "" }: BrainVitaStatsProps) {
  const iconSize = isCompact ? "h-5 w-5" : "h-7 w-7 md:h-9 md:w-9";
  const items: { key: string; label: string; value: string | number; icon: ReactNode }[] = [
    { key: "marbles", label: "Marbles", value: marbles, icon: <MarbleIcon className={iconSize} /> },
    { key: "jumps", label: "Jumps", value: jumps, icon: <Footprints aria-hidden className={`flex-shrink-0 ${iconSize}`} style={{ color: GOLD }} /> },
    { key: "time", label: "Time", value: time, icon: <Timer aria-hidden className={`flex-shrink-0 ${iconSize}`} style={{ color: GOLD }} /> },
  ];
  const plank = { background: PLANK_BACKGROUND, border: PLANK_BORDER, boxShadow: PLANK_SHADOW };

  if (layout === "list") {
    return (
      <dl className={`flex flex-col rounded-2xl ${isCompact ? "gap-1 px-3 py-1.5" : "gap-2.5 px-4 py-3"} ${className}`} style={plank}>
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-3">
            {item.icon}
            <dt className="text-xs font-semibold uppercase tracking-wider text-amber-100/80">{item.label}</dt>
            <dd className={`ml-auto font-bold tabular-nums text-amber-50 ${isCompact ? "text-base" : "text-2xl"}`}>{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={`flex items-stretch rounded-2xl ${isCompact ? "px-2 py-1.5" : "px-3 py-2.5 md:px-6 md:py-3.5"} ${className}`} style={plank}>
      {items.map((item, index) => (
        <div key={item.key} className={`flex min-w-0 flex-1 items-center justify-center gap-2 md:gap-3 ${index > 0 ? "border-l border-[#E4B128]/20" : ""}`}>
          {item.icon}
          <div className="min-w-0 leading-tight">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-amber-100/80 md:text-xs">{item.label}</dt>
            <dd className={`font-bold tabular-nums text-amber-50 ${isCompact ? "text-lg" : "text-xl min-[400px]:text-2xl md:text-3xl"}`}>{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export interface BrainVitaPillProps {
  label: string;
  /** The spoken name where it needs to say more than the caption. */
  ariaLabel: string;
  icon: ReactNode;
  onClick: () => void;
  /** Dimmed, and a tap does nothing, but it stays in the tab order so its state can be heard. */
  isDisabled?: boolean;
  /** The gold-edged one: the action a player most wants. */
  isPrimary?: boolean;
  /** Icon beside the caption instead of above it, for a stacked column of pills. */
  isInline?: boolean;
}

/** One wide pill of the action dock, icon over caption as in the design. */
export function BrainVitaPill({ label, ariaLabel, icon, onClick, isDisabled = false, isPrimary = false, isInline = false }: BrainVitaPillProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!isDisabled) onClick();
      }}
      aria-label={ariaLabel}
      aria-disabled={isDisabled}
      className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[1.4rem] px-2 py-1.5 font-semibold text-amber-50 transition-[filter,transform] hover:brightness-125 active:scale-[0.97] aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:brightness-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4B128] ${
        isInline ? "min-h-[44px] flex-row gap-2 text-sm" : "min-h-[52px] flex-col gap-0.5 text-sm md:min-h-[64px] md:gap-1 md:text-base"
      }`}
      style={{
        background: isPrimary ? "linear-gradient(180deg, rgba(120,78,24,0.95) 0%, rgba(70,42,12,0.96) 100%)" : PLANK_BACKGROUND,
        border: isPrimary ? `1.5px solid ${GOLD}` : PLANK_BORDER,
        boxShadow: PLANK_SHADOW,
      }}
    >
      <span className="flex items-center justify-center" style={{ color: isPrimary ? GOLD_SOFT : "rgba(255,244,214,0.85)" }}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

/** The action dock: three pills side by side, or one above another. */
export function BrainVitaDock({ children, isStacked = false, className = "" }: { children: ReactNode; isStacked?: boolean; className?: string }) {
  return <div className={`flex gap-2 md:gap-3 ${isStacked ? "flex-col" : "items-stretch"} ${className}`}>{children}</div>;
}
