import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { HcBall, HcInnings, HcState, Player } from "@shared/types";
import { HC_COUNTRIES, HC_FRANCHISES, getRosterFor, type HcPlayerProfile } from "@shared/hc-rosters";
import { getSocket } from "../../lib/socket";
import { computeManOfTheMatch, summarizeMatch } from "./hc-shared";
import { useHcSquad } from "./useHcSquad";
import {
  currentPartnership,
  economy,
  fallOfWickets,
  lastOvers,
  oversFromBalls,
  strikeRate,
} from "./hc-stats";
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

/**
 * Last-resort display name for a profile id the roster could not resolve.
 *
 * Ids are slugs ("mohammed-siraj"), so a raw fallback puts a lowercase
 * hyphenated string in a scorecard. Rosters normally resolve, but a roster/JSON
 * mismatch for one team should degrade to "Mohammed Siraj", not leak the key.
 */
export function prettyName(id: string): string {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** 1st, 2nd, 3rd… for partnership and wicket labels. */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
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

        {/* Matchup. Was `hidden sm:flex`, so on a phone you played a whole
            match with no persistent answer to "who am I, and who am I
            playing?" — the score bug only ever shows the batting side. */}
        <div className="flex items-center gap-2">
          <TeamPlate team={a} size="sm" />
          <span className="text-[10px] font-black" style={{ color: PRO.inkLo, letterSpacing: "0.12em" }}>
            V
          </span>
          <TeamPlate team={b} size="sm" />
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
          {live && <ProLive />}
          {/* Format and overs now survive on a phone as one merged chip
              ("T20 · 10 ov") rather than being hidden outright — the match
              length is the frame for every decision in a chase, and it was
              invisible for the entire match on the platform most people
              play on. Two chips became one so the header still fits. */}
          {opts.mode === "galli" && <ProChip tone="gold">Galli</ProChip>}
          <ProChip>
            {opts.format.toUpperCase()}
            {overs != null ? ` · ${overs} ov` : ""}
          </ProChip>
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
            {/* Was `oppPick.toString().slice(0, 14)`, which printed the raw
                team slug — "Opponent picked southafrica". The display name is
                one lookup away and this is a first-run screen. */}
            <ProChip tone="info">
              Opponent picked {teams.find((t) => t.id === oppPick)?.name ?? prettyName(String(oppPick))}
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
      {/* Was "Odd total, you call it." — never said whose "you", and never
          said what "call it" wins you. Both sides now read the same rule and
          learn the stake before they commit to a number. */}
      <div className="mt-1.5 text-[12px] font-semibold" style={{ color: PRO.inkLo }}>
        You and your opponent each pick a number. If the two add up to an
        <span style={{ color: PRO.gold }}> odd</span> total you win the toss and
        choose whether to bat or bowl first.
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
  footer,
}: {
  state: HcState;
  innings: HcInnings;
  target: number | null;
  players: Player[];
  compact?: boolean;
  /** Rendered as a full-bleed strip inside this panel rather than as a
   *  separate card below it. The powerplay banner lives here: it is innings
   *  state, so a second bordered box under the score bug was two frames
   *  around one idea, and it cost a border, a gap and a rounded corner of
   *  vertical space on a phone. */
  footer?: ReactNode;
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
    /*
     * THE INNINGS WEARS THE BATTING SIDE'S COLOUR.
     *
     * The screen had one accent (gold) doing every job, so the largest
     * surfaces carried no colour at all and the team identity was stranded in
     * a 44px plate. A cricket broadcast tints its lower-third to whoever is
     * batting; doing the same here gives the innings an identity that
     * re-keys at the break, and makes "who is batting" readable from the
     * panel's edge rather than from reading a name.
     *
     * It owns a REGION — this panel's surface, the crease header, the chase
     * meter — rather than being sprinkled, and gold stays reserved for the
     * primary action so the thing you press never competes with atmosphere.
     *
     * The first cut of this used a 4px coloured left border. That is a banned
     * default (craft floor: no coloured border-left above 1px on a card) and
     * the detector flagged it as `side-tab`. Tinting the SURFACE is the better
     * move regardless: a stripe decorates an edge, a wash actually gives the
     * region to the batting side.
     */
    <ProPanel
      glow={need != null && need <= 12 && ballsLeft <= 12}
      dense={compact}
      style={{
        backgroundImage: `radial-gradient(120% 100% at 0% 0%, ${bat.color}24, transparent 62%)`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamPlate team={bat} size={compact ? "md" : "lg"} />
          <div className="min-w-0">
            {/* Team colour on a wide-tracked micro-label: 4.44:1 for IND
                orange is under AA body but clears the 3:1 control/large bar,
                and it is 11px 800-weight, not running text. */}
            <ProLabel className="mb-1.5" color={bat.color}>
              Innings {innings.number} · {bat.playerName}
            </ProLabel>
            <div className="flex items-baseline gap-1">
              <span
                className={`${compact ? "text-[30px]" : "text-[46px]"} font-black leading-none tabular-nums`}
                style={{ color: PRO.ink }}
              >
                {innings.runs}
              </span>
              <span
                className={`${compact ? "text-[18px]" : "text-[26px]"} font-black leading-none tabular-nums`}
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

        {target != null ? (
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
        ) : (
          /* First innings has no target, which left this whole half of the bug
             empty. A broadcast fills it with the projection — current rate run
             out to the full quota — which is the number both players are
             actually arguing about at this point. */
          <div className="shrink-0 text-right">
            <ProStat
              label="Projected"
              value={innings.balls > 0 ? Math.round(runRate * innings.overs) : "—"}
              accent={PRO.gold}
              size={compact ? "md" : "lg"}
              align="right"
            />
            <div className="mt-2 text-[11px] font-bold tabular-nums" style={{ color: PRO.inkMid }}>
              {ballsLeft} balls left
            </div>
            <div className="mt-0.5 text-[11px] font-bold tabular-nums" style={{ color: PRO.inkLo }}>
              {innings.wickets} of {state.maxWickets} down
            </div>
          </div>
        )}
      </div>

      {target != null && (
        <div className="mt-3">
          {/* The chase belongs to the side batting it, so the meter carries
              their colour rather than gold — which stays the action colour. */}
          <ProMeter
            value={innings.runs}
            max={target}
            accent={bat.color}
            label="Chase progress"
            valueText={`${innings.runs} of ${target} runs`}
          />
        </div>
      )}

      {/* Full-bleed footer strip. Negative margins cancel ProPanel's padding
          so it meets the panel's own edges and inherits its bottom radius —
          one card, two registers, rather than a card stacked on a card. */}
      {footer && (
        <div
          className={`${compact ? "-mx-2.5 -mb-2.5 px-2.5 py-2" : "-mx-4 -mb-4 px-4 py-2.5"} mt-3 rounded-b-2xl`}
          style={{ borderTop: `1px solid ${PRO.line}`, background: "rgba(255,255,255,0.03)" }}
        >
          {footer}
        </div>
      )}
    </ProPanel>
  );
}

/**
 * Who is at the crease, and who is bowling at them.
 *
 * The single most-requested readout and the one thing the first broadcast pass
 * dropped: without it you cannot tell whose wicket just fell, who is set, or
 * how the current bowler is going. Derivations mirror hc-shared's
 * `CurrentPlayersBar` exactly — striker/non-striker come from the batting
 * team's `squadPlayerIds` indexed by `strikerIdx`/`nonStrikerIdx`, NOT from
 * the roster order, which is a different list.
 */
export function HcProPlayersBar({
  state,
  innings,
  selfId,
  players,
  compact = false,
}: {
  state: HcState;
  innings: HcInnings;
  selfId: string;
  /** Needed to resolve each side's identity colour. */
  players: Player[];
  compact?: boolean;
}) {
  const batSel = state.teamSelections[innings.battingPlayerId];
  const bowlSel = state.teamSelections[innings.bowlingPlayerId];
  const batRoster = batSel?.teamId ? getRosterFor(batSel.teamId, state.options.format) : null;
  const bowlRoster = bowlSel?.teamId ? getRosterFor(bowlSel.teamId, state.options.format) : null;
  const batPool: HcPlayerProfile[] = batRoster ? [...batRoster.squad, ...batRoster.extras] : [];
  const bowlPool: HcPlayerProfile[] = bowlRoster ? [...bowlRoster.squad, ...bowlRoster.extras] : [];

  const squad = batSel?.squadPlayerIds ?? [];
  const strikerId = squad[innings.strikerIdx];
  const nonStrikerId = squad[innings.nonStrikerIdx];
  const striker = strikerId ? batPool.find((p) => p.id === strikerId) : null;
  const nonStriker = nonStrikerId ? batPool.find((p) => p.id === nonStrikerId) : null;
  const strikerStats = strikerId ? innings.batterStats[strikerId] : null;
  const nonStrikerStats = nonStrikerId ? innings.batterStats[nonStrikerId] : null;

  const bowlerId = innings.currentBowlerId;
  const bowler = bowlerId ? bowlPool.find((p) => p.id === bowlerId) : null;
  const bowlerStats = bowlerId ? innings.bowlerStats[bowlerId] : null;

  // The two sides' identity colours. Batting owns the header and the two
  // batter cells; bowling owns the bowler cell — so the crease bar reads as
  // "these two versus that one" at a glance instead of three identical cells.
  const batSeat = state.playerOrder.indexOf(innings.battingPlayerId);
  const bowlSeat = state.playerOrder.indexOf(innings.bowlingPlayerId);
  const batColor = proTeam(state, innings.battingPlayerId, players, batSeat < 0 ? 0 : batSeat).color;
  const bowlColor = proTeam(state, innings.bowlingPlayerId, players, bowlSeat < 0 ? 1 : bowlSeat).color;

  const iBat = innings.battingPlayerId === selfId;
  const iBowl = innings.bowlingPlayerId === selfId;

  const batLine = (s: typeof strikerStats) =>
    s
      ? `${s.runs}${s.isOut ? "" : "*"} (${s.balls})${s.fours ? ` · ${s.fours}×4` : ""}${s.sixes ? ` · ${s.sixes}×6` : ""}`
      : "Yet to face";

  const stand = currentPartnership(innings);

  return (
    <ProPanel padded={false}>
      {/* Partnership header — the stand in progress. Cricket followers track
          this constantly and it had no home anywhere in the UI. Sits above the
          crease cells because it describes the pair BELOW it. */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-2"
        style={{
          borderBottom: `1px solid ${PRO.line}`,
          // Same innings accent as the score bug's rail, at a low alpha so it
          // reads as "this belongs to the batting side" without becoming a
          // second thing competing for attention.
          background: `linear-gradient(90deg, ${batColor}26, transparent 70%)`,
        }}
      >
        <ProLabel color={batColor}>Partnership · {ordinal(stand.forWicket + 1)} wicket</ProLabel>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-black tabular-nums" style={{ color: PRO.ink }}>
            {stand.runs}
          </span>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: PRO.inkLo }}>
            ({stand.balls} {stand.balls === 1 ? "ball" : "balls"})
          </span>
          {stand.balls >= 6 && (
            <span className="ml-1 text-[11px] font-bold tabular-nums" style={{ color: PRO.inkLo }}>
              RR {((stand.runs / stand.balls) * 6).toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Three columns on EVERY width, not just `sm` and up.
       *
       * On a phone this was `grid-cols-1`, so three short facts — a name and a
       * figure each — cost three stacked rows and ~150px of a column that has
       * roughly 500px to spend. Side by side they cost ~62px and read as one
       * line of crease state, which is how a scoreboard presents them. */}
      <div className="grid grid-cols-3">
        <CreaseCell
          label="Striker"
          onStrike
          mine={iBat}
          name={striker?.name ?? "—"}
          sub={batLine(strikerStats)}
          compact={compact}
          accent={batColor}
        />
        <CreaseCell
          label="Non-striker"
          mine={iBat}
          dim
          name={nonStriker?.name ?? "—"}
          sub={batLine(nonStrikerStats)}
          compact={compact}
          bordered
          accent={batColor}
        />
        <CreaseCell
          label="Bowling"
          mine={iBowl}
          name={bowler?.name ?? "Waiting…"}
          sub={
            bowler
              ? bowlerStats
                ? `${oversFromBalls(bowlerStats.balls)}–${bowlerStats.wickets}–${bowlerStats.runs}`
                : "0.0–0–0"
              : "Pick a bowler"
          }
          warn={!bowler}
          compact={compact}
          bordered
          accent={bowlColor}
        />
      </div>
    </ProPanel>
  );
}

function CreaseCell({
  label,
  name,
  sub,
  mine,
  dim = false,
  warn = false,
  onStrike = false,
  bordered = false,
  compact = false,
  accent,
}: {
  label: string;
  name: string;
  sub: string;
  mine: boolean;
  /** Side identity — batting colour for the two batters, bowling colour for
   *  the bowler. Carried on the label and a top rail, never on the figures. */
  accent?: string;
  dim?: boolean;
  warn?: boolean;
  onStrike?: boolean;
  bordered?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`min-w-0 ${compact ? "px-2 py-1.5" : "px-4 py-3"}`}
      style={{
        // Now that the cells are side by side at every width, the divider is
        // always the vertical one. The old `borderTop` existed only for the
        // stacked phone layout, which no longer happens.
        borderLeft: bordered ? `1px solid ${PRO.line}` : undefined,
      }}
    >
      {accent && (
        <div aria-hidden className="mb-1 h-[2px] w-6 rounded-full" style={{ background: accent }} />
      )}
      <div className="flex min-w-0 items-center gap-1">
        <ProLabel color={warn ? PRO.gold : accent ?? PRO.inkLo} className="truncate">
          {/* Three columns on a 390px phone leaves ~118px each — "Non-striker"
              does not fit beside a dot and a YOU tag, and truncating a LABEL
              to "Non-str…" is worse than shortening it deliberately. */}
          {compact && label === "Non-striker" ? "Non-str" : label}
        </ProLabel>
        {onStrike && (
          <>
            {/* Was a 5px span with `title` only — not exposed by most screen
                readers, unreachable by keyboard, and the sole indicator of who
                faces the next ball. The dot stays; the meaning is now text. */}
            <span
              aria-hidden
              className="inline-block rounded-full"
              style={{ width: 5, height: 5, background: PRO.win, boxShadow: `0 0 6px ${PRO.win}` }}
            />
            <span className="sr-only">on strike</span>
          </>
        )}
        {mine && <span className="text-[9px] font-black" style={{ color: PRO.gold, letterSpacing: "0.12em" }}>YOU</span>}
      </div>
      <div
        className={`mt-1 truncate font-black ${compact ? "text-[13px]" : "text-[15px]"}`}
        style={{ color: warn ? PRO.gold : dim ? PRO.inkMid : PRO.ink }}
      >
        {name}
      </div>
      <div className="mt-0.5 truncate text-[11px] font-semibold tabular-nums" style={{ color: PRO.inkLo }}>
        {sub}
      </div>
    </div>
  );
}

/**
 * Powerplay strip: which balls of this over restrict the bowler to 1-3.
 *
 * The pips are the point — knowing ball 4 is restricted BEFORE it is bowled is
 * what makes the phase strategic for both sides, so the advice line is
 * role-specific rather than a generic rule reminder.
 */
export function HcProPowerplay({
  overNumber,
  totalPowerplayOvers,
  restrictedBalls,
  currentBallInOver,
  bowlerRestricted,
  myRole,
  embedded = false,
}: {
  overNumber: number;
  totalPowerplayOvers: number;
  restrictedBalls: number[];
  currentBallInOver: number;
  bowlerRestricted: boolean;
  myRole: "batter" | "bowler" | null;
  /** Rendered inside the score bug's footer slot — drops its own frame so it
   *  is a strip within that card, not a card nested in a card. */
  embedded?: boolean;
}) {
  return (
    <div
      className={embedded ? "" : "rounded-2xl px-3.5 py-2.5"}
      style={
        embedded
          ? undefined
          : {
              background: `linear-gradient(135deg, rgba(245,196,81,0.16), rgba(245,196,81,0.05))`,
              border: `1px solid ${PRO.gold}55`,
              boxShadow: `0 0 18px ${PRO.gold}1F`,
            }
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <ProLabel color={PRO.gold}>Powerplay</ProLabel>
          <div className="mt-1 text-[12px] font-bold" style={{ color: PRO.inkMid }}>
            Over {overNumber} of {totalPowerplayOvers} · 3 random balls cap the bowler at 1–3
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6].map((b) => {
            const restricted = restrictedBalls.includes(b);
            const current = b === currentBallInOver;
            return (
              <span
                key={b}
                title={restricted ? `Ball ${b}: bowler capped at 1–3` : `Ball ${b}: no cap`}
                className="grid h-6 w-6 place-items-center rounded text-[10px] font-black tabular-nums"
                style={{
                  background: restricted ? (current ? PRO.gold : `${PRO.gold}66`) : "rgba(255,255,255,0.06)",
                  color: restricted ? "#2A1D05" : PRO.inkLo,
                  border: current ? `2px solid ${PRO.ink}` : `1px solid ${PRO.line}`,
                }}
              >
                {b}
              </span>
            );
          })}
        </div>
      </div>
      {bowlerRestricted && myRole === "bowler" && (
        <div className="mt-1.5 text-center text-[11px] font-extrabold" style={{ color: PRO.gold }}>
          This ball is capped — you may only pick 1, 2 or 3
        </div>
      )}
      {bowlerRestricted && myRole === "batter" && (
        <div className="mt-1.5 text-center text-[11px] font-extrabold" style={{ color: PRO.win }}>
          Bowler is capped at 1–3 this ball — 4, 5 or 6 scores risk-free
        </div>
      )}
    </div>
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
  compactRow = false,
}: {
  myPick: number | null;
  allowed: number[];
  restricted: boolean;
  role: "batter" | "bowler" | null;
  onPick: (n: number) => void;
  /** Phone density — still above the 44px touch floor. */
  compactRow?: boolean;
}) {
  const verb = role === "bowler" ? "Bowl" : "Play";

  /**
   * Value ramp on the tiles.
   *
   * In hand cricket the number IS the outcome, so six identical grey tiles
   * threw away the one piece of meaning the control already carries. The ramp
   * runs cool→hot with magnitude: 1–3 green (singles), 4–5 amber, 6 gold
   * (maximum). Deliberately keyed to VALUE, not to good/bad — the same tile
   * is a hope for the batter and a fear for the bowler, so a
   * success/danger reading would be wrong for one of them every ball.
   *
   * Colour is never the only code: the numeral is the label, and the capped
   * powerplay tiles keep their strike-through rule mark.
   */
  const valueTint = (n: number): string =>
    n >= 6 ? PRO.gold : n >= 4 ? "#E0982A" : PRO.win;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <ProLabel color={myPick != null ? PRO.inkLo : PRO.gold}>
          {myPick != null ? "Locked in" : role === "batter" ? "Your shot" : role === "bowler" ? "Your delivery" : "Watching"}
        </ProLabel>
        {restricted && <ProChip tone="gold">Powerplay · 1–3 only</ProChip>}
      </div>

      {/*
       * THE HERO. This is the entire game — one tap among six, sixty times a
       * match — and it previously rendered as the smallest, dimmest element on
       * a page of statistics, below a toss picker used once. Size now follows
       * frequency and consequence: tall tiles, large numerals, and a gold
       * treatment on the live state.
       */}
      <div role="group" aria-label={role === "bowler" ? "Choose your delivery" : "Choose your shot"}>
        <div className="grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const ok = allowed.includes(n);
            const chosen = myPick === n;
            const disabled = !ok || myPick != null || role == null;
            const capped = !ok && restricted;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onPick(n)}
                disabled={disabled}
                // Screen readers previously heard six buttons named "1".."6"
                // with no indication of what they do or why one is unavailable.
                aria-label={
                  capped
                    ? `${n}. Unavailable — powerplay caps you at 1 to 3`
                    : chosen
                    ? `${n} locked in`
                    : `${verb} ${n}`
                }
                aria-pressed={chosen}
                className="relative grid place-items-center rounded-2xl font-black tabular-nums transition active:scale-[0.96] disabled:cursor-not-allowed"
                style={{
                  // 64px floor clears the 44px touch minimum with room to spare
                  // on the axis a thumb actually travels.
                  minHeight: compactRow ? 56 : 64,
                  fontSize: compactRow ? 24 : 28,
                  background: chosen
                    ? `linear-gradient(168deg, ${PRO.gold}, ${PRO.goldDeep})`
                    : ok
                    // Tinted from the tile's own value rather than a flat
                    // white wash — low alpha so six lit tiles read as one
                    // ramp, not six competing buttons.
                    ? `linear-gradient(168deg, ${valueTint(n)}2E, ${valueTint(n)}0F)`
                    : "rgba(255,255,255,0.03)",
                  color: chosen ? "#2A1D05" : ok ? PRO.ink : PRO.inkLo,
                  border: `1px solid ${chosen ? "rgba(255,235,180,0.6)" : ok ? `${valueTint(n)}66` : PRO.line}`,
                  boxShadow: chosen ? `0 4px 18px ${PRO.gold}44` : "none",
                  // Was 0.3, which put a capped tile near 1.5:1 and defeated
                  // this row's own reason for keeping them on screen. The cap
                  // is now carried by a rule mark, not by fading it out.
                  opacity: disabled && !chosen ? 0.62 : 1,
                }}
              >
                {n}
                {capped && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-3 top-1/2 h-[2px] -translate-y-1/2 rotate-[-18deg] rounded-full"
                    style={{ background: PRO.gold, opacity: 0.7 }}
                  />
                )}
              </button>
            );
          })}
        </div>
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
  compact = false,
}: {
  reveal: HcBall | null;
  meIsBatter: boolean;
  myPick: number | null;
  oppLockedIn: boolean;
  /** Phone density: the plates and padding shrink so this panel stops eating
   *  ~180px of column for two numerals. */
  compact?: boolean;
}) {
  const plate = compact ? 48 : 64;
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
      <div className={`flex flex-col items-center ${compact ? "gap-1.5 py-0.5" : "gap-2.5 py-2"}`}>
        <div className="flex items-center gap-4">
          <RevealNum n={mine} label="You" tone={PRO.info} size={plate} />
          <span className="text-[11px] font-black" style={{ color: PRO.inkLo }}>V</span>
          <RevealNum n={theirs} label="Them" tone={PRO.loss} size={plate} />
        </div>
        <div className={compact ? "text-[15px] font-black uppercase" : "text-[18px] font-black uppercase"} style={{ letterSpacing: "0.1em", color: tone }}>
          {headline}
        </div>
      </div>
    );
  }
  return (
    <div className={`flex flex-col items-center ${compact ? "gap-1.5 py-1" : "gap-2 py-4"}`}>
      <div className="flex items-center gap-4">
        <RevealNum n={myPick} label="You" tone={PRO.info} hidden={myPick == null} size={plate} />
        <span className="text-[11px] font-black" style={{ color: PRO.inkLo }}>V</span>
        <RevealNum n={null} label="Them" tone={PRO.loss} hidden locked={oppLockedIn} size={plate} />
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
  size = 64,
}: {
  n: number | null;
  label: string;
  tone: string;
  hidden?: boolean;
  locked?: boolean;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="grid place-items-center rounded-2xl font-black tabular-nums"
        style={{
          width: size,
          height: size,
          // Numeral scales with the plate so the two stay proportional.
          fontSize: Math.round(size * 0.47),
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
  // Both already existed and were used only by the nostalgia skin — this is
  // the first slice of converging the two.
  const margin = summarizeMatch(state);
  const motm = computeManOfTheMatch(state, players);

  return (
    /*
     * RESULT AS A BAND, NOT A TOWER.
     *
     * The old summary was an 820px column centred in a 1900px viewport: two
     * thirds of the screen was empty while the scorecards — the thing a
     * cricket player actually reads after a match — were pushed below the fold
     * and clipped mid-table.
     *
     * It also printed both innings totals twice: once as big numerals in the
     * result card, and again in each scorecard header immediately below. The
     * band now states only what the scorecards CANNOT (who won, by how much,
     * player of the match) and hands the totals to the cards that own them.
     */
    <div className="mx-auto w-full">
      <ProPanel glow className="mb-3">
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-6">
          {/* Verdict */}
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
              style={{
                background: tie ? "rgba(255,255,255,0.06)" : `${PRO.gold}22`,
                border: `1px solid ${tie ? PRO.line : `${PRO.gold}66`}`,
                color: tie ? PRO.inkMid : PRO.gold,
              }}
            >
              <IconTrophy size={20} />
            </span>
            <div className="min-w-0">
              <ProLabel className="mb-1">Match complete</ProLabel>
              <div
                className="truncate text-[22px] font-black leading-none"
                style={{ color: tie ? PRO.ink : iWon ? PRO.gold : PRO.ink }}
              >
                {tie ? "Match tied" : iWon ? "You win" : `${winnerName} wins`}
              </div>
              {margin && (
                <div className="mt-1.5 text-[13px] font-bold" style={{ color: PRO.inkMid }}>
                  {margin}
                </div>
              )}
            </div>
          </div>

          {/* Player of the match takes the middle, where the width used to be
              empty — it is the one honour the scorecards below cannot show. */}
          {motm && (
            <div
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3.5 py-2.5"
              style={{ background: `${PRO.gold}14`, border: `1px solid ${PRO.gold}44` }}
            >
              <span className="shrink-0" style={{ color: PRO.gold }}><IconTrophy size={18} /></span>
              <div className="min-w-0">
                <ProLabel color={PRO.gold}>Player of the match</ProLabel>
                <div className="mt-1 truncate text-[13px] font-black" style={{ color: PRO.ink }}>
                  {motm.name}
                  <span className="ml-1.5 text-[11px] font-bold" style={{ color: PRO.inkLo }}>
                    {motm.teamShort}
                  </span>
                </div>
                <div className="truncate text-[11px] font-semibold tabular-nums" style={{ color: PRO.inkMid }}>
                  {motm.line}
                </div>
              </div>
            </div>
          )}

          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="shrink-0 rounded-xl px-6 py-3 text-[12px] font-extrabold uppercase transition active:scale-[0.98]"
              style={{
                letterSpacing: "0.14em",
                background: `linear-gradient(168deg, ${PRO.gold}, ${PRO.goldDeep})`,
                color: "#2A1D05",
              }}
            >
              Continue
            </button>
          )}
        </div>
      </ProPanel>

      <div className="grid gap-3 lg:grid-cols-2">
        {i1 && <HcProScorecard state={state} innings={i1} players={players} />}
        {i2 && <HcProScorecard state={state} innings={i2} players={players} />}
      </div>
    </div>
  );
}

