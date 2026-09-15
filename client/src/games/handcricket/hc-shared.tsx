import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type {
  ChatMessage,
  HcBall,
  HcBatterStats,
  HcBowlerStats,
  HcCountry,
  HcFranchise,
  HcInnings,
  HcState,
  HcTeamId,
  Player,
} from "@shared/types";
import {
  HC_COUNTRIES,
  HC_FRANCHISES,
  evaluateSquadComposition,
  getRosterFor,
  type HcPlayerProfile,
} from "@shared/hc-rosters";
import {
  getJsonTeamMeta,
  getJsonPlayerStyleMap,
  getJsonPlayers,
  type JsonPlayerStyle,
} from "./hc-json-data";
import { HC_MAX_OVERS_PER_BOWLER } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { useRoomStore } from "../../store/roomStore";
import { deriveTerminalMatchId } from "../../lib/economyMotionTriggers";
import { useMatchSettlement, winnerPrizesFor } from "../../hooks/useMatchSettlement";
import PrizeWonChip from "../../components/economy/PrizeWonChip";
import PlayerSettlementSummary from "../../components/economy/PlayerSettlementSummary";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import {
  RoughBorder,
  HcSketchHeading,
  MaskingTapeCorner,
  StumpsInGrassSketch,
  CricketBallStitchSketch,
  BallInMotionIcon,
  PaperclipGraphic,
  CurledCornerFold,
  HcRibbonBanner,
} from "./hc-notebook";
import {
  PaperPanel,
  PaperButton,
  PaperCard,
  PaperBadge,
  SketchHeading,
  ROLE_BADGE_TONE,
  ROLE_BADGE_LABEL,
} from "../../components/paper";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { useHcCelebrationEvents, type HcCelebrationData } from "./useHcCelebrationEvents";
import { HcScorecardFX } from "./animations3d/scorecard/HcScorecardFX";
import { Hc3DCelebrationLayer } from "./animations3d/Hc3DCelebrationLayer";

/**
 * Shared props for every Hand Cricket shell (picker, mobile, desktop).
 * Identical to what Room.tsx forwards.
 */
export interface HandCricketBoardProps {
  state: HcState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
  /** Leaves the room. Threaded from Room.tsx so the fixed-viewport notebook
   *  shell can render its own Leave control (Room.tsx's header is covered by
   *  the z-50 notebook overlay). */
  onLeave?: () => void;
  /** Called when the end-of-match scorecard is dismissed (Continue button or
   *  the 90 s auto-advance). Room.tsx shows the GameOverScreen only after this,
   *  so the scorecard isn't blown away within a second of the match ending. */
  onScorecardClose?: () => void;
}

const HAND_FACES = ["", "☝️", "✌️", "🤟", "🖖", "🖐️", "✊"];
const COUNTRY_LIST: HcCountry[] = [
  "india", "australia", "england", "newzealand", "southafrica",
  "pakistan", "westindies", "srilanka", "bangladesh", "afghanistan",
  "ireland", "zimbabwe",
];
const FRANCHISE_LIST: HcFranchise[] = [
  "csk", "mi", "rcb", "kkr", "srh", "dc", "pbks", "rr", "gt", "lsg",
];

const ROLE_ORDER: Record<HcPlayerProfile["role"], number> = {
  batter: 0, keeper: 1, allrounder: 2, bowler: 3,
};

export function teamLabel(state: HcState, playerId: string, players: Player[]): {
  flag: string;
  short: string;
  name: string;
  playerName: string;
  color?: string;
} {
  const teamId = state.teamSelections[playerId]?.teamId;
  const playerName = players.find((p) => p.id === playerId)?.name ?? useRoomStore.getState().knownPlayers[playerId]?.name ?? "?";
  if (!teamId) return { flag: "❓", short: "?", name: "Choosing…", playerName };
  const country = (HC_COUNTRIES as Record<string, typeof HC_COUNTRIES.india | undefined>)[teamId];
  if (country) {
    return { flag: country.flag, short: country.short, name: country.name, playerName };
  }
  const franchise = (HC_FRANCHISES as Record<string, typeof HC_FRANCHISES.csk | undefined>)[teamId];
  if (franchise) {
    return {
      flag: "🏟️",
      short: franchise.short,
      name: franchise.name,
      playerName,
      color: franchise.color,
    };
  }
  return { flag: "🏳️", short: String(teamId).slice(0, 3).toUpperCase(), name: String(teamId), playerName };
}

export function MatchHeader({
  state,
  players,
  selfId,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
}) {
  const [p0, p1] = state.playerOrder;
  const t0 = teamLabel(state, p0, players);
  const t1 = teamLabel(state, p1, players);
  const formatLabel =
    state.options.format === "test" ? "Test · 30 overs"
    : state.options.format === "odi" ? "ODI · 15 overs"
    : "T20 · 10 overs";
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-extrabold tracking-[0.2em] text-emerald-200 uppercase">🏏 Hand Cricket</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-700/60 text-amber-100 font-bold">
          {formatLabel}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-700/60 text-cyan-100 font-bold">
          {state.options.category === "international" ? "International" : "IPL"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm font-bold">
        <TeamChip flag={t0.flag} short={t0.short} playerName={t0.playerName} isSelf={p0 === selfId} />
        <span className="text-emerald-300 text-xs">vs</span>
        <TeamChip flag={t1.flag} short={t1.short} playerName={t1.playerName} isSelf={p1 === selfId} />
      </div>
    </div>
  );
}

export function TeamChip({
  flag,
  short,
  playerName,
  isSelf,
}: {
  flag: string;
  short: string;
  playerName: string;
  isSelf: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{
        background: isSelf ? "rgba(252,211,77,0.25)" : "rgba(0,0,0,0.3)",
        border: `1px solid ${isSelf ? "#fbbf24" : "rgba(255,255,255,0.15)"}`,
        color: "#ecfdf5",
      }}
    >
      <span>{flag}</span>
      <span>{short}</span>
      <span className="opacity-70">({playerName})</span>
    </span>
  );
}

