import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { HcBall, HcInnings, HcState, Player } from "@shared/types";
import { HC_COUNTRIES, HC_FRANCHISES, getRosterFor, type HcPlayerProfile } from "@shared/hc-rosters";
import { getSocket } from "../../lib/socket";
import { useHcSquad } from "./useHcSquad";
import {
  PRO,
  PRO_SIDES,
  ProChip,
  ProLabel,
  ProLive,
  ProMeter,
  ProPanel,
  ProStat,
  IconBall,
  IconBat,
  IconTrophy,
  IconWicket,
  type ProSide,
} from "../pro/pro-kit";

/**
 * HAND CRICKET — broadcast skin.
 *
 * The professional counterpart to hc-notebook.tsx. Reference is a live cricket
 * broadcast: a persistent score bug, team colour plates rather than emoji
 * flags, run-rate and target readouts, and a ball-by-ball ticker.
 *
 * Team identity uses SHORT CODES on a colour plate ("IND", "CSK"), not the
 * emoji flags the notebook skin uses — which is both what a real broadcast
 * does and what keeps the skin free of per-OS emoji rendering.
 *
 * Every interactive control emits the same `game:move` payloads the notebook
 * components do, so the two skins are interchangeable mid-match.
 */

/* ── team identity ───────────────────────────────────────────────────────── */

export interface HcTeamId2 {
  short: string;
  name: string;
  playerName: string;
  color: string;
}

/** Colour plate identity for a seat. Falls back gracefully mid-selection. */
export function proTeam(state: HcState, playerId: string, players: Player[], seat: number): HcTeamId2 {
  const teamId = state.teamSelections[playerId]?.teamId;
  const playerName = players.find((p) => p.id === playerId)?.name ?? "?";
  const fallback = PRO_SIDES[seat % PRO_SIDES.length].base;
  if (!teamId) return { short: "—", name: "Choosing…", playerName, color: fallback };

  const country = (HC_COUNTRIES as Record<string, { name: string; short: string } | undefined>)[teamId];
  if (country) return { short: country.short, name: country.name, playerName, color: fallback };

  const franchise = (HC_FRANCHISES as Record<string, { name: string; short: string; color: string } | undefined>)[teamId];
  if (franchise) return { short: franchise.short, name: franchise.name, playerName, color: franchise.color };

  return { short: String(teamId).slice(0, 3).toUpperCase(), name: String(teamId), playerName, color: fallback };
}

