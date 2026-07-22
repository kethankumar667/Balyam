import { cn } from "../../../lib/cn";
import type { TeamRef } from "../types";

/**
 * A team tile styled like a collectible postcard with a passport-stamp
 * treatment. Used on Team Selection. Shows an optional slot badge ("A"/"B")
 * when chosen. Always an accessible button.
 */
export interface CollectibleCountryCardProps {
  team: TeamRef;
  selected?: boolean;
  slotBadge?: string | null;
  onClick: () => void;
  className?: string;
}

export function CollectibleCountryCard({ team, selected = false, slotBadge = null, onClick, className }: CollectibleCountryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${team.name}${selected ? `, selected as team ${slotBadge ?? ""}`.trimEnd() : ""}`}
      className={cn(
        "relative flex flex-col items-center gap-1 overflow-hidden rounded-2xl border-2 bg-[#FFFBF0] px-2 py-3 text-center transition active:scale-95",
        selected ? "border-transparent shadow-md" : "border-[#E4D3AC] shadow-sm",
        className,
      )}
      style={selected ? { boxShadow: `0 0 0 2px ${team.color}` } : undefined}
    >
      <span
        aria-hidden
        className="absolute right-1 top-1 h-8 w-8 rounded-full border-2 border-dashed opacity-30"
        style={{ borderColor: team.color }}
      />
      {team.flag ? (
        <span className="text-3xl leading-none" aria-hidden>{team.flag}</span>
      ) : (
        <span
          className="rounded-lg px-2 py-1 text-lg font-black leading-none text-white"
          style={{ backgroundColor: team.color }}
          aria-hidden
        >
          {team.short}
        </span>
      )}
      <span className="font-black text-sm" style={{ color: team.color }}>{team.short}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6D4323]/70 leading-tight">{team.name}</span>
      {slotBadge && (
        <span
          className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white shadow"
          style={{ backgroundColor: team.color }}
        >
          {slotBadge}
        </span>
      )}
    </button>
  );
}
