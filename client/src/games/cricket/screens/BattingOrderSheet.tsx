import { BottomSheet, PlayerCard } from "../components";
import type { InningsState } from "../innings";

/**
 * Batting Order — a bottom sheet listing the XI in order with live per-player
 * state: on strike, at the other end, out, next in, or waiting. Read-only and
 * keyboard-accessible (BottomSheet manages focus + Escape).
 */
export interface BattingOrderSheetProps {
  open: boolean;
  onClose: () => void;
  innings: InningsState;
}

type SeatState = "striker" | "nonStriker" | "out" | "next" | "waiting";

const STATE_LABEL: Record<SeatState, { label: string; className: string }> = {
  striker: { label: "On strike", className: "bg-[#2E7D32] text-white" },
  nonStriker: { label: "Batting", className: "bg-[#2E7D32]/15 text-[#2E7D32]" },
  out: { label: "Out", className: "bg-[#C0392B]/15 text-[#C0392B]" },
  next: { label: "Next in", className: "bg-[#E4B128]/25 text-[#9A6E1A]" },
  waiting: { label: "Waiting", className: "bg-[#6D4323]/10 text-[#6D4323]/70" },
};

function seatState(innings: InningsState, idx: number): SeatState {
  const player = innings.xi[idx];
  if (innings.stats[player.id]?.out) return "out";
  if (idx === innings.strikerIdx) return "striker";
  if (idx === innings.nonStrikerIdx) return "nonStriker";
  if (idx === innings.nextIdx) return "next";
  return "waiting";
}

export function BattingOrderSheet({ open, onClose, innings }: BattingOrderSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Batting order">
      <ol className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {innings.xi.map((player, idx) => {
          const state = STATE_LABEL[seatState(innings, idx)];
          const stat = innings.stats[player.id];
          return (
            <li key={player.id} className="flex items-center gap-2">
              <span className="w-5 flex-none text-center text-xs font-bold text-[#6D4323]/60 tabular-nums">{idx + 1}</span>
              <PlayerCard player={player} className="flex-1" />
              <div className="flex-none text-right">
                <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${state.className}`}>{state.label}</span>
                {(stat.balls > 0 || stat.out) && (
                  <p className="mt-0.5 text-[11px] font-semibold text-[#3A2210] tabular-nums">
                    {stat.runs} ({stat.balls})
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </BottomSheet>
  );
}

export default BattingOrderSheet;
