import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { HcState, Player } from "@shared/types";
import { DD, DdChip, DdLive, IconBat, ddSideFor, DdAvatar } from "./doordarshan-kit";
import { HcThemeSwitcher } from "../HcThemeSwitcher";
import { useHcSkin } from "../hc-skin";
import { useFullscreenToggle } from "../../../hooks/useFullscreenToggle";
import { isFullscreenSupported } from "../../../lib/fullscreen";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * A ticking `REC ● HH:MM:SS` readout since the match started — the "this is
 * a recording" idea the whole theme is built on (see doordarshan-kit.tsx's
 * own header comment), made literal instead of just implied by the grain
 * and scanlines.
 */
function DdTapeCounter({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const elapsedSec = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(elapsedSec / 3600);
  const m = Math.floor((elapsedSec % 3600) / 60);
  const s = elapsedSec % 60;
  return (
    <span
      className="font-crt inline-flex items-center gap-1.5 rounded px-2 py-1 text-[13px]"
      style={{ letterSpacing: "0.06em", color: DD.inkLo, border: `1px solid ${DD.line}`, background: "rgba(232,198,140,0.04)" }}
      title="Recording time"
    >
      <span style={{ color: "#E08277" }}>●</span>
      REC {h > 0 ? `${pad2(h)}:` : ""}{pad2(m)}:{pad2(s)}
    </span>
  );
}

const PHASE_LABEL: Record<HcState["phase"], string> = {
  teamSelect: "PRE-MATCH",
  tossCall: "THE CALL (ODD/EVEN)",
  toss: "THE TOSS",
  tossChoice: "TOSS DECISION",
  innings1: "1ST INNINGS",
  innings2: "2ND INNINGS",
  finished: "FULL SCORE",
};

/**
 * Doordarshan leave button — must ONLY ever forward whatever `onLeave` it's
 * given, never assume or hardcode what leaving means: a past audit found the
 * notebook skin's own leave button doing exactly that.
 * __tests__/DoordarshanHeader.leave.test.tsx pins this contract.
 */
export function DoordarshanLeaveButton({ onLeave }: { onLeave: () => void }) {
  return (
    <button
      type="button"
      onClick={onLeave}
      aria-label="Leave room"
      className="rounded px-2.5 py-1.5 font-crt text-[14px] uppercase transition hover:brightness-125 active:scale-95"
      style={{ letterSpacing: "0.08em", background: "rgba(192,57,43,0.14)", color: "#E08277", border: "1px solid rgba(192,57,43,0.4)" }}
    >
      Leave
    </button>
  );
}

function ChipBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded px-2.5 py-1.5 font-crt text-[14px] uppercase transition hover:brightness-125 active:scale-95"
      style={{ letterSpacing: "0.08em", background: "rgba(232,198,140,0.06)", color: DD.inkMid, border: `1px solid ${DD.line}` }}
    >
      {label}
    </button>
  );
}

