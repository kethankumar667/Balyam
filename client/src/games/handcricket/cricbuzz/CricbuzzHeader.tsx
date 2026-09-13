import type { ReactNode } from "react";
import type { HcState, Player } from "@shared/types";
import { CB, CricbuzzLiveIndicator, IconBat } from "./cricbuzz-kit";
import { HcThemeSwitcher } from "../HcThemeSwitcher";
import { useHcSkin } from "../hc-skin";
import SeatAvatar from "../../../components/profile/SeatAvatar";

const PHASE_TITLE: Record<HcState["phase"], string> = {
  teamSelect: "TEAMS & SQUADS",
  tossCall: "TOSS · PICK UP THE CALL",
  toss: "TOSS & PITCH REPORT",
  tossChoice: "TOSS DECISION",
  innings1: "1ST INNINGS",
  innings2: "2ND INNINGS",
  finished: "MATCH SUMMARY",
};

export function CricbuzzHeader({
  state,
  players,
  onHelp,
  onLeave,
  rail,
}: {
  state: HcState;
  players: Player[];
  onHelp?: () => void;
  onLeave?: () => void;
  rail?: ReactNode;
}) {
  const [skin, setSkin] = useHcSkin();
  const [p0, p1] = state.playerOrder;
  const isLive = state.phase === "innings1" || state.phase === "innings2";

  const nameOf = (id?: string) => players.find((p) => p.id === id)?.name ?? "Player";
  const avatarOf = (id?: string) => players.find((p) => p.id === id)?.avatar;

  return (
    <header className="shrink-0 bg-[#004838] text-white shadow-md select-none border-b border-[#035A46]">
      {/* Top Cricbuzz Brand Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3.5 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {/* Cricbuzz Wordmark Badge */}
          <div className="flex items-center gap-1.5">
            <div className="grid h-7 w-7 place-items-center rounded bg-[#009270] text-white shadow-xs">
              <IconBat size={16} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center font-extrabold tracking-tight text-[17px] leading-none text-white">
                <span className="text-white">cric</span>
                <span className="text-[#00B38A]">buzz</span>
              </div>
              <span className="text-[9px] font-bold tracking-widest text-[#A7F3D0] uppercase mt-0.5">
                HAND CRICKET
              </span>
            </div>
          </div>

          <div className="hidden h-5 w-px bg-[#035A46] sm:block" />

          {/* Phase Badge */}
          <div className="hidden sm:flex items-center gap-2">
            {isLive && <CricbuzzLiveIndicator />}
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#A7F3D0]">
              {PHASE_TITLE[state.phase]}
            </span>
          </div>
        </div>

        {/* Versus Avatar Display */}
        {p0 && p1 && (
          <div className="hidden md:flex items-center gap-2.5 rounded bg-[#035A46]/60 px-3 py-1 border border-[#047857]/40">
            <div className="flex items-center gap-1.5">
              <SeatAvatar avatar={avatarOf(p0)} name={nameOf(p0)} className="w-5.5 h-5.5" />
              <span className="max-w-[80px] truncate text-[12px] font-bold text-white">{nameOf(p0)}</span>
            </div>
            <span className="text-[11px] font-extrabold text-[#A7F3D0]">VS</span>
            <div className="flex items-center gap-1.5">
              <SeatAvatar avatar={avatarOf(p1)} name={nameOf(p1)} className="w-5.5 h-5.5" />
              <span className="max-w-[80px] truncate text-[12px] font-bold text-white">{nameOf(p1)}</span>
            </div>
          </div>
        )}

        {/* Right Tools (Skin switcher, Help, Leave) */}
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          {/* Format Chip */}
          <span className="hidden sm:inline-block rounded bg-[#035A46] px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#A7F3D0] border border-[#047857]">
            {state.options.format.toUpperCase()}
            {state.oversPerInnings != null ? ` · ${state.oversPerInnings} OV` : ""}
          </span>

          {/* Theme Switcher */}
          <HcThemeSwitcher
            current={skin}
            onChange={setSkin}
            renderOption={(opt, isActive) => (
              <span
                className={`inline-block rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition-all ${
                  isActive
                    ? "bg-[#009270] text-white shadow-xs border border-[#A7F3D0]/60"
                    : "bg-[#035A46]/80 text-[#A7F3D0] hover:bg-[#035A46] border border-transparent"
                }`}
              >
                {opt.label}
              </span>
            )}
          />

          {onHelp && (
            <button
              type="button"
              onClick={onHelp}
              className="rounded bg-[#035A46] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#047857] active:scale-95 transition"
            >
              Help
            </button>
          )}

          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              aria-label="Leave match"
              className="rounded bg-[#CB0606]/80 hover:bg-[#CB0606] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white active:scale-95 transition"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Room Rail (Chat & Voice) */}
      {rail && <div className="border-t border-[#035A46] bg-[#00382B] px-3 py-1.5">{rail}</div>}
    </header>
  );
}