/** The broadcast team badge — short code on a colour plate. */
export function TeamPlate({ team, size = "md" }: { team: HcTeamId2; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? { w: 54, h: 34, f: 15 } : size === "md" ? { w: 44, h: 28, f: 12 } : { w: 36, h: 23, f: 10 };
  return (
    <span
      className="grid shrink-0 place-items-center rounded-md font-black"
      style={{
        width: dims.w,
        height: dims.h,
        fontSize: dims.f,
        letterSpacing: "0.06em",
        background: `linear-gradient(160deg, ${team.color}, ${team.color}99)`,
        color: "#0A1220",
        border: "1px solid rgba(255,255,255,0.35)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      {team.short}
    </span>
  );
}

/* ── page chrome ─────────────────────────────────────────────────────────── */

const PHASE_LABEL: Record<HcState["phase"], string> = {
  teamSelect: "Team selection",
  toss: "Toss",
  tossChoice: "Toss decision",
  innings1: "1st innings",
  innings2: "2nd innings",
  finished: "Match complete",
};

export function HcProHeader({
  state,
  players,
  selfId,
  onHelp,
  onLeave,
  onSkin,
  rail,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
  onHelp?: () => void;
  onLeave?: () => void;
  onSkin?: () => void;
  /** Room rail slot — the shells pass InlineRoomRail so this file stays
   *  presentational and doesn't reach for socket-connected components. */
  rail?: ReactNode;
}) {
  const [p0, p1] = state.playerOrder;
  const a = proTeam(state, p0 ?? "", players, 0);
  const b = proTeam(state, p1 ?? "", players, 1);
  const opts = state.options;
  // `oversPerInnings` is already the resolved value — the server applies the
  // host's `galliOvers` override there, so this must not re-derive it.
  const overs = state.oversPerInnings;
  const live = state.phase === "innings1" || state.phase === "innings2";

  return (
    <div
      className="shrink-0 px-4 py-2.5"
      style={{ borderBottom: `1px solid ${PRO.line}`, background: "rgba(4,10,20,0.55)" }}
    >
      {/* Wraps rather than clipping: at 390px the wordmark, matchup, context
          chips and three actions do not fit on one line, and `shrink-0` on the
          action cluster meant Leave fell off the right edge entirely. */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md"
            style={{ background: `linear-gradient(150deg, ${PRO.gold}, ${PRO.goldDeep})`, color: "#2A1D05" }}
          >
            <IconBat size={15} />
          </div>
          <div className="min-w-0">
            <div
              className="truncate text-[12px] font-black uppercase leading-none"
              style={{ letterSpacing: "0.18em", color: PRO.ink }}
            >
              Hand&nbsp;Cricket
            </div>
            <div
              className="mt-1 truncate text-[9px] font-bold uppercase leading-none"
              style={{ letterSpacing: "0.14em", color: PRO.inkLo }}
            >
              {PHASE_LABEL[state.phase]}
            </div>
          </div>
        </div>

        {/* Matchup */}
        <div className="hidden items-center gap-2.5 sm:flex">
          <TeamPlate team={a} size="sm" />
          <span className="text-[10px] font-black" style={{ color: PRO.inkLo, letterSpacing: "0.12em" }}>
            V
          </span>
          <TeamPlate team={b} size="sm" />
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
          {live && <ProLive />}
          {/* Format and overs are reference, not action — first to go when
              space is tight, so the controls always stay reachable.
              `sm` (640px), not a custom `xs`: this project defines no extra
              breakpoints, and an undefined prefix would hide these forever. */}
          <span className="hidden sm:inline-flex">
            <ProChip>{opts.format.toUpperCase()}</ProChip>
          </span>
          {opts.mode === "galli" && <ProChip tone="gold">Galli</ProChip>}
          {overs != null && (
            <span className="hidden sm:inline-flex">
              <ProChip>{overs} ov</ProChip>
            </span>
          )}
          {onSkin && <HeaderBtn label="Classic" onClick={onSkin} />}
          {onHelp && <HeaderBtn label="Help" onClick={onHelp} />}
          {onLeave && <HeaderBtn label="Leave" onClick={onLeave} danger />}
        </div>
      </div>

      {rail && <div className="mt-2.5">{rail}</div>}
    </div>
  );
}

function HeaderBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase transition hover:brightness-125 active:scale-95"
      style={{
        letterSpacing: "0.12em",
        background: danger ? "rgba(248,113,113,0.14)" : "rgba(255,255,255,0.06)",
        color: danger ? "#FCA5A5" : PRO.inkMid,
        border: `1px solid ${danger ? "rgba(248,113,113,0.4)" : PRO.line}`,
      }}
    >
      {label}
    </button>
  );
}

/* ── team selection ──────────────────────────────────────────────────────── */

export function HcProTeamPicker({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const isIpl = state.options.category === "ipl";
  const oppId = state.playerOrder.find((id) => id !== selfId);
  const oppPick = oppId ? state.teamSelections[oppId]?.teamId : null;
  const myPick = state.teamSelections[selfId]?.teamId;

  const teams = useMemo(() => {
    if (isIpl) {
      return Object.values(HC_FRANCHISES).map((f) => ({
        id: f.id as string,
        name: f.name,
        short: f.short,
        color: f.color,
        sub: "IPL 2026",
      }));
    }
    return Object.values(HC_COUNTRIES).map((c) => ({
      id: c.id as string,
      name: c.name,
      short: c.short,
      color: PRO_SIDES[0].base,
      sub: "International",
    }));
  }, [isIpl]);

  function select(teamId: string) {
    getSocket().emit("game:move", { type: "selectTeam", data: { teamId } });
  }

  return (
    <div>
      <div className="mb-4 text-center">
        <ProLabel className="mb-2">Team selection</ProLabel>
        <div className="text-[20px] font-black" style={{ color: PRO.ink }}>
          Choose your side
        </div>
        {oppPick && (
          <div className="mt-2 flex justify-center">
            <ProChip tone="info">
              Opponent picked {oppPick.toString().slice(0, 14)}
            </ProChip>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {teams.map((t) => {
          const mine = myPick === t.id;
          const taken = oppPick === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={taken}
              onClick={() => select(t.id)}
              className="group flex items-center gap-2.5 rounded-xl p-3 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
              style={{
                background: mine
                  ? `linear-gradient(160deg, ${t.color}33, ${t.color}0D)`
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${mine ? `${t.color}AA` : PRO.line}`,
                boxShadow: mine ? `0 0 20px ${t.color}33` : "none",
              }}
            >
              <TeamPlate team={{ short: t.short, name: t.name, playerName: "", color: t.color }} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-extrabold" style={{ color: PRO.ink }}>
                  {t.name}
                </div>
                <div className="text-[9px] font-bold uppercase" style={{ letterSpacing: "0.12em", color: PRO.inkLo }}>
                  {taken ? "Taken" : mine ? "Your team" : t.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="sr-only">{players.length} players</div>
    </div>
  );
}

const ROLE_TAG: Record<HcPlayerProfile["role"], { label: string; tone: string }> = {
  batter: { label: "BAT", tone: "#5AA9F0" },
  bowler: { label: "BWL", tone: "#F87171" },
  allrounder: { label: "AR", tone: "#34D399" },
  keeper: { label: "WK", tone: "#F5C451" },
};

function PlayerRow({
  p,
  inXI,
  isCaptain,
  isVice,
  style,
  onToggle,
  onCaptain,
  onVice,
}: {
  p: HcPlayerProfile;
  inXI: boolean;
  isCaptain: boolean;
  isVice: boolean;
  style?: { battingStyle: string; bowlingStyle: string };
  onToggle: () => void;
  onCaptain: () => void;
  onVice: () => void;
}) {
  const tag = ROLE_TAG[p.role];
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2.5 py-2 transition"
      style={{
        background: inXI ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${inXI ? PRO.lineStrong : PRO.line}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        title={inXI ? "Remove from XI" : "Add to XI"}
      >
        <span
          className="grid h-5 w-8 shrink-0 place-items-center rounded text-[8px] font-black"
          style={{ background: `${tag.tone}22`, color: tag.tone, border: `1px solid ${tag.tone}55` }}
        >
          {tag.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-bold" style={{ color: inXI ? PRO.ink : PRO.inkMid }}>
            {p.name}
          </span>
          {style && (style.battingStyle || style.bowlingStyle) && (
            <span className="block truncate text-[9px] font-semibold" style={{ color: PRO.inkLo }}>
              {[style.battingStyle, style.bowlingStyle].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
      </button>

      {inXI && (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onCaptain}
            title="Make captain"
            className="grid h-6 w-6 place-items-center rounded text-[9px] font-black transition"
            style={{
              background: isCaptain ? `${PRO.gold}2E` : "rgba(255,255,255,0.05)",
              color: isCaptain ? PRO.gold : PRO.inkLo,
              border: `1px solid ${isCaptain ? `${PRO.gold}88` : PRO.line}`,
            }}
          >
            C
          </button>
          <button
            type="button"
            onClick={onVice}
            title="Make vice-captain"
            className="grid h-6 w-6 place-items-center rounded text-[9px] font-black transition"
            style={{
              background: isVice ? "rgba(90,169,240,0.22)" : "rgba(255,255,255,0.05)",
              color: isVice ? PRO.info : PRO.inkLo,
              border: `1px solid ${isVice ? "rgba(90,169,240,0.6)" : PRO.line}`,
            }}
          >
            VC
          </button>
        </div>
      )}
    </div>
  );
}

export function HcProSquadPicker({
  state,
  selfId,
  onChangeTeam,
}: {
  state: HcState;
  selfId: string;
  onChangeTeam: () => void;
}) {
  const sq = useHcSquad(state, selfId);
  if (!sq) {
    return (
      <ProPanel>
        <div className="py-6 text-center text-[13px] font-bold" style={{ color: PRO.loss }}>
          Roster unavailable for this team.
        </div>
      </ProPanel>
    );
  }

  const c = sq.composition;
  return (
    <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
      {/* Left: the XI */}
      <ProPanel>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <ProLabel className="mb-1">Your XI</ProLabel>
            <div className="truncate text-[15px] font-black" style={{ color: PRO.ink }}>
              {sq.teamName}
            </div>
            {sq.coach && (
              <div className="mt-0.5 truncate text-[10px] font-semibold" style={{ color: PRO.inkLo }}>
                Coach {sq.coach}
                {sq.homeCity ? ` · ${sq.homeCity}` : ""}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onChangeTeam}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase"
            style={{ letterSpacing: "0.12em", background: "rgba(255,255,255,0.06)", color: PRO.inkMid, border: `1px solid ${PRO.line}` }}
          >
            Change team
          </button>
        </div>

        {/* Composition readout */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <ProChip tone={c.total === 11 ? "win" : "loss"}>{c.total}/11 picked</ProChip>
          <ProChip tone={c.keepers >= 1 ? "neutral" : "loss"}>{c.keepers} WK</ProChip>
          <ProChip tone={c.bowlingOptions >= 4 ? "neutral" : "loss"}>{c.bowlingOptions} bowling</ProChip>
          <ProChip>{c.batters} BAT</ProChip>
          <ProChip>{c.allrounders} AR</ProChip>
        </div>

        <div className="flex max-h-[46vh] flex-col gap-1.5 overflow-y-auto pr-1">
          {sq.xi.map((p) => (
            <PlayerRow
              key={p.id}
              p={p}
              inXI
              isCaptain={sq.captainId === p.id}
              isVice={sq.viceCaptainId === p.id}
              style={sq.styleMap.get(p.name.toLowerCase())}
              onToggle={() => sq.toggle(p.id)}
              onCaptain={() => sq.setCaptain(p.id)}
              onVice={() => sq.setViceCaptain(p.id)}
            />
          ))}
        </div>

        {c.problems.length > 0 && (
          <div className="mt-3 rounded-lg px-3 py-2" style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.3)" }}>
            {c.problems.map((pr) => (
              <div key={pr} className="text-[11px] font-semibold" style={{ color: "#FCA5A5" }}>
                {pr}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={sq.confirm}
          disabled={!sq.canConfirm}
          className="mt-3 w-full rounded-xl py-3 text-[12px] font-extrabold uppercase transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
          style={{
            letterSpacing: "0.14em",
            background: sq.canConfirm ? `linear-gradient(168deg, ${PRO.gold}, ${PRO.goldDeep})` : "rgba(255,255,255,0.06)",
            color: sq.canConfirm ? "#2A1D05" : PRO.inkLo,
            border: `1px solid ${sq.canConfirm ? "rgba(255,235,180,0.5)" : PRO.line}`,
          }}
        >
          Confirm XI
        </button>
      </ProPanel>

      {/* Right: bench */}
      <ProPanel>
        <ProLabel className="mb-2">Bench</ProLabel>
        <div className="flex max-h-[26vh] flex-col gap-1.5 overflow-y-auto pr-1">
          {sq.bench.length === 0 && (
            <div className="py-3 text-center text-[11px] font-semibold" style={{ color: PRO.inkLo }}>
              Everyone is in the XI
            </div>
          )}
          {sq.bench.map((p) => (
            <PlayerRow
              key={p.id}
              p={p}
              inXI={false}
              isCaptain={false}
              isVice={false}
              style={sq.styleMap.get(p.name.toLowerCase())}
              onToggle={() => sq.toggle(p.id)}
              onCaptain={() => {}}
              onVice={() => {}}
            />
          ))}
        </div>

        {sq.legendsBench.length > 0 && (
          <>
            <ProLabel className="mb-2 mt-4">Legends pool</ProLabel>
            <div className="flex max-h-[20vh] flex-col gap-1.5 overflow-y-auto pr-1">
              {sq.legendsBench.map((p) => (
                <PlayerRow
                  key={p.id}
                  p={p}
                  inXI={false}
                  isCaptain={false}
                  isVice={false}
                  style={sq.styleMap.get(p.name.toLowerCase())}
                  onToggle={() => sq.toggle(p.id)}
                  onCaptain={() => {}}
                  onVice={() => {}}
                />
              ))}
            </div>
          </>
        )}
      </ProPanel>
    </div>
  );
}

export function HcProWaiting({ state, selfId, players }: { state: HcState; selfId: string; players: Player[] }) {
  const oppId = state.playerOrder.find((id) => id !== selfId);
  const opp = proTeam(state, oppId ?? "", players, 1);
  const mine = proTeam(state, selfId, players, 0);
  return (
    <ProPanel className="text-center">
      <ProLabel className="mb-3">Squad locked</ProLabel>
      <div className="mb-4 flex items-center justify-center gap-4">
        <TeamPlate team={mine} size="lg" />
        <span className="text-[12px] font-black" style={{ color: PRO.inkLo }}>V</span>
        <TeamPlate team={opp} size="lg" />
      </div>
      <div className="text-[15px] font-black" style={{ color: PRO.ink }}>
        Waiting for {opp.playerName}
      </div>
      <div className="mt-1.5 text-[12px] font-semibold" style={{ color: PRO.inkLo }}>
        They're still picking their XI.
      </div>
      <div className="mt-4 flex justify-center">
        <ProChip tone="info">Toss is next</ProChip>
      </div>
    </ProPanel>
  );
}

/* ── toss ────────────────────────────────────────────────────────────────── */

export function HcProToss({ state, selfId, players }: { state: HcState; selfId: string; players: Player[] }) {
  const myPick = state.tossPicks[selfId];
  const oppId = state.playerOrder.find((id) => id !== selfId);
  const oppLocked = oppId ? state.tossPicks[oppId] != null : false;

  function pick(n: number) {
    if (myPick != null) return;
    getSocket().emit("game:move", { type: "tossPick", data: { pick: n } });
  }

  return (
    <ProPanel className="text-center">
      <ProLabel className="mb-2">The toss</ProLabel>
      <div className="text-[19px] font-black" style={{ color: PRO.ink }}>
        Pick a number
      </div>
      <div className="mt-1.5 text-[12px] font-semibold" style={{ color: PRO.inkLo }}>
        Both picks are added together. Odd total, you call it.
      </div>

      <div className="mx-auto mt-5 grid max-w-[380px] grid-cols-3 gap-2.5">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const chosen = myPick === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => pick(n)}
              disabled={myPick != null}
              className="rounded-xl py-4 text-[24px] font-black tabular-nums transition active:scale-[0.96] disabled:cursor-not-allowed"
              style={{
                background: chosen ? `linear-gradient(168deg, ${PRO.gold}, ${PRO.goldDeep})` : "rgba(255,255,255,0.05)",
                color: chosen ? "#2A1D05" : PRO.ink,
                border: `1px solid ${chosen ? "rgba(255,235,180,0.55)" : PRO.line}`,
                opacity: myPick != null && !chosen ? 0.3 : 1,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <ProChip tone={myPick != null ? "win" : "neutral"}>{myPick != null ? "You're in" : "Your pick"}</ProChip>
        <ProChip tone={oppLocked ? "win" : "neutral"}>{oppLocked ? "Opponent in" : "Waiting on opponent"}</ProChip>
      </div>
      <div className="sr-only">{players.length}</div>
    </ProPanel>
  );
}

export function HcProTossChoice({ state, selfId, players }: { state: HcState; selfId: string; players: Player[] }) {
  const iWon = state.tossWinnerId === selfId;
  const winner = players.find((p) => p.id === state.tossWinnerId)?.name ?? "Opponent";

  function choose(choice: "bat" | "bowl") {
    getSocket().emit("game:move", { type: "tossChoice", data: { choice } });
  }

  return (
    <ProPanel className="text-center">
      <ProLabel className="mb-2">Toss result</ProLabel>
      {state.tossSum != null && (
        <div className="mb-3 flex justify-center">
          <ProChip tone="gold">Total {state.tossSum}</ProChip>
        </div>
      )}
      <div className="text-[19px] font-black" style={{ color: iWon ? PRO.gold : PRO.ink }}>
        {iWon ? "You won the toss" : `${winner} won the toss`}
      </div>

      {iWon ? (
        <>
          <div className="mt-1.5 text-[12px] font-semibold" style={{ color: PRO.inkLo }}>
            Bat first, or put them in?
          </div>
          <div className="mx-auto mt-5 grid max-w-[360px] grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => choose("bat")}
              className="flex flex-col items-center gap-2 rounded-xl py-5 transition active:scale-[0.97]"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${PRO.line}`, color: PRO.ink }}
            >
              <IconBat size={26} />
              <span className="text-[12px] font-extrabold uppercase" style={{ letterSpacing: "0.14em" }}>Bat</span>
            </button>
            <button
              type="button"
              onClick={() => choose("bowl")}
              className="flex flex-col items-center gap-2 rounded-xl py-5 transition active:scale-[0.97]"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${PRO.line}`, color: PRO.ink }}
            >
              <IconBall size={26} />
              <span className="text-[12px] font-extrabold uppercase" style={{ letterSpacing: "0.14em" }}>Bowl</span>
            </button>
          </div>
        </>
      ) : (
        <div className="mt-2 text-[12px] font-semibold" style={{ color: PRO.inkLo }}>
          Waiting for their decision…
        </div>
      )}
    </ProPanel>
  );
}

/* ── live innings ────────────────────────────────────────────────────────── */

/** The persistent score bug — the single most-read element of the whole game. */
export function HcProScoreBug({
  state,
  innings,
  target,
  players,
  compact = false,
}: {
  state: HcState;
  innings: HcInnings;
  target: number | null;
  players: Player[];
  compact?: boolean;
}) {
  const seat = state.playerOrder.indexOf(innings.battingPlayerId);
  const bat = proTeam(state, innings.battingPlayerId, players, seat < 0 ? 0 : seat);
  const oversBowled = Math.floor(innings.balls / 6);
  const ballsThisOver = innings.balls % 6;
  const runRate = innings.balls > 0 ? (innings.runs / innings.balls) * 6 : 0;

  const ballsLeft = innings.overs * 6 - innings.balls;
  const need = target != null ? Math.max(0, target - innings.runs) : null;
  const reqRate = need != null && ballsLeft > 0 ? (need / ballsLeft) * 6 : null;

  return (
    <ProPanel glow={need != null && need <= 12 && ballsLeft <= 12}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamPlate team={bat} size={compact ? "md" : "lg"} />
          <div className="min-w-0">
            <ProLabel className="mb-1.5">
              Innings {innings.number} · {bat.playerName}
            </ProLabel>
            <div className="flex items-baseline gap-1">
              <span
                className={`${compact ? "text-[34px]" : "text-[46px]"} font-black leading-none tabular-nums`}
                style={{ color: PRO.ink }}
              >
                {innings.runs}
              </span>
              <span
                className={`${compact ? "text-[20px]" : "text-[26px]"} font-black leading-none tabular-nums`}
                style={{ color: PRO.loss }}
              >
                /{innings.wickets}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-bold tabular-nums" style={{ color: PRO.inkLo }}>
              {oversBowled}.{ballsThisOver} / {innings.overs} ov · RR {runRate.toFixed(2)}
            </div>
          </div>
        </div>

        {target != null && (
          <div className="shrink-0 text-right">
            <ProStat label="Target" value={target} accent={PRO.gold} size={compact ? "md" : "lg"} align="right" />
            {need != null && (
              <div className="mt-2 text-[11px] font-bold tabular-nums" style={{ color: PRO.inkMid }}>
                Need {need} off {ballsLeft}
              </div>
            )}
            {reqRate != null && Number.isFinite(reqRate) && (
              <div className="mt-0.5 text-[11px] font-bold tabular-nums" style={{ color: reqRate > 12 ? PRO.loss : PRO.inkLo }}>
                RRR {reqRate.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>

      {target != null && (
        <div className="mt-3">
          <ProMeter value={innings.runs} max={target} accent={PRO.gold} />
        </div>
      )}
    </ProPanel>
  );
}

/** Ball-by-ball ticker — most recent last, the way a broadcast reads it. */
export function HcProBallTicker({ history, max = 12 }: { history: HcBall[]; max?: number }) {
  const balls = history.slice(-max);
  if (balls.length === 0) {
    return (
      <div className="py-2 text-center text-[11px] font-semibold" style={{ color: PRO.inkLo }}>
        No balls bowled yet
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {balls.map((b, i) => {
        const tone = b.wicket ? PRO.loss : b.isBoundary ? PRO.gold : b.runs === 0 ? PRO.inkLo : PRO.win;
        return (
          <div
            key={`${b.overNumber}.${b.ballInOver}-${i}`}
            title={`Over ${b.overNumber}.${b.ballInOver}`}
            className="grid h-7 w-7 place-items-center rounded-md text-[11px] font-black tabular-nums"
            style={{ background: `${tone}1F`, color: tone, border: `1px solid ${tone}44` }}
          >
            {b.wicket ? "W" : b.runs}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The pick row — 1..6, the whole interaction of Hand Cricket.
 *
 * `allowed` is narrowed to 1-3 for a restricted powerplay ball; the disabled
 * options stay VISIBLE rather than being removed so the row never reflows
 * mid-over and the restriction is legible rather than mysterious.
 */
export function HcProPickRow({
  myPick,
  allowed,
  restricted,
  role,
  onPick,
}: {
  myPick: number | null;
  allowed: number[];
  restricted: boolean;
  role: "batter" | "bowler" | null;
  onPick: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <ProLabel>
          {myPick != null ? "Locked in" : role === "batter" ? "Your shot" : role === "bowler" ? "Your delivery" : "Watching"}
        </ProLabel>
        {restricted && <ProChip tone="gold">Powerplay · 1-3 only</ProChip>}
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const ok = allowed.includes(n);
          const chosen = myPick === n;
          const disabled = !ok || myPick != null || role == null;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPick(n)}
              disabled={disabled}
              className="rounded-xl py-3 text-[19px] font-black tabular-nums transition active:scale-[0.95] disabled:cursor-not-allowed"
              style={{
                background: chosen
                  ? `linear-gradient(168deg, ${PRO.gold}, ${PRO.goldDeep})`
                  : "rgba(255,255,255,0.05)",
                color: chosen ? "#2A1D05" : ok ? PRO.ink : PRO.inkLo,
                border: `1px solid ${chosen ? "rgba(255,235,180,0.55)" : PRO.line}`,
                opacity: disabled && !chosen ? 0.3 : 1,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Reveal plate: what each side threw on the ball just bowled. */
export function HcProReveal({
  reveal,
  meIsBatter,
  myPick,
  oppLockedIn,
}: {
  reveal: HcBall | null;
  meIsBatter: boolean;
  myPick: number | null;
  oppLockedIn: boolean;
}) {
  if (reveal) {
    const mine = meIsBatter ? reveal.batterPick : reveal.bowlerPick;
    const theirs = meIsBatter ? reveal.bowlerPick : reveal.batterPick;
    const out = reveal.wicket;
    const headline = out
      ? meIsBatter ? "Out!" : "Wicket!"
      : reveal.isBoundary
      ? `${reveal.runs} runs`
      : `${reveal.runs} run${reveal.runs === 1 ? "" : "s"}`;
    const tone = out ? (meIsBatter ? PRO.loss : PRO.win) : reveal.isBoundary ? PRO.gold : PRO.ink;
    return (
      <div className="flex flex-col items-center gap-2.5 py-2">
        <div className="flex items-center gap-4">
          <RevealNum n={mine} label="You" tone={PRO.info} />
          <span className="text-[11px] font-black" style={{ color: PRO.inkLo }}>V</span>
          <RevealNum n={theirs} label="Them" tone={PRO.loss} />
        </div>
        <div className="text-[18px] font-black uppercase" style={{ letterSpacing: "0.1em", color: tone }}>
          {headline}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="flex items-center gap-4">
        <RevealNum n={myPick} label="You" tone={PRO.info} hidden={myPick == null} />
        <span className="text-[11px] font-black" style={{ color: PRO.inkLo }}>V</span>
        <RevealNum n={null} label="Them" tone={PRO.loss} hidden locked={oppLockedIn} />
      </div>
      <div className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.14em", color: PRO.inkLo }}>
        {myPick == null ? "Make your pick" : oppLockedIn ? "Revealing…" : "Waiting for opponent"}
      </div>
    </div>
  );
}

function RevealNum({
  n,
  label,
  tone,
  hidden = false,
  locked = false,
}: {
  n: number | null;
  label: string;
  tone: string;
  hidden?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="grid h-16 w-16 place-items-center rounded-2xl text-[30px] font-black tabular-nums"
        style={{
          background: hidden ? "rgba(255,255,255,0.04)" : `${tone}1F`,
          border: `1px solid ${hidden ? PRO.line : `${tone}66`}`,
          color: hidden ? PRO.inkLo : tone,
        }}
      >
        {hidden ? (locked ? "•" : "?") : n ?? "?"}
      </div>
      <ProLabel color={PRO.inkLo}>{label}</ProLabel>
    </div>
  );
}

/* ── mid-innings pickers ─────────────────────────────────────────────────── */

/**
 * Choose who walks in after a wicket.
 *
 * Not optional chrome — the innings BLOCKS on `needsNextBatterPick` until this
 * emits, so a skin without it would deadlock the match. Same for the bowler
 * picker below.
 */
export function HcProNextBatter({ state, innings }: { state: HcState; innings: HcInnings }) {
  const sel = state.teamSelections[innings.battingPlayerId];
  const squad = sel?.squadPlayerIds ?? [];
  const slot = innings.pendingBatterSlot ?? innings.nextBatterIdx - 1;
  const remaining = squad.slice(slot);

  const roster = sel?.teamId ? getRosterFor(sel.teamId, state.options.format) : null;
  const all: HcPlayerProfile[] = roster ? [...roster.squad, ...roster.extras] : [];
  const profileOf = (id: string) => all.find((p) => p.id === id) ?? null;

  function select(profileId: string) {
    getSocket().emit("game:move", { type: "selectNextBatter", data: { profileId } });
  }

  return (
    <ProPanel glow>
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: PRO.loss }}><IconWicket size={18} /></span>
        <div>
          <ProLabel color={PRO.loss}>Wicket</ProLabel>
          <div className="mt-1 text-[14px] font-black" style={{ color: PRO.ink }}>
            Send in your next batter
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {remaining.map((id) => {
          const p = profileOf(id);
          if (!p) return null;
          const tag = ROLE_TAG[p.role];
          return (
            <button
              key={id}
              type="button"
              onClick={() => select(id)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition active:scale-[0.97]"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${PRO.line}` }}
            >
              <span
                className="grid h-5 w-8 shrink-0 place-items-center rounded text-[8px] font-black"
                style={{ background: `${tag.tone}22`, color: tag.tone, border: `1px solid ${tag.tone}55` }}
              >
                {tag.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-bold" style={{ color: PRO.ink }}>
                {p.name}
              </span>
            </button>
          );
        })}
        {remaining.length === 0 && (
          <div className="col-span-full py-3 text-center text-[11px] font-semibold" style={{ color: PRO.inkLo }}>
            No batters remaining
          </div>
        )}
      </div>
    </ProPanel>
  );
}

const MAX_OVERS_PER_BOWLER: Record<string, number | null> = { test: null, odi: 4, t20: 3 };

export function HcProBowlerPicker({
  state,
  innings,
  selfId,
  players,
}: {
  state: HcState;
  innings: HcInnings;
  selfId: string;
  players: Player[];
}) {
  const amBowling = innings.bowlingPlayerId === selfId;
  const sel = state.teamSelections[innings.bowlingPlayerId];
  const roster = sel?.teamId ? getRosterFor(sel.teamId, state.options.format) : null;
  const all: HcPlayerProfile[] = roster ? [...roster.squad, ...roster.extras] : [];
  const chosenIds = sel?.squadPlayerIds ?? [];
  const over = Math.floor(innings.balls / 6) + 1;
  const bowlingName = players.find((p) => p.id === innings.bowlingPlayerId)?.name ?? "Opponent";

  if (!amBowling) {
    return (
      <ProPanel className="text-center">
        <ProLabel className="mb-2">Over {over}</ProLabel>
        <div className="text-[13px] font-bold" style={{ color: PRO.ink }}>
          {bowlingName} is choosing a bowler…
        </div>
      </ProPanel>
    );
  }

  // Only bowlers and all-rounders may bowl — mirrors the server's rule.
  const candidates = chosenIds
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is HcPlayerProfile => !!p)
    .filter((p) => p.role === "bowler" || p.role === "allrounder");

  const maxOvers = MAX_OVERS_PER_BOWLER[state.options.format] ?? null;

  function pickBowler(profileId: string) {
    getSocket().emit("game:move", { type: "selectBowler", data: { playerId: profileId } });
  }

  return (
    <ProPanel glow>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span style={{ color: PRO.gold }}><IconBall size={18} /></span>
          <div>
            <ProLabel>Over {over}</ProLabel>
            <div className="mt-1 text-[14px] font-black" style={{ color: PRO.ink }}>
              Choose your bowler
            </div>
          </div>
        </div>
        <ProChip>{maxOvers == null ? "No quota" : `${maxOvers} ov max`}</ProChip>
      </div>

      {candidates.length === 0 ? (
        <div className="py-4 text-center text-[12px] font-bold" style={{ color: PRO.loss }}>
          No bowlers or all-rounders in your XI.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {candidates.map((p) => {
            const st = innings.bowlerStats[p.id];
            const done = st ? Math.floor(st.balls / 6) : 0;
            const atQuota = maxOvers != null && done >= maxOvers;
            const tag = ROLE_TAG[p.role];
            return (
              <button
                key={p.id}
                type="button"
                disabled={atQuota}
                onClick={() => pickBowler(p.id)}
                className="rounded-lg p-2.5 text-left transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${PRO.line}` }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="grid h-4.5 w-7 shrink-0 place-items-center rounded text-[8px] font-black"
                    style={{ background: `${tag.tone}22`, color: tag.tone, border: `1px solid ${tag.tone}55`, height: 18 }}
                  >
                    {tag.label}
                  </span>
                  {atQuota && <ProChip tone="loss">Max</ProChip>}
                </div>
                <div className="mt-1.5 truncate text-[12px] font-bold" style={{ color: PRO.ink }}>
                  {p.name}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold tabular-nums" style={{ color: PRO.inkLo }}>
                  {st && st.balls > 0
                    ? `${Math.floor(st.balls / 6)}.${st.balls % 6}–${st.wickets}–${st.runs}`
                    : "Unused"}
                  {maxOvers != null ? ` · ${done}/${maxOvers}` : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </ProPanel>
  );
}

/* ── result ──────────────────────────────────────────────────────────────── */

export function HcProSummary({
  state,
  players,
  selfId,
  onContinue,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
  onContinue?: () => void;
}) {
  const i1 = state.innings1;
  const i2 = state.innings2;
  const iWon = state.winnerId === selfId;
  const tie = state.result === "tie";
  const winnerName = players.find((p) => p.id === state.winnerId)?.name ?? "—";

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <ProPanel glow className="mb-3 text-center">
        <div
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full"
          style={{
            background: tie ? "rgba(255,255,255,0.06)" : `${PRO.gold}22`,
            border: `1px solid ${tie ? PRO.line : `${PRO.gold}66`}`,
            color: tie ? PRO.inkMid : PRO.gold,
          }}
        >
          <IconTrophy size={22} />
        </div>
        <ProLabel className="mb-2">Match complete</ProLabel>
        <div className="text-[22px] font-black" style={{ color: tie ? PRO.ink : iWon ? PRO.gold : PRO.ink }}>
          {tie ? "Match tied" : iWon ? "You win" : `${winnerName} wins`}
        </div>

        <div className="mt-5 flex items-center justify-center gap-6">
          {i1 && <InningsTotal state={state} innings={i1} players={players} />}
          {i2 && <InningsTotal state={state} innings={i2} players={players} />}
        </div>

        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="mt-5 rounded-xl px-6 py-2.5 text-[12px] font-extrabold uppercase transition active:scale-[0.98]"
            style={{
              letterSpacing: "0.14em",
              background: `linear-gradient(168deg, ${PRO.gold}, ${PRO.goldDeep})`,
              color: "#2A1D05",
            }}
          >
            Continue
          </button>
        )}
      </ProPanel>

      <div className="grid gap-3 lg:grid-cols-2">
        {i1 && <HcProScorecard state={state} innings={i1} players={players} />}
        {i2 && <HcProScorecard state={state} innings={i2} players={players} />}
      </div>
    </div>
  );
}

function InningsTotal({ state, innings, players }: { state: HcState; innings: HcInnings; players: Player[] }) {
  const seat = state.playerOrder.indexOf(innings.battingPlayerId);
  const t = proTeam(state, innings.battingPlayerId, players, seat < 0 ? 0 : seat);
  const ov = Math.floor(innings.balls / 6);
  const bl = innings.balls % 6;
  return (
    <div className="text-center">
      <TeamPlate team={t} size="md" />
      <div className="mt-2 text-[26px] font-black leading-none tabular-nums" style={{ color: PRO.ink }}>
        {innings.runs}
        <span style={{ color: PRO.loss }}>/{innings.wickets}</span>
      </div>
      <div className="mt-1 text-[10px] font-bold tabular-nums" style={{ color: PRO.inkLo }}>
        {ov}.{bl} ov
      </div>
    </div>
  );
}

/** Batting + bowling card for one innings. */
export function HcProScorecard({
  state,
  innings,
  players,
}: {
  state: HcState;
  innings: HcInnings;
  players: Player[];
}) {
  const seat = state.playerOrder.indexOf(innings.battingPlayerId);
  const bat = proTeam(state, innings.battingPlayerId, players, seat < 0 ? 0 : seat);
  const teamId = state.teamSelections[innings.battingPlayerId]?.teamId;
  const bowlTeamId = state.teamSelections[innings.bowlingPlayerId]?.teamId;

  const nameOf = useMemo(() => {
    const pool: HcPlayerProfile[] = [];
    for (const id of [teamId, bowlTeamId]) {
      if (!id) continue;
      const r = getRosterFor(id, state.options.format);
      if (r) pool.push(...r.squad, ...r.extras);
    }
    const m = new Map(pool.map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? id;
  }, [teamId, bowlTeamId, state.options.format]);

  const batters = Object.entries(innings.batterStats).filter(([, s]) => s.balls > 0 || s.isOut);
  const bowlers = Object.entries(innings.bowlerStats).filter(([, s]) => s.balls > 0);

  return (
    <ProPanel>
      <div className="mb-3 flex items-center gap-2.5">
        <TeamPlate team={bat} size="sm" />
        <div className="min-w-0">
          <ProLabel>Innings {innings.number}</ProLabel>
          <div className="mt-1 truncate text-[13px] font-black tabular-nums" style={{ color: PRO.ink }}>
            {innings.runs}/{innings.wickets}
          </div>
        </div>
      </div>

      <ProLabel className="mb-1.5">Batting</ProLabel>
      <div className="mb-3 overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr style={{ color: PRO.inkLo }}>
              <th className="pb-1 font-bold">Batter</th>
              <th className="pb-1 text-right font-bold tabular-nums">R</th>
              <th className="pb-1 text-right font-bold tabular-nums">B</th>
              <th className="pb-1 text-right font-bold tabular-nums">4s</th>
              <th className="pb-1 text-right font-bold tabular-nums">6s</th>
            </tr>
          </thead>
          <tbody>
            {batters.length === 0 && (
              <tr><td colSpan={5} className="py-2 text-center" style={{ color: PRO.inkLo }}>No batting yet</td></tr>
            )}
            {batters.map(([id, s]) => (
              <tr key={id} style={{ borderTop: `1px solid ${PRO.line}` }}>
                <td className="py-1.5 pr-2 font-semibold" style={{ color: s.isOut ? PRO.inkMid : PRO.ink }}>
                  <span className="block max-w-[140px] truncate">
                    {nameOf(id)}
                    {!s.isOut && <span style={{ color: PRO.win }}> *</span>}
                  </span>
                </td>
                <td className="py-1.5 text-right font-black tabular-nums" style={{ color: PRO.ink }}>{s.runs}</td>
                <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>{s.balls}</td>
                <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>{s.fours}</td>
                <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>{s.sixes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProLabel className="mb-1.5">Bowling</ProLabel>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr style={{ color: PRO.inkLo }}>
              <th className="pb-1 font-bold">Bowler</th>
              <th className="pb-1 text-right font-bold tabular-nums">O</th>
              <th className="pb-1 text-right font-bold tabular-nums">R</th>
              <th className="pb-1 text-right font-bold tabular-nums">W</th>
            </tr>
          </thead>
          <tbody>
            {bowlers.length === 0 && (
              <tr><td colSpan={4} className="py-2 text-center" style={{ color: PRO.inkLo }}>No bowling yet</td></tr>
            )}
            {bowlers.map(([id, s]) => (
              <tr key={id} style={{ borderTop: `1px solid ${PRO.line}` }}>
                <td className="py-1.5 pr-2 font-semibold" style={{ color: PRO.ink }}>
                  <span className="block max-w-[140px] truncate">{nameOf(id)}</span>
                </td>
                <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>
                  {Math.floor(s.balls / 6)}.{s.balls % 6}
                </td>
                <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>{s.runs}</td>
                <td className="py-1.5 text-right font-black tabular-nums" style={{ color: s.wickets > 0 ? PRO.win : PRO.ink }}>
                  {s.wickets}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProPanel>
  );
}

/* ── innings screen (composed) ───────────────────────────────────────────── */

export function HcProInnings({
  state,
  selfId,
  players,
  compact = false,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
  compact?: boolean;
}) {
  const innings = state.phase === "innings1" ? state.innings1! : state.innings2!;
  const myRole =
    innings.battingPlayerId === selfId ? "batter" : innings.bowlingPlayerId === selfId ? "bowler" : null;
  const myPick = state.pendingPicks[selfId] ?? null;
  const oppId = state.playerOrder.find((id) => id !== selfId);
  const oppLockedIn = oppId ? state.pendingPicks[oppId] != null : false;

  const target = state.phase === "innings2" && state.innings1 ? state.innings1.runs + 1 : null;

  // Powerplay restriction for the ball about to be bowled.
  const upcomingOver = Math.floor(innings.balls / 6) + 1;
  const upcomingBall = (innings.balls % 6) + 1;
  const restrictedThisOver = innings.restrictedBallsByOver[upcomingOver] ?? [];
  const isRestrictedNow = restrictedThisOver.includes(upcomingBall);
  const bowlerRestricted = myRole === "bowler" && isRestrictedNow;
  const allowed = bowlerRestricted ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];

  // Briefly hold the just-bowled ball on screen so the reveal is readable.
  const [reveal, setReveal] = useState<HcBall | null>(null);
  const lastCount = useRef(innings.history.length);
  useEffect(() => {
    if (innings.history.length > lastCount.current) {
      setReveal(innings.history[innings.history.length - 1]);
      lastCount.current = innings.history.length;
      const t = setTimeout(() => setReveal(null), 1800);
      return () => clearTimeout(t);
    }
    lastCount.current = innings.history.length;
  }, [innings.history.length]);

  function pick(n: number) {
    if (myPick != null || myRole == null) return;
    // The server ignores a pick with no bowler set; bail early so the button
    // never looks like it worked.
    if (innings.currentBowlerId == null) return;
    getSocket().emit("game:move", { type: "pick", data: { pick: n } });
  }

  const isBattingPlayer = innings.battingPlayerId === selfId;
  const needsBowler = innings.currentBowlerId == null;

  return (
    <div className="flex flex-col gap-3">
      <HcProScoreBug state={state} innings={innings} target={target} players={players} compact={compact} />

      {/* Three mutually-exclusive action states, in the same precedence the
          notebook skin uses — a wicket blocks everything, then a missing
          bowler, then the live ball. Getting this order wrong deadlocks the
          match, so it deliberately mirrors hc-shared's InningsPhase. */}
      {innings.needsNextBatterPick ? (
        <>
          {isBattingPlayer ? (
            <HcProNextBatter state={state} innings={innings} />
          ) : (
            <ProPanel className="text-center">
              <ProLabel className="mb-2" color={PRO.loss}>Wicket</ProLabel>
              <div className="text-[13px] font-bold" style={{ color: PRO.ink }}>
                Opponent is selecting their next batter…
              </div>
            </ProPanel>
          )}
          {/* A wicket on the last ball of an over needs BOTH picks. */}
          {needsBowler && (
            <HcProBowlerPicker state={state} innings={innings} selfId={selfId} players={players} />
          )}
        </>
      ) : needsBowler ? (
        <HcProBowlerPicker state={state} innings={innings} selfId={selfId} players={players} />
      ) : (
        <>
          <ProPanel>
            <div className="mb-2 flex items-center justify-between">
              <ProLabel>
                {myRole === "batter" ? "You are batting" : myRole === "bowler" ? "You are bowling" : "Spectating"}
              </ProLabel>
              <span style={{ color: PRO.inkLo }}>
                {myRole === "batter" ? <IconBat size={14} /> : myRole === "bowler" ? <IconBall size={14} /> : null}
              </span>
            </div>
            <HcProReveal reveal={reveal} meIsBatter={myRole === "batter"} myPick={myPick} oppLockedIn={oppLockedIn} />
          </ProPanel>

          <ProPanel>
            <HcProPickRow
              myPick={myPick}
              allowed={allowed}
              restricted={bowlerRestricted}
              role={myRole}
              onPick={pick}
            />
          </ProPanel>
        </>
      )}

      <ProPanel>
        <ProLabel className="mb-2">This innings</ProLabel>
        <HcProBallTicker history={innings.history} max={compact ? 10 : 16} />
      </ProPanel>
    </div>
  );
}

/** Side accent helper for shells that need one. */
export function hcSide(seat: number): ProSide {
  return PRO_SIDES[seat % PRO_SIDES.length];
}