export function DoordarshanHeader({
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
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const avatarOf = (id: string) => players.find((p) => p.id === id)?.avatar;
  const live = state.phase === "innings1" || state.phase === "innings2";
  const opts = state.options;

  const [copied, setCopied] = useState(false);
  function handleCopyRoomCode() {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  const team0Id = p0 ? state.teamSelections[p0]?.teamId : null;
  const team1Id = p1 ? state.teamSelections[p1]?.teamId : null;
  const short0 = team0Id ? String(team0Id).slice(0, 3).toUpperCase() : "TEAM 1";
  const short1 = team1Id ? String(team1Id).slice(0, 3).toUpperCase() : "TEAM 2";

  const formatLabel =
    opts.format === "test"
      ? "TEST · 30 OV"
      : opts.format === "odi"
      ? "ODI · 15 OV"
      : `T20 · ${state.oversPerInnings ?? 10} OV`;
  const categoryLabel = opts.category === "ipl" ? "IPL" : "INTERNATIONAL";

  return (
    <div
      className="shrink-0 px-3.5 py-2 sm:px-4 sm:py-2.5 flex flex-col gap-2 select-none"
      style={{ borderBottom: `1px solid ${DD.lineStrong}`, background: "rgba(10,7,5,0.85)" }}
    >
      {/* Row 1: Brand + CRT tape indicator + Actions */}
      <div className="flex items-center justify-between gap-x-3 gap-y-1.5 w-full">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="grid h-7 w-7 shrink-0 place-items-center rounded"
            style={{ background: `linear-gradient(165deg, ${DD.amber}, ${DD.amberDeep})`, color: "#1A0F04" }}
          >
            <IconBat size={15} />
          </div>
          <div className="min-w-0">
            <div className="font-typewriter truncate text-[12px] sm:text-[13px] leading-none" style={{ color: DD.ink }}>
              Doordarshan Rerun
            </div>
            <div className="font-crt mt-1 truncate text-[10px] sm:text-[12px] uppercase leading-none" style={{ letterSpacing: "0.1em", color: DD.inkLo }}>
              {PHASE_LABEL[state.phase]}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1 sm:gap-1.5 shrink-0">
          <DdTapeCounter since={state.startedAt} />
          {live && <DdLive />}
          <HcThemeSwitcher
            current={skin}
            onChange={setSkin}
            renderOption={(opt, isActive) => (
              <span
                className="inline-block rounded px-1.5 py-0.5 sm:px-2 sm:py-1 font-crt text-[10px] sm:text-[12px] uppercase transition-all"
                style={{
                  letterSpacing: "0.06em",
                  background: isActive ? "rgba(217,138,61,0.18)" : "rgba(232,198,140,0.05)",
                  color: isActive ? DD.amber : DD.inkMid,
                  border: `1px solid ${isActive ? DD.amber : DD.line}`,
                }}
              >
                <span className="hidden sm:inline">{opt.label}</span>
                <span className="sm:hidden">
                  {opt.id === "broadcast" ? "Live" : opt.id === "cricbuzz" ? "CB" : opt.id === "doordarshan" ? "DD" : "Book"}
                </span>
              </span>
            )}
          />
          {isFullscreenSupported() && (
            <ChipBtn label={isFullscreen ? "Exit" : "FS"} onClick={toggleFullscreen} />
          )}
          {onHelp && <ChipBtn label="Help" onClick={onHelp} />}
          {onLeave && <DoordarshanLeaveButton onLeave={onLeave} />}
        </div>
      </div>

      {/* Row 2: Format / Category Badges + Room Code */}
      <div className="flex items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span
            className="rounded px-2 py-0.5 font-crt text-[10px] sm:text-[11.5px] uppercase tracking-wide shrink-0"
            style={{
              background: "rgba(232,198,140,0.08)",
              color: DD.ink,
              border: `1px solid ${DD.line}`,
            }}
          >
            {formatLabel}
          </span>
          <span
            className="rounded px-2 py-0.5 font-crt text-[10px] sm:text-[11.5px] uppercase tracking-wide shrink-0"
            style={{
              background: "rgba(217,138,61,0.15)",
              color: DD.amber,
              border: `1px solid ${DD.lineStrong}`,
            }}
          >
            {categoryLabel}
          </span>
          {opts.mode === "galli" && (
            <span
              className="rounded px-2 py-0.5 font-crt text-[10px] sm:text-[11.5px] uppercase tracking-wide shrink-0"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "#FCA5A5",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              GALLI
            </span>
          )}
        </div>

        {roomCode && (
          <button
            type="button"
            onClick={handleCopyRoomCode}
            title={copied ? "Copied" : `Copy room code ${roomCode}`}
            className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-crt text-[10px] sm:text-[11.5px] uppercase tracking-wider transition hover:brightness-125 cursor-pointer shrink-0"
            style={{
              background: copied ? "rgba(34,197,94,0.15)" : "rgba(232,198,140,0.08)",
              color: copied ? "#86EFAC" : DD.amber,
              border: `1px dashed ${copied ? "#86EFAC" : DD.amber}`,
            }}
          >
            <span className="text-[9px] text-stone-400">ROOM</span>
            <span className="font-mono">{copied ? "COPIED ✓" : roomCode}</span>
          </button>
        )}
      </div>

      {/* Row 3: Doordarshan CRT Matchup Cards */}
      {p0 && p1 && (
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Team 1 */}
          <div
            className="flex flex-1 items-center gap-2 rounded px-2.5 py-1.5 min-w-0"
            style={{
              background: "rgba(232,198,140,0.05)",
              border: `1px solid ${DD.line}`,
            }}
          >
            <DdAvatar name={nameOf(p0)} avatar={avatarOf(p0)} side={ddSideFor(0)} size={26} />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-crt font-bold text-xs uppercase tracking-wide truncate" style={{ color: DD.ink }}>
                  {short0}
                </span>
                {p0 === selfId && (
                  <span
                    className="rounded px-1 py-0.2 font-crt text-[8.5px] uppercase shrink-0"
                    style={{ background: "rgba(217,138,61,0.25)", color: DD.amber }}
                  >
                    YOU
                  </span>
                )}
              </div>
              <span className="font-typewriter text-[10px] truncate" style={{ color: DD.inkLo }}>
                {nameOf(p0)}
              </span>
            </div>
          </div>

          {/* VS Badge */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center font-crt text-[10px] shrink-0"
            style={{
              background: "rgba(217,138,61,0.18)",
              color: DD.amber,
              border: `1px solid ${DD.amber}`,
            }}
          >
            VS
          </div>

          {/* Team 2 */}
          <div
            className="flex flex-1 items-center gap-2 rounded px-2.5 py-1.5 min-w-0"
            style={{
              background: "rgba(232,198,140,0.05)",
              border: `1px solid ${DD.line}`,
            }}
          >
            <DdAvatar name={nameOf(p1)} avatar={avatarOf(p1)} side={ddSideFor(1)} size={26} />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-crt font-bold text-xs uppercase tracking-wide truncate" style={{ color: DD.ink }}>
                  {short1}
                </span>
                {p1 === selfId && (
                  <span
                    className="rounded px-1 py-0.2 font-crt text-[8.5px] uppercase shrink-0"
                    style={{ background: "rgba(217,138,61,0.25)", color: DD.amber }}
                  >
                    YOU
                  </span>
                )}
              </div>
              <span className="font-typewriter text-[10px] truncate" style={{ color: DD.inkLo }}>
                {nameOf(p1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {rail && <div className="mt-1">{rail}</div>}
    </div>
  );
}
