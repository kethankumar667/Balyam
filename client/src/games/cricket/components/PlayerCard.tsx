import { cn } from "../../../lib/cn";
import type { CricketPlayer, PlayerRole } from "../types";

/**
 * A roster player row: initials avatar (no external images), name, role tag,
 * captain and legend badges, and an optional selected toggle for the Playing
 * XI screen. Selection is not color-only — it carries a checkmark and ring.
 */
export interface PlayerCardProps {
  player: CricketPlayer;
  selected?: boolean;
  captain?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  onSetCaptain?: () => void;
  className?: string;
}

const ROLE_STYLE: Record<PlayerRole, { label: string; className: string }> = {
  BAT: { label: "BAT", className: "bg-[#1D63C4]/15 text-[#1D63C4]" },
  BOWL: { label: "BOWL", className: "bg-[#C0392B]/15 text-[#C0392B]" },
  AR: { label: "AR", className: "bg-[#8E44AD]/15 text-[#8E44AD]" },
  WK: { label: "WK", className: "bg-[#2E7D32]/15 text-[#2E7D32]" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PlayerCard({ player, selected = false, captain = false, disabled = false, onToggle, onSetCaptain, className }: PlayerCardProps) {
  const role = ROLE_STYLE[player.role];
  const body = (
    <>
      <span
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-black text-white"
        style={{ background: "linear-gradient(135deg,#9A6E1A,#6D4323)" }}
        aria-hidden
      >
        {initials(player.name)}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-bold text-[#3A2210]">{player.name}</span>
          {captain && (
            <span className="rounded bg-[#E4B128] px-1 text-[9px] font-black text-[#3A2210]" title="Captain">C</span>
          )}
          {player.isExtra && (
            <span className="rounded bg-[#6D4323]/15 px-1 text-[9px] font-bold text-[#6D4323]" title="Legend">★</span>
          )}
        </span>
        <span className={cn("mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold", role.className)}>{role.label}</span>
      </span>
    </>
  );

  if (!onToggle) {
    return (
      <div className={cn("flex items-center gap-2.5 rounded-xl border border-[#E4D3AC] bg-[#FFFBF0] px-2.5 py-2", className)}>
        {body}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border-2 bg-[#FFFBF0] px-2.5 py-2 transition",
        selected ? "border-[#2E7D32] ring-1 ring-[#2E7D32]/30" : "border-[#E4D3AC]",
        disabled && "opacity-50",
        className,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={`${selected ? "Remove" : "Add"} ${player.name}`}
        className="flex flex-1 items-center gap-2.5 disabled:cursor-not-allowed"
      >
        {body}
      </button>
      {selected && onSetCaptain && (
        <button
          type="button"
          onClick={onSetCaptain}
          aria-pressed={captain}
          aria-label={`Make ${player.name} captain`}
          className={cn(
            "flex-none rounded-lg border px-2 py-1 text-[10px] font-black transition active:scale-95",
            captain ? "border-[#E4B128] bg-[#E4B128] text-[#3A2210]" : "border-[#E4D3AC] bg-white text-[#6D4323]",
          )}
        >
          C
        </button>
      )}
      <span
        aria-hidden
        className={cn(
          "flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 text-xs font-black",
          selected ? "border-[#2E7D32] bg-[#2E7D32] text-white" : "border-[#C8A66B] text-transparent",
        )}
      >
        ✓
      </span>
    </div>
  );
}
