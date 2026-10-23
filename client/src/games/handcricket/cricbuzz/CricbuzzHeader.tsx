import { useState, type ReactNode } from "react";
import type { HcState, Player } from "@shared/types";
import { CB, CricbuzzLiveIndicator, IconBat } from "./cricbuzz-kit";
import { HcThemeSwitcher } from "../HcThemeSwitcher";
import { useHcSkin } from "../hc-skin";
import SeatAvatar from "../../../components/profile/SeatAvatar";
import { useFullscreenToggle } from "../../../hooks/useFullscreenToggle";
import { isFullscreenSupported } from "../../../lib/fullscreen";
import { teamLabel } from "../hc-shared";

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
  selfId,
  roomCode,
  onHelp,
  onLeave,
  rail,
}: {
  state: HcState;
  players: Player[];
  selfId?: string;
  roomCode?: string;
  onHelp?: () => void;
  onLeave?: () => void;
  rail?: ReactNode;
}) {
  const [skin, setSkin] = useHcSkin();
  const { isFullscreen, toggleFullscreen } = useFullscreenToggle();
  const [p0, p1] = state.playerOrder;
  const isLive = state.phase === "innings1" || state.phase === "innings2";
  const opts = state.options;

  const [copied, setCopied] = useState(false);
  function handleCopyRoomCode() {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  const nameOf = (id?: string) => players.find((p) => p.id === id)?.name ?? "Player";
  const avatarOf = (id?: string) => players.find((p) => p.id === id)?.avatar;

  const short0 = p0 && state.teamSelections[p0]?.teamId ? teamLabel(state, p0, players).short : "TEAM 1";
  const short1 = p1 && state.teamSelections[p1]?.teamId ? teamLabel(state, p1, players).short : "TEAM 2";

  const formatLabel =
    opts.format === "test"
      ? "Test · 30 Overs"
      : opts.format === "odi"
      ? "ODI · 15 Overs"
      : `T20 · ${state.oversPerInnings ?? 10} Overs`;
  const categoryLabel = opts.category === "ipl" ? "League" : "International";

  return (
    <header className="shrink-0 bg-[#24103F] text-white shadow-md select-none border-b border-[#3B0764] px-3.5 py-2 sm:px-5 flex flex-col gap-2">
      <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-3 gap-y-1.5 w-full">
        <div className="flex w-full lg:w-auto min-w-0 items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded bg-[#6D28D9] text-white shadow-xs shrink-0">
            <IconBat size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="truncate font-display text-[12px] sm:text-[16px] leading-tight text-white">
              BHALYAM Live Score
            </div>
            <span className="text-[8.5px] sm:text-[9px] font-bold tracking-widest text-[#EDE9FE] uppercase mt-0.5 truncate">
              {PHASE_TITLE[state.phase]}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap w-full lg:w-auto items-center justify-start lg:justify-end gap-1.5 shrink-0">
          {isLive && <CricbuzzLiveIndicator />}
          <HcThemeSwitcher
            current={skin}
            onChange={setSkin}
            renderOption={(opt, isActive) => (
              <span
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide transition-all ${
                  isActive
                    ? "bg-[#6D28D9] text-white shadow-xs border border-[#EDE9FE]/60"
                    : "bg-[#3B0764]/80 text-[#EDE9FE] hover:bg-[#3B0764] border border-transparent"
                }`}
              >
                <span className="hidden sm:inline">{opt.label}</span>
                <span className="sm:hidden">
                  {opt.id === "broadcast" ? "Live" : opt.id === "cricbuzz" ? "Score" : opt.id === "doordarshan" ? "Retro" : "Book"}
                </span>
              </span>
            )}
          />

          {isFullscreenSupported() && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="min-h-11 min-w-11 rounded bg-[#3B0764] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#5B21B6] active:scale-95 transition cursor-pointer"
            >
              {isFullscreen ? "Exit" : "FS"}
            </button>
          )}

          {onHelp && (
            <button
              type="button"
              onClick={onHelp}
              className="min-h-11 min-w-11 rounded bg-[#3B0764] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#5B21B6] active:scale-95 transition cursor-pointer"
            >
              Help
            </button>
          )}

          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              aria-label="Leave match"
              className="min-h-11 min-w-11 rounded bg-[#CB0606]/80 hover:bg-[#CB0606] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white active:scale-95 transition cursor-pointer"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Format & Category Badges + Room Code */}
      <div className="flex items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="rounded bg-[#3B0764] px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-[#EDE9FE] border border-[#5B21B6] shrink-0">
            {formatLabel}
          </span>
          <span className="rounded bg-[#6D28D9]/40 px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-white border border-[#6D28D9]/60 shrink-0">
            {categoryLabel}
          </span>
          {opts.mode === "galli" && (
            <span className="rounded bg-[#CB0606]/30 px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-red-200 border border-red-500/40 shrink-0">
              GALLI
            </span>
          )}
        </div>

        {roomCode && (
          <button
            type="button"
            onClick={handleCopyRoomCode}
            title={copied ? "Copied" : `Copy room code ${roomCode}`}
            className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider bg-[#3B0764] text-[#EDE9FE] border border-dashed border-[#A78BFA]/60 hover:bg-[#5B21B6] transition cursor-pointer shrink-0"
          >
            <span className="text-[8.5px] text-[#EDE9FE]/70 font-bold">ROOM</span>
            <span className="font-mono text-white">{copied ? "COPIED ✓" : roomCode}</span>
          </button>
        )}
      </div>

      {/* Row 3: Cricbuzz Matchup Cards */}
      {p0 && p1 && (
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Team 1 */}
          <div className="flex flex-1 items-center gap-2 rounded bg-[#3B0764]/70 px-2.5 py-1.5 border border-[#5B21B6]/50 min-w-0">
            <SeatAvatar avatar={avatarOf(p0)} playerId={p0} name={nameOf(p0)} className="w-6 h-6 shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-xs uppercase tracking-wide truncate text-white">
                  {short0}
                </span>
                {p0 === selfId && (
                  <span className="rounded bg-[#6D28D9] text-white px-1 py-0.2 text-[8px] font-black uppercase shrink-0">
                    YOU
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-[#EDE9FE] truncate">
                {nameOf(p0)}
              </span>
            </div>
          </div>

          {/* VS Badge */}
          <div className="w-6 h-6 rounded-full bg-[#6D28D9] border border-[#EDE9FE]/60 flex items-center justify-center font-extrabold text-[9.5px] text-white shadow-2xs shrink-0">
            VS
          </div>

          {/* Team 2 */}
          <div className="flex flex-1 items-center gap-2 rounded bg-[#3B0764]/70 px-2.5 py-1.5 border border-[#5B21B6]/50 min-w-0">
            <SeatAvatar avatar={avatarOf(p1)} playerId={p1} name={nameOf(p1)} className="w-6 h-6 shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-xs uppercase tracking-wide truncate text-white">
                  {short1}
                </span>
                {p1 === selfId && (
                  <span className="rounded bg-[#6D28D9] text-white px-1 py-0.2 text-[8px] font-black uppercase shrink-0">
                    YOU
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-[#EDE9FE] truncate">
                {nameOf(p1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Room Rail (Chat & Voice) */}
      {rail && <div className="border-t border-[#3B0764] bg-[#24103F] -mx-3.5 -mb-2 px-3.5 py-1.5 sm:-mx-5">{rail}</div>}
    </header>
  );
}