/* `InningsTotal` lived here. Deleted rather than left orphaned: it printed
   each side's total in the result card, directly above scorecards whose own
   headers print the same total — the duplication the band redesign removed. */

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
    return (id: string) => m.get(id) ?? prettyName(id);
  }, [teamId, bowlTeamId, state.options.format]);

  const batters = Object.entries(innings.batterStats).filter(([, s]) => s.balls > 0 || s.isOut);
  const bowlers = Object.entries(innings.bowlerStats).filter(([, s]) => s.balls > 0);

  return (
    // Same innings-identity wash as the live score bug, so a card is
    // recognisably one side's innings before you read a name.
    <ProPanel
      style={{
        backgroundImage: `radial-gradient(120% 100% at 0% 0%, ${bat.color}1F, transparent 60%)`,
      }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <TeamPlate team={bat} size="sm" />
        <div className="min-w-0 flex-1">
          <ProLabel color={bat.color}>Innings {innings.number}</ProLabel>
          <div className="mt-1 truncate text-[13px] font-black tabular-nums" style={{ color: PRO.ink }}>
            {innings.runs}/{innings.wickets}
            <span className="ml-1.5 text-[11px] font-bold" style={{ color: PRO.inkLo }}>
              ({oversFromBalls(innings.balls)} ov)
            </span>
          </div>
        </div>
        {/* How the innings ended. The engine has always recorded this and the
            nostalgia skin shows it; broadcast never did, so you could not tell
            a chase completed from an innings that simply ran out of overs. */}
        {innings.endedReason && (
          <ProChip tone={innings.endedReason === "chased" ? "win" : "neutral"}>
            {innings.endedReason === "allOut"
              ? "All out"
              : innings.endedReason === "chased"
              ? "Target chased"
              : "Overs up"}
          </ProChip>
        )}
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
              <th className="pb-1 text-right font-bold tabular-nums">SR</th>
            </tr>
          </thead>
          <tbody>
            {batters.length === 0 && (
              <tr><td colSpan={6} className="py-2 text-center" style={{ color: PRO.inkLo }}>No batting yet</td></tr>
            )}
            {batters.map(([id, s]) => {
              const sr = strikeRate(s.runs, s.balls);
              return (
                <tr key={id} style={{ borderTop: `1px solid ${PRO.line}` }}>
                  <td className="py-1.5 pr-2 font-semibold" style={{ color: s.isOut ? PRO.inkMid : PRO.ink }}>
                    <span className="block max-w-[130px] truncate">
                      {nameOf(id)}
                      {!s.isOut && <span style={{ color: PRO.win }}> *</span>}
                    </span>
                  </td>
                  <td className="py-1.5 text-right font-black tabular-nums" style={{ color: PRO.ink }}>{s.runs}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>{s.balls}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>{s.fours}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>{s.sixes}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>
                    {sr == null ? "—" : sr.toFixed(0)}
                  </td>
                </tr>
              );
            })}
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
              <th className="pb-1 text-right font-bold tabular-nums">Econ</th>
            </tr>
          </thead>
          <tbody>
            {bowlers.length === 0 && (
              <tr><td colSpan={5} className="py-2 text-center" style={{ color: PRO.inkLo }}>No bowling yet</td></tr>
            )}
            {bowlers.map(([id, s]) => {
              const econ = economy(s.runs, s.balls);
              return (
                <tr key={id} style={{ borderTop: `1px solid ${PRO.line}` }}>
                  <td className="py-1.5 pr-2 font-semibold" style={{ color: PRO.ink }}>
                    <span className="block max-w-[130px] truncate">{nameOf(id)}</span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>
                    {oversFromBalls(s.balls)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>{s.runs}</td>
                  <td className="py-1.5 text-right font-black tabular-nums" style={{ color: s.wickets > 0 ? PRO.win : PRO.ink }}>
                    {s.wickets}
                  </td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: PRO.inkLo }}>
                    {econ == null ? "—" : econ.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Fall of wickets closes the card, after both tables.
          It sat BETWEEN batting and bowling before, which is where a printed
          scorecard puts it — but players read this as the two tables being
          unrelated and reported it as a layout bug. Batting then bowling is
          the pairing they expect; the wicket list is reference material they
          consult after, so it reads better as a footer than as a wedge. */}
      {innings.wickets > 0 && (
        <div className="mt-3">
          <ProLabel className="mb-1.5">Fall of wickets</ProLabel>
          <HcProFallOfWickets state={state} innings={innings} />
        </div>
      )}
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
  const isPowerplayOver = upcomingOver <= innings.powerplayOvers;
  // Balls bowled in the over currently in progress. `upcomingOver` is the over
  // the NEXT ball belongs to, which is the same over these balls are in.
  const thisOver = innings.history.filter((b) => b.overNumber === upcomingOver);

  /* Three mutually-exclusive action states, in the same precedence the
     notebook skin uses — a wicket blocks everything, then a missing bowler,
     then the live ball. Getting this order wrong deadlocks the match, so it
     deliberately mirrors hc-shared's InningsPhase. */
  /** True only when a delivery is actually awaiting picks. */
  const liveBall = !innings.needsNextBatterPick && !needsBowler;

  // The blocking pickers (wicket / new over). These REPLACE the reveal stage,
  // never the sticky pick footer — that only exists on a live ball.
  const blocking = innings.needsNextBatterPick ? (
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
      {needsBowler && <HcProBowlerPicker state={state} innings={innings} selfId={selfId} players={players} />}
    </>
  ) : needsBowler ? (
    <HcProBowlerPicker state={state} innings={innings} selfId={selfId} players={players} />
  ) : null;

  const revealPanel = (
    // On desktop this absorbs the leftover height so the deck reads as a full
    // screen rather than a column bunched at the top.
    <ProPanel dense={compact} className={compact ? "" : "flex flex-1 flex-col"}>
      <div className="mb-2 flex items-center justify-between">
        <ProLabel>
          {myRole === "batter" ? "You are batting" : myRole === "bowler" ? "You are bowling" : "Spectating"}
        </ProLabel>
        <span style={{ color: PRO.inkLo }}>
          {myRole === "batter" ? <IconBat size={14} /> : myRole === "bowler" ? <IconBall size={14} /> : null}
        </span>
      </div>
      <div className={compact ? "" : "flex flex-1 items-center justify-center"}>
        <HcProReveal reveal={reveal} meIsBatter={myRole === "batter"} myPick={myPick} oppLockedIn={oppLockedIn} compact={compact} />
      </div>
    </ProPanel>
  );

  /**
   * The pick row, pinned.
   *
   * Sticky on BOTH breakpoints, for two different failures it fixes:
   *   - desktop 1280×720, where the clipped column could push it off-screen
   *     entirely with no scrollbar to reveal it;
   *   - phones, where it sat ~600px down the page behind the score bug,
   *     powerplay strip and a three-row crease bar.
   * The one control that advances the match is now always on screen.
   */
  const pickFooter = liveBall ? (
    <div
      // No negative margin: this sits inside an `overflow-y-auto` column, and
      // `-mx-1` pushed the child past the content box, which produced a
      // horizontal scrollbar across the whole left deck.
      className="sticky bottom-0 z-20 pt-2"
      style={{
        paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))",
        background: `linear-gradient(to top, ${PRO.bg0} 62%, transparent)`,
      }}
    >
      <ProPanel dense={compact}>
        {/* On a phone the reveal lives INSIDE this card.
         *
         * Picking and seeing the result are one interaction, and splitting
         * them across two bordered cards meant the outcome plate sat a screen
         * away from the tiles that produced it — you tapped a number, then
         * scrolled to find out what happened. Inline, the card reads top to
         * bottom as: what you threw → what to throw. Desktop keeps them apart,
         * where there is room for the reveal to be a stage of its own. */}
        {compact && (
          <div className="mb-2 pb-2" style={{ borderBottom: `1px solid ${PRO.line}` }}>
            <HcProReveal
              reveal={reveal}
              meIsBatter={myRole === "batter"}
              myPick={myPick}
              oppLockedIn={oppLockedIn}
              compact
            />
          </div>
        )}
        <HcProPickRow
          myPick={myPick}
          allowed={allowed}
          restricted={bowlerRestricted}
          role={myRole}
          onPick={pick}
          compactRow={compact}
        />
      </ProPanel>
    </div>
  ) : null;

  // Merged into the score bug's footer rather than standing as its own card:
  // powerplay IS innings state, and a second bordered box under the score cost
  // a border, a gap and a corner radius of phone height for no separation the
  // reader needed.
  const powerplay = isPowerplayOver && !needsBowler ? (
    <HcProPowerplay
      overNumber={upcomingOver}
      totalPowerplayOvers={innings.powerplayOvers}
      restrictedBalls={restrictedThisOver}
      currentBallInOver={upcomingBall}
      bowlerRestricted={isRestrictedNow}
      myRole={myRole}
      embedded
    />
  ) : null;

  const crease = (
    <HcProPlayersBar state={state} innings={innings} selfId={selfId} players={players} compact={compact} />
  );

  /**
   * Spoken match commentary for screen readers.
   *
   * The board previously had NO live region at all — the only one in the game
   * belonged to the nostalgia celebration overlay, so a screen-reader user
   * heard "Kohli sends it out of the park!" but never the score, never "out",
   * and never the target. This announces the substance of each delivery, then
   * the state that follows it.
   *
   * `polite` so it queues behind the user's own actions rather than cutting
   * across them, and keyed on ball count so it fires once per delivery.
   */
  const spoken = (() => {
    if (!reveal) return "";
    const outcome = reveal.wicket
      ? "Out."
      : `${reveal.runs} run${reveal.runs === 1 ? "" : "s"}.`;
    const chase =
      target != null
        ? ` Need ${Math.max(0, target - innings.runs)} from ${innings.overs * 6 - innings.balls} balls.`
        : "";
    return `${outcome} ${innings.runs} for ${innings.wickets}, ${oversFromBalls(innings.balls)} overs.${chase}`;
  })();

  // Phone: one column. Reference material (ticker, fall of wickets) now sits
  // ABOVE the action rather than below it — it was previously the only thing
  // between the pick row and the bottom of a very long scroll, which is
  // exactly backwards: you glance at the log, you act on the picks.
  if (compact) {
    return (
      <div className="flex min-h-full flex-col gap-3">
        <p aria-live="polite" aria-atomic="true" className="sr-only">{spoken}</p>
        <HcProScoreBug
          state={state}
          innings={innings}
          target={target}
          players={players}
          compact
          footer={powerplay}
        />

        {/* Requested order: reveal → crease → log.
            1. YOU ARE BATTING  — the live ball
            2. PARTNERSHIP      — who is at the crease
            3. THIS INNINGS     — the log
            The pick row stays pinned to the bottom regardless, so the control
            is still under the thumb even though the reveal now sits up top.

            The reveal is NOT rendered here any more — on a phone it lives
            inside the pinned pick card, beside the tiles that produce it. */}
        {blocking}

        {crease}

        {/* The log, as ONE line.
         *
         * A full panel with a heading, a ticker, a recent-form row and a
         * fall-of-wickets list is reference material: you glance at it between
         * deliveries, never during one. At ~150px it was pushing the live
         * state off a 844px screen. Collapsed to a single tappable strip that
         * expands only when you want it. */}
        <details className="group">
          <summary
            className="flex cursor-pointer list-none items-center justify-between rounded-2xl px-3 py-2"
            style={{
              background: `linear-gradient(168deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015)), ${PRO.panel}`,
              border: `1px solid ${PRO.line}`,
            }}
          >
            <ProLabel>This innings</ProLabel>
            <span className="flex items-center gap-2">
              <HcProBallTicker history={innings.history} max={5} />
              <span className="text-[11px] font-black" style={{ color: PRO.inkLo }}>
                <span className="group-open:hidden">▾</span>
                <span className="hidden group-open:inline">▴</span>
              </span>
            </span>
          </summary>
          <ProPanel dense className="mt-2">
            <HcProBallTicker history={innings.history} max={18} />
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${PRO.line}` }}>
              <HcProRecentForm innings={innings} />
            </div>
            {innings.wickets > 0 && (
              <>
                <ProLabel className="mb-2 mt-4">Fall of wickets</ProLabel>
                <HcProFallOfWickets state={state} innings={innings} compact />
              </>
            )}
          </ProPanel>
        </details>

        {/* Absorbs leftover height so nothing floats mid-screen when the
            column is shorter than the viewport. */}
        <div className="flex-1" />
        {pickFooter}
      </div>
    );
  }

  // Desktop: a broadcast control room. The match state everyone watches holds
  // the wide left column; the reference material a player only glances at
  // (over log, bowling figures) lives in a fixed rail so the action column
  // never has to stretch across a 2560px monitor to fill it.
  return (
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      {/*
       * `overflow-y-auto` is the P0 fix: the shell clips this region
       * (`overflow-hidden` while live), and only the rail had a scroller. At
       * 1280×720 during a powerplay over the column out-measured the clip box
       * and the bottom of the pick row was simply gone, with no scrollbar. The
       * scroller plus the sticky footer means it can no longer be lost.
       */}
      <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden pr-0.5">
        <p aria-live="polite" aria-atomic="true" className="sr-only">{spoken}</p>
        <HcProScoreBug
          state={state}
          innings={innings}
          target={target}
          players={players}
          footer={powerplay}
        />
        {crease}
        {blocking}
        {liveBall && revealPanel}
        {pickFooter}
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <ProPanel>
          <ProLabel className="mb-2">This over</ProLabel>
          <HcProBallTicker history={thisOver} max={6} />
          <ProLabel className="mb-2 mt-4">This innings</ProLabel>
          <HcProBallTicker history={innings.history} max={24} />
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${PRO.line}` }}>
            <HcProRecentForm innings={innings} />
          </div>
        </ProPanel>
        {/* Bowling before fall of wickets, matching the scorecard above. */}
        <HcProBowlingFigures state={state} innings={innings} />
        <ProPanel>
          <ProLabel className="mb-2">Fall of wickets</ProLabel>
          <HcProFallOfWickets state={state} innings={innings} />
        </ProPanel>
      </div>
    </div>
  );
}

/**
 * Fall of wickets — `1-13 (Gaikwad, 1.4)`.
 *
 * The line that tells the story of a collapse at a glance, and the one thing a
 * scorecard reader looks for after the totals. Reconstructed entirely from
 * ball history; nothing new is stored.
 */
export function HcProFallOfWickets({
  state,
  innings,
  compact = false,
}: {
  state: HcState;
  innings: HcInnings;
  compact?: boolean;
}) {
  const sel = state.teamSelections[innings.battingPlayerId];
  const roster = sel?.teamId ? getRosterFor(sel.teamId, state.options.format) : null;
  const pool: HcPlayerProfile[] = roster ? [...roster.squad, ...roster.extras] : [];
  const nameOf = (id: string) => pool.find((p) => p.id === id)?.name ?? prettyName(id);

  const fow = fallOfWickets(innings);
  if (fow.length === 0) {
    return (
      <div className="py-2 text-center text-[11px] font-semibold" style={{ color: PRO.inkLo }}>
        No wickets down
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {fow.map((w) => (
        <div key={w.wicket} className="flex items-baseline justify-between gap-2">
          <span className="shrink-0 text-[11px] font-black tabular-nums" style={{ color: PRO.loss }}>
            {w.wicket}–{w.score}
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-[11px] font-semibold" style={{ color: PRO.inkMid }}>
            {compact ? nameOf(w.batterId).split(" ").slice(-1)[0] : nameOf(w.batterId)}
            <span className="tabular-nums" style={{ color: PRO.inkLo }}> · {w.over}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** "Last 5 overs: 38 runs, 1 wicket" — the momentum readout during a chase. */
export function HcProRecentForm({ innings, overs = 5 }: { innings: HcInnings; overs?: number }) {
  const form = lastOvers(innings, overs);
  if (form.balls === 0) return null;
  const rate = (form.runs / form.balls) * 6;
  return (
    <div className="flex items-center justify-between gap-2">
      <ProLabel>Last {Math.min(overs, Math.ceil(form.balls / 6))} ov</ProLabel>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[13px] font-black tabular-nums" style={{ color: PRO.ink }}>
          {form.runs}
        </span>
        <span className="text-[10px] font-bold tabular-nums" style={{ color: PRO.inkLo }}>
          / {form.wickets} wkt{form.wickets === 1 ? "" : "s"} · RR {rate.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

/** Bowling figures for the innings — the rail's reference panel. */
export function HcProBowlingFigures({ state, innings }: { state: HcState; innings: HcInnings }) {
  const sel = state.teamSelections[innings.bowlingPlayerId];
  const roster = sel?.teamId ? getRosterFor(sel.teamId, state.options.format) : null;
  const pool: HcPlayerProfile[] = roster ? [...roster.squad, ...roster.extras] : [];
  const rows = Object.entries(innings.bowlerStats).filter(([, s]) => s.balls > 0);

  return (
    <ProPanel>
      <ProLabel className="mb-2">Bowling</ProLabel>
      {rows.length === 0 ? (
        <div className="py-2 text-center text-[11px] font-semibold" style={{ color: PRO.inkLo }}>
          No overs bowled yet
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map(([id, s]) => {
            const name = pool.find((p) => p.id === id)?.name ?? prettyName(id);
            const current = innings.currentBowlerId === id;
            return (
              <div
                key={id}
                className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
                style={{
                  background: current ? "rgba(245,196,81,0.10)" : "rgba(255,255,255,0.035)",
                  border: `1px solid ${current ? `${PRO.gold}55` : PRO.line}`,
                }}
              >
                <span className="min-w-0 flex-1 truncate text-[11px] font-bold" style={{ color: PRO.ink }}>
                  {name}
                </span>
                <span className="shrink-0 text-[11px] font-black tabular-nums" style={{ color: PRO.inkMid }}>
                  {oversFromBalls(s.balls)}–{s.wickets}–{s.runs}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </ProPanel>
  );
}

/** Side accent helper for shells that need one. */
export function hcSide(seat: number): ProSide {
  return PRO_SIDES[seat % PRO_SIDES.length];
}
