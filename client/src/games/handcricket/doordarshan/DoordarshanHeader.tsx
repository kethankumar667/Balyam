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
  state, players, onHelp, onLeave, rail,
}: {
  state: HcState; players: Player[]; onHelp?: () => void; onLeave?: () => void; rail?: ReactNode;
}) {
  const [skin, setSkin] = useHcSkin();
  const { isFullscreen, toggleFullscreen } = useFullscreenToggle();
  const [p0, p1] = state.playerOrder;
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const avatarOf = (id: string) => players.find((p) => p.id === id)?.avatar;
  const live = state.phase === "innings1" || state.phase === "innings2";

  return (
    <div className="shrink-0 px-4 py-2.5" style={{ borderBottom: `1px solid ${DD.lineStrong}`, background: "rgba(10,7,5,0.6)" }}>
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded" style={{ background: `linear-gradient(165deg, ${DD.amber}, ${DD.amberDeep})`, color: "#1A0F04" }}>
            <IconBat size={15} />
          </div>
          <div className="min-w-0">
            <div className="font-typewriter truncate text-[13px] leading-none" style={{ color: DD.ink }}>
              Doordarshan Rerun
            </div>
            <div className="font-crt mt-1 truncate text-[13px] uppercase leading-none" style={{ letterSpacing: "0.1em", color: DD.inkLo }}>
              {PHASE_LABEL[state.phase]}
            </div>
          </div>
        </div>

        {p0 && p1 && (
          <div className="flex items-center gap-2">
            <DdAvatar name={nameOf(p0)} avatar={avatarOf(p0)} side={ddSideFor(0)} size={26} />
            <span className="font-crt text-[13px]" style={{ color: DD.inkLo, letterSpacing: "0.08em" }}>VS</span>
            <DdAvatar name={nameOf(p1)} avatar={avatarOf(p1)} side={ddSideFor(1)} size={26} />
          </div>
        )}

        <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
          <DdTapeCounter since={state.startedAt} />
          {live && <DdLive />}
          {state.options.mode === "galli" && <DdChip tone="amber">GALLI</DdChip>}
          <DdChip>
            {state.options.format.toUpperCase()}
            {state.oversPerInnings != null ? ` · ${state.oversPerInnings} OV` : ""}
          </DdChip>
          <HcThemeSwitcher
            current={skin}
            onChange={setSkin}
            renderOption={(opt, isActive) => (
              <span
                className="inline-block rounded px-2 py-1.5 font-crt text-[12px] uppercase"
                style={{
                  letterSpacing: "0.06em",
                  background: isActive ? "rgba(217,138,61,0.18)" : "rgba(232,198,140,0.05)",
                  color: isActive ? DD.amber : DD.inkMid,
                  border: `1px solid ${isActive ? DD.amber : DD.line}`,
                }}
              >
                {opt.label}
              </span>
            )}
          />
          {isFullscreenSupported() && (
            <ChipBtn label={isFullscreen ? "Exit FS" : "Fullscreen"} onClick={toggleFullscreen} />
          )}
          {onHelp && <ChipBtn label="Help" onClick={onHelp} />}
          {onLeave && <DoordarshanLeaveButton onLeave={onLeave} />}
        </div>
      </div>

      {rail && <div className="mt-2.5">{rail}</div>}
    </div>
  );
}