export function TeamSelectPhase({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const mySelection = state.teamSelections[selfId];
  // `forceTeamPicker` is local-only. Clicking "Change team" inside the squad
  // picker can't actually clear the server state (selectTeam expects a teamId
  // and re-emitting the same one wouldn't navigate anywhere). So we override
  // the view client-side and reset the override the instant the user picks a
  // team — letting the normal flow resume.
  const [forceTeamPicker, setForceTeamPicker] = useState(false);
  const prevTeamIdRef = useRef<string | null | undefined>(mySelection?.teamId);
  useEffect(() => {
    const prev = prevTeamIdRef.current;
    const next = mySelection?.teamId ?? null;
    if (forceTeamPicker && next && next !== prev) {
      setForceTeamPicker(false);
    }
    prevTeamIdRef.current = next;
  }, [mySelection?.teamId, forceTeamPicker]);

  // Two-step flow: pick team first, then pick squad.
  if (!mySelection?.teamId || forceTeamPicker) {
    return <TeamPicker state={state} selfId={selfId} players={players} />;
  }
  if (mySelection.squadPlayerIds == null) {
    return (
      <SquadPicker
        state={state}
        selfId={selfId}
        players={players}
        onChangeTeam={() => setForceTeamPicker(true)}
      />
    );
  }
  return <WaitingForOpponentSquad state={state} selfId={selfId} players={players} />;
}

export function TeamPicker({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppPick = state.teamSelections[oppId]?.teamId ?? null;
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";
  const isIpl = state.options.category === "ipl";

  function pick(teamId: HcTeamId) {
    getSocket().emit("game:move", { type: "selectTeam", data: { teamId } });
  }

  if (isIpl) {
    return (
      <div className="bg-emerald-950/50 rounded-lg p-4 space-y-3">
        <div className="text-center text-emerald-100 font-bold">
          Pick your IPL franchise (2026 season)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {FRANCHISE_LIST.map((id) => {
            const f = HC_FRANCHISES[id];
            const meta = getJsonTeamMeta(id, state.options.format);
            const isOpp = oppPick === id;
            return (
              <button
                key={id}
                onClick={() => pick(id)}
                className="relative rounded-lg p-3 border-2 transition flex flex-col items-center gap-1 border-slate-700 bg-slate-900/40 hover:scale-105"
                style={{ borderColor: oppPick === id ? "#06b6d4" : undefined }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold"
                  style={{ background: f.color, color: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
                >
                  {f.short}
                </div>
                <span className="text-xs font-bold text-slate-100 text-center leading-tight">
                  {f.name}
                </span>
                {meta?.homeCity && (
                  <span className="text-[9px] text-slate-400 leading-tight">📍 {meta.homeCity}</span>
                )}
                {meta?.coach && (
                  <span className="text-[9px] text-slate-400 leading-tight">🎽 {meta.coach}</span>
                )}
                {isOpp && (
                  <span className="absolute top-1 left-1 text-[9px] bg-cyan-600 text-white rounded px-1 font-extrabold truncate max-w-[80%]">
                    {oppName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="text-center text-xs text-emerald-300/80">
          Same franchise? No problem — we'll show it as{" "}
          <span className="text-amber-300">CSK(Sri Krishna) vs CSK(Radha)</span>.
        </div>
      </div>
    );
  }

  // International country picker.
  return (
    <div className="bg-emerald-950/50 rounded-lg p-4 space-y-3">
      <div className="text-center text-emerald-100 font-bold">
        Pick the country you'll represent
      </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {COUNTRY_LIST.map((id, idx) => {
          const profile = HC_COUNTRIES[id];
          const jsonPlayers = getJsonPlayers(id, state.options.format);
          const hasRoster = profile.squads[state.options.format].length > 0 || jsonPlayers.length > 0;
          const isOpp = oppPick === id;
          const meta = getJsonTeamMeta(id, state.options.format);
          const isMobileOnly = idx >= COUNTRY_LIST.length - 2; // last two teams visible only on small screens
          return (
            <button
              key={id}
              onClick={() => hasRoster && pick(id)}
              disabled={!hasRoster}
              className={`relative rounded-lg p-3 border-2 transition flex flex-col items-center gap-1 ${
                hasRoster
                  ? "border-slate-700 bg-slate-900/40 hover:border-emerald-400 hover:scale-105"
                  : "border-slate-800 bg-slate-900/20 opacity-50 cursor-not-allowed"
              } ${isMobileOnly ? "lg:hidden" : ""}`}
            >
              <span className="text-3xl">{profile.flag}</span>
              <span className="text-xs font-bold text-slate-100">{profile.name}</span>
              <span className="text-[10px] text-slate-400">{profile.short}</span>
              {meta?.coach && (
                <span className="text-[9px] text-slate-400 leading-tight">🎽 {meta.coach}</span>
              )}
              {!hasRoster && (
                <span className="text-[9px] text-amber-300 italic">No roster yet</span>
              )}
              {isOpp && (
                <span className="absolute top-1 left-1 text-[9px] bg-cyan-600 text-white rounded px-1 font-extrabold truncate max-w-[60%]">
                  {oppName}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-center text-xs text-emerald-300/80">
        Same country? No problem — we'll show it as{" "}
        <span className="text-amber-300">India(Sri Krishna) vs India(Radha)</span>.
      </div>
    </div>
  );
}

// ── Notebook palette (squad picker section) ──────────────────────────────
const PAPER   = "#F5E9C4";
const PAPER_L = "#FBF5E0";
const INK     = "#1a2952";
const INK_LT  = "#4a5a82";
const BORDER  = "rgba(46,40,25,0.50)";
const STAMP_G = "#166534";
const STAMP_A = "#92400e";
const GOLD    = "#C5963A";

const _ROLE_COLORS: Record<HcPlayerProfile["role"], string> = {
  batter: "#166534", keeper: "#92400e", allrounder: "#6d28d9", bowler: "#991b1b",
};
const _ROLE_LABELS: Record<HcPlayerProfile["role"], string> = {
  batter: "BAT", keeper: "WK", allrounder: "AR", bowler: "BOWL",
};

/* ── Squad sketchbook paper-physics helpers ──────────────────────────────
   All components below are local to the squad-picker section. They are
   intentionally not exported — they encode the "hand-drawn roster sheet"
   visual language and should never drift out of this context.
   ──────────────────────────────────────────────────────────────────────── */

/** Pencil-style hand-drawn checkmark — replaces the plain ✓ glyph on XI members. */
function PencilCheck({ size = 12, color = "#166534" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M1 6.5 L4.5 10 L11 2"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Role → border colour per the brief's strict coding (blue/orange/purple/red). */
const SKETCH_ROLE: Record<HcPlayerProfile["role"], { label: string; color: string }> = {
  batter:     { label: "BAT",  color: "#1d4ed8" }, // blue
  keeper:     { label: "WK",   color: "#c2410c" }, // orange
  allrounder: { label: "AR",   color: "#6d28d9" }, // purple
  bowler:     { label: "BOWL", color: "#991b1b" }, // red
};

/**
 * Square-edged, border-only role badge in the brief's strict colour coding.
 * Replaces the filled PaperBadge — border-only reads as hand-ruled ink box
 * rather than a production sticker.
 */
function SketchRoleBadge({ role, big = false }: { role: HcPlayerProfile["role"]; big?: boolean }) {
  const { label, color } = SKETCH_ROLE[role];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1.5px solid ${color}`,
        color,
        fontFamily: "'Kalam', cursive",
        fontWeight: 800,
        fontSize: big ? 9 : 7.5,
        padding: big ? "2px 5px" : "1px 4px",
        borderRadius: 2,
        letterSpacing: "0.04em",
        lineHeight: 1,
        background: `${color}12`,
      }}
    >
      {label}
    </span>
  );
}

/**
 * Thin sketch capsule status pill — border-only oval with a pencil checkmark
 * when the condition is satisfied. Used in CompositionChecklist.
 */
function SketchPill({ ok, label, count }: { ok: boolean; label: string; count: string }) {
  const clr = ok ? STAMP_G : "#b45309";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        border: `1.3px solid ${clr}`,
        borderRadius: 999,
        padding: "2px 9px 2px 7px",
        background: ok ? "rgba(22,101,52,0.06)" : "rgba(180,83,9,0.06)",
        fontFamily: "'Kalam', cursive",
        fontSize: 10,
        fontWeight: 800,
        color: clr,
        whiteSpace: "nowrap",
        lineHeight: 1.3,
      }}
    >
      {ok
        ? <PencilCheck size={9} color={clr} />
        : <span style={{ opacity: 0.45, fontSize: 11, lineHeight: 1 }}>·</span>
      }
      {label}{" "}<span style={{ fontSize: 9, opacity: 0.72 }}>({count})</span>
    </span>
  );
}

/**
 * Washi/masking-tape strip taped at the top corners of the squad sheet.
 * The two strips are intentionally misaligned (-3° / +4°) — real tape never
 * lands perfectly straight, and the asymmetry grounds the paper illusion.
 */
function TapeStrip({ right = false }: { right?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: -10,
        ...(right ? { right: 20 } : { left: 20 }),
        width: 44,
        height: 17,
        transform: `rotate(${right ? 4 : -3}deg)`,
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      <svg width={44} height={17} viewBox="0 0 44 17" fill="none">
        <rect x="0" y="0" width="44" height="17" rx="1.5" fill="rgba(245,228,168,0.82)" />
        {Array.from({ length: 10 }, (_, i) => (i + 1) * 4).map((x, wi) => (
          <line key={wi} x1={x} y1="0" x2={x} y2="17"
            stroke="rgba(170,130,40,0.09)" strokeWidth="1" />
        ))}
        <path d="M0 1 Q11 -0.6 22 1 Q33 -0.6 44 1"
          stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" fill="none" />
        <path d="M0 16 Q11 17.5 22 16 Q33 17.5 44 16"
          stroke="rgba(0,0,0,0.13)" strokeWidth="0.7" fill="none" />
      </svg>
    </div>
  );
}

/**
 * Compact cricket bat line-art doodle for the confirm button.
 * Handle at top with grip-tape wraps, blade body, and a faint grain line.
 */
function BatDoodleInline({ color = "#166534" }: { color?: string }) {
  return (
    <svg width={16} height={20} viewBox="0 0 16 20" fill="none" aria-hidden>
      <line x1="8" y1="1.5" x2="8" y2="5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6.5" y1="2.8" x2="9.5" y2="3.5" stroke={color} strokeWidth="0.65" strokeLinecap="round" opacity="0.55" />
      <line x1="6.5" y1="4.4" x2="9.5" y2="5.1" stroke={color} strokeWidth="0.65" strokeLinecap="round" opacity="0.55" />
      <path
        d="M5.5 5.5 Q5 7 5 10.5 Q5 16 7 18.5 Q8 19 9 18.5 Q11 16 11 10.5 Q11 7 10.5 5.5 Z"
        stroke={color} strokeWidth="1.3" fill="none" strokeLinejoin="round"
      />
      <line x1="8" y1="7" x2="8" y2="17" stroke={color} strokeWidth="0.5" strokeLinecap="round" opacity="0.28" />
    </svg>
  );
}

function PlayerCardMini({
  p,
  isSelected,
  isCaptain,
  onToggle,
  onCaptain,
  disabled,
  isLegend = false,
  big = false,
  style,
}: {
  p: HcPlayerProfile;
  isSelected: boolean;
  isCaptain: boolean;
  onToggle: () => void;
  onCaptain: () => void;
  disabled: boolean;
  isLegend?: boolean;
  big?: boolean;
  /** Rich player metadata from the JSON files (batting/bowling style). */
  style?: JsonPlayerStyle;
}) {
  const isDisabledLook = disabled && !isSelected;
  return (
    <div
      onClick={() => {
        if (!disabled || isSelected) onToggle();
      }}
      role="button"
      tabIndex={isDisabledLook ? -1 : 0}
      aria-pressed={isSelected}
      aria-label={p.name}
      className={cn(
        "relative rounded-xl transition-all select-none text-left flex flex-col justify-between overflow-hidden",
        big ? "p-3 min-h-[96px]" : "p-2 min-h-[80px]",
        isDisabledLook
          ? "opacity-40 bg-stone-100 border border-stone-200 cursor-not-allowed"
          : isCaptain
          ? "bg-gradient-to-br from-amber-50 to-amber-100/90 border-2 border-amber-500 shadow-md ring-2 ring-amber-400/40 cursor-pointer hover:shadow-lg active:scale-98"
          : isSelected
          ? "bg-white/95 border-2 border-emerald-600/80 shadow-xs hover:border-emerald-600 cursor-pointer hover:shadow-sm active:scale-98"
          : "bg-white/80 border border-stone-300 hover:border-stone-400 shadow-xs cursor-pointer hover:bg-white active:scale-98",
      )}
    >
      <div>
        {/* Badge row: Role badge + Captain status */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1 flex-wrap">
            <SketchRoleBadge role={p.role} big={big} />
            {isLegend && (
              <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-700 bg-amber-100/90 border border-amber-300 px-1 py-0.5 rounded leading-none">
                ★ Legend
              </span>
            )}
          </div>
          {isSelected && (
            <div className="flex items-center gap-1">
              {isCaptain ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-black tracking-wide text-white bg-amber-600 px-1.5 py-0.5 rounded-full shadow-xs">
                  ★ C
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCaptain();
                  }}
                  className="text-[9px] font-bold text-amber-800 bg-amber-100/90 hover:bg-amber-200 border border-amber-400 px-1.5 py-0.5 rounded-full transition cursor-pointer"
                  title="Make Captain"
                >
                  Make C
                </button>
              )}
            </div>
          )}
        </div>

        {/* Player Name */}
        <div
          className={cn(
            "font-hand font-black text-stone-900 leading-snug tracking-tight",
            big ? "text-sm sm:text-base" : "text-xs sm:text-sm",
          )}
        >
          {p.name}
        </div>

        {/* Batting / Bowling style */}
        {style && (style.battingStyle || style.bowlingStyle) && (
          <div className="text-[10px] sm:text-[11px] text-stone-500 font-['Kalam',cursive] leading-tight truncate mt-0.5">
            {style.battingStyle}
            {style.battingStyle && style.bowlingStyle ? " · " : ""}
            {style.bowlingStyle}
          </div>
        )}
      </div>

      {/* Bottom status / tap helper */}
      <div className="flex items-center justify-between pt-1 mt-1.5 border-t border-stone-200/60 text-[10px] font-['Kalam',cursive]">
        {isSelected ? (
          <span className="text-emerald-700 font-bold flex items-center gap-1">
            <PencilCheck size={10} color="#15803d" /> In XI
          </span>
        ) : (
          <span className="text-stone-400 font-semibold">+ Tap to add</span>
        )}
        {isSelected && (
          <span className="text-rose-600/70 hover:text-rose-700 text-[9px] font-semibold">
            Drop
          </span>
        )}
      </div>
    </div>
  );
}

export function SquadPicker({
  state,
  selfId,
  players,
  onChangeTeam,
  isDesktop = false,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
  onChangeTeam: () => void;
  /** Desktop shell passes true so the (shared) picker uses larger type and
   *  wider cards — there's far more room than on a phone. */
  isDesktop?: boolean;
}) {
  const mySelection = state.teamSelections[selfId];
  const myTeamId = mySelection?.teamId;
  const roster = myTeamId ? getRosterFor(myTeamId, state.options.format) : null;

  const _jsonPlayersForTeam = myTeamId ? getJsonPlayers(myTeamId, state.options.format) : [];
  let rosterToUse = roster;
  if (roster && roster.squad.length === 0 && _jsonPlayersForTeam.length > 0) {
    const squad = _jsonPlayersForTeam.map((j) => ({
      id: j.id,
      name: j.name,
      role: j.isWicketKeeper ? ("keeper" as const) : j.isAllRounder ? ("allrounder" as const) : j.isBowler ? ("bowler" as const) : ("batter" as const),
    }));
    rosterToUse = { ...roster, squad, extras: [] };
  }

  /** Stable reference to the JSON-derived playing XI + captain names. */
  const jsonMeta = useMemo(
    () => (myTeamId ? getJsonTeamMeta(myTeamId, state.options.format) : null),
    [myTeamId, state.options.format],
  );

  const sortedSquad = useMemo(
    () => (rosterToUse ? rosterToUse.squad.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) : []),
    [rosterToUse],
  );
  const sortedExtras = useMemo(
    () => (rosterToUse ? rosterToUse.extras.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) : []),
    [rosterToUse],
  );
  const profilesById = useMemo(() => {
    const m = new Map<string, HcPlayerProfile>();
    for (const p of sortedSquad) m.set(p.id, p);
    for (const p of sortedExtras) m.set(p.id, p);
    return m;
  }, [sortedSquad, sortedExtras]);

  const profilesByName = useMemo(() => {
    const m = new Map<string, HcPlayerProfile>();
    for (const p of sortedSquad) m.set(p.name.toLowerCase(), p);
    for (const p of sortedExtras) m.set(p.name.toLowerCase(), p);
    return m;
  }, [sortedSquad, sortedExtras]);

  const styleMap = useMemo(
    () => (myTeamId ? getJsonPlayerStyleMap(myTeamId, state.options.format) : new Map()),
    [myTeamId, state.options.format],
  );

  const [selected, setSelected] = useState<Set<string>>(() => {
    if (jsonMeta && jsonMeta.playingXI.length > 0) {
      const ids = jsonMeta.playingXI
        .map((name) => profilesByName.get(name.toLowerCase()))
        .filter((p): p is HcPlayerProfile => p !== undefined)
        .map((p) => p.id);
      if (ids.length === 11) return new Set(ids);
    }
    return new Set(sortedSquad.slice(0, 11).map((p) => p.id));
  });
  const [captainId, setCaptainId] = useState<string | null>(null);

  useEffect(() => {
    if (captainId && !selected.has(captainId)) setCaptainId(null);
  }, [selected, captainId]);

  useEffect(() => {
    if (captainId) return;
    if (selected.size === 0) return;

    if (jsonMeta?.captain) {
      const cap = profilesByName.get(jsonMeta.captain.toLowerCase());
      if (cap && selected.has(cap.id)) {
        setCaptainId(cap.id);
        return;
      }
    }

    const inXI = [...selected]
      .map((id) => profilesById.get(id))
      .filter((p): p is HcPlayerProfile => p !== undefined);
    const tagged = inXI.find((p) => p.isCaptain);
    const arOrBat = (p: HcPlayerProfile) => p.role === "allrounder" || p.role === "batter";
    const cap = tagged ?? inXI.find(arOrBat) ?? inXI[0];
    if (!cap) return;
    setCaptainId(cap.id);
  }, [selected, profilesById, profilesByName, jsonMeta, captainId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 11) next.add(id);
      return next;
    });
  }

  function confirm() {
    if (selected.size !== 11) return;
    if (!captainId) return;
    getSocket().emit("game:move", {
      type: "confirmSquad",
      data: { playerIds: [...selected], captainId },
    });
  }

  const xiPlayers = useMemo(() => {
    return [...selected]
      .map((id) => profilesById.get(id))
      .filter((p): p is HcPlayerProfile => !!p)
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  }, [selected, profilesById]);
  const benchPlayers = useMemo(
    () => sortedSquad.filter((p) => !selected.has(p.id)),
    [sortedSquad, selected],
  );
  const legendsBench = useMemo(
    () => sortedExtras.filter((p) => !selected.has(p.id)),
    [sortedExtras, selected],
  );
  const composition = useMemo(() => evaluateSquadComposition(xiPlayers), [xiPlayers]);

  if (!myTeamId) return null;
  if (!roster) return (
    <div style={{ color: "#991b1b", fontFamily: "'Kalam', cursive", fontSize: 14 }}>Roster unavailable.</div>
  );

  const profile = (HC_COUNTRIES as Record<string, typeof HC_COUNTRIES.india | undefined>)[myTeamId];
  const franchise = (HC_FRANCHISES as Record<string, typeof HC_FRANCHISES.csk | undefined>)[myTeamId];
  const teamDisplay = profile
    ? `${profile.flag} ${profile.name}`
    : franchise
    ? `🏟️ ${franchise.name}`
    : roster.teamName;

  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppSelection = state.teamSelections[oppId];
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";
  const oppStatus = oppSelection?.squadPlayerIds
    ? "✓ Squad confirmed"
    : oppSelection?.teamId
    ? "Picking squad…"
    : "Picking country…";

  const hasLeader = !!captainId;
  const ready = composition.isValid && hasLeader;
  const confirmLabel = !composition.isValid
    ? selected.size !== 11
      ? `Select ${11 - selected.size} more player${11 - selected.size === 1 ? "" : "s"}`
      : "Fix squad composition"
    : !hasLeader
    ? "Pick a Captain"
    : "🖊 CONFIRM PLAYING XI";

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col relative overflow-hidden px-4 md:px-8 py-3 md:py-4 font-notebook">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-3 mb-2 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-[#1E3A8A] font-['Architects_Daughter',cursive]">
              Pick Your XI — {teamDisplay}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onChangeTeam}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 bg-white/80 hover:bg-white text-stone-700 text-xs font-bold font-sans transition shadow-xs cursor-pointer active:scale-95 flex-shrink-0"
        >
          <span>← Change Team</span>
        </button>
      </div>

      {/* ── Status & Composition Strip ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-2 px-3.5 mb-3 rounded-2xl border border-stone-200/90 bg-white/70 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3 text-xs sm:text-sm font-hand text-stone-600">
          <span>
            Selected: <strong className="text-stone-900 font-bold">{selected.size}/11</strong>
          </span>
          <span>•</span>
          <span>
            Format: <strong className="text-stone-900 font-bold">{state.options.format.toUpperCase()}</strong>
          </span>
          <span>•</span>
          <span>
            {oppName}: <em className="text-stone-700 font-medium">{oppStatus}</em>
          </span>
        </div>

        <CompositionChecklist composition={composition} />
      </div>

      {/* ── Main Scrollable Ledger Area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 space-y-4 pb-20">
        {/* Playing XI Section */}
        <div className="rounded-2xl border border-stone-300/80 bg-[#FCF8EE]/95 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <div>
              <span className="font-sketch font-bold text-[#1E3A8A] tracking-wide text-base sm:text-lg">
                🏏 Your Playing XI ({xiPlayers.length}/11)
              </span>
              <span className="ml-2 text-xs text-stone-500 font-['Kalam',cursive] italic">
                Click [Make C] to assign Captain · Tap card to drop to bench
              </span>
            </div>
          </div>

          {xiPlayers.length === 0 ? (
            <div className="italic text-stone-400 py-3 text-center text-sm">
              No players selected yet. Tap players from the bench below to add.
            </div>
          ) : (
            <div
              className="grid gap-2 sm:gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${isDesktop ? 160 : 124}px, 1fr))`,
              }}
            >
              {xiPlayers.map((p) => (
                <PlayerCardMini
                  key={p.id}
                  p={p}
                  isSelected
                  big={isDesktop}
                  isCaptain={captainId === p.id}
                  onToggle={() => toggle(p.id)}
                  onCaptain={() => setCaptainId(p.id)}
                  disabled={false}
                  style={styleMap.get(p.name.toLowerCase())}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bench Section */}
        {benchPlayers.length > 0 && (
          <SquadGroup
            title={`🪑 Bench (${benchPlayers.length})`}
            subtitle="Available squad members not currently in your XI"
            players={benchPlayers}
            selected={selected}
            onToggle={toggle}
            disabledHint={selected.size >= 11}
            big={isDesktop}
            styleMap={styleMap}
          />
        )}

        {/* Legends Section */}
        {legendsBench.length > 0 && (
          <SquadGroup
            title={`★ Legends (${legendsBench.length})`}
            subtitle="Iconic franchise & national legends"
            players={legendsBench}
            selected={selected}
            onToggle={toggle}
            disabledHint={selected.size >= 11}
            isLegend
            big={isDesktop}
            styleMap={styleMap}
          />
        )}
      </div>

      {/* ── Fixed Bottom Tape Confirmation Bar ── */}
      <div className="absolute bottom-3 left-4 right-4 md:left-8 md:right-8 z-20 flex justify-center pointer-events-none">
        <motion.button
          type="button"
          onClick={confirm}
          disabled={!ready}
          whileTap={ready ? { scale: 0.97, y: 1 } : {}}
          className={cn(
            "pointer-events-auto w-full max-w-md py-3 px-6 rounded-2xl font-black text-base uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2.5 font-['Architects_Daughter',cursive]",
            ready
              ? "bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer active:scale-98 shadow-emerald-950/40 ring-2 ring-emerald-500/50"
              : "bg-stone-300 text-stone-500 cursor-not-allowed opacity-80",
          )}
        >
          <BatDoodleInline color={ready ? "#ffffff" : "#78716c"} />
          <span>{confirmLabel.replace("🖊 ", "")}</span>
        </motion.button>
      </div>
    </div>
  );
}

export function CompositionChecklist({
  composition,
}: {
  composition: ReturnType<typeof evaluateSquadComposition>;
}) {
  const items = [
    { label: "11 Players", ok: composition.total === 11, count: `${composition.total}/11` },
    { label: "Keeper", ok: composition.keepers >= 1, count: `${composition.keepers}` },
    { label: "Bowling options", ok: composition.bowlingOptions >= 4, count: `${composition.bowlingOptions}/4` },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
      {items.map((item) => (
        <SketchPill key={item.label} ok={item.ok} label={item.label} count={item.count} />
      ))}
    </div>
  );
}

export function SquadGroup({
  title,
  subtitle,
  players,
  selected,
  onToggle,
  accentColor: _accentColor = "#10b981",
  disabledHint = false,
  isLegend = false,
  big = false,
  styleMap,
}: {
  title: string;
  subtitle?: string;
  players: HcPlayerProfile[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  accentColor?: string;
  disabledHint?: boolean;
  isLegend?: boolean;
  big?: boolean;
  /** Optional batting/bowling style lookup from JSON data. */
  styleMap?: Map<string, JsonPlayerStyle>;
}) {
  return (
    <div className="rounded-2xl border border-stone-300/80 bg-[#FCF8EE]/90 p-3.5 sm:p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <h4 className="font-sketch font-bold text-stone-800 m-0 tracking-wide text-sm sm:text-base">
          {title}
        </h4>
        {subtitle && (
          <span className="italic text-stone-500 text-xs font-['Kalam',cursive]">{subtitle}</span>
        )}
      </div>
      {players.length === 0 ? (
        <div className="italic text-stone-400 py-2 text-xs">Empty.</div>
      ) : (
        <div
          className="grid gap-2 sm:gap-2.5"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${big ? 160 : 124}px, 1fr))`,
          }}
        >
          {players.map((p) => {
            const isSel = selected.has(p.id);
            const isDisabled = !isSel && disabledHint;
            return (
              <PlayerCardMini
                key={p.id}
                p={p}
                isSelected={isSel}
                isCaptain={false}
                onToggle={() => onToggle(p.id)}
                onCaptain={() => {}}
                disabled={isDisabled}
                isLegend={isLegend}
                big={big}
                style={styleMap?.get(p.name.toLowerCase())}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function WaitingForOpponentSquad({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppSelection = state.teamSelections[oppId];
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";
  const t0 = teamLabel(state, selfId, players);

  function reopen() {
    if (state.teamSelections[selfId]?.teamId) {
      getSocket().emit("game:move", {
        type: "selectTeam",
        data: { teamId: state.teamSelections[selfId]!.teamId },
      });
    }
  }

  return (
    <PaperPanel tone="soft" strong pad="lg" className="text-center font-notebook">
      <div className="text-[2.4rem] mb-1">{t0.flag}</div>
      <div className="font-sketch font-bold text-[18px] text-hc-ink mb-0.5">{t0.name}</div>
      <div className="text-xs text-hc-ink-lt mb-2.5">
        XI confirmed · {state.teamSelections[selfId]?.squadPlayerIds?.length ?? 0} players
      </div>
      <div className="text-[13px] text-hc-ink mb-3.5">
        Waiting for <strong>{oppName}</strong>
        {oppSelection?.teamId ? " to confirm their XI…" : " to pick a team…"}
      </div>
      <PaperButton variant="ghost" size="sm" onClick={reopen} className="font-kalam normal-case tracking-normal">
        ← Edit my XI
      </PaperButton>
    </PaperPanel>
  );
}

function TossCoinIllustration() {
  return (
    <div
      style={{
        position: "relative",
        width: 120,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {/* 3D Gold Tossing Coin — enlarged, completely clean without any background lines */}
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [-4, 4, -4] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: 110, height: 110, position: "relative" }}
      >
        <svg width="110" height="110" viewBox="0 0 100 100">
          <defs>
            <linearGradient
              id="hcTossRimGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#ca8a04" />
              <stop offset="50%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
            <radialGradient id="hcTossFaceGrad" cx="38%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#facc15" />
              <stop offset="75%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </radialGradient>
            <linearGradient id="hcTossInnerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Soft Drop Shadow under coin */}
          <ellipse
            cx="50"
            cy="93"
            rx="28"
            ry="4.5"
            fill="rgba(0,0,0,0.16)"
            filter="blur(1.5px)"
          />

          {/* Coin tilted at 20deg */}
          <g transform="rotate(20, 50, 50)">
            {/* 3D Extrusion Bevel (Rim) */}
            <ellipse cx="50" cy="54" rx="38" ry="32" fill="url(#hcTossRimGrad)" />

            {/* Rim milled ridges */}
            <path
              d="M 14 53 L 14 57 M 19 59 L 19 63 M 26 64 L 26 68 M 35 68 L 35 72 M 45 70 L 45 74 M 55 70 L 55 74 M 65 67 L 65 71 M 74 62 L 74 66 M 82 56 L 82 60 M 87 50 L 87 54"
              stroke="#451a03"
              strokeWidth="1.6"
              opacity="0.65"
            />

            {/* Front Coin Face */}
            <ellipse
              cx="50"
              cy="48"
              rx="38"
              ry="32"
              fill="url(#hcTossFaceGrad)"
              stroke="#854d0e"
              strokeWidth="1.5"
            />

            {/* Inner Stamped Rings */}
            <ellipse
              cx="50"
              cy="48"
              rx="31"
              ry="26"
              fill="none"
              stroke="url(#hcTossInnerGlow)"
              strokeWidth="1.8"
            />
            <ellipse
              cx="50"
              cy="48"
              rx="29.5"
              ry="24.5"
              fill="none"
              stroke="#a16207"
              strokeWidth="1"
              strokeDasharray="2,2"
            />

            {/* Crown Emblem (stamped in center) */}
            <g transform="translate(35, 33) scale(1.2)">
              {/* Crown shadow */}
              <path
                d="M 2 18 L 4 6 L 10 12 L 13 3 L 16 12 L 22 6 L 24 18 Z"
                fill="#854d0e"
                opacity="0.4"
                transform="translate(0, 1)"
              />
              {/* Crown main body */}
              <path
                d="M 2 18 L 4 6 L 10 12 L 13 3 L 16 12 L 22 6 L 24 18 Z"
                fill="#78350f"
              />
              {/* Crown tip jewels */}
              <circle cx="4" cy="5" r="1.3" fill="#78350f" />
              <circle cx="13" cy="2" r="1.5" fill="#78350f" />
              <circle cx="22" cy="5" r="1.3" fill="#78350f" />
              {/* Crown base */}
              <rect x="2" y="19" width="22" height="2" rx="1" fill="#78350f" />
            </g>
          </g>
        </svg>
      </motion.div>
    </div>
  );
}

export function TossCallPhase({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const callerId = state.tossCallerId ?? state.playerOrder[0];
  const callerName = players.find((p) => p.id === callerId)?.name ?? "Player 1";
  const isCaller = callerId === selfId;

  function call(choice: "odd" | "even") {
    getSocket().emit("game:move", { type: "tossCall", data: { call: choice } });
  }

  return (
    <div
      className="relative mx-auto w-full my-auto select-none"
      style={{
        maxWidth: 580,
      }}
    >
      <PaperPanel tone="legend" pad="lg" className="text-center space-y-4 font-notebook">
        <div className="inline-block rounded-full bg-amber-100/90 dark:bg-amber-950/60 px-3 py-1 text-[11px] font-bold tracking-widest text-amber-900 dark:text-amber-200 border border-amber-300">
          STEP 1 OF 2 · THE CALL
        </div>
        <SketchHeading>The Toss Call</SketchHeading>
        <p className="text-[14.5px] text-hc-ink/80 font-kalam max-w-md mx-auto">
          {isCaller
            ? "Just like calling Heads or Tails! Choose ODD or EVEN. Next, both players will pick numbers (1–6) — their SUM determines who wins the toss."
            : `Waiting for ${callerName} to make the toss call (ODD or EVEN). You will both pick numbers next.`}
        </p>

        {/* 3-Step Mini Guide */}
        <div className="rounded-xl bg-amber-50/70 p-3 text-center border border-amber-200/80 max-w-md mx-auto space-y-1">
          <div className="text-[12px] font-bold text-amber-900">
            How The Gully Toss Works:
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px] font-kalam text-amber-950">
            <div className="rounded bg-white/80 p-1.5 border border-amber-200">1. Pick Call (Odd/Even)</div>
            <div className="rounded bg-white/80 p-1.5 border border-amber-200">2. Both Pick (1–6)</div>
            <div className="rounded bg-white/80 p-1.5 border border-amber-200">3. Total Sum Wins</div>
          </div>
          <div className="text-[11px] text-amber-800/90 font-kalam pt-0.5">
            Example: You pick 3 + Opponent picks 4 = 7 (ODD)
          </div>
        </div>

        {isCaller ? (
          <div className="flex justify-center gap-4 pt-2">
            <PaperButton variant="solidBlue" size="lg" onClick={() => call("odd")} className="px-6 py-2">
              ODD (1,3,5,7,9,11)
            </PaperButton>
            <PaperButton variant="solidGreen" size="lg" onClick={() => call("even")} className="px-6 py-2">
              EVEN (2,4,6,8,10,12)
            </PaperButton>
          </div>
        ) : (
          <div className="py-4 text-[13px] font-kalam text-hc-ink/60 animate-pulse">
            Awaiting call from {callerName}…
          </div>
        )}
      </PaperPanel>
    </div>
  );
}

export function TossPhase({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const myPick = state.tossPicks[selfId];
  const oppId = state.playerOrder.find((id) => id !== selfId) ?? "";
  const oppPick = oppId ? state.tossPicks[oppId] : null;
  const oppLockedIn = oppPick != null;

  const me = players.find((p) => p.id === selfId);
  const myName = me?.name ?? "You";
  const myAvatar = me?.avatar;

  const opponent = players.find((p) => p.id === oppId);
  const oppName = opponent?.name ?? "Opponent";
  const oppAvatar = opponent?.avatar;

  const [selectedNumber, setSelectedNumber] = useState<number | null>(
    myPick ?? null,
  );

  useEffect(() => {
    if (myPick != null) {
      setSelectedNumber(myPick);
    }
  }, [myPick]);

  function handlePick(n: number) {
    if (myPick != null) return;
    setSelectedNumber(n);
    getSocket().emit("game:move", {
      type: "tossPick",
      data: { pick: n },
    });
  }

  const callerId = state.tossCallerId ?? state.playerOrder[0];
  const callerName = players.find((p) => p.id === callerId)?.name ?? "Player 1";
  const callerCall = state.tossCall ?? "even";
  const myCall = selfId === callerId ? callerCall : callerCall === "even" ? "odd" : "even";

  return (
    <div
      className="relative mx-auto w-full my-auto select-none"
      style={{
        maxWidth: 580,
        background: "#FFFDF8",
        border: "2px solid #2e1d0f",
        borderRadius: 16,
        boxShadow:
          "0 8px 24px rgba(46, 29, 15, 0.09), inset 0 0 0 1px rgba(80, 50, 20, 0.12)",
        padding: "24px 22px 24px",
        position: "relative",
      }}
    >
      {/* ── Corner Washi Tape (translucent taped paper look) ── */}
      <div
        style={{
          position: "absolute",
          top: -9,
          left: 20,
          width: 68,
          height: 22,
          background: "rgba(220, 195, 155, 0.75)",
          transform: "rotate(-32deg)",
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(40,20,5,0.15)",
          borderLeft: "2px dashed rgba(160, 130, 90, 0.6)",
          borderRight: "2px dashed rgba(160, 130, 90, 0.6)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -9,
          right: 20,
          width: 68,
          height: 22,
          background: "rgba(220, 195, 155, 0.75)",
          transform: "rotate(32deg)",
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(40,20,5,0.15)",
          borderLeft: "2px dashed rgba(160, 130, 90, 0.6)",
          borderRight: "2px dashed rgba(160, 130, 90, 0.6)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* ── TOP SECTION: Odd/Even Doodle + 3D Coin + Sticky Note ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          width: "100%",
        }}
      >
        {/* Left Handwritten Doodle: "Odd or Even?" */}
        <div
          style={{
            transform: "rotate(-10deg)",
            textAlign: "center",
            flexShrink: 0,
            width: 105,
            userSelect: "none",
          }}
        >
          <div
            style={{
              fontFamily: "'Caveat', 'Kalam', cursive",
              color: "#2e1d0f",
              fontSize: "clamp(18px, 3vw, 21px)",
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            Odd or
            <br />
            Even?
          </div>
          <div
            style={{
              fontFamily: "'Kalam', cursive",
              color: "#92400e",
              fontSize: "11px",
              fontWeight: 700,
              marginTop: 1,
            }}
          >
            (1-6 fingers sum)
          </div>
          <svg
            width={68}
            height={6}
            viewBox="0 0 68 6"
            style={{ margin: "2px auto 0", display: "block" }}
          >
            <path
              d="M 2 3 Q 22 6, 44 3 T 66 4"
              fill="none"
              stroke="#b91c1c"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Center: 3D Gold Tossing Coin with crown & spin arcs */}
        <TossCoinIllustration />

        {/* Right Sticky Note: "Toss decides who bats first!" */}
        <div
          style={{
            transform: "rotate(6deg)",
            background: "linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)",
            border: "1px solid rgba(234, 179, 8, 0.4)",
            boxShadow: "0 3px 10px rgba(60, 40, 10, 0.12)",
            borderRadius: 4,
            padding: "8px 12px",
            textAlign: "center",
            flexShrink: 0,
            maxWidth: 135,
            userSelect: "none",
          }}
        >
          <div
            style={{
              fontFamily: "'Caveat', 'Kalam', cursive",
              color: "#2e1d0f",
              fontSize: "clamp(14px, 2.4vw, 16px)",
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            Toss decides
            <br />
            who bats first!
          </div>
          <svg
            width={72}
            height={6}
            viewBox="0 0 72 6"
            style={{ margin: "3px auto 0", display: "block" }}
          >
            <path
              d="M 2 3 Q 24 5, 48 3 T 70 4"
              fill="none"
              stroke="#b91c1c"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* ── TITLE: "THE TOSS" ── */}
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <div className="inline-block rounded-full bg-amber-100/90 dark:bg-amber-950/60 px-3 py-0.5 text-[10.5px] font-bold tracking-widest text-amber-900 dark:text-amber-200 border border-amber-300 mb-1">
          STEP 2 OF 2 · SHOW FINGERS
        </div>
        <br />
        <div
          className="font-sketch"
          style={{
            color: "#1e293b",
            fontSize: "clamp(28px, 4.5vw, 34px)",
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            display: "inline-block",
            position: "relative",
          }}
        >
          THE TOSS
          <svg
            width="100%"
            height="8"
            viewBox="0 0 120 8"
            preserveAspectRatio="none"
            style={{ display: "block", marginTop: 2 }}
          >
            <path
              d="M 2 4 Q 30 7, 60 4 T 118 5"
              fill="none"
              stroke="#b91c1c"
              strokeWidth={2.6}
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* ── RULES EXPLANATION BOX ── */}
      <div
        style={{
          background: "rgba(238, 228, 210, 0.85)",
          border: "1px solid rgba(80, 50, 20, 0.2)",
          borderRadius: 14,
          padding: "10px 16px",
          textAlign: "center",
          marginTop: 14,
          width: "100%",
        }}
      >
        <div
          style={{
            fontFamily: "'Kalam', system-ui, sans-serif",
            color: "#2e1d0f",
            fontSize: 13.5,
            fontWeight: 700,
            lineHeight: 1.35,
          }}
        >
          <div style={{ color: "#92400e", fontWeight: 800 }}>
            {callerId === selfId ? "You called" : `${callerName} called`} {callerCall.toUpperCase()}
          </div>
          <div style={{ marginTop: 2, fontSize: 13 }}>
            Both pick 1 to 6 fingers · <strong>You WIN</strong> if Total Sum is <strong>{myCall.toUpperCase()}</strong> ({myCall === "even" ? "2, 4, 6, 8, 10, 12" : "1, 3, 5, 7, 9, 11"})
          </div>
        </div>
      </div>

      {/* ── SECTION HEADER: "PICK YOUR NUMBER" (yellow marker) ── */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <div
          style={{
            background: "rgba(254, 240, 138, 0.9)",
            padding: "4px 20px",
            borderRadius: 6,
            display: "inline-block",
          }}
        >
          <span
            className="font-sketch"
            style={{
              color: "#1e293b",
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            PICK YOUR NUMBER
          </span>
        </div>
      </div>

      {/* ── NUMBER CARDS (1 to 6) — Extra Bold Numbers ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "clamp(6px, 2vw, 12px)",
          marginTop: 14,
          width: "100%",
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((num) => {
          const isSelected = selectedNumber === num;
          const isLocked = myPick != null;
          return (
            <button
              key={num}
              type="button"
              disabled={isLocked}
              onClick={() => handlePick(num)}
              style={{
                flex: 1,
                maxWidth: 64,
                minWidth: 44,
                height: 68,
                borderRadius: 12,
                background: isSelected ? "#f0fdf4" : "#ffffff",
                border: isSelected
                  ? "2.5px solid #16a34a"
                  : "1.5px solid rgba(80, 50, 20, 0.22)",
                boxShadow: isSelected
                  ? "0 4px 12px rgba(22, 163, 74, 0.25)"
                  : "0 2px 6px rgba(50, 20, 5, 0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: isLocked ? "default" : "pointer",
                transition: "all 140ms ease",
                transform: isSelected ? "translateY(-3px) scale(1.04)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isLocked && !isSelected) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "rgba(80, 50, 20, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.borderColor = "rgba(80, 50, 20, 0.22)";
                }
              }}
            >
              <span
                className="font-sketch"
                style={{
                  fontSize: "clamp(26px, 5.5vw, 34px)",
                  fontWeight: 900,
                  color: isSelected ? "#15803d" : "#0f172a",
                  lineHeight: 1,
                  WebkitTextStroke: isSelected ? "0.6px #15803d" : "0.6px #0f172a",
                }}
              >
                {num}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── PLAYER STATUS CARDS (Bilateral tension with VS) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 14,
          width: "100%",
        }}
      >
        {/* You */}
        <div
          style={{
            flex: 1,
            background: "#FFFDF9",
            border: "1.5px solid rgba(80, 50, 20, 0.16)",
            borderRadius: 14,
            padding: "10px 12px",
            boxShadow: "0 2px 6px rgba(50, 20, 5, 0.05)",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, flexShrink: 0 }}>
              <SeatAvatar
                avatar={myAvatar}
                name={myName}
                className="w-full h-full object-cover rounded-full"
                textClassName="text-[11px]"
              />
            </div>
            <div
              style={{
                fontFamily: "'Kalam', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: 13.5,
                color: "#1e293b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              {myName} <span style={{ opacity: 0.75, fontSize: 12 }}>(You)</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 24 }}>
            {myPick != null ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 10px",
                  borderRadius: 9999,
                  background: "rgba(22, 101, 52, 0.12)",
                  border: "1px solid #166534",
                  color: "#166534",
                  fontWeight: 800,
                  fontSize: 11.5,
                  fontFamily: "'Kalam', system-ui, sans-serif",
                }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Ready
              </span>
            ) : (
              <span className="inline-flex gap-1.5 items-center" aria-label="waiting">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#94a3b8",
                    }}
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                  />
                ))}
              </span>
            )}
          </div>

          <div
            style={{
              fontFamily: "'Kalam', system-ui, sans-serif",
              fontSize: 11,
              color: "#64748b",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {myPick != null ? "Locked in!" : "Waiting for your choice..."}
          </div>
        </div>

        {/* Center VS Divider with accent ticks */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: "0 2px",
          }}
        >
          {/* Top burst ticks */}
          <svg width={18} height={8} viewBox="0 0 18 8">
            <line x1="3" y1="7" x2="1" y2="1" stroke="#b91c1c" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="9" y1="7" x2="9" y2="0" stroke="#b91c1c" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="15" y1="7" x2="17" y2="1" stroke="#b91c1c" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
          <div
            className="font-sketch"
            style={{
              color: "#2e1d0f",
              fontSize: 18,
              fontWeight: 900,
              padding: "2px 0",
              userSelect: "none",
            }}
          >
            VS
          </div>
          {/* Bottom burst ticks */}
          <svg width={18} height={8} viewBox="0 0 18 8">
            <line x1="3" y1="1" x2="1" y2="7" stroke="#b91c1c" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="9" y1="1" x2="9" y2="8" stroke="#b91c1c" strokeWidth={1.5} strokeLinecap="round" />
            <line x1="15" y1="1" x2="17" y2="7" stroke="#b91c1c" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
        </div>

        {/* Opponent */}
        <div
          style={{
            flex: 1,
            background: "#FFFDF9",
            border: "1.5px solid rgba(80, 50, 20, 0.16)",
            borderRadius: 14,
            padding: "10px 12px",
            boxShadow: "0 2px 6px rgba(50, 20, 5, 0.05)",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, flexShrink: 0 }}>
              <SeatAvatar
                avatar={oppAvatar}
                name={oppName}
                className="w-full h-full object-cover rounded-full"
                textClassName="text-[11px]"
              />
            </div>
            <div
              style={{
                fontFamily: "'Kalam', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: 13.5,
                color: "#1e293b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              {oppName}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 24 }}>
            {oppLockedIn ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 10px",
                  borderRadius: 9999,
                  background: "rgba(22, 101, 52, 0.12)",
                  border: "1px solid #166534",
                  color: "#166534",
                  fontWeight: 800,
                  fontSize: 11.5,
                  fontFamily: "'Kalam', system-ui, sans-serif",
                }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Ready
              </span>
            ) : (
              <span className="inline-flex gap-1.5 items-center" aria-label="thinking">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#94a3b8",
                    }}
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                  />
                ))}
              </span>
            )}
          </div>

          <div
            style={{
              fontFamily: "'Kalam', system-ui, sans-serif",
              fontSize: 11,
              color: "#64748b",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {oppLockedIn ? "Waiting for your call..." : "Thinking..."}
          </div>
        </div>
      </div>
    </div>
  );
}


function NotebookWashiTape({ corner }: { corner: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const positionStyle: Record<typeof corner, CSSProperties> = {
    "top-left": { top: -9, left: -9, transform: "rotate(-35deg)" },
    "top-right": { top: -9, right: -9, transform: "rotate(35deg)" },
    "bottom-left": { bottom: -9, left: -9, transform: "rotate(35deg)" },
    "bottom-right": { bottom: -9, right: -9, transform: "rotate(-35deg)" },
  };

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyle[corner],
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 52,
          height: 18,
          backgroundColor: "rgba(245, 230, 185, 0.82)",
          border: "1px stroke rgba(180, 150, 100, 0.45)",
          boxShadow: "0 1.5px 4px rgba(0,0,0,0.12)",
        }}
      />
    </div>
  );
}

function TossChoiceCoinIllustration() {
  return (
    <div className="relative inline-block my-0.5 sm:my-1">
      <svg viewBox="0 0 140 120" className="w-[85px] h-[72px] sm:w-[140px] sm:h-[120px] overflow-visible">
        <defs>
          <radialGradient id="tossCoinGoldGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFF2A1" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="85%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </radialGradient>
          <linearGradient id="tossCoinRimGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <filter id="coinShadowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#78350F" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* 3D Coin Body (Enlarged coin, clean without surrounding lines) */}
        <g filter="url(#coinShadowFilter)">
          <circle cx={70} cy={60} r={48} fill="url(#tossCoinRimGrad)" stroke="#78350F" strokeWidth={2.5} />
          <circle cx={70} cy={60} r={41} fill="url(#tossCoinGoldGrad)" stroke="#92400E" strokeWidth={2} />
          <circle cx={70} cy={60} r={37} fill="none" stroke="#FEF3C7" strokeWidth={1.5} opacity={0.7} strokeDasharray="4 2.5" />

          {/* Crown symbol */}
          <path d="M 53 68 L 53 53 L 60 59 L 70 49 L 80 59 L 87 53 L 87 68 Z" fill="none" stroke="#78350F" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
          <path d="M 53 68 L 53 53 L 60 59 L 70 49 L 80 59 L 87 53 L 87 68 Z" fill="none" stroke="#FEF3C7" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
          <line x1={53} y1={68} x2={87} y2={68} stroke="#78350F" strokeWidth={3.5} strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function CricketBatIllustration() {
  return (
    <svg viewBox="0 0 95 65" className="w-[65px] h-[44px] sm:w-[95px] sm:h-[65px] drop-shadow-md">
      <defs>
        <linearGradient id="batWoodGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="batGripGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      <g transform="rotate(-30 47 32)">
        {/* Handle */}
        <rect x={68} y={28} width={22} height={7} rx={3.5} fill="url(#batGripGrad)" stroke="#7F1D1D" strokeWidth={1} />
        <line x1={74} y1={28} x2={74} y2={35} stroke="#FEF2F2" strokeWidth={1} opacity={0.6} />
        <line x1={80} y1={28} x2={80} y2={35} stroke="#FEF2F2" strokeWidth={1} opacity={0.6} />
        <line x1={85} y1={28} x2={85} y2={35} stroke="#FEF2F2" strokeWidth={1} opacity={0.6} />

        {/* Shoulder cone */}
        <path d="M 60 26 L 69 28 L 69 35 L 60 37 Z" fill="#D97706" stroke="#92400E" strokeWidth={1} />

        {/* Blade */}
        <rect x={8} y={21} width={53} height={21} rx={4} fill="url(#batWoodGrad)" stroke="#78350F" strokeWidth={1.5} />
        {/* Wood grain */}
        <line x1={13} y1={26} x2={56} y2={26} stroke="#B45309" strokeWidth={1} opacity={0.4} />
        <line x1={10} y1={31} x2={54} y2={31} stroke="#FEF3C7" strokeWidth={1.2} opacity={0.75} />
        <line x1={14} y1={36} x2={57} y2={36} stroke="#B45309" strokeWidth={1} opacity={0.4} />
      </g>
    </svg>
  );
}

function CricketBallInMotionIllustration() {
  return (
    <svg viewBox="0 0 95 65" className="w-[65px] h-[44px] sm:w-[95px] sm:h-[65px] drop-shadow-md">
      <defs>
        <radialGradient id="ball3dGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="40%" stopColor="#DC2626" />
          <stop offset="85%" stopColor="#991B1B" />
          <stop offset="100%" stopColor="#450A0A" />
        </radialGradient>
      </defs>
      {/* Motion speed lines */}
      <path d="M 10 25 Q 26 23 40 24" fill="none" stroke="#93C5FD" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
      <path d="M 4 33 Q 24 33 44 33" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.95} />
      <path d="M 12 41 Q 28 43 42 42" fill="none" stroke="#93C5FD" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />

      {/* Red Cricket Ball */}
      <circle cx={62} cy={33} r={21} fill="url(#ball3dGrad)" stroke="#7F1D1D" strokeWidth={1.5} />

      {/* White seam stitches */}
      <path d="M 49 18 Q 62 33 75 48" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeDasharray="3 2" />
      <path d="M 47 22 Q 60 35 73 50" fill="none" stroke="#FEE2E2" strokeWidth={1} strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}

function SketchCrownIcon() {
  return (
    <svg width={26} height={20} viewBox="0 0 26 20" fill="none">
      <path d="M 2 17 L 2 6 L 8 11 L 13 3 L 18 11 L 24 6 L 24 17 Z" fill="none" stroke="#FACC15" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <line x1={2} y1={17} x2={24} y2={17} stroke="#FACC15" strokeWidth={2} strokeLinecap="round" />
      <circle cx={2} cy={4} r={1.5} fill="#FACC15" />
      <circle cx={13} cy={2} r={1.5} fill="#FACC15" />
      <circle cx={24} cy={4} r={1.5} fill="#FACC15" />
    </svg>
  );
}

function GreenLightbulbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-7 sm:h-7 flex-shrink-0">
      <circle cx={12} cy={12} r={10} fill="#DCFCE7" />
      <path d="M9 18h6m-5 3h4m-4-6a5 5 0 1 1 6-7.5 4.97 4.97 0 0 1-2 4.5V15H10v-3z" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TossChoicePhase({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const isWinner = state.tossWinnerId === selfId;
  const winnerName = players.find((p) => p.id === state.tossWinnerId)?.name ?? "Winner";

  function choose(choice: "bat" | "bowl") {
    getSocket().emit("game:move", { type: "tossChoice", data: { choice } });
  }

  // Non-winner view (waiting for winner to choose)
  if (!isWinner) {
    return (
      <div className="relative w-full max-w-[620px] mx-auto my-auto p-2.5 sm:p-6 bg-[#FAF6EA] rounded-2xl border-2 border-[#4A3525]/40 shadow-[0_8px_30px_rgba(74,53,37,0.15)] font-notebook">
        <NotebookWashiTape corner="top-left" />
        <NotebookWashiTape corner="top-right" />
        <NotebookWashiTape corner="bottom-left" />
        <NotebookWashiTape corner="bottom-right" />

        <div className="border border-dashed border-[#4A3525]/25 rounded-xl p-3 sm:p-7 text-center relative space-y-2 sm:space-y-4">
          <TossChoiceCoinIllustration />

          <div className="space-y-0.5 sm:space-y-1">
            <div className="font-sketch font-extrabold text-[18px] sm:text-[26px] text-hc-ink">
              {winnerName.toUpperCase()} WON THE TOSS!
            </div>
            <p className="text-[12px] sm:text-[14px] text-hc-ink-lt font-kalam">
              Sum was <strong className="text-hc-ink">{state.tossSum}</strong>. They are currently deciding whether to bat or bowl first...
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-1 text-[#475569] font-kalam text-[11.5px] sm:text-[13px]">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#166534]"
            />
            <span>Hang tight! The game will start as soon as they make their pick.</span>
          </div>
        </div>
      </div>
    );
  }

  // Winner View (Choose Bat or Bowl)
  return (
    <div className="relative w-full max-w-[640px] mx-auto my-auto p-2.5 sm:p-6 bg-[#FAF6EA] rounded-2xl border-2 border-[#4A3525]/40 shadow-[0_8px_30px_rgba(74,53,37,0.15)] font-notebook">
      <NotebookWashiTape corner="top-left" />
      <NotebookWashiTape corner="top-right" />
      <NotebookWashiTape corner="bottom-left" />
      <NotebookWashiTape corner="bottom-right" />

      {/* Double inner sketch border container */}
      <div className="border border-dashed border-[#4A3525]/25 rounded-xl p-2.5 sm:p-6 relative space-y-2 sm:space-y-5">
        
        {/* Top Row: Coin in center + Yellow Sticky Note on right */}
        <div className="relative flex flex-col items-center">
          
          {/* Sticky Note Top Right */}
          <div className="absolute right-0 top-0 transform translate-x-1 -translate-y-1 rotate-6 z-10 hidden sm:block">
            <div className="bg-[#FEF08A] border border-[#EAB308]/40 shadow-md px-2.5 py-1.5 rounded-sm max-w-[120px] text-center transform hover:scale-105 transition-transform">
              <p className="font-kalam font-bold text-[12px] text-[#713F12] leading-tight">
                It's yours!
              </p>
              <p className="font-kalam text-[11px] text-[#854D0E] leading-tight">
                Make it count!
              </p>
            </div>
          </div>

          {/* 3D Coin Illustration */}
          <TossChoiceCoinIllustration />

          {/* Title & Underline */}
          <div className="text-center mt-0.5 space-y-0.5">
            <h2 className="font-sketch font-extrabold text-[20px] sm:text-[30px] text-hc-ink tracking-tight uppercase leading-tight">
              YOU WON THE TOSS!
            </h2>
            <div className="flex justify-center">
              <svg viewBox="0 0 180 8" fill="none" className="w-[120px] sm:w-[180px] h-[6px] sm:h-[8px]">
                <path d="M 4 5 Q 45 1, 90 5 T 176 4" stroke="#DC2626" strokeWidth={2.8} strokeLinecap="round" />
              </svg>
            </div>
            <p className="font-kalam text-[12px] sm:text-[15px] text-[#334155] mt-1">
              The coin showed <strong className="text-[#0F172A]">Heads</strong>. What would you like to do?
            </p>
          </div>
        </div>

        {/* Lightbulb Strategy Tip Box */}
        <div className="bg-[#F4EFE0] border border-[#4A3525]/15 rounded-xl p-2 sm:p-3.5 flex items-center gap-2 sm:gap-3 shadow-inner">
          <GreenLightbulbIcon />
          <div className="font-kalam text-[11px] sm:text-[13.5px] text-[#2E1D0F] leading-snug">
            <div><strong>Bat first:</strong> set a target for the opponent.</div>
            <div><strong>Bowl first:</strong> chase it down.</div>
          </div>
        </div>

        {/* Two Main Choice Cards (BAT FIRST vs BOWL FIRST) — Side-by-side 2-column grid on ALL screens */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-0.5">
          
          {/* BAT FIRST CARD */}
          <button
            type="button"
            onClick={() => choose("bat")}
            className="group relative bg-gradient-to-br from-[#15803D] to-[#166534] hover:from-[#166534] hover:to-[#14532D] text-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border-2 border-[#14532D] shadow-[0_4px_14px_rgba(22,101,52,0.35)] hover:shadow-[0_8px_25px_rgba(22,101,52,0.45)] transition-all duration-200 hover:-translate-y-1 text-center flex flex-col items-center justify-between min-h-[135px] sm:min-h-[220px]"
          >
            {/* Top-left sketch crown */}
            <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 opacity-90 group-hover:scale-110 transition-transform scale-75 sm:scale-100 origin-top-left">
              <SketchCrownIcon />
            </div>

            {/* Bat graphic */}
            <div className="mt-1 sm:mt-2 mb-0.5 group-hover:scale-105 transition-transform">
              <CricketBatIllustration />
            </div>

            {/* Titles */}
            <div className="space-y-0">
              <div className="font-sketch font-black text-[15px] sm:text-[22px] tracking-wider text-white">
                BAT FIRST
              </div>
              <div className="font-kalam text-[10.5px] sm:text-[13.5px] text-emerald-100 opacity-90">
                Set a target
              </div>
            </div>

            {/* Circular Arrow Button */}
            <div className="mt-1 sm:mt-3 w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-white text-[#166534] flex items-center justify-center shadow-md group-hover:bg-emerald-50 group-hover:scale-110 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 sm:w-5 sm:h-5">
                <line x1={5} y1={12} x2={19} y2={12} />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </button>

          {/* BOWL FIRST CARD */}
          <button
            type="button"
            onClick={() => choose("bowl")}
            className="group relative bg-gradient-to-br from-[#1D4ED8] to-[#1E40AF] hover:from-[#1E40AF] hover:to-[#1E3A8A] text-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border-2 border-[#1E3A8A] shadow-[0_4px_14px_rgba(29,78,216,0.35)] hover:shadow-[0_8px_25px_rgba(29,78,216,0.45)] transition-all duration-200 hover:-translate-y-1 text-center flex flex-col items-center justify-between min-h-[135px] sm:min-h-[220px]"
          >
            {/* Ball graphic */}
            <div className="mt-1 sm:mt-2 mb-0.5 group-hover:scale-105 transition-transform">
              <CricketBallInMotionIllustration />
            </div>

            {/* Titles */}
            <div className="space-y-0">
              <div className="font-sketch font-black text-[15px] sm:text-[22px] tracking-wider text-white">
                BOWL FIRST
              </div>
              <div className="font-kalam text-[10.5px] sm:text-[13.5px] text-blue-100 opacity-90">
                Chase it down
              </div>
            </div>

            {/* Circular Arrow Button */}
            <div className="mt-1 sm:mt-3 w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-white text-[#1D4ED8] flex items-center justify-center shadow-md group-hover:bg-blue-50 group-hover:scale-110 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 sm:w-5 sm:h-5">
                <line x1={5} y1={12} x2={19} y2={12} />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </button>
        </div>

        {/* Bottom Helper Note */}
        <div className="flex items-center justify-center gap-1.5 pt-1 text-center text-[#475569] font-kalam text-[11px] sm:text-[13px]">
          <svg viewBox="0 0 24 24" fill="#2563EB" className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0">
            <circle cx={12} cy={12} r={10} />
            <path d="M12 16v-4m0-4h.01" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
          </svg>
          <span>You can play your selected role after the toss. Good luck!</span>
        </div>

      </div>
    </div>
  );
}

/**
 * Shown to the batting player immediately after a wicket falls.
 * Lists every remaining squad member (from pendingBatterSlot onward) and
 * lets them choose who walks in. Blocks play until a selection is made.
 */
function NextBatterPicker({
  state,
  innings,
  big = false,
}: {
  state: HcState;
  innings: HcInnings;
  big?: boolean;
}) {
  const sel = state.teamSelections[innings.battingPlayerId];
  const squad = sel?.squadPlayerIds ?? [];
  const slot = innings.pendingBatterSlot ?? innings.nextBatterIdx - 1;
  const remaining = squad.slice(slot);

  // Build profile lookup from roster
  const roster = sel?.teamId ? getRosterFor(sel.teamId, state.options.format) : null;
  const allProfiles: HcPlayerProfile[] = roster ? [...roster.squad, ...roster.extras] : [];
  const profileOf = (id: string) => allProfiles.find((p) => p.id === id) ?? null;

  function select(profileId: string) {
    getSocket().emit("game:move", { type: "selectNextBatter", data: { profileId } });
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "rgba(245,233,196,0.92)",
        border: "2px solid rgba(46,40,25,0.55)",
        boxShadow: "0 4px 16px rgba(74,44,18,0.18)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: "rgba(153,27,27,0.10)", borderBottom: "1px solid rgba(46,40,25,0.22)" }}
      >
        <span className="text-[22px]">🏏</span>
        <div>
          <div
            className="font-extrabold text-hc-ink tracking-[0.04em]"
            style={{ fontSize: big ? 16 : 14, fontFamily: "'Kalam', cursive" }}
          >
            Wicket! Choose your next batter
          </div>
          <div className="text-hc-ink-lt" style={{ fontSize: big ? 12 : 10, fontFamily: "'Kalam', cursive" }}>
            Tap a player to send them in
          </div>
        </div>
      </div>

      {/* Remaining batters grid */}
      <div
        className="p-3 grid"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${big ? 150 : 120}px, 1fr))`,
          gap: big ? 10 : 8,
        }}
      >
        {remaining.length === 0 ? (
          <div
            className="col-span-full text-center text-hc-ink-lt py-2"
            style={{ fontSize: 13, fontFamily: "'Kalam', cursive" }}
          >
            No batters remaining
          </div>
        ) : (
          remaining.map((profileId, idx) => {
            const profile = profileOf(profileId);
            const isDefault = idx === 0; // first in remaining = the "natural" next batter
            if (!profile) return null;
            return (
              <button
                key={profileId}
                onClick={() => select(profileId)}
                className="rounded-md text-left transition hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: isDefault ? "rgba(22,101,52,0.08)" : "rgba(245,233,196,0.6)",
                  border: `1.5px solid ${isDefault ? "rgba(22,101,52,0.6)" : "rgba(46,40,25,0.35)"}`,
                  padding: big ? "8px 10px" : "6px 8px",
                  cursor: "pointer",
                }}
              >
                <SketchRoleBadge role={profile.role} big={big} />
                <div
                  className="font-bold text-hc-ink leading-tight mt-1"
                  style={{ fontSize: big ? 14 : 12, fontFamily: "'Kalam', cursive" }}
                >
                  {profile.name}
                </div>
                {isDefault && (
                  <div
                    className="text-hc-ink-lt mt-0.5"
                    style={{ fontSize: big ? 10 : 8.5, fontFamily: "'Kalam', cursive" }}
                  >
                    Next in order
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Format balls count into overs string (e.g. 7 balls -> "1.1"). */
function oversFromBalls(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

/**
 * Shown when an over ends or innings starts without a current bowler.
 * Lets the fielding captain pick their bowler within format constraints.
 */
function BowlerPicker({
  state,
  innings,
  selfId,
  players: _players,
  isDesktop = false,
}: {
  state: HcState;
  innings: HcInnings;
  selfId: string;
  players: Player[];
  isDesktop?: boolean;
}) {
  const isBowlingPlayer = innings.bowlingPlayerId === selfId;
  const sel = state.teamSelections[innings.bowlingPlayerId];
  const squad = sel?.squadPlayerIds ?? [];
  const roster = sel?.teamId ? getRosterFor(sel.teamId, state.options.format) : null;
  const allProfiles: HcPlayerProfile[] = roster ? [...roster.squad, ...roster.extras] : [];
  const profileOf = (id: string) => allProfiles.find((p) => p.id === id) ?? null;

  const cap = HC_MAX_OVERS_PER_BOWLER[state.options.format] ?? 2;

  function pick(playerId: string) {
    getSocket().emit("game:move", { type: "selectBowler", data: { playerId } });
  }

  if (!isBowlingPlayer) {
    return (
      <div className="rounded-xl text-center py-4 font-notebook w-full bg-amber-50/80 border border-amber-200 shadow-xs">
        <div className="text-2xl mb-1">🎯</div>
        <div className="font-bold text-stone-800 text-sm font-hand">
          Opponent is choosing their bowler…
        </div>
      </div>
    );
  }

  const bowlerCandidates = squad.filter((id) => {
    const p = profileOf(id);
    return p?.role === "bowler" || p?.role === "allrounder";
  });
  const displayBowlerIds = bowlerCandidates.length > 0 ? bowlerCandidates : squad;

  return (
    <div
      className="rounded-lg overflow-hidden w-full"
      style={{
        background: "rgba(245,233,196,0.95)",
        border: "2px solid rgba(46,40,25,0.55)",
        boxShadow: "0 4px 16px rgba(74,44,18,0.18)",
      }}
    >
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: "rgba(30,58,138,0.08)", borderBottom: "1px solid rgba(46,40,25,0.22)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[20px]">🎯</span>
          <div>
            <div
              className="font-extrabold text-hc-ink tracking-[0.04em]"
              style={{ fontSize: isDesktop ? 16 : 14, fontFamily: "'Kalam', cursive" }}
            >
              Choose your next bowler
            </div>
            <div className="text-hc-ink-lt" style={{ fontSize: isDesktop ? 12 : 10, fontFamily: "'Kalam', cursive" }}>
              Max {cap} ov/bowler • Cannot bowl consecutive overs
            </div>
          </div>
        </div>
      </div>

      <div
        className="p-3 grid"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${isDesktop ? 150 : 120}px, 1fr))`,
          gap: isDesktop ? 10 : 8,
        }}
      >
        {displayBowlerIds.map((profileId) => {
          const isLastBowler = profileId === innings.lastBowlerId;
          const p = profileOf(profileId);
          if (!p) return null;
          const overs = (innings.bowlerStats[profileId]?.balls ?? 0) / 6;
          const maxed = cap != null && overs >= cap;
          const disabled = isLastBowler || maxed;

          return (
            <button
              key={profileId}
              onClick={() => !disabled && pick(profileId)}
              disabled={disabled}
              className={cn(
                "rounded-md text-left transition relative cursor-pointer",
                disabled ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.03] active:scale-[0.97]"
              )}
              style={{
                background: "rgba(245,233,196,0.6)",
                border: "1.5px solid rgba(46,40,25,0.35)",
                padding: isDesktop ? "8px 10px" : "6px 8px",
              }}
            >
              <SketchRoleBadge role={p.role} big={isDesktop} />
              <div
                className="font-bold text-hc-ink leading-tight mt-1 truncate"
                style={{ fontSize: isDesktop ? 14 : 12, fontFamily: "'Kalam', cursive" }}
              >
                {p.name}
              </div>
              <div
                className="text-hc-ink-lt mt-0.5 text-xs font-hand"
              >
                {oversFromBalls(innings.bowlerStats[profileId]?.balls ?? 0)} ov {isLastBowler ? "(just bowled)" : maxed ? "(maxed)" : ""}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const HAND_GESTURES: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "☝️", label: "1" },
  2: { emoji: "✌️", label: "2" },
  3: { emoji: "🖐️", label: "3" },
  4: { emoji: "🖐️", label: "4" },
  5: { emoji: "🖐️", label: "5" },
  6: { emoji: "🤙", label: "6" },
};

export function InningsPhase({
  state,
  selfId,
  players,
  isDesktop = false,
  registerCardRef,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
  isDesktop?: boolean;
  registerCardRef?: (playerId: string | null) => (el: HTMLElement | null) => void;
}) {
  const innings = state.phase === "innings1" ? state.innings1! : state.innings2!;
  const myRole = innings.battingPlayerId === selfId ? "batter"
    : innings.bowlingPlayerId === selfId ? "bowler" : null;
  const myPick = state.pendingPicks[selfId];
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppPickRaw = state.pendingPicks[oppId];
  const oppLockedIn = oppPickRaw != null;

  // Powerplay info for the upcoming ball.
  const upcomingOver = Math.floor(innings.balls / 6) + 1;
  const upcomingBall = (innings.balls % 6) + 1;
  const isPowerplayOver = upcomingOver <= innings.powerplayOvers;
  const restrictedThisOver = innings.restrictedBallsByOver[upcomingOver] ?? [];
  const isRestrictedNow = restrictedThisOver.includes(upcomingBall);
  const bowlerRestricted = myRole === "bowler" && isRestrictedNow;
  const allowedBowlerPicks = bowlerRestricted ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];

  const yorkerUsedThisOver = Boolean(innings.yorkerUsedByOver?.[upcomingOver]);
  const canBowlYorker = myRole === "bowler" && isPowerplayOver && !yorkerUsedThisOver;
  const [isYorkerToggled, setIsYorkerToggled] = useState(false);
  useEffect(() => {
    if (myPick != null || yorkerUsedThisOver) setIsYorkerToggled(false);
  }, [myPick, yorkerUsedThisOver, upcomingOver]);

  // Reveal last ball briefly when both lock in.
  const [reveal, setReveal] = useState<HcBall | null>(null);
  const lastBallCount = useRef(innings.history.length);
  useEffect(() => {
    if (innings.history.length > lastBallCount.current) {
      const last = innings.history[innings.history.length - 1];
      setReveal(last);
      const t = setTimeout(() => setReveal(null), 1800);
      lastBallCount.current = innings.history.length;
      return () => clearTimeout(t);
    }
    lastBallCount.current = innings.history.length;
  }, [innings.history.length]);

  // Wicket announcement
  const [wicketAnnounce, setWicketAnnounce] = useState<{ outName: string; inName: string } | null>(null);
  const prevWicketsRef = useRef(innings.wickets);
  useEffect(() => {
    if (innings.wickets <= prevWicketsRef.current) return;
    prevWicketsRef.current = innings.wickets;
    const sel = state.teamSelections[innings.battingPlayerId];
    const pool: HcPlayerProfile[] = (() => {
      if (!sel?.teamId) return [];
      const r = getRosterFor(sel.teamId, state.options.format);
      return r ? [...r.squad, ...r.extras] : [];
    })();
    const nameOf = (id: string) => pool.find((p) => p.id === id)?.name ?? id;
    const lastWicket = [...innings.history].reverse().find((b) => b.wicket);
    const outName = lastWicket ? nameOf(lastWicket.batterId) : "Batter";
    const isBattingTeam = innings.battingPlayerId === selfId;
    const inName = isBattingTeam ? "Pick your next batter!" : "Opponent is picking…";
    setWicketAnnounce({ outName, inName });
  }, [innings.wickets, innings.battingPlayerId, innings.history, selfId, state.options.format, state.teamSelections]);

  useEffect(() => {
    if (!wicketAnnounce) return;
    const t = setTimeout(() => setWicketAnnounce(null), 4000);
    return () => clearTimeout(t);
  }, [wicketAnnounce]);

  const isBattingPlayer = innings.battingPlayerId === selfId;

  function pick(n: number, isYorker: boolean = false) {
    if (myPick != null) return;
    if (innings.currentBowlerId == null) return;
    if (isYorker && n > 3) return;
    getSocket().emit("game:move", { type: "pick", data: { pick: n, isYorker: isYorker || undefined } });
  }

  const target = state.innings1 && state.phase === "innings2"
    ? state.innings1.runs + 1
    : null;

  const needsBowler = innings.currentBowlerId == null;

  const renderActionArea = () => (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Torn Paper Header */}
      <div className="mb-2">
        <div className="relative inline-block">
          <span
            className={cn(
              "font-sketch font-black text-sm sm:text-base tracking-wider uppercase",
              myRole === "batter" ? "text-[#1E3A8A]" : "text-[#B91C1C]"
            )}
          >
            {myRole === "batter" ? "YOU ARE BATTING" : "YOU ARE BOWLING"}
          </span>
          <div className={cn("w-full h-0.5 mt-0.5 rounded-full", myRole === "batter" ? "bg-[#1E3A8A]" : "bg-[#B91C1C]")} />
        </div>
      </div>

      {innings.needsNextBatterPick ? (
        <div className="w-full">
          {reveal && (
            <RevealStage
              reveal={reveal}
              innings={innings}
              myId={selfId}
              oppLockedIn={oppLockedIn}
              myPick={typeof myPick === "number" && myPick > 0 ? myPick : null}
              big={isDesktop}
              players={players}
            />
          )}
          {isBattingPlayer ? (
            <NextBatterPicker state={state} innings={innings} big={isDesktop} />
          ) : (
            <div className="rounded-xl text-center py-4 font-notebook w-full bg-amber-50/80 border border-amber-200">
              <div className="text-2xl mb-1">🏏</div>
              <div className="font-bold text-stone-800 text-sm font-hand">
                Opponent is selecting the next batter…
              </div>
            </div>
          )}
          {needsBowler && (
            <div className="mt-2">
              <BowlerPicker state={state} innings={innings} selfId={selfId} players={players} isDesktop={isDesktop} />
            </div>
          )}
        </div>
      ) : needsBowler ? (
        <div className="w-full">
          {reveal && (
            <RevealStage
              reveal={reveal}
              innings={innings}
              myId={selfId}
              oppLockedIn={oppLockedIn}
              myPick={typeof myPick === "number" && myPick > 0 ? myPick : null}
              big={isDesktop}
              players={players}
            />
          )}
          <BowlerPicker state={state} innings={innings} selfId={selfId} players={players} isDesktop={isDesktop} />
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <RevealStage
            reveal={reveal}
            innings={innings}
            myId={selfId}
            oppLockedIn={oppLockedIn}
            myPick={typeof myPick === "number" && myPick > 0 ? myPick : null}
            big={isDesktop}
            players={players}
          />

          {canBowlYorker && myPick == null && (
            <div className="my-2 flex items-center justify-between gap-3 w-full max-w-sm px-3 py-1.5 rounded-xl bg-red-50 border border-red-200">
              <span className="text-xs font-bold text-red-900">🔥 Mystery Yorker Available</span>
              <button
                type="button"
                onClick={() => setIsYorkerToggled((v) => !v)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-black uppercase transition cursor-pointer",
                  isYorkerToggled ? "bg-red-700 text-white" : "bg-red-100 text-red-800 border border-red-300",
                )}
              >
                {isYorkerToggled ? "Armed ✓" : "Arm Yorker"}
              </button>
            </div>
          )}

          <div className="mt-2 w-full">
            <PickRow
              disabled={myPick != null || reveal !== null}
              onPick={(n) => pick(n, isYorkerToggled)}
              selected={typeof myPick === "number" && myPick > 0 ? myPick : null}
              allowedPicks={myRole === "bowler" ? (isYorkerToggled ? [1, 2, 3] : allowedBowlerPicks) : [1, 2, 3, 4, 5, 6]}
              restrictedNote={isYorkerToggled ? "Mystery Yorker — Line 1, 2 or 3" : bowlerRestricted ? "Powerplay — Bowler limited to 1, 2 or 3" : null}
              big={isDesktop}
            />
          </div>

          {/* Footer Status line */}
          <div className="mt-2.5 flex items-center justify-center gap-6 text-xs font-hand font-bold text-stone-600 select-none">
            <span>You: {myPick != null ? "✓ locked" : "thinking..."}</span>
            <span>Opp: {oppLockedIn ? "✓ locked" : "thinking..."}</span>
          </div>
        </div>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="w-full flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* ── Left Column: Live Match Pitch & Duel Arena ── */}
        <div className="flex flex-col justify-between overflow-y-auto space-y-3 flex-1 min-h-0 pr-1">
          <TurnTimeWarning
            deadline={state.turnDeadline}
            active={!needsBowler && !innings.needsNextBatterPick && myPick == null && myRole != null}
          />

          {/* Scoreboard Card */}
          <Scoreboard
            state={state}
            innings={innings}
            target={target}
            players={players}
            big={isDesktop}
            registerCardRef={registerCardRef}
            isPowerplayOver={isPowerplayOver}
            upcomingOver={upcomingOver}
          />

          {/* Powerplay Card */}
          {isPowerplayOver && (
            <PowerplayBanner
              upcomingOver={upcomingOver}
              powerplayOvers={innings.powerplayOvers}
              restrictedThisOver={restrictedThisOver}
              upcomingBall={upcomingBall}
            />
          )}

          {/* Wicket Announcement */}
          {wicketAnnounce && (
            <WicketNotification
              outName={wicketAnnounce.outName}
              inName={wicketAnnounce.inName}
              onDismiss={() => setWicketAnnounce(null)}
            />
          )}

          {/* Active Match Arena (White Taped Paper Card) */}
          <div className="rounded-2xl border-2 border-[#3E2723]/30 bg-[#FFFDF8] p-4 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Left half: Crease Figures */}
            <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-stone-200/70 pb-3 md:pb-0 md:pr-4">
              <CurrentPlayersBar
                state={state}
                innings={innings}
                selfId={selfId}
                players={players}
                big={isDesktop}
                registerCardRef={registerCardRef}
              />
            </div>

            {/* Right half: Duel & Hand Tokens */}
            <div className="w-full md:w-7/12 flex-1 min-w-0">
              {renderActionArea()}
            </div>
          </div>
        </div>

        {/* ── Right Column: Match Info Stack & Post-it Notes ── */}
        <div className="flex flex-col gap-3 w-72 xl:w-80 flex-shrink-0 min-h-0 overflow-y-auto">
          {/* Card 1: This Over & Recent */}
          <RecentBalls history={innings.history} currentOver={upcomingOver} />

          {/* Card 2: Match Info */}
          <MatchInfoCard state={state} />

          {/* Card 3: Post-it note */}
          <MatchPostItCard />
        </div>
      </div>
    );
  }

  // ── Mobile Portrait View matching media_1789502371018.png ──
  return (
    <div className="w-full space-y-3 font-notebook pb-12">
      <TurnTimeWarning
        deadline={state.turnDeadline}
        active={!needsBowler && !innings.needsNextBatterPick && myPick == null && myRole != null}
      />

      {/* 1. Scoreboard Card */}
      <Scoreboard
        state={state}
        innings={innings}
        target={target}
        players={players}
        big={false}
        registerCardRef={registerCardRef}
        isPowerplayOver={isPowerplayOver}
        upcomingOver={upcomingOver}
      />

      {/* 2. Powerplay Banner */}
      {isPowerplayOver && (
        <PowerplayBanner
          upcomingOver={upcomingOver}
          powerplayOvers={innings.powerplayOvers}
          restrictedThisOver={restrictedThisOver}
          upcomingBall={upcomingBall}
        />
      )}

      {/* Wicket Announcement */}
      {wicketAnnounce && (
        <WicketNotification
          outName={wicketAnnounce.outName}
          inName={wicketAnnounce.inName}
          onDismiss={() => setWicketAnnounce(null)}
        />
      )}

      {/* 3. Combined Crease & Overs Card */}
      <div className="rounded-2xl border-2 border-[#3E2723]/30 bg-[#FFFDF8] p-3.5 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-12 gap-3">
          {/* Left Column: Crease figures */}
          <div className="col-span-7 border-r border-stone-200/70 pr-2">
            <CurrentPlayersBar
              state={state}
              innings={innings}
              selfId={selfId}
              players={players}
              big={false}
              registerCardRef={registerCardRef}
            />
          </div>

          {/* Right Column: This Over & Recent */}
          <div className="col-span-5 flex flex-col justify-between space-y-2">
            <div>
              <div className="text-[11px] font-hand font-bold text-[#1E3A8A] italic mb-1 uppercase">
                THIS OVER
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {innings.history.filter((b) => b.overNumber === upcomingOver).length === 0 ? (
                  <span className="text-[10px] font-hand text-stone-400 italic">—</span>
                ) : (
                  innings.history
                    .filter((b) => b.overNumber === upcomingOver)
                    .map((b, i) => (
                      <span
                        key={i}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center font-sketch font-black text-xs shadow-xs border",
                          b.wicket ? "bg-[#DC2626] text-white border-[#991B1B]" : "bg-white text-[#1E3A8A] border border-[#1E3A8A]"
                        )}
                      >
                        {b.wicket ? "W" : b.runs}
                      </span>
                    ))
                )}
              </div>
            </div>

            <div className="pt-1.5 border-t border-stone-200/60">
              <div className="text-[11px] font-hand font-bold text-[#1E3A8A] italic mb-1 uppercase">
                RECENT
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {innings.history.slice(-5).map((b, i) => (
                  <span
                    key={i}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center font-sketch font-black text-xs shadow-xs border",
                      b.wicket ? "bg-[#DC2626] text-white border-[#991B1B]" : "bg-white text-[#1E3A8A] border border-[#1E3A8A]"
                    )}
                  >
                    {b.wicket ? "W" : b.runs}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Duel & Pick Gestures Card */}
      <div className="rounded-2xl border-2 border-[#3E2723]/30 bg-[#FFFDF8] p-3.5 shadow-sm relative overflow-hidden">
        {renderActionArea()}
      </div>

      {/* 5. Bottom Silhouette Tagline */}
      <div className="pt-2 text-center select-none opacity-80">
        <div className="text-xs font-hand font-bold text-stone-600">
          Play • Chat • Laugh • Repeat
        </div>
      </div>
    </div>
  );
}

export function PowerplayBanner({
  upcomingOver,
  powerplayOvers,
  restrictedThisOver,
  upcomingBall,
}: {
  upcomingOver: number;
  powerplayOvers: number;
  restrictedThisOver: number[];
  upcomingBall: number;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-[#D9480F] via-[#E8590C] to-[#F76707] text-white p-3 sm:p-3.5 shadow-sm font-notebook select-none">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl sm:text-3xl animate-pulse">🔥</span>
        <div className="flex-1 min-w-0">
          <div className="font-sketch font-black text-xs sm:text-sm uppercase tracking-wider text-white">
            POWERPLAY
          </div>
          <div className="text-[11px] sm:text-xs font-hand text-amber-100 font-bold truncate">
            Over {upcomingOver} of {powerplayOvers} • 3 random balls restrict the bowler to 1–3
          </div>
        </div>
      </div>

      {/* 6 Over Balls indicator pills */}
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2 mt-2">
        {[1, 2, 3, 4, 5, 6].map((b) => {
          const isRestricted = restrictedThisOver.includes(b);
          const isCurrent = b === upcomingBall;
          return (
            <div
              key={b}
              className={cn(
                "h-7 rounded-lg flex items-center justify-center font-sketch font-black text-xs transition-all",
                isRestricted
                  ? "bg-[#4E1410] text-white border-2 border-white shadow-xs scale-105"
                  : isCurrent
                  ? "bg-amber-300 text-amber-950 font-black border border-white/80 shadow-xs"
                  : "bg-amber-400/30 text-white/90 border border-amber-300/30"
              )}
            >
              {b}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CurrentPlayersBar({
  state,
  innings,
  selfId,
  players,
  big: _big = false,
  registerCardRef,
}: {
  state: HcState;
  innings: HcInnings;
  selfId: string;
  players: Player[];
  big?: boolean;
  registerCardRef?: (playerId: string | null) => (el: HTMLElement | null) => void;
}) {
  const battingSelection = state.teamSelections[innings.battingPlayerId];
  const bowlingSelection = state.teamSelections[innings.bowlingPlayerId];
  const battingTeamId = battingSelection?.teamId;
  const bowlingTeamId = bowlingSelection?.teamId;
  const battingRoster = battingTeamId ? getRosterFor(battingTeamId, state.options.format) : null;
  const bowlingRoster = bowlingTeamId ? getRosterFor(bowlingTeamId, state.options.format) : null;
  const allBattingPlayers: HcPlayerProfile[] = battingRoster ? [...battingRoster.squad, ...battingRoster.extras] : [];
  const allBowlingPlayers: HcPlayerProfile[] = bowlingRoster ? [...bowlingRoster.squad, ...bowlingRoster.extras] : [];
  const lookupBatter = (id: string) => allBattingPlayers.find((p) => p.id === id);
  const lookupBowler = (id: string) => allBowlingPlayers.find((p) => p.id === id);

  const battingSquad = battingSelection?.squadPlayerIds ?? [];
  const strikerId = battingSquad[innings.strikerIdx];
  const nonStrikerId = battingSquad[innings.nonStrikerIdx];
  const striker = strikerId ? lookupBatter(strikerId) : null;
  const nonStriker = nonStrikerId ? lookupBatter(nonStrikerId) : null;
  const strikerStats = strikerId ? innings.batterStats[strikerId] : null;
  const nonStrikerStats = nonStrikerId ? innings.batterStats[nonStrikerId] : null;

  const currentBowlerId = innings.currentBowlerId;
  const currentBowler = currentBowlerId ? lookupBowler(currentBowlerId) : null;
  const bowlerStats = currentBowlerId ? innings.bowlerStats[currentBowlerId] : null;
  const bowlingPlayer = players.find((p) => p.id === innings.bowlingPlayerId);

  const bowlingIsMine = innings.bowlingPlayerId === selfId;
  const waitingForBowler = !currentBowler;

  return (
    <div className="flex flex-col space-y-2.5 font-notebook text-xs">
      {/* Striker */}
      <div>
        <div className="text-[11px] font-hand font-bold text-[#1E3A8A] flex items-center gap-1">
          <span>▶ STRIKER</span>
        </div>
        <div className="font-hand font-bold text-stone-900 text-xs sm:text-sm truncate">
          {striker?.name ?? "—"}
        </div>
        <div className="text-[11px] font-hand text-stone-500 tabular-nums">
          {strikerStats ? `${strikerStats.runs}* (${strikerStats.balls})` : "0* (0)"}
        </div>
      </div>

      {/* Dotted Divider */}
      <div className="border-t border-dashed border-stone-300 my-0.5" />

      {/* Non-Striker */}
      <div>
        <div className="text-[11px] font-hand font-bold text-amber-800 flex items-center gap-1">
          <span>👤 NON-STRIKER</span>
        </div>
        <div className="font-hand font-bold text-stone-900 text-xs sm:text-sm truncate">
          {nonStriker?.name ?? "—"}
        </div>
        <div className="text-[11px] font-hand text-stone-500 tabular-nums">
          {nonStrikerStats ? `${nonStrikerStats.runs}* (${nonStrikerStats.balls})` : "0* (0)"}
        </div>
      </div>

      {/* Solid Divider */}
      <div className="border-t border-stone-200 my-0.5" />

      {/* Bowler */}
      <div ref={registerCardRef?.(innings.bowlingPlayerId)} className="flex items-center gap-2 pt-0.5">
        <SeatAvatar avatar={bowlingPlayer?.avatar} name={bowlingPlayer?.name ?? "Bowler"} className="w-8 h-8 rounded-full ring-1 ring-red-400" />
        <div className="min-w-0">
          <div className="text-[10px] font-hand font-bold text-red-800 flex items-center gap-1 leading-tight">
            <span>BOWLING {bowlingIsMine ? "• YOU" : ""}</span>
          </div>
          <div className="font-hand font-bold text-stone-900 text-xs truncate leading-tight">
            {waitingForBowler ? "Picking bowler…" : currentBowler?.name}
          </div>
          <div className="text-[10px] font-hand text-stone-500 tabular-nums leading-tight">
            {bowlerStats ? `${Math.floor(bowlerStats.balls / 6)}.${bowlerStats.balls % 6} - ${bowlerStats.wickets} - ${bowlerStats.runs}` : "0.0 - 0 - 0"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Scoreboard({
  state,
  innings,
  target,
  players,
  big: _big = false,
  registerCardRef,
  isPowerplayOver: _isPowerplayOver = false,
  upcomingOver: _upcomingOver = 1,
}: {
  state: HcState;
  innings: HcInnings;
  target: number | null;
  players: Player[];
  big?: boolean;
  registerCardRef?: (playerId: string | null) => (el: HTMLElement | null) => void;
  isPowerplayOver?: boolean;
  upcomingOver?: number;
}) {
  const batterTeam = teamLabel(state, innings.battingPlayerId, players);
  const batterPlayer = players.find((p) => p.id === innings.battingPlayerId);
  const oversBowled = Math.floor(innings.balls / 6);
  const ballsThisOver = innings.balls % 6;
  const ballsRemaining = Math.max(0, innings.overs * 6 - innings.balls);
  const runsNeeded = target != null ? Math.max(0, target - innings.runs) : null;

  return (
    <div
      ref={registerCardRef?.(innings.battingPlayerId)}
      className="rounded-2xl border-2 border-[#3E2723]/30 bg-[#FFFDF8] p-3.5 sm:p-4 shadow-sm font-notebook relative overflow-hidden select-none"
    >
      {/* Corner Washi Tape */}
      <div className="absolute -top-2.5 left-5 w-14 sm:w-16 h-4 bg-[#D4C3A3]/80 -rotate-12 rounded-xs shadow-xs pointer-events-none z-10 border-x border-amber-900/20" />
      <div className="absolute -top-2.5 right-5 w-14 sm:w-16 h-4 bg-[#D4C3A3]/80 rotate-12 rounded-xs shadow-xs pointer-events-none z-10 border-x border-amber-900/20" />

      {/* Top Italics Blue Header */}
      <div className="text-center mb-2">
        <span className="font-hand font-bold italic tracking-wide text-xs sm:text-sm text-[#1E3A8A] uppercase">
          INNINGS {innings.number} • {batterTeam.short ?? batterTeam.name} ({batterTeam.playerName}) BATTING
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Left: Flag + Avatar + Giant Score */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-9 h-9 rounded-full bg-stone-100 shadow-xs border border-stone-300 flex-shrink-0 flex items-center justify-center text-xl">
            {batterTeam.flag}
          </div>

          <div className="flex-shrink-0">
            <SeatAvatar avatar={batterPlayer?.avatar} name={batterTeam.playerName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-[#2563EB] shadow-xs" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="font-sketch text-4xl sm:text-5xl font-black text-[#1E3A8A]">
                {innings.runs}<span className="text-[#DC2626]">/{innings.wickets}</span>
              </span>
            </div>
            <span className="text-xs sm:text-sm font-hand font-bold text-stone-600 mt-1">
              Overs {oversBowled}.{ballsThisOver} / {innings.overs}
              {target != null && <span className="text-amber-800 ml-1.5 font-bold">(Target: {target} • Need {runsNeeded} off {ballsRemaining}b)</span>}
            </span>
          </div>
        </div>

        {/* Right: Cricket Stumps Sketch + Doodle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="font-hand font-bold text-[#1E3A8A] italic text-xs sm:text-sm -rotate-3 leading-tight">
              Small Numbers<br />Big Thrills!
            </div>
          </div>
          <svg width={36} height={36} viewBox="0 0 44 44" fill="none" className="text-stone-700 opacity-90">
            <line x1="16" y1="14" x2="16" y2="38" stroke="#3E2723" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="22" y1="12" x2="22" y2="38" stroke="#3E2723" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="28" y1="14" x2="28" y2="38" stroke="#3E2723" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="14" y1="12" x2="30" y2="12" stroke="#3E2723" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="34" cy="34" r="5" fill="#991B1B" stroke="#3E2723" strokeWidth="1.5" />
            <path d="M32 30 C34 32 34 36 36 38" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function RevealStage({
  reveal,
  innings,
  myId,
  oppLockedIn,
  myPick,
  big = false,
  players = [],
}: {
  reveal: HcBall | null;
  innings: HcInnings;
  myId: string;
  oppLockedIn: boolean;
  myPick: number | null;
  big?: boolean;
  players?: Player[];
}) {
  const meIsBatter = innings.battingPlayerId === myId;
  const oppId = innings.battingPlayerId === myId ? innings.bowlingPlayerId : innings.battingPlayerId;
  const me = players.find((p) => p.id === myId);
  const opp = players.find((p) => p.id === oppId);

  if (reveal) {
    const myShown = meIsBatter ? reveal.batterPick : reveal.bowlerPick;
    const oppShown = meIsBatter ? reveal.bowlerPick : reveal.batterPick;

    return (
      <div className="flex items-center justify-center gap-6 sm:gap-10 py-2 w-full select-none">
        {/* You Card */}
        <RevealPlayerCard
          name={me?.name ?? "You"}
          avatar={me?.avatar}
          role="You"
          pick={myShown}
          big={big}
        />

        {/* Outcome Badge */}
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.7, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            className={cn(
              "px-4 py-2 rounded-2xl font-black font-sketch text-base sm:text-xl shadow-md uppercase tracking-wider",
              reveal.wicket
                ? "bg-[#DC2626] text-white shadow-rose-900/30"
                : reveal.runs === 6
                ? "bg-purple-600 text-white shadow-purple-900/30"
                : reveal.runs === 4
                ? "bg-amber-500 text-white shadow-amber-900/30"
                : reveal.runs > 0
                ? "bg-blue-600 text-white shadow-blue-900/30"
                : "bg-stone-200 text-stone-700",
            )}
          >
            {reveal.wicket
              ? "💥 WICKET!"
              : reveal.runs === 6
              ? "🚀 MAXIMUM SIX!"
              : reveal.runs === 4
              ? "⚡ FOUR RUNS!"
              : reveal.runs > 0
              ? `+${reveal.runs} ${reveal.runs === 1 ? "RUN" : "RUNS"}`
              : "DOT BALL"}
          </motion.div>
        </div>

        {/* Opponent Card */}
        <RevealPlayerCard
          name={opp?.name ?? "Opponent"}
          avatar={opp?.avatar}
          role="Opp"
          pick={oppShown}
          big={big}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-5 sm:gap-8 py-2 w-full select-none">
      {/* You Duel Box */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-16 h-20 sm:w-20 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all bg-white shadow-xs",
          myPick != null ? "border-emerald-600 text-emerald-800" : "border-dashed border-red-500 text-red-600"
        )}>
          {myPick != null ? (
            <>
              <span className="text-2xl sm:text-3xl leading-none">{HAND_GESTURES[myPick]?.emoji ?? myPick}</span>
              <span className="font-sketch font-black text-sm sm:text-base mt-0.5">{myPick}</span>
            </>
          ) : (
            <span className="text-3xl sm:text-4xl font-sketch font-black text-red-600">?</span>
          )}
        </div>
        <span className="font-hand font-bold text-xs text-stone-700 mt-1">You</span>
      </div>

      {/* VS */}
      <span className="font-sketch font-black text-xl sm:text-2xl text-[#1E3A8A]">
        VS
      </span>

      {/* Opponent Duel Box */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-16 h-20 sm:w-20 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all shadow-xs",
          oppLockedIn ? "bg-amber-50 border-amber-400" : "bg-stone-50 border-stone-300"
        )}>
          <span className="text-3xl sm:text-4xl leading-none">{oppLockedIn ? "🤐" : "🤔"}</span>
        </div>
        <span className="font-hand font-bold text-xs text-stone-700 mt-1">Opp</span>
      </div>
    </div>
  );
}

function RevealPlayerCard({
  name,
  avatar,
  role,
  pick,
  pending,
  hidden,
  big: _big,
}: {
  name: string;
  avatar?: string;
  role: string;
  pick: number | null;
  pending?: boolean;
  hidden?: boolean;
  isOutcome?: boolean;
  big?: boolean;
}) {
  return (
    <div className="flex flex-col items-center min-w-[70px] sm:min-w-[90px]">
      <div className="flex items-center gap-1.5 mb-1">
        <SeatAvatar avatar={avatar} name={name} className="w-5 h-5" textClassName="text-[9px]" />
        <span className="font-hand font-bold text-xs text-stone-800 truncate max-w-[65px] sm:max-w-[85px]">
          {name}
        </span>
      </div>

      <div
        className={cn(
          "w-14 h-18 sm:w-16 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all shadow-xs",
          pick != null
            ? "bg-white border-emerald-600 shadow-sm text-emerald-800"
            : hidden
            ? "bg-amber-50 border-amber-400 text-amber-800"
            : pending
            ? "bg-stone-50 border-dashed border-stone-300 text-stone-400 animate-pulse"
            : "bg-white border-stone-300",
        )}
      >
        {pick != null ? (
          <>
            <span className="text-xl sm:text-2xl leading-none">{HAND_GESTURES[pick]?.emoji ?? pick}</span>
            <span className="font-sketch font-black text-sm sm:text-base mt-0.5">{pick}</span>
          </>
        ) : hidden ? (
          <span className="text-2xl leading-none">🤐</span>
        ) : pending ? (
          <span className="text-[10px] font-bold font-['Kalam',cursive] text-stone-400">Thinking…</span>
        ) : (
          <span className="text-stone-300 font-bold">—</span>
        )}
      </div>

      <span className="text-[9px] font-bold text-stone-400 mt-1 uppercase tracking-wider">{role}</span>
    </div>
  );
}

export function PickRow({
  disabled,
  onPick,
  selected,
  allowedPicks = [1, 2, 3, 4, 5, 6],
  restrictedNote = null,
  big = false,
}: {
  disabled: boolean;
  onPick: (n: number) => void;
  selected: number | null;
  allowedPicks?: number[];
  restrictedNote?: string | null;
  big?: boolean;
}) {
  const side = big ? 52 : 44;
  return (
    <div className="space-y-1.5 w-full flex flex-col items-center select-none">
      {restrictedNote && (
        <div className="text-center text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
          🔥 {restrictedNote}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const isAllowed = allowedPicks.includes(n);
          const isDisabled = disabled || !isAllowed;
          const isSelected = selected === n;
          return (
            <button
              key={n}
              onClick={() => isAllowed && onPick(n)}
              disabled={isDisabled}
              title={!isAllowed ? "Restricted during powerplay" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center font-bold transition-all duration-150 active:scale-95 group rounded-xl border-2 border-dashed",
                isSelected
                  ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-md -translate-y-1"
                  : isDisabled
                  ? "bg-stone-100 border-stone-200 text-stone-400 opacity-40 cursor-not-allowed"
                  : "bg-white border-stone-400/80 text-stone-900 hover:border-stone-600 hover:-translate-y-0.5 shadow-xs cursor-pointer",
              )}
              style={{ width: side, height: side * 1.2 }}
            >
              <span className="leading-none transition-transform group-hover:scale-110" style={{ fontSize: big ? 20 : 16 }}>
                {HAND_GESTURES[n]?.emoji ?? n}
              </span>
              <span className="mt-0.5 font-sketch font-black text-xs sm:text-sm">
                {n}
              </span>
              {!isAllowed && (
                <span className="absolute top-1 right-1 text-[8px] font-black text-red-600">
                  ✕
                </span>
              )}
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px] font-black shadow-xs">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RecentBalls({ history, currentOver }: { history: HcBall[]; currentOver?: number }) {
  const thisOverBalls = history.filter((b) => currentOver != null && b.overNumber === currentOver);
  const recentBalls = history.slice(-5);

  return (
    <div className="rounded-2xl border-2 border-[#3E2723]/30 bg-[#FFFDF8] p-3.5 sm:p-4 shadow-sm font-notebook space-y-3 select-none">
      {/* THIS OVER */}
      <div>
        <div className="text-xs font-hand font-bold text-[#1E3A8A] italic mb-1.5 uppercase tracking-wide">
          THIS OVER
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {thisOverBalls.length === 0 ? (
            <div className="text-xs font-hand text-stone-400 italic">First ball of over…</div>
          ) : (
            thisOverBalls.map((b, i) => (
              <span
                key={i}
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-sketch font-black text-xs sm:text-sm shadow-xs border",
                  b.wicket
                    ? "bg-[#DC2626] text-white border-[#991B1B]"
                    : "bg-white text-[#1E3A8A] border-2 border-[#1E3A8A]"
                )}
              >
                {b.wicket ? "W" : b.runs}
              </span>
            ))
          )}
        </div>
      </div>

      {/* RECENT */}
      <div className="pt-2 border-t border-stone-200/60">
        <div className="text-xs font-hand font-bold text-[#1E3A8A] italic mb-1.5 uppercase tracking-wide">
          RECENT
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {recentBalls.length === 0 ? (
            <div className="text-xs font-hand text-stone-400 italic">Match just started…</div>
          ) : (
            recentBalls.map((b, i) => (
              <span
                key={i}
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-sketch font-black text-xs sm:text-sm shadow-xs border",
                  b.wicket
                    ? "bg-[#DC2626] text-white border-[#991B1B]"
                    : "bg-white text-[#1E3A8A] border-2 border-[#1E3A8A]"
                )}
              >
                {b.wicket ? "W" : b.runs}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function MatchInfoCard({ state }: { state: HcState }) {
  const format = state.options.format.toUpperCase();
  const overs = state.options.format === "test" ? 30 : state.options.format === "odi" ? 15 : 10;
  const venue = state.options.category === "ipl" ? "IPL" : "International";
  const powerplay = "Overs 1-3";
  const mode = "Classic";

  return (
    <div className="rounded-2xl border-2 border-[#3E2723]/30 bg-[#FFFDF8] p-3.5 sm:p-4 shadow-sm font-notebook select-none">
      <div className="text-xs font-sketch font-black text-[#1E3A8A] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <span>MATCH INFO</span>
      </div>
      <div className="space-y-2 text-xs font-hand font-bold text-stone-700">
        <div className="flex items-center justify-between">
          <span className="text-stone-500 flex items-center gap-1.5">📅 Format</span>
          <span className="text-[#1E3A8A] font-black font-sketch">{format}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 flex items-center gap-1.5">⏱️ Overs</span>
          <span className="text-[#1E3A8A] font-black font-sketch">{overs}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 flex items-center gap-1.5">📍 Venue</span>
          <span className="text-[#1E3A8A] font-black font-sketch">{venue}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 flex items-center gap-1.5">🔥 Powerplay</span>
          <span className="text-[#1E3A8A] font-black font-sketch">{powerplay}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 flex items-center gap-1.5">👑 Mode</span>
          <span className="text-[#1E3A8A] font-black font-sketch">{mode}</span>
        </div>
      </div>
    </div>
  );
}

export function MatchPostItCard() {
  return (
    <div className="rounded-xl border border-amber-300/80 bg-[#FEF9C3] p-3 shadow-xs font-notebook relative rotate-1 select-none">
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3.5 bg-[#D4C3A3]/80 -rotate-2 rounded-xs" />
      <div className="text-center">
        <div className="text-xs font-hand font-bold text-amber-900 leading-tight">
          Play Friends Relive 90s 😊
        </div>
        <div className="text-xl my-1">🏏</div>
        <div className="text-[10px] font-hand text-amber-800/80 italic">
          Chat • Laugh • Repeat
        </div>
      </div>
    </div>
  );
}

export function BattingScorecardLedger({
  state,
  innings,
  players: _players,
}: {
  state: HcState;
  innings: HcInnings;
  players: Player[];
}) {
  const sel = state.teamSelections[innings.battingPlayerId];
  const squad = sel?.squadPlayerIds ?? [];
  const roster = sel?.teamId ? getRosterFor(sel.teamId, state.options.format) : null;
  const pool: HcPlayerProfile[] = roster ? [...roster.squad, ...roster.extras] : [];
  const nameOf = (id: string) => pool.find((p) => p.id === id)?.name ?? id;
  const roleOf = (id: string) => pool.find((p) => p.id === id)?.role ?? "batter";

  const strikerId = squad[innings.strikerIdx];
  const nonStrikerId = squad[innings.nonStrikerIdx];

  return (
    <div className="rounded-2xl border border-stone-300/80 bg-[#FCF8EE]/95 p-3 sm:p-3.5 shadow-xs font-notebook flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-stone-200/80">
        <span className="font-sketch font-bold text-stone-800 text-xs sm:text-sm uppercase tracking-wide">
          📖 Batting Scorecard
        </span>
        <span className="text-[11px] font-bold text-stone-500 font-['Kalam',cursive]">
          {innings.runs}/{innings.wickets} ({Math.floor(innings.balls / 6)}.{innings.balls % 6} ov)
        </span>
      </div>

      <div className="space-y-1 text-xs max-h-48 sm:max-h-64 overflow-y-auto pr-1">
        {squad.map((id, idx) => {
          const stats = innings.batterStats[id];
          const isStriker = id === strikerId && !stats?.isOut;
          const isNonStriker = id === nonStrikerId && !stats?.isOut;
          const hasBatted = Boolean(stats && (stats.balls > 0 || stats.isOut));

          return (
            <div
              key={id}
              className={cn(
                "flex items-center justify-between py-1 px-1.5 rounded-lg transition-colors text-xs",
                isStriker
                  ? "bg-amber-100/70 border border-amber-300/60 font-bold"
                  : isNonStriker
                  ? "bg-emerald-50/70 border border-emerald-300/60 font-medium"
                  : idx % 2 === 0
                  ? "bg-stone-100/40"
                  : "bg-transparent",
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-[10px] text-stone-400 w-3">{idx + 1}</span>
                <span className="truncate text-stone-900 font-hand">
                  {nameOf(id)} {isStriker ? "🏏" : isNonStriker ? "🏃" : ""}
                </span>
                <SketchRoleBadge role={roleOf(id)} />
              </div>

              <div className="flex items-center gap-2 text-right flex-shrink-0 tabular-nums">
                {hasBatted ? (
                  <>
                    <span className="font-bold text-stone-900 font-sketch text-xs">
                      {stats?.runs}{stats?.isOut ? "" : "*"}
                    </span>
                    <span className="text-[10px] text-stone-500 font-['Kalam',cursive]">
                      ({stats?.balls}b {stats?.fours ? `${stats.fours}x4 ` : ""}{stats?.sixes ? `${stats.sixes}x6` : ""})
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-stone-400 italic">yet to bat</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Aggregated match contribution for one cricketer, used to pick MoM. */
interface CricketerContribution {
  id: string;
  name: string;
  teamPlayerId: string;
  teamShort: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  wickets: number;
  conceded: number;
  ballsBowled: number;
}
type MomAgg = CricketerContribution;

export interface ManOfTheMatch {
  name: string;
  teamShort: string;
  playerName: string;
  line: string;
}

/**
 * Man of the Match — pure analysis over both innings' batter/bowler stats.
 * A cricketer's impact = batting (runs + boundary bonus) + bowling
 * (wickets heavily weighted, minus a small economy penalty). Aggregates a
 * player's contribution across the whole match (they bat in one innings and
 * may bowl in the other) and returns the single best performer, or null if
 * nobody actually did anything (e.g. a 0–0 washout).
 */
export function computeManOfTheMatch(state: HcState, players: Player[]): ManOfTheMatch | null {
  const innings = [state.innings1, state.innings2].filter((i): i is HcInnings => !!i);
  if (innings.length === 0) return null;

  const agg = new Map<string, MomAgg>();
  const nameOfPlayer = (pid: string) =>
    players.find((p) => p.id === pid)?.name ??
    useRoomStore.getState().knownPlayers[pid]?.name ??
    "Player";

  const ensure = (id: string, teamPlayerId: string): MomAgg => {
    let a = agg.get(id);
    if (!a) {
      const sel = state.teamSelections[teamPlayerId];
      const roster = sel?.teamId ? getRosterFor(sel.teamId, state.options.format) : null;
      const profile = roster ? [...roster.squad, ...roster.extras].find((p) => p.id === id) : null;
      a = {
        id,
        name: profile?.name ?? "Batsman",
        teamPlayerId,
        teamShort: teamLabel(state, teamPlayerId, players).short,
        runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, conceded: 0, ballsBowled: 0,
      };
      agg.set(id, a);
    }
    return a;
  };

  for (const inn of innings) {
    for (const [pid, s] of Object.entries(inn.batterStats)) {
      const a = ensure(pid, inn.battingPlayerId);
      a.runs += s.runs; a.balls += s.balls; a.fours += s.fours; a.sixes += s.sixes;
    }
    for (const [pid, s] of Object.entries(inn.bowlerStats)) {
      const a = ensure(pid, inn.bowlingPlayerId);
      a.wickets += s.wickets; a.conceded += s.runs; a.ballsBowled += s.balls;
    }
  }

  let best: MomAgg | null = null;
  let bestScore = 0;
  for (const a of agg.values()) {
    const batScore = a.runs + a.fours + a.sixes * 2;
    const bowlScore = a.ballsBowled > 0 ? a.wickets * 20 - a.conceded * 0.4 : 0;
    const total = batScore + bowlScore;
    if (
      total > bestScore ||
      (best != null && total === bestScore &&
        (a.wickets > best.wickets || (a.wickets === best.wickets && a.runs > best.runs)))
    ) {
      bestScore = total;
      best = a;
    }
  }
  if (!best || bestScore <= 0) return null;

  const parts: string[] = [];
  if (best.balls > 0 || best.runs > 0) {
    parts.push(`${best.runs} (${best.balls})${best.sixes ? ` · ${best.sixes}×6` : ""}${best.fours ? ` · ${best.fours}×4` : ""}`);
  }
  if (best.ballsBowled > 0 && best.wickets > 0) {
    parts.push(`${best.wickets}/${best.conceded}`);
  }
  return {
    name: best.name,
    teamShort: best.teamShort,
    playerName: nameOfPlayer(best.teamPlayerId),
    line: parts.join("  ·  "),
  };
}

export function MatchSummary({
  state,
  players,
  selfId,
  onContinue,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
  /** When provided, renders the end-of-match "page" chrome: a Man-of-the-Match
   *  banner, a Continue button and a 90 s auto-advance countdown. */
  onContinue?: () => void;
}) {
  const INK = "#1a2952";
  const INK_LT = "#4a5a82";
  const STAMP_G = "#166534";
  const STAMP_R = "#991b1b";

  const youWon = state.winnerId === selfId;
  const winnerName =
    players.find((p) => p.id === state.winnerId)?.name ??
    (state.winnerId ? useRoomStore.getState().knownPlayers[state.winnerId]?.name : undefined) ??
    "—";
  const winnerTeam = state.winnerId
    ? teamLabel(state, state.winnerId, players)
    : null;

  const mom = useMemo(() => computeManOfTheMatch(state, players), [state, players]);

  // Real-money prize for the winner, for a paid, settled match only.
  const roomState = useRoomStore((s) => s.roomState);
  const { settlement } = useMatchSettlement(deriveTerminalMatchId(roomState));
  const winnerPrize = winnerPrizesFor(settlement)?.[0] ?? null;
  const myRank = state.winnerId ? (youWon ? 0 : 1) : undefined;
  const selfIsGuest = players.find((p) => p.id === selfId)?.isGuest ?? false;

  // 90 s auto-advance to the Game Over screen — only when this is the
  // end-of-match "page" (onContinue provided). Closable early via the button.
  const [secondsLeft, setSecondsLeft] = useState(SCORECARD_HOLD_SECONDS);
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;
  const hasContinue = !!onContinue;
  // Mount-only: `onContinue`'s identity changes on every Room re-render, so
  // depending on it would reset the countdown constantly. The ref keeps the
  // latest callback; we only care whether one exists at mount.
  useEffect(() => {
    if (!hasContinue) return;
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          continueRef.current?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bannerBg = state.result === "tie"
    ? "linear-gradient(135deg, #e7e2cf 0%, #cbd5e1 100%)"
    : youWon
    ? "linear-gradient(135deg, #dcfce7 0%, #fef9c3 55%, #fde68a 100%)"
    : "linear-gradient(135deg, #fee2e2 0%, #fef3c7 100%)";

  return (
    <div className="space-y-3 font-notebook">
      {/* 5-second Firing Crackers & Flower Blast for Winner or Cheer-up for Runner */}
      <HcScorecardFX state={state} players={players} selfId={selfId} forcedSkin="nostalgia" />

      <div
        className="rounded-xl p-4 text-center border-2"
        style={{
          background: bannerBg,
          borderColor: state.result === "tie" ? INK_LT : youWon ? STAMP_G : STAMP_R,
          boxShadow: youWon ? "0 4px 22px rgba(22,101,52,0.22)" : "0 4px 16px rgba(0,0,0,0.10)",
        }}
      >
        <div className="text-4xl mb-1">
          {state.result === "tie" ? "🤝" : youWon ? "🏆" : "👏"}
        </div>
        <div className="font-sketch text-[22px] font-bold" style={{ color: state.result === "tie" ? INK : youWon ? STAMP_G : STAMP_R }}>
          {state.result === "tie"
            ? "Match tied!"
            : winnerTeam
            ? `${winnerTeam.flag} ${winnerTeam.name} (${winnerName}) win!`
            : "Match over"}
        </div>
        <div className="text-sm text-hc-ink-lt mt-1 font-bold">
          {summarizeMatch(state)}
        </div>
        {winnerPrize && (
          <div className="flex justify-center mt-2">
            <PrizeWonChip amount={winnerPrize} size="md" />
          </div>
        )}
      </div>

      {typeof myRank === "number" && (
        <PlayerSettlementSummary settlement={settlement} myRank={myRank} isGuest={selfIsGuest} />
      )}

      {/* Man of the Match */}
      {mom && (
        <div
          className="relative rounded-xl px-4 py-3 text-center"
          style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 55%, #fcd34d 100%)" }}
        >
          <RoughBorder roughness={1.7} strokeWidth={2} stroke="rgba(180,120,20,0.95)" padding={3} />
          <div className="relative">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "#92400e" }}>
              🏅 Player of the Match
            </div>
            <div className="font-sketch text-[20px] font-bold text-hc-ink mt-0.5">
              {mom.name}
            </div>
            <div className="text-xs font-bold" style={{ color: "#78350f" }}>
              {mom.teamShort} ({mom.playerName}){mom.line ? ` — ${mom.line}` : ""}
            </div>
          </div>
        </div>
      )}

      {/* Innings scorecards — side by side on desktop to keep the page from
          overflowing; stacked on narrow (mobile) shells. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        {state.innings1 && (
          <InningsScorecard
            innings={state.innings1}
            state={state}
            players={players}
            accent="green"
          />
        )}
        {state.innings2 && (
          <InningsScorecard
            innings={state.innings2}
            state={state}
            players={players}
            accent="blue"
          />
        )}
      </div>

      {/* End-of-match page chrome: Continue + 90 s auto-advance countdown. */}
      {onContinue && (
        <div className="sticky bottom-0 flex flex-col items-center gap-2 pt-2 pb-1 bg-[#F5F0E4]/90 backdrop-blur-sm rounded-b-xl">
          <PaperButton variant="confirm" size="block" onClick={onContinue} className="max-w-xs tracking-[0.08em]">
            Continue →
          </PaperButton>
          <div className="text-[11px] text-hc-ink-lt">
            Auto-continues in {secondsLeft}s · tap Continue to skip
          </div>
        </div>
      )}
    </div>
  );
}

/** How long the end-of-match scorecard stays up before auto-advancing. */
const SCORECARD_HOLD_SECONDS = 90;

export function summarizeMatch(state: HcState): string {
  const i1 = state.innings1;
  const i2 = state.innings2;
  if (!i1 || !i2) return "";
  if (state.result === "tie") {
    return `Both sides finished on ${i1.runs}.`;
  }
  const winnerInnings = i1.runs > i2.runs ? i1 : i2;
  const margin = Math.abs(i1.runs - i2.runs);
  if (winnerInnings.number === 2) {
    return `Won by ${state.maxWickets - winnerInnings.wickets} wicket${
      state.maxWickets - winnerInnings.wickets === 1 ? "" : "s"
    }.`;
  }
  return `Won by ${margin} run${margin === 1 ? "" : "s"}.`;
}

const SCORECARD_ACCENTS = {
  green: {
    bar: "linear-gradient(135deg, #166534 0%, #15803d 60%, #22c55e 100%)",
    soft: "rgba(22,101,52,0.10)",
    ring: "rgba(22,101,52,0.45)",
  },
  blue: {
    bar: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #3b82f6 100%)",
    soft: "rgba(29,78,216,0.10)",
    ring: "rgba(29,78,216,0.40)",
  },
} as const;

export function InningsScorecard({
  innings,
  state,
  players,
  accent = "green",
}: {
  innings: HcInnings;
  state: HcState;
  players: Player[];
  accent?: keyof typeof SCORECARD_ACCENTS;
}) {
  const acc = SCORECARD_ACCENTS[accent];
  const batter = teamLabel(state, innings.battingPlayerId, players);
  const bowler = teamLabel(state, innings.bowlingPlayerId, players);
  const oversBowled = Math.floor(innings.balls / 6);
  const ballsThisOver = innings.balls % 6;
  const fours = innings.history.filter((b) => !b.wicket && b.runs === 4).length;
  const sixes = innings.history.filter((b) => !b.wicket && b.runs === 6).length;
  const dots = innings.history.filter((b) => !b.wicket && b.runs === 0).length;
  const strikeRate = innings.balls > 0 ? ((innings.runs / innings.balls) * 100).toFixed(1) : "0.0";
  const reasonLabel: Record<string, string> = {
    allOut: "All out",
    oversUp: "Overs up",
    chased: "Target chased",
  };

  const battingSelection = state.teamSelections[innings.battingPlayerId];
  const bowlingSelection = state.teamSelections[innings.bowlingPlayerId];
  const battingRoster = battingSelection?.teamId
    ? getRosterFor(battingSelection.teamId, state.options.format)
    : null;
  const bowlingRoster = bowlingSelection?.teamId
    ? getRosterFor(bowlingSelection.teamId, state.options.format)
    : null;
  const battingPool: HcPlayerProfile[] = battingRoster
    ? [...battingRoster.squad, ...battingRoster.extras]
    : [];
  const bowlingPool: HcPlayerProfile[] = bowlingRoster
    ? [...bowlingRoster.squad, ...bowlingRoster.extras]
    : [];
  const nameOfBatter = (id: string) => battingPool.find((p) => p.id === id)?.name ?? id;
  const nameOfBowler = (id: string) => bowlingPool.find((p) => p.id === id)?.name ?? id;

  const battingOrder = battingSelection?.squadPlayerIds ?? [];
  const batterRows = battingOrder
    .map((id) => ({ id, stats: innings.batterStats[id] }))
    .filter((row) => row.stats && (row.stats.balls > 0 || row.stats.isOut));
  const bowlerRows = Object.entries(innings.bowlerStats)
    .map(([id, stats]) => ({ id, stats }))
    .filter((row) => row.stats.balls > 0)
    .sort((a, b) => b.stats.wickets - a.stats.wickets || a.stats.runs - b.stats.runs);

  return (
    <PaperPanel tone="default" pad="none" className="space-y-2.5 overflow-hidden font-notebook min-w-0">
      {/* Coloured innings header bar */}
      <div
        className="flex items-center justify-between flex-wrap gap-2 px-3 py-2"
        style={{ background: acc.bar, color: "#fff" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl drop-shadow">{batter.flag}</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/85">
              Innings {innings.number} · {batter.short} ({batter.playerName})
            </div>
            <div className="tabular-nums font-extrabold text-2xl leading-none text-white">
              {innings.runs}<span className="text-amber-200">/{innings.wickets}</span>
              {" "}<span className="text-xs font-normal text-white/80">({oversBowled}.{ballsThisOver} ov)</span>
            </div>
          </div>
        </div>
        <div className="text-[11px] text-white/85 text-right">
          <div>Bowled by {bowler.short} ({bowler.playerName})</div>
          {innings.endedReason && (
            <div className="font-bold text-amber-200">
              {reasonLabel[innings.endedReason] ?? innings.endedReason}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs px-2.5">
        <Stat label="4s" value={fours} color="#166534" bg="rgba(22,101,52,0.12)" />
        <Stat label="6s" value={sixes} color="#6d28d9" bg="rgba(109,40,217,0.12)" />
        <Stat label="Dots" value={dots} color="#475569" bg="rgba(71,85,105,0.12)" />
        <Stat label="SR" value={strikeRate} color="#b45309" bg="rgba(180,83,9,0.12)" />
      </div>
      <div className="space-y-2.5 px-2.5 pb-2.5">
        {batterRows.length > 0 && (
          <BatterTable rows={batterRows} nameOf={nameOfBatter} nameOfBowler={nameOfBowler} />
        )}
        {bowlerRows.length > 0 && (
          <BowlerTable rows={bowlerRows} nameOf={nameOfBowler} />
        )}
      </div>
    </PaperPanel>
  );
}

export function BatterTable({
  rows,
  nameOf,
  nameOfBowler,
}: {
  rows: { id: string; stats: HcBatterStats | undefined }[];
  nameOf: (id: string) => string;
  nameOfBowler: (id: string) => string;
}) {
  return (
    <div style={{ background: "rgba(245,233,196,0.70)", border: "1.5px dashed rgba(46,40,25,0.35)", borderRadius: 6, padding: 8, overflowX: "auto" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#166534", fontWeight: 800, marginBottom: 4, paddingLeft: 4, fontFamily: "'Kalam', cursive" }}>
        🏏 Batting
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ color: "#4a5a82", fontSize: 10, fontFamily: "'Kalam', cursive" }}>
            <th className="text-left py-0.5">Batter</th>
            <th className="text-right">R</th>
            <th className="text-right">B</th>
            <th className="text-right">4s</th>
            <th className="text-right">6s</th>
            <th className="text-right">SR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, stats }, i) => {
            if (!stats) return null;
            const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(0) : "—";
            return (
              <tr key={id} style={{ color: "#1a2952", fontFamily: "'Kalam', cursive", background: i % 2 ? "rgba(22,101,52,0.06)" : "transparent" }}>
                <td className="py-0.5 pl-1 rounded-l">
                  <div className="font-bold">{nameOf(id)}{!stats.isOut ? "*" : ""}</div>
                  {stats.isOut && stats.dismissedBy && (
                    <div style={{ fontSize: 10, color: "#991b1b", opacity: 0.75 }}>b {nameOfBowler(stats.dismissedBy)}</div>
                  )}
                </td>
                <td className="text-right tabular-nums font-bold">{stats.runs}</td>
                <td className="text-right tabular-nums">{stats.balls}</td>
                <td className="text-right tabular-nums">{stats.fours}</td>
                <td className="text-right tabular-nums">{stats.sixes}</td>
                <td className="text-right tabular-nums">{sr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function BowlerTable({
  rows,
  nameOf,
}: {
  rows: { id: string; stats: HcBowlerStats }[];
  nameOf: (id: string) => string;
}) {
  return (
    <div style={{ background: "rgba(245,233,196,0.70)", border: "1.5px dashed rgba(46,40,25,0.35)", borderRadius: 6, padding: 8, overflowX: "auto" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1d4ed8", fontWeight: 800, marginBottom: 4, paddingLeft: 4, fontFamily: "'Kalam', cursive" }}>
        ⚾ Bowling
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ color: "#4a5a82", fontSize: 10, fontFamily: "'Kalam', cursive" }}>
            <th className="text-left py-0.5">Bowler</th>
            <th className="text-right">O</th>
            <th className="text-right">R</th>
            <th className="text-right">W</th>
            <th className="text-right">Econ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, stats }, i) => {
            const overs = `${Math.floor(stats.balls / 6)}.${stats.balls % 6}`;
            const econ = stats.balls > 0 ? ((stats.runs / stats.balls) * 6).toFixed(1) : "—";
            return (
              <tr key={id} style={{ color: "#1a2952", fontFamily: "'Kalam', cursive", background: i % 2 ? "rgba(29,78,216,0.06)" : "transparent" }}>
                <td className="py-0.5 pl-1 font-bold rounded-l">{nameOf(id)}</td>
                <td className="text-right tabular-nums">{overs}</td>
                <td className="text-right tabular-nums">{stats.runs}</td>
                <td className="text-right tabular-nums font-bold" style={{ color: "#92400e" }}>{stats.wickets}</td>
                <td className="text-right tabular-nums">{econ}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Stat({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number | string;
  color?: string;
  bg?: string;
}) {
  return (
    <div
      className="px-1.5 py-1 text-center rounded-md font-notebook"
      style={{
        background: bg ?? "rgba(245,233,196,0.7)",
        border: `1.5px solid ${color ? `${color}55` : "rgba(46,40,25,0.30)"}`,
      }}
    >
      <div className="text-[9px] uppercase tracking-[0.10em] font-extrabold" style={{ color: color ?? "#4a5a82" }}>{label}</div>
      <div className="tabular-nums font-extrabold text-base" style={{ color: color ?? "#1a2952" }}>{value}</div>
    </div>
  );
}

/* ───────────────────────────── Celebrations ───────────────────────────── */

/**
 * The shared emoji-burst celebration look — Broadcast and Classic both reuse
 * this as-is. Doordarshan gets its own reskinned version
 * (doordarshan/DoordarshanCelebration.tsx) built on the same
 * `useHcCelebrationEvents` hook, which owns all the event-detection logic
 * that used to live directly in this component (ball-history diffing,
 * milestone-vs-streak priority, hat-trick detection, auto-dismiss timing).
 */
export function HcCelebrationLayer({
  state,
  players,
  selfId,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
}) {
  return <Hc3DCelebrationLayer state={state} players={players} selfId={selfId} />;
}

export function HcCelebrationOverlay({ data }: { data: HcCelebrationData }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            data.kind === "wicket" || data.kind === "duck" || data.kind === "hattrickWickets"
              ? "radial-gradient(ellipse at center, rgba(127,29,29,0.45) 0%, rgba(0,0,0,0.55) 70%)"
              : data.kind === "winner"
              ? "radial-gradient(ellipse at center, rgba(217,119,6,0.4) 0%, rgba(0,0,0,0.6) 70%)"
              : "radial-gradient(ellipse at center, rgba(180,83,9,0.35) 0%, rgba(0,0,0,0.45) 70%)",
        }}
      />
      {(data.kind === "four" || data.kind === "six" || data.kind === "streak") && (
        <EmojiBurst emojis={data.kind === "four" ? ["4️⃣", "🏏", "💥"] : data.kind === "six" ? ["6️⃣", "🏏", "🎆", "⭐"] : ["4️⃣", "6️⃣", "🔥", "🏏"]} count={data.kind === "streak" ? 22 : 14} />
      )}
      {(data.kind === "wicket" || data.kind === "hattrickWickets") && (
        <EmojiBurst emojis={data.kind === "wicket" ? ["💥", "🎯"] : ["🎯", "💥", "🔥"]} count={data.kind === "hattrickWickets" ? 18 : 10} />
      )}
      {data.kind === "duck" && (
        <EmojiBurst emojis={["🦆", "💔", "🥚", "🏏"]} count={16} />
      )}
      {data.kind === "milestone" && (
        <EmojiBurst emojis={data.runs >= 100 ? ["💯", "🎉", "👏", "🏏"] : ["🎉", "👏", "🏏"]} count={data.runs >= 100 ? 24 : 16} />
      )}
      {data.kind === "winner" && !data.isTie && (
        <ConfettiRain count={60} />
      )}

      <HcCelebrationCard data={data} />
    </div>
  );
}

export function HcCelebrationCard({ data }: { data: HcCelebrationData }) {
  switch (data.kind) {
    case "four":
      return (
        <div className="relative hc-four-slide text-center">
          <div
            className="font-black tracking-tight leading-none"
            style={{
              fontSize: "clamp(72px, 18vw, 168px)",
              background: "linear-gradient(180deg, #fde047 0%, #f59e0b 60%, #b45309 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 6px 22px rgba(0,0,0,0.55)",
            }}
          >
            FOUR!
          </div>
          <div className="mt-2 text-amber-100 font-bold text-base sm:text-lg drop-shadow">
            {data.message}
          </div>
        </div>
      );
    case "six":
      return (
        <div className="relative hc-six-launch text-center">
          <div
            className="absolute inset-0 -z-10 mx-auto hc-rays-spin"
            aria-hidden
            style={{
              width: "min(120vw, 800px)",
              height: "min(120vw, 800px)",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background:
                "conic-gradient(from 0deg, rgba(251,191,36,0.0) 0deg, rgba(251,191,36,0.35) 30deg, rgba(251,191,36,0) 60deg, rgba(251,191,36,0.35) 90deg, rgba(251,191,36,0) 120deg, rgba(251,191,36,0.35) 150deg, rgba(251,191,36,0) 180deg, rgba(251,191,36,0.35) 210deg, rgba(251,191,36,0) 240deg, rgba(251,191,36,0.35) 270deg, rgba(251,191,36,0) 300deg, rgba(251,191,36,0.35) 330deg, rgba(251,191,36,0) 360deg)",
              filter: "blur(8px)",
              opacity: 0.6,
            }}
          />
          <div
            className="font-black tracking-tight leading-none hc-glow-pulse"
            style={{
              fontSize: "clamp(80px, 22vw, 200px)",
              background:
                "linear-gradient(180deg, #fff3a0 0%, #f97316 55%, #b91c1c 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 8px 28px rgba(0,0,0,0.6)",
            }}
          >
            SIX!
          </div>
          <div className="mt-2 text-amber-50 font-extrabold text-base sm:text-xl drop-shadow">
            {data.message}
          </div>
        </div>
      );
    case "wicket":
      return (
        <div className="relative hc-shake text-center">
          <div
            className="font-black tracking-tight leading-none"
            style={{
              fontSize: "clamp(72px, 20vw, 180px)",
              background: "linear-gradient(180deg, #fecaca 0%, #ef4444 55%, #7f1d1d 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 6px 24px rgba(0,0,0,0.7)",
            }}
          >
            WICKET!
          </div>
          <div className="mt-2 text-rose-100 font-extrabold text-base sm:text-xl drop-shadow">
            {data.message}
          </div>
        </div>
      );
    case "duck": {
      const title = data.duckType === "diamond" ? "DIAMOND DUCK!" : data.duckType === "golden" ? "GOLDEN DUCK!" : "DUCK OUT!";
      return (
        <div className="relative hc-shake text-center">
          <div className="text-[36px] sm:text-[44px] mb-1">🦆🥚</div>
          <div
            className="font-black tracking-tight leading-none"
            style={{
              fontSize: "clamp(56px, 16vw, 150px)",
              background: "linear-gradient(180deg, #fef08a 0%, #f97316 50%, #dc2626 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 6px 24px rgba(0,0,0,0.7)",
            }}
          >
            {title}
          </div>
          <div className="mt-2 text-amber-100 font-extrabold text-base sm:text-xl drop-shadow">
            {data.message}
          </div>
        </div>
      );
    }
    case "hattrickWickets":
      return (
        <div className="relative hc-hattrick-strobe text-center">
          <div className="text-[28px] sm:text-[36px] mb-1">🔥🔥🔥</div>
          <div
            className="font-black tracking-tight leading-none uppercase"
            style={{
              fontSize: "clamp(60px, 16vw, 140px)",
              background:
                "linear-gradient(180deg, #fef08a 0%, #f97316 50%, #b91c1c 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "0.02em",
              textShadow: "0 8px 26px rgba(0,0,0,0.7)",
            }}
          >
            HAT-TRICK!
          </div>
          <div className="mt-2 text-amber-100 font-extrabold text-base sm:text-xl drop-shadow">
            {data.message}
          </div>
          <div className="mt-4 flex justify-center gap-3 text-3xl sm:text-4xl">
            <span className="hc-celebrate-pop" style={{ animationDelay: "120ms" }}>🎯</span>
            <span className="hc-celebrate-pop" style={{ animationDelay: "240ms" }}>🎯</span>
            <span className="hc-celebrate-pop" style={{ animationDelay: "360ms" }}>🎯</span>
          </div>
        </div>
      );
    case "streak": {
      const topEmoji = data.variant === "sixes" ? "🚀🚀🚀" : "⚡⚡⚡";
      const streakAnim =
        data.variant === "sixes" ? "hc-streak-sixes" : data.variant === "fours" ? "hc-streak-fours" : "hc-streak-wobble";
      return (
        <div className={`relative ${streakAnim} text-center px-4`}>
          <div className="text-[28px] sm:text-[36px] mb-1">{topEmoji}</div>
          <div
            className="font-black tracking-tight leading-none uppercase"
            style={{
              fontSize: "clamp(44px, 12vw, 120px)",
              background:
                data.variant === "sixes"
                  ? "linear-gradient(180deg, #fff3a0 0%, #f97316 55%, #b91c1c 100%)"
                  : "linear-gradient(180deg, #fff3a0 0%, #f59e0b 50%, #9a3412 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "0.02em",
              textShadow: "0 8px 26px rgba(0,0,0,0.65)",
            }}
          >
            {data.title}
          </div>
          <div className="mt-2 text-amber-50 font-extrabold text-base sm:text-xl drop-shadow max-w-xl mx-auto">
            {data.message}
          </div>
        </div>
      );
    }
    case "milestone": {
      // "50" / "100" / "150"… reads better than a word for anything past a
      // century — there's no snappy English name for 150 the way FOUR/SIX
      // have one, and a cricket follower reads the number instantly anyway.
      const headline = data.runs === 50 ? "FIFTY!" : data.runs === 100 ? "CENTURY!" : `${data.runs}!`;
      const isBig = data.runs >= 100;
      return (
        <div className={`relative ${isBig ? "hc-milestone-century" : "hc-celebrate-pop"} text-center`}>
          {isBig && (
            <div
              aria-hidden
              className="absolute inset-0 -z-10 mx-auto hc-rays-spin"
              style={{
                width: "min(110vw, 700px)",
                height: "min(110vw, 700px)",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                background:
                  "conic-gradient(from 0deg, rgba(251,191,36,0) 0deg, rgba(251,191,36,0.4) 30deg, rgba(251,191,36,0) 60deg, rgba(251,191,36,0.4) 90deg, rgba(251,191,36,0) 120deg, rgba(251,191,36,0.4) 150deg, rgba(251,191,36,0) 180deg, rgba(251,191,36,0.4) 210deg, rgba(251,191,36,0) 240deg, rgba(251,191,36,0.4) 270deg, rgba(251,191,36,0) 300deg, rgba(251,191,36,0.4) 330deg, rgba(251,191,36,0) 360deg)",
                filter: "blur(9px)",
                opacity: 0.65,
              }}
            />
          )}
          <div className="text-[26px] sm:text-[34px] mb-1">{isBig ? "💯" : "🎉"}</div>
          <div
            className="font-black tracking-tight leading-none hc-glow-pulse"
            style={{
              fontSize: "clamp(64px, 17vw, 160px)",
              background: "linear-gradient(180deg, #fff3a0 0%, #f59e0b 55%, #9a3412 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 6px 22px rgba(0,0,0,0.6)",
            }}
          >
            {headline}
          </div>
          <div className="mt-2 text-amber-100 font-bold text-base sm:text-lg drop-shadow">
            {data.message}
          </div>
        </div>
      );
    }
    case "winner":
      return (
        <div className="relative text-center max-w-md mx-auto">
          <div
            className="absolute inset-0 -z-10 mx-auto hc-rays-spin"
            aria-hidden
            style={{
              width: "min(140vw, 900px)",
              height: "min(140vw, 900px)",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background:
                "conic-gradient(from 0deg, rgba(251,191,36,0) 0deg, rgba(251,191,36,0.5) 25deg, rgba(251,191,36,0) 50deg, rgba(251,191,36,0.5) 75deg, rgba(251,191,36,0) 100deg, rgba(251,191,36,0.5) 125deg, rgba(251,191,36,0) 150deg, rgba(251,191,36,0.5) 175deg, rgba(251,191,36,0) 200deg, rgba(251,191,36,0.5) 225deg, rgba(251,191,36,0) 250deg, rgba(251,191,36,0.5) 275deg, rgba(251,191,36,0) 300deg, rgba(251,191,36,0.5) 325deg, rgba(251,191,36,0) 360deg)",
              filter: "blur(10px)",
              opacity: data.isTie ? 0 : 0.7,
            }}
          />
          <div className="winner-pop">
            <div className="text-6xl sm:text-7xl winner-crown-bob mb-2">
              {data.isTie ? "🤝" : "🏆"}
            </div>
            <div
              className="font-black tracking-tight leading-none uppercase"
              style={{
                fontSize: "clamp(58px, 15vw, 130px)",
                background: data.isTie
                  ? "linear-gradient(180deg, #e5e7eb, #94a3b8)"
                  : "linear-gradient(180deg, #fff3a0 0%, #f59e0b 50%, #b45309 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow: "0 8px 28px rgba(0,0,0,0.65)",
              }}
            >
              {data.isTie ? "TIED!" : data.youWon ? "VICTORY!" : "WELL PLAYED"}
            </div>
            <div className="mt-3 text-amber-50 font-extrabold text-base sm:text-xl drop-shadow">
              {data.isTie
                ? "Match tied — a thriller!"
                : `${data.winnerName} wins ${data.margin}!`}
            </div>
          </div>
        </div>
      );
  }
}

export function EmojiBurst({ emojis, count }: { emojis: string[]; count: number }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const radius = 180 + Math.random() * 180;
      const bx = Math.cos(angle) * radius;
      const by = Math.sin(angle) * radius;
      return {
        emoji: emojis[i % emojis.length],
        bx: `${bx.toFixed(0)}px`,
        by: `${by.toFixed(0)}px`,
        rot: `${(Math.random() * 720 - 360).toFixed(0)}deg`,
        delay: `${(Math.random() * 250).toFixed(0)}ms`,
        size: 22 + Math.floor(Math.random() * 22),
      };
    });
  }, [emojis, count]);
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="hc-burst-piece absolute"
          style={
            {
              fontSize: `${p.size}px`,
              "--bx": p.bx,
              "--by": p.by,
              "--brot": p.rot,
              animationDelay: p.delay,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55))",
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

const CONFETTI_COLORS = [
  "#f59e0b", "#fbbf24", "#10b981", "#34d399",
  "#3b82f6", "#60a5fa", "#ef4444", "#f472b6",
];

export function ConfettiRain({ count }: { count: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i / count) * 100 + Math.random() * (100 / count)}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: `${(Math.random() * 1500).toFixed(0)}ms`,
        duration: `${(2.2 + Math.random() * 1.4).toFixed(2)}s`,
        rot: `${(Math.random() * 360).toFixed(0)}deg`,
      })),
    [count],
  );
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: p.left,
            top: "-2vh",
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rot})`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────── Wicket notification ────────────────────────────
 * Shown for 4 s (with manual dismiss) when a batter is dismissed and the
 * next player walks in. Placed inline just below CurrentPlayersBar.
 * ─────────────────────────────────────────────────────────────────────── */
function WicketNotification({
  outName,
  inName,
  onDismiss,
}: {
  outName: string;
  inName: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-xl border-2 px-4 pt-3 pb-3 text-center"
      style={{
        background: "linear-gradient(135deg, #fef2f2 0%, #fef9c3 100%)",
        borderColor: "#991b1b",
      }}
    >
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-[10px] hover:bg-black/10"
        style={{ color: "#6b7280" }}
      >
        ✕
      </button>
      <div
        className="font-extrabold uppercase tracking-widest mb-1"
        style={{ fontSize: 11, color: "#991b1b" }}
      >
        💥 Wicket!
      </div>
      <div
        className="font-sketch font-bold leading-tight"
        style={{ fontSize: 16, color: "#1a2952" }}
      >
        <span style={{ color: "#991b1b" }}>{outName}</span> is out
      </div>
      <div
        className="font-bold mt-1.5"
        style={{ fontSize: 14, color: "#166534" }}
      >
        ✦ <span className="font-sketch">{inName}</span> comes in to bat
      </div>
    </motion.div>
  );
}

/* ─────────────────────── Batting order panel ───────────────────────────
 * Shown only to the batting player. Lists upcoming batters with ▲/▼ swap
 * buttons; emits reorderBatting on each tap.
 * ─────────────────────────────────────────────────────────────────────── */
function BattingOrderPanel({
  innings,
  state,
}: {
  innings: HcInnings;
  state: HcState;
}) {
  const sel = state.teamSelections[innings.battingPlayerId];
  const squad = sel?.squadPlayerIds ?? [];
  const pool: HcPlayerProfile[] = useMemo(() => {
    if (!sel?.teamId) return [];
    const r = getRosterFor(sel.teamId, state.options.format);
    return r ? [...r.squad, ...r.extras] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.teamId, state.options.format]);

  const nameOf = (id: string) => pool.find((p) => p.id === id)?.name ?? id;
  const roleTag = (id: string) => {
    const r = pool.find((p) => p.id === id)?.role;
    return r === "batter" ? "BAT" : r === "bowler" ? "BOWL" : r === "keeper" ? "WK" : "AR";
  };

  // Positions 0..nextBatterIdx-1 are locked (already played or at crease).
  const lockCount = innings.nextBatterIdx;
  const upcomingIds = squad.slice(lockCount);

  function swap(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= upcomingIds.length) return;
    const newUpcoming = [...upcomingIds];
    [newUpcoming[i], newUpcoming[j]] = [newUpcoming[j], newUpcoming[i]];
    const newOrder = [...squad.slice(0, lockCount), ...newUpcoming];
    getSocket().emit("game:move", { type: "reorderBatting", data: { newOrder } });
  }

  if (upcomingIds.length === 0) {
    return (
      <div className="text-xs text-hc-ink-lt text-center py-1.5">
        No upcoming batters to reorder.
      </div>
    );
  }

  return (
    <div
      className="mt-1 rounded-lg overflow-hidden"
      style={{ border: "1px solid rgba(22,101,52,0.22)" }}
    >
      {upcomingIds.map((id, i) => (
        <div
          key={id}
          className="flex items-center gap-2 px-2.5 py-1.5"
          style={{
            background: i % 2 ? "rgba(22,101,52,0.04)" : "transparent",
            borderBottom: i < upcomingIds.length - 1 ? "1px solid rgba(22,101,52,0.10)" : undefined,
          }}
        >
          {/* Position number */}
          <span className="w-5 text-center tabular-nums font-bold text-hc-ink-lt" style={{ fontSize: 10 }}>
            {lockCount + i + 1}
          </span>
          {/* Name */}
          <span className="flex-1 font-notebook font-bold text-hc-ink" style={{ fontSize: 13 }}>
            {nameOf(id)}
          </span>
          {/* Role chip */}
          <span
            className="rounded px-1 py-0.5 font-bold uppercase"
            style={{ fontSize: 9, background: "rgba(46,40,25,0.08)", color: "#4a5a82" }}
          >
            {roleTag(id)}
          </span>
          {/* Swap buttons */}
          <div className="flex gap-0.5">
            <button
              onClick={() => swap(i, -1)}
              disabled={i === 0}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-hc-ink/10 disabled:opacity-25"
              style={{ fontSize: 12, color: "#166534" }}
              title="Move up"
            >
              ▲
            </button>
            <button
              onClick={() => swap(i, 1)}
              disabled={i === upcomingIds.length - 1}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-hc-ink/10 disabled:opacity-25"
              style={{ fontSize: 12, color: "#166534" }}
              title="Move down"
            >
              ▼
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}


/* ─────────────────────────── Phase router ─────────────────────────── */

/**
 * Routes to the active phase's component. Identical between the mobile and
 * desktop shells — extracted here so neither shell duplicates the switch.
 * Every phase component below is itself viewport-agnostic (pure Tailwind
 * `sm:`/`lg:` density, unchanged from the original single-tree board); only
 * the shells' surrounding arrangement (room-rail placement, padding) differs.
 */
export function HcPhaseBody({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  return (
    <>
      {state.phase === "teamSelect" && (
        <TeamSelectPhase state={state} selfId={selfId} players={players} />
      )}

      {state.phase === "toss" && (
        <TossPhase state={state} selfId={selfId} players={players} />
      )}

      {state.phase === "tossChoice" && (
        <TossChoicePhase state={state} selfId={selfId} players={players} />
      )}

      {(state.phase === "innings1" || state.phase === "innings2") && (
        <InningsPhase state={state} selfId={selfId} players={players} />
      )}

      {state.phase === "finished" && (
        <MatchSummary state={state} players={players} selfId={selfId} />
      )}
    </>
  );
}
