import { cn } from "../../../lib/cn";
import type { TeamRef } from "../types";

/**
 * A team crest tile: flag glyph (countries) or a colored short-code chip (IPL
 * franchises, which have no flag), plus code and name, tinted by the team's
 * color. Interactive when `onClick` is given (renders an accessible button).
 */
export interface TeamFlagCardProps {
  team: TeamRef;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZES: Record<NonNullable<TeamFlagCardProps["size"]>, { pad: string; flag: string; code: string; name: string }> = {
  sm: { pad: "p-2.5", flag: "text-2xl", code: "text-base", name: "text-[10px]" },
  md: { pad: "p-3.5", flag: "text-4xl", code: "text-xl", name: "text-xs" },
  lg: { pad: "p-5", flag: "text-5xl", code: "text-2xl", name: "text-sm" },
};

function Crest({ team, className }: { team: TeamRef; className: string }) {
  if (team.flag) {
    return <span className={cn("leading-none", className)} aria-hidden>{team.flag}</span>;
  }
  return (
    <span
      className={cn("flex items-center justify-center rounded-lg px-2 py-1 font-black text-white leading-none", className)}
      style={{ backgroundColor: team.color }}
      aria-hidden
    >
      {team.short}
    </span>
  );
}

export function TeamFlagCard({ team, size = "md", selected = false, onClick, className }: TeamFlagCardProps) {
  const s = SIZES[size];
  const inner = (
    <>
      <Crest team={team} className={s.flag} />
      <span className={cn("font-black tracking-wide", s.code)} style={{ color: team.color }}>{team.short}</span>
      <span className={cn("font-semibold uppercase tracking-wide text-[#6D4323]/70", s.name)}>{team.name}</span>
    </>
  );
  const base = cn(
    "flex flex-col items-center gap-1 rounded-2xl border bg-[#FFFBF0] text-center transition",
    s.pad,
    selected ? "border-transparent shadow-md" : "border-[#E4D3AC] shadow-sm",
    className,
  );
  const ring = selected ? { boxShadow: `0 0 0 2px ${team.color}` } : undefined;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-label={`${team.name}${selected ? ", selected" : ""}`}
        className={cn(base, "active:scale-95")}
        style={ring}
      >
        {inner}
      </button>
    );
  }
  return (
    <figure className={base} style={ring} aria-label={team.name}>
      {inner}
    </figure>
  );
}
