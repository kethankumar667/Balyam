import { useState, type ReactNode } from "react";
import type { HcState, Player } from "@shared/types";
import { CB, CricbuzzLiveIndicator, IconBat } from "./cricbuzz-kit";
import { HcThemeSwitcher } from "../HcThemeSwitcher";
import { useHcSkin } from "../hc-skin";
import SeatAvatar from "../../../components/profile/SeatAvatar";
import { useFullscreenToggle } from "../../../hooks/useFullscreenToggle";
import { isFullscreenSupported } from "../../../lib/fullscreen";

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

  const team0Id = p0 ? state.teamSelections[p0]?.teamId : null;
  const team1Id = p1 ? state.teamSelections[p1]?.teamId : null;
  const short0 = team0Id ? String(team0Id).slice(0, 3).toUpperCase() : "TEAM 1";
  const short1 = team1Id ? String(team1Id).slice(0, 3).toUpperCase() : "TEAM 2";

  const formatLabel =
    opts.format === "test"
      ? "Test · 30 Overs"
      : opts.format === "odi"
      ? "ODI · 15 Overs"
      : `T20 · ${state.oversPerInnings ?? 10} Overs`;
  const categoryLabel = opts.category === "ipl" ? "IPL" : "International";

  return (
    <header className="shrink-0 bg-[#004838] text-white shadow-md select-none border-b border-[#035A46] px-3.5 py-2 sm:px-5 flex flex-col gap-2">
      {/* Row 1: Cricbuzz Brand Bar + Phase + Actions */}
      <div className="flex items-center justify-between gap-x-3 gap-y-1.5 w-full">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded bg-[#009270] text-white shadow-xs shrink-0">
            <IconBat size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center font-extrabold tracking-tight text-[15px] sm:text-[17px] leading-none text-white">
              <span className="text-white">cric</span>
              <span className="text-[#00B38A]">buzz</span>
            </div>
            <span className="text-[8.5px] sm:text-[9px] font-bold tracking-widest text-[#A7F3D0] uppercase mt-0.5 truncate">
              {PHASE_TITLE[state.phase]}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 shrink-0">
          {isLive && <CricbuzzLiveIndicator />}
          <HcThemeSwitcher
            current={skin}
            onChange={setSkin}
            renderOption={(opt, isActive) => (
              <span
                className={`inline-block rounded px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide transition-all ${
                  isActive
                    ? "bg-[#009270] text-white shadow-xs border border-[#A7F3D0]/60"
                    : "bg-[#035A46]/80 text-[#A7F3D0] hover:bg-[#035A46] border border-transparent"
                }`}
              >
                <span className="hidden sm:inline">{opt.label}</span>
                <span className="sm:hidden">
                  {opt.id === "broadcast" ? "Live" : opt.id === "cricbuzz" ? "CB" : opt.id === "doordarshan" ? "DD" : "Book"}
                </span>
              </span>
            )}
          />

          {isFullscreenSupported() && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="rounded bg-[#035A46] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#047857] active:scale-95 transition cursor-pointer"
            >
              {isFullscreen ? "Exit" : "FS"}
            </button>
          )}

          {onHelp && (
            <button
              type="button"
              onClick={onHelp}
              className="rounded bg-[#035A46] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#047857] active:scale-95 transition cursor-pointer"
            >
              Help
            </button>
          )}

          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              aria-label="Leave match"
              className="rounded bg-[#CB0606]/80 hover:bg-[#CB0606] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white active:scale-95 transition cursor-pointer"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Format & Category Badges + Room Code */}
      <div className="flex items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="rounded bg-[#035A46] px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-[#A7F3D0] border border-[#047857] shrink-0">
            {formatLabel}
          </span>
          <span className="rounded bg-[#009270]/40 px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-white border border-[#009270]/60 shrink-0">
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
            className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider bg-[#035A46] text-[#A7F3D0] border border-dashed border-[#00B38A]/60 hover:bg-[#047857] transition cursor-pointer shrink-0"
          >
            <span className="text-[8.5px] text-[#A7F3D0]/70 font-bold">ROOM</span>
            <span className="font-mono text-white">{copied ? "COPIED ✓" : roomCode}</span>
          </button>
        )}
      </div>

      {/* Row 3: Cricbuzz Matchup Cards */}
      {p0 && p1 && (
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Team 1 */}
          <div className="flex flex-1 items-center gap-2 rounded bg-[#035A46]/70 px-2.5 py-1.5 border border-[#047857]/50 min-w-0">
            <SeatAvatar avatar={avatarOf(p0)} name={nameOf(p0)} className="w-6 h-6 shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-xs uppercase tracking-wide truncate text-white">
                  {short0}
                </span>
                {p0 === selfId && (
                  <span className="rounded bg-[#009270] text-white px-1 py-0.2 text-[8px] font-black uppercase shrink-0">
                    YOU
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-[#A7F3D0] truncate">
                {nameOf(p0)}
              </span>
            </div>
          </div>

          {/* VS Badge */}
          <div className="w-6 h-6 rounded-full bg-[#009270] border border-[#A7F3D0]/60 flex items-center justify-center font-extrabold text-[9.5px] text-white shadow-2xs shrink-0">
            VS
          </div>

          {/* Team 2 */}
          <div className="flex flex-1 items-center gap-2 rounded bg-[#035A46]/70 px-2.5 py-1.5 border border-[#047857]/50 min-w-0">
            <SeatAvatar avatar={avatarOf(p1)} name={nameOf(p1)} className="w-6 h-6 shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-xs uppercase tracking-wide truncate text-white">
                  {short1}
                </span>
                {p1 === selfId && (
                  <span className="rounded bg-[#009270] text-white px-1 py-0.2 text-[8px] font-black uppercase shrink-0">
                    YOU
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-[#A7F3D0] truncate">
                {nameOf(p1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Room Rail (Chat & Voice) */}
      {rail && <div className="border-t border-[#035A46] bg-[#00382B] -mx-3.5 -mb-2 px-3.5 py-1.5 sm:-mx-5">{rail}</div>}
    </header>
  );
}
