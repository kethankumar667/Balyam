import { useEffect, useMemo, useRef, useState } from "react";
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
  const playerName = players.find((p) => p.id === playerId)?.name ?? "?";
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
  isVC,
  onToggle,
  onCaptain,
  onVC,
  disabled,
  isLegend = false,
  big = false,
  style,
}: {
  p: HcPlayerProfile;
  isSelected: boolean;
  isCaptain: boolean;
  isVC: boolean;
  onToggle: () => void;
  onCaptain: () => void;
  onVC: () => void;
  disabled: boolean;
  isLegend?: boolean;
  big?: boolean;
  /** Rich player metadata from the JSON files (batting/bowling style). */
  style?: JsonPlayerStyle;
}) {
  const nameSize = big ? 14 : 11;
  const leadSize = big ? 10 : 8;
  const isDisabledLook = disabled && !isSelected;
  const leadPad = big ? "2px 7px" : "1px 5px";
  return (
    <PaperCard
      tone={isSelected ? "selected" : isLegend ? "legend" : "default"}
      disabled={isDisabledLook}
      interactive={!isDisabledLook}
      onClick={() => { if (!disabled || isSelected) onToggle(); }}
      ariaPressed={isSelected}
      ariaLabel={p.name}
      className="min-w-0"
    >
      <div className={cn("relative", big ? "px-2.5 py-2" : "px-2 py-1.5")}>
        {/* Badge row: sketch role square + captain/VC status indicators */}
        <div className="flex items-center gap-1 flex-wrap" style={{ marginBottom: big ? 3 : 2 }}>
          <SketchRoleBadge role={p.role} big={big} />
          {isCaptain && (
            <span
              style={{
                border: `1.5px solid ${GOLD}`,
                color: GOLD,
                background: `${GOLD}18`,
                fontFamily: "'Kalam', cursive",
                fontWeight: 800,
                fontSize: big ? 8 : 7,
                padding: big ? "2px 5px" : "1px 3px",
                borderRadius: 2,
                lineHeight: 1,
              }}
            >C</span>
          )}
          {isVC && (
            <span
              style={{
                border: `1.5px solid ${STAMP_A}`,
                color: STAMP_A,
                background: `${STAMP_A}18`,
                fontFamily: "'Kalam', cursive",
                fontWeight: 800,
                fontSize: big ? 8 : 7,
                padding: big ? "2px 5px" : "1px 3px",
                borderRadius: 2,
                lineHeight: 1,
              }}
            >VC</span>
          )}
        </div>

        {/* Player name */}
        <div className="font-hand font-bold text-hc-ink leading-tight" style={{ fontSize: nameSize }}>
          {isLegend ? `★ ${p.name}` : p.name}
        </div>

        {/* Batting / bowling style from JSON — compact ink-pencil metadata */}
        {style && (style.battingStyle || style.bowlingStyle) && (
          <div
            className="text-hc-ink-lt mt-0.5 leading-tight truncate"
            style={{ fontSize: big ? 9 : 7.5, fontFamily: "'Kalam', cursive" }}
          >
            {style.battingStyle}
            {style.battingStyle && style.bowlingStyle ? " · " : ""}
            {style.bowlingStyle}
          </div>
        )}

        {/* Pencil checkmark in top-right corner for XI members */}
        {isSelected && (
          <span className="absolute top-1 right-1">
            <PencilCheck size={big ? 13 : 11} />
          </span>
        )}

        {/* Captain / VC sketch-rectangle toggles with hand-drawn dropdown caret */}
        {isSelected && (
          <div className="flex gap-1" style={{ marginTop: big ? 4 : 3 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onCaptain(); }}
              className="cursor-pointer inline-flex items-center"
              style={{
                gap: 2,
                background: isCaptain ? GOLD : "rgba(197,150,58,0.10)",
                color: isCaptain ? "#fff" : GOLD,
                border: `1.5px solid ${GOLD}`,
                borderRadius: 2,
                fontFamily: "'Kalam', cursive",
                fontWeight: 800,
                fontSize: leadSize,
                padding: leadPad,
                lineHeight: 1,
              }}
            >
              C
              <svg width={5} height={4} viewBox="0 0 5 4" fill="none" aria-hidden>
                <path d="M0.5 1 L2.5 3 L4.5 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onVC(); }}
              className="cursor-pointer inline-flex items-center"
              style={{
                gap: 2,
                background: isVC ? STAMP_A : "rgba(146,64,14,0.10)",
                color: isVC ? "#fff" : STAMP_A,
                border: `1.5px solid ${STAMP_A}`,
                borderRadius: 2,
                fontFamily: "'Kalam', cursive",
                fontWeight: 800,
                fontSize: leadSize,
                padding: leadPad,
                lineHeight: 1,
              }}
            >
              VC
              <svg width={5} height={4} viewBox="0 0 5 4" fill="none" aria-hidden>
                <path d="M0.5 1 L2.5 3 L4.5 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </PaperCard>
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
  if (!mySelection?.teamId) return null;
  const myTeamId = mySelection.teamId;
  const roster = getRosterFor(myTeamId, state.options.format);
  if (!roster) return (
    <div style={{ color: "#991b1b", fontFamily: "'Kalam', cursive", fontSize: 14 }}>Roster unavailable.</div>
  );

  // When the shared `HC_COUNTRIES` pool is empty (server-side), the canonical
  // JSON files in `client/src/games/handcricket/data` are the source of truth
  // for international teams such as Bangladesh and Afghanistan. If the
  // shared roster is empty, build a client-side squad from the JSON players
  // so the UI can present a selectable XI.
  const _jsonPlayersForTeam = getJsonPlayers(myTeamId, state.options.format);
  let rosterToUse = roster;
  if (roster.squad.length === 0 && _jsonPlayersForTeam.length > 0) {
    const squad = _jsonPlayersForTeam.map((j) => ({
      id: j.id,
      name: j.name,
      role: j.isWicketKeeper ? ("keeper" as const) : j.isAllRounder ? ("allrounder" as const) : j.isBowler ? ("bowler" as const) : ("batter" as const),
    }));
    rosterToUse = { ...roster, squad, extras: [] };
  }

  /** Stable reference to the JSON-derived playing XI + captain names. */
  const jsonMeta = useMemo(
    () => getJsonTeamMeta(myTeamId, state.options.format),
    [myTeamId, state.options.format],
  );

  const sortedSquad = useMemo(
    () => rosterToUse.squad.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
    [rosterToUse],
  );
  const sortedExtras = useMemo(
    () => rosterToUse.extras.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
    [rosterToUse],
  );
  const profilesById = useMemo(() => {
    const m = new Map<string, HcPlayerProfile>();
    for (const p of sortedSquad) m.set(p.id, p);
    for (const p of sortedExtras) m.set(p.id, p);
    return m;
  }, [sortedSquad, sortedExtras]);

  /**
   * Name-keyed index (lowercase) for matching the JSON's plain string lists
   * (playingXI, captain, viceCaptain) to their typed HcPlayerProfile entries.
   * Extras are included so legends listed as captain elsewhere can still match.
   */
  const profilesByName = useMemo(() => {
    const m = new Map<string, HcPlayerProfile>();
    for (const p of sortedSquad) m.set(p.name.toLowerCase(), p);
    for (const p of sortedExtras) m.set(p.name.toLowerCase(), p);
    return m;
  }, [sortedSquad, sortedExtras]);

  /** JSON player-style lookup keyed by lowercase name for card display. */
  const styleMap = useMemo(
    () => getJsonPlayerStyleMap(myTeamId, state.options.format),
    [myTeamId, state.options.format],
  );

  const [selected, setSelected] = useState<Set<string>>(() => {
    // Pre-select the JSON's declared playing XI when available.
    // Falls back to first 11 by role order if the JSON lookup yields < 11 matches.
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
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);

  useEffect(() => {
    if (captainId && !selected.has(captainId)) setCaptainId(null);
    if (viceCaptainId && !selected.has(viceCaptainId)) setViceCaptainId(null);
  }, [selected, captainId, viceCaptainId]);

  useEffect(() => {
    if (captainId || viceCaptainId) return;
    if (selected.size === 0) return;

    // Prefer the JSON-declared captain / VC when both are in the selected XI.
    if (jsonMeta) {
      const cap = jsonMeta.captain
        ? profilesByName.get(jsonMeta.captain.toLowerCase())
        : undefined;
      const vc = jsonMeta.viceCaptain
        ? profilesByName.get(jsonMeta.viceCaptain.toLowerCase())
        : undefined;
      if (cap && selected.has(cap.id)) {
        setCaptainId(cap.id);
        if (vc && selected.has(vc.id) && vc.id !== cap.id) {
          setViceCaptainId(vc.id);
          return;
        }
      }
    }

    // Fallback: derive from role-sorted XI (existing logic).
    const inXI = [...selected]
      .map((id) => profilesById.get(id))
      .filter((p): p is HcPlayerProfile => p !== undefined);
    const tagged = inXI.find((p) => p.isCaptain);
    const arOrBat = (p: HcPlayerProfile) => p.role === "allrounder" || p.role === "batter";
    const cap = tagged ?? inXI.find(arOrBat) ?? inXI[0];
    if (!cap) return;
    const vc = inXI.find((p) => p.id !== cap.id && arOrBat(p)) ?? inXI.find((p) => p.id !== cap.id);
    if (!vc) return;
    setCaptainId(cap.id);
    setViceCaptainId(vc.id);
  }, [selected, profilesById, profilesByName, jsonMeta, captainId, viceCaptainId]);

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
    if (!captainId || !viceCaptainId) return;
    if (captainId === viceCaptainId) return;
    getSocket().emit("game:move", {
      type: "confirmSquad",
      data: { playerIds: [...selected], captainId, viceCaptainId },
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

  const hasLeaders = !!captainId && !!viceCaptainId && captainId !== viceCaptainId;
  const ready = composition.isValid && hasLeaders;
  const confirmLabel = !composition.isValid
    ? selected.size !== 11
      ? `Select ${11 - selected.size} more player${11 - selected.size === 1 ? "" : "s"}`
      : "Fix squad composition"
    : !hasLeaders
    ? "Pick Captain & Vice-Captain"
    : "🖊 CONFIRM PLAYING XI";

  return (
    <div
      className="relative rounded-sm overflow-visible font-notebook"
      style={{
        background: PAPER_L,
        boxShadow: "5px 9px 28px rgba(74,44,18,0.22), 0 2px 6px rgba(74,44,18,0.10)",
      }}
    >
      {/* Double-lined hand-sketched border: dual draws the outer ink stroke
          plus a lighter inner pencil ghost line ~9px inside it. */}
      <RoughBorder
        dual
        stroke="rgba(46,40,25,0.78)"
        strokeWidth={2.8}
        roughness={2.4}
        bowing={1.5}
        padding={3}
        seed={99}
      />
      {/* Tape strips — mismatched tilts (-3° / +4°) sell the physical illusion */}
      <TapeStrip />
      <TapeStrip right />
      <div className="relative z-[1] px-5 pt-5 pb-3.5">
        {/* Change team — top-right */}
        <PaperButton
          variant="ghost"
          size="sm"
          onClick={onChangeTeam}
          className="absolute -top-1 right-0 font-kalam normal-case tracking-normal"
        >
          ← Change Team
        </PaperButton>

        <HcSketchHeading size={isDesktop ? "26px" : "clamp(14px,1.8vw,20px)"}>
          Pick Your XI — {teamDisplay}
        </HcSketchHeading>

        {/* Status + composition checklist */}
        <div className="flex justify-center items-center flex-wrap gap-2.5 my-2.5 mb-3">
          <span className="font-hand text-hc-ink-lt" style={{ fontSize: isDesktop ? 14 : 12 }}>
            Selected <strong className="text-hc-ink">{selected.size}/11</strong>
            {" · "}Format: <strong className="text-hc-ink">{state.options.format.toUpperCase()}</strong>
            {" · "}{oppName}: <em>{oppStatus}</em>
          </span>
          <CompositionChecklist composition={composition} />
        </div>

        {/* Sections — the shell owns the single scroll container, so this
            block flows naturally (no nested scrollbar / double-scroll). */}
        <div>
          {/* YOUR XI — ruled-paper panel */}
          <PaperPanel
            pad="none"
            className="mb-2.5 pl-12 pr-2.5 py-2.5"
            style={{
              backgroundImage: [
                "repeating-linear-gradient(to bottom, transparent, transparent 26px, rgba(50,80,160,0.13) 26px, rgba(50,80,160,0.13) 27px)",
                "linear-gradient(to right, rgba(180,30,30,0.32) 0px, rgba(180,30,30,0.32) 1.5px, transparent 1.5px)",
              ].join(", "),
              backgroundPosition: "0 15px, 48px 0",
            }}
          >
            <div className="mb-2">
              <span
                className="font-sketch font-bold text-hc-ink tracking-[0.03em]"
                style={{ fontSize: isDesktop ? 19 : 15 }}
              >
                🏏 Your XI ({xiPlayers.length}/11)
              </span>{" "}
              <span className="italic text-hc-ink-lt" style={{ fontSize: isDesktop ? 13 : 11 }}>
                Click [C] / [VC] on a card to assign captain roles · Click card to drop to bench
              </span>
            </div>
            {xiPlayers.length === 0 ? (
              <div className="italic text-hc-ink-lt py-1" style={{ fontSize: isDesktop ? 13 : 11 }}>
                No players selected yet.
              </div>
            ) : (
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${isDesktop ? 156 : 116}px, 1fr))`, gap: isDesktop ? 10 : 8 }}
              >
                {xiPlayers.map((p) => (
                  <PlayerCardMini
                    key={p.id}
                    p={p}
                    isSelected
                    big={isDesktop}
                    isCaptain={captainId === p.id}
                    isVC={viceCaptainId === p.id}
                    onToggle={() => toggle(p.id)}
                    onCaptain={() => {
                      setCaptainId(p.id);
                      if (viceCaptainId === p.id) setViceCaptainId(null);
                    }}
                    onVC={() => {
                      setViceCaptainId(p.id);
                      if (captainId === p.id) setCaptainId(null);
                    }}
                    disabled={false}
                    style={styleMap.get(p.name.toLowerCase())}
                  />
                ))}
              </div>
            )}
          </PaperPanel>

          {/* BENCH */}
          {benchPlayers.length > 0 && (
            <SquadGroup
              title={`🪑 Bench (${benchPlayers.length})`}
              subtitle="Current squad members not in your XI"
              players={benchPlayers}
              selected={selected}
              onToggle={toggle}
              disabledHint={selected.size >= 11}
              big={isDesktop}
              styleMap={styleMap}
            />
          )}

          {/* LEGENDS */}
          {legendsBench.length > 0 && (
            <SquadGroup
              title={`★ Legends (${legendsBench.length})`}
              subtitle="Popular past players from this team's history"
              players={legendsBench}
              selected={selected}
              onToggle={toggle}
              disabledHint={selected.size >= 11}
              isLegend
              big={isDesktop}
              styleMap={styleMap}
            />
          )}

          {/* Confirm button */}
          {/* Captain's seal — the confirm button is the single most important
              tap in the squad-building flow. When ready it gets a bold green
              fill + larger shadow. motion.button + whileTap gives the
              physical "signing the scorecard" press sensation. */}
          <motion.button
            onClick={confirm}
            disabled={!ready}
            whileTap={ready ? { scale: 0.965, y: 1 } : {}}
            className={cn(
              "relative mt-3 w-full inline-flex items-center justify-center gap-2.5 rounded-sm overflow-visible",
              isDesktop ? "py-4 text-base" : "py-3 text-[15px]",
            )}
            style={{
              fontFamily: "'Architects Daughter', 'Kalam', cursive",
              fontWeight: 800,
              letterSpacing: "0.09em",
              background: ready
                ? "linear-gradient(170deg, rgba(22,101,52,0.16) 0%, rgba(22,101,52,0.09) 100%)"
                : "rgba(0,0,0,0.02)",
              color: ready ? STAMP_G : "#9ca3af",
              border: "none",
              cursor: ready ? "pointer" : "not-allowed",
              opacity: ready ? 1 : 0.45,
              boxShadow: ready ? "0 3px 14px rgba(22,101,52,0.18)" : "none",
            }}
          >
            <RoughBorder
              stroke={ready ? "rgba(22,101,52,0.94)" : "rgba(0,0,0,0.18)"}
              strokeWidth={ready ? 3.2 : 2.0}
              roughness={2.2}
              bowing={1.4}
              padding={2}
              seed={7}
            />
            <span className="relative z-[1] inline-flex items-center gap-2.5">
              <BatDoodleInline color={ready ? STAMP_G : "#9ca3af"} />
              {confirmLabel.replace("🖊 ", "")}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// LeadershipPicker removed — captain/VC are now set via [C]/[VC] buttons on XI cards.

export function CompositionChecklist({
  composition,
}: {
  composition: ReturnType<typeof evaluateSquadComposition>;
}) {
  const items = [
    { label: "11 Players",      ok: composition.total === 11,        count: `${composition.total}/11` },
    { label: "Keeper",          ok: composition.keepers >= 1,        count: `${composition.keepers}` },
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
    <PaperPanel tone={isLegend ? "legend" : "soft"} pad="sm" className="mb-2.5">
      <div className="flex items-baseline justify-between gap-2 mb-2 pl-0.5">
        <h4 className="font-sketch font-bold text-hc-ink m-0 tracking-[0.03em]" style={{ fontSize: big ? 19 : 15 }}>
          {title}
        </h4>
        {subtitle && (
          <span className="italic text-hc-ink-lt" style={{ fontSize: big ? 13 : 11 }}>{subtitle}</span>
        )}
      </div>
      {players.length === 0 ? (
        <div className="italic text-hc-ink-lt px-0.5 py-1" style={{ fontSize: big ? 13 : 11 }}>Empty.</div>
      ) : (
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${big ? 156 : 116}px, 1fr))`, gap: big ? 10 : 8 }}
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
                isVC={false}
                onToggle={() => onToggle(p.id)}
                onCaptain={() => {}}
                onVC={() => {}}
                disabled={isDisabled}
                isLegend={isLegend}
                big={big}
                style={styleMap?.get(p.name.toLowerCase())}
              />
            );
          })}
        </div>
      )}
    </PaperPanel>
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
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppPick = state.tossPicks[oppId];
  const oppLockedIn = oppPick != null;
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";

  function pick(n: number) {
    if (myPick != null) return;
    getSocket().emit("game:move", { type: "tossPick", data: { pick: n } });
  }

  return (
    <PaperPanel tone="soft" pad="lg" className="font-notebook">
      <div className="flex flex-col items-center gap-5">
        {/* Kinetic dice — 52 px + bounce + rotation makes the coin feel
            airborne rather than decorative. Size step alone (34 → 52) is
            the single biggest emotional lift; the animation seals it. */}
        <motion.div
          aria-hidden
          animate={{ y: [0, -14, 0], rotate: [0, 16, -16, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: 52, lineHeight: 1 }}
        >
          🎲
        </motion.div>

        <div className="text-center space-y-1.5">
          {/* 32 px heading vs the previous 20 px — the toss deserves
              the same prominence as the scoreboard headline. */}
          <SketchHeading arrows={false} className="text-[32px] tracking-[0.08em]">
            The Toss
          </SketchHeading>
          <p className="font-hand text-hc-ink-lt text-[12px] max-w-[340px] mx-auto leading-snug">
            Both players pick 1-6. Even sum: first player wins. Odd sum: second player wins.
          </p>
        </div>

        <PickRow disabled={myPick != null} onPick={pick} selected={myPick ?? null} />

        {/* Bilateral tension — YOU on left, OPPONENT on right, VS divider
            mirrors two captains walking to the pitch for the coin toss. */}
        <div className="flex items-stretch w-full max-w-[380px]">
          <TossStatusPill
            label="You"
            value={myPick != null ? String(myPick) : "…"}
            ready={myPick != null}
            mine
          />
          <div className="flex flex-col items-center justify-center px-4 flex-shrink-0" aria-hidden>
            <div style={{ width: 1, flexGrow: 1, background: "rgba(26,41,82,0.18)" }} />
            <span
              className="font-sketch font-extrabold text-hc-ink-lt"
              style={{ fontSize: 9, letterSpacing: "0.22em", padding: "5px 0" }}
            >
              VS
            </span>
            <div style={{ width: 1, flexGrow: 1, background: "rgba(26,41,82,0.18)" }} />
          </div>
          <TossStatusPill
            label={oppName}
            value={oppLockedIn ? "✓ ready" : "thinking…"}
            ready={oppLockedIn}
          />
        </div>
      </div>
    </PaperPanel>
  );
}

function TossStatusPill({
  label,
  value,
  ready,
  mine = false,
}: {
  label: string;
  value: string;
  ready: boolean;
  mine?: boolean;
}) {
  return (
    <motion.div
      animate={ready ? { scale: [1, 1.08, 0.97, 1] } : { scale: 1 }}
      transition={{ duration: 0.4, ease: "backOut" }}
      style={{
        flex: 1,
        minWidth: 0,
        textAlign: "center",
        background: ready && mine
          ? "rgba(22,101,52,0.13)"
          : ready
          ? "rgba(22,101,52,0.07)"
          : mine
          ? "rgba(245,233,196,0.85)"
          : "rgba(245,233,196,0.5)",
        border: `2px ${ready ? "solid" : "dashed"} ${ready ? "#166534" : "rgba(46,40,25,0.35)"}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontFamily: "'Kalam', cursive",
      }}
    >
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "#4a5a82", fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: ready ? "#166534" : "#1a2952", lineHeight: 1.25 }}>
        {value === "thinking…" ? (
          /* Bouncing dots — opponent suspense made legible */
          <span className="inline-flex gap-1 items-center" aria-label="thinking">
            {([0, 1, 2] as const).map((i) => (
              <motion.span
                key={i}
                style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#1a2952" }}
                animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
              />
            ))}
          </span>
        ) : value}
      </div>
    </motion.div>
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

  if (!isWinner) {
    return (
      <PaperPanel tone="soft" pad="lg" className="font-notebook text-hc-ink-lt">
        <div className="text-center space-y-2">
          <div className="text-[34px] leading-none">🪙</div>
          <div className="font-kalam font-extrabold text-[18px] text-hc-ink">
            {winnerName} won the toss
          </div>
          <div className="text-[13px]">
            Sum was <strong>{state.tossSum}</strong> — they're choosing to bat or bowl…
          </div>
        </div>
      </PaperPanel>
    );
  }
  return (
    <PaperPanel tone="soft" pad="lg" className="font-notebook">
      <div className="text-center space-y-5">
        <div className="space-y-1">
          <div className="text-[34px] leading-none">🎉</div>
          <SketchHeading arrows={false} className="text-[20px] tracking-normal">You won the toss!</SketchHeading>
          <div className="text-hc-ink-lt text-[13px]">
            Sum was <strong>{state.tossSum}</strong>. What would you like to do?
          </div>
        </div>
        <div className="flex justify-center gap-4 flex-wrap">
          <TossChoiceButton emoji="🏏" label="BAT first" sub="Set a target" variant="solidGreen" onClick={() => choose("bat")} />
          <TossChoiceButton emoji="⚾" label="BOWL first" sub="Chase it down" variant="solidBlue" onClick={() => choose("bowl")} />
        </div>
      </div>
    </PaperPanel>
  );
}

function TossChoiceButton({
  emoji,
  label,
  sub,
  variant,
  onClick,
}: {
  emoji: string;
  label: string;
  sub: string;
  variant: "solidGreen" | "solidBlue";
  onClick: () => void;
}) {
  return (
    <PaperButton variant={variant} onClick={onClick} className="min-w-[150px] px-6 py-4 rounded-lg shadow-[0_4px_14px_rgba(0,0,0,0.22)]">
      <span className="flex flex-col items-center">
        <span className="text-[30px] leading-none">{emoji}</span>
        <span className="font-black text-[17px] tracking-[0.04em] mt-1">{label}</span>
        <span className="text-[11px] opacity-85 mt-0.5 font-normal">{sub}</span>
      </span>
    </PaperButton>
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

export function InningsPhase({
  state,
  selfId,
  players,
  isDesktop = false,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
  isDesktop?: boolean;
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

  // ─── Wicket announcement ─────────────────────────────────────────────
  /** Brief card shown when a batter is dismissed and the next walks in. */
  const [wicketAnnounce, setWicketAnnounce] = useState<{ outName: string; inName: string } | null>(null);
  const prevWicketsRef = useRef(innings.wickets);
  // Effect 1: detect a new wicket and set the announcement state.
  // Deliberately does NOT start the timer — a separate effect handles that
  // so the timer restarts correctly under React Strict Mode's double-invoke.
  useEffect(() => {
    if (innings.wickets <= prevWicketsRef.current) return;
    prevWicketsRef.current = innings.wickets;
    // Resolve player names from batting team roster.
    const sel = state.teamSelections[innings.battingPlayerId];
    const squad = sel?.squadPlayerIds ?? [];
    const pool: HcPlayerProfile[] = (() => {
      if (!sel?.teamId) return [];
      const r = getRosterFor(sel.teamId, state.options.format);
      return r ? [...r.squad, ...r.extras] : [];
    })();
    const nameOf = (id: string) => pool.find((p) => p.id === id)?.name ?? id;
    const lastWicket = [...innings.history].reverse().find((b) => b.wicket);
    const outName = lastWicket ? nameOf(lastWicket.batterId) : "Batter";
    // The next batter is now chosen manually — announcement reflects this.
    const isBattingTeam = innings.battingPlayerId === selfId;
    const inName = isBattingTeam ? "Pick your next batter!" : "Opponent is picking…";
    setWicketAnnounce({ outName, inName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innings.wickets]);
  // Effect 2: 4-second auto-dismiss timer. Separated so StrictMode's cleanup +
  // re-invoke correctly restarts the timer after the state has settled.
  useEffect(() => {
    if (!wicketAnnounce) return;
    const t = setTimeout(() => setWicketAnnounce(null), 4000);
    return () => clearTimeout(t);
  }, [wicketAnnounce]);

  // ─── Batting order panel ──────────────────────────────────────────────
  const isBattingPlayer = innings.battingPlayerId === selfId;
  const [battingOrderOpen, setBattingOrderOpen] = useState(false);

  function pick(n: number) {
    if (myPick != null) return;
    if (innings.currentBowlerId == null) return; // wait for bowler
    getSocket().emit("game:move", { type: "pick", data: { pick: n } });
  }

  const target = state.innings1 && state.phase === "innings2"
    ? state.innings1.runs + 1
    : null;

  const needsBowler = innings.currentBowlerId == null;

  return (
    <div className={isDesktop ? "space-y-2.5" : "space-y-3"}>
      <Scoreboard
        state={state}
        innings={innings}
        target={target}
        players={players}
        big={isDesktop}
      />

      {isPowerplayOver && innings.currentBowlerId != null && (
        <PowerplayBanner
          overNumber={upcomingOver}
          totalPowerplayOvers={innings.powerplayOvers}
          restrictedBalls={restrictedThisOver}
          currentBallInOver={upcomingBall}
          bowlerRestricted={bowlerRestricted}
          myRole={myRole}
        />
      )}

      <CurrentPlayersBar state={state} innings={innings} selfId={selfId} big={isDesktop} />

      {/* Wicket + new batter announcement — shows for 4 s when a wicket falls. */}
      {wicketAnnounce && (
        <WicketNotification
          outName={wicketAnnounce.outName}
          inName={wicketAnnounce.inName}
          onDismiss={() => setWicketAnnounce(null)}
        />
      )}

      {/* Ripped-parchment ribbon — dynamically announces the local player's
          role, floating between the scoreboard and the action card below. */}
      {myRole && (
        <HcRibbonBanner tone={myRole === "batter" ? "batting" : "bowling"}>
          You are {myRole === "batter" ? "Batting" : "Bowling"}
        </HcRibbonBanner>
      )}

      {/* Batting order panel — batting player can shuffle upcoming batters. */}
      {isBattingPlayer && !innings.endedReason && (
        <div>
          <button
            onClick={() => setBattingOrderOpen((o) => !o)}
            className="w-full flex items-center justify-between text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg transition"
            style={{
              background: battingOrderOpen ? "rgba(22,101,52,0.14)" : "rgba(22,101,52,0.07)",
              border: "1px solid rgba(22,101,52,0.28)",
              color: "#166534",
            }}
          >
            <span>🏏 Batting Order</span>
            <span style={{ fontSize: 10 }}>{battingOrderOpen ? "▲ hide" : "▼ show"}</span>
          </button>
          {battingOrderOpen && (
            <BattingOrderPanel innings={innings} state={state} />
          )}
        </div>
      )}

      {/* ── Action area ─────────────────────────────────────────────────
           Three mutually-exclusive states:
           1. Wicket pending → show NextBatterPicker (batting) / waiting (bowling)
           2. No bowler yet  → show BowlerPicker
           3. Live ball      → show RevealStage + PickRow                       */}
      {innings.needsNextBatterPick ? (
        <>
          {isBattingPlayer ? (
            <NextBatterPicker state={state} innings={innings} big={isDesktop} />
          ) : (
            <div
              className="rounded-lg text-center py-5 font-notebook"
              style={{
                background: "rgba(245,233,196,0.6)",
                border: "1.5px dashed rgba(46,40,25,0.45)",
                fontFamily: "'Kalam', cursive",
              }}
            >
              <div className="text-[28px] mb-1">🏏</div>
              <div className="font-bold text-hc-ink" style={{ fontSize: isDesktop ? 16 : 14 }}>
                Opponent is selecting the next batter…
              </div>
            </div>
          )}
          {/* Concurrent: bowling player may also need to pick a bowler
               if the wicket fell on the last ball of an over. */}
          {needsBowler && (
            <BowlerPicker state={state} innings={innings} selfId={selfId} players={players} />
          )}
        </>
      ) : needsBowler ? (
        <BowlerPicker state={state} innings={innings} selfId={selfId} players={players} />
      ) : (
        <>
          <RevealStage
            reveal={reveal}
            innings={innings}
            myId={selfId}
            oppLockedIn={oppLockedIn}
            myPick={typeof myPick === "number" && myPick > 0 ? myPick : null}
            big={isDesktop}
          />

          <PickRow
            disabled={myPick != null || reveal !== null}
            onPick={pick}
            selected={typeof myPick === "number" && myPick > 0 ? myPick : null}
            allowedPicks={myRole === "bowler" ? allowedBowlerPicks : [1, 2, 3, 4, 5, 6]}
            restrictedNote={bowlerRestricted ? "Powerplay — bowler limited to 1, 2 or 3" : null}
            big={isDesktop}
          />

          <div
            className="flex justify-center gap-6 text-hc-ink-lt"
            style={{ fontSize: isDesktop ? 14 : 12 }}
          >
            <div>You: {myPick != null && typeof myPick === "number" && myPick > 0 ? "✓ locked" : "thinking…"}</div>
            <div>Opp: {oppLockedIn ? "✓ locked" : "thinking…"}</div>
          </div>
        </>
      )}

      {target != null && (
        <div
          className="text-center text-hc-amber font-bold"
          style={{ fontSize: isDesktop ? 15 : 13 }}
        >
          Target: <b>{target}</b> · Need {Math.max(0, target - innings.runs)} more from{" "}
          {Math.max(0, innings.overs * 6 - innings.balls)} balls
        </div>
      )}

      {innings.history.length > 0 && (
        <RecentBalls history={innings.history.slice(-12)} />
      )}
    </div>
  );
}

export function CurrentPlayersBar({
  state,
  innings,
  selfId,
  big = false,
}: {
  state: HcState;
  innings: HcInnings;
  selfId: string;
  big?: boolean;
}) {
  const battingSelection = state.teamSelections[innings.battingPlayerId];
  const bowlingSelection = state.teamSelections[innings.bowlingPlayerId];
  const battingTeamId = battingSelection?.teamId;
  const bowlingTeamId = bowlingSelection?.teamId;
  const battingRoster = battingTeamId
    ? getRosterFor(battingTeamId, state.options.format)
    : null;
  const bowlingRoster = bowlingTeamId
    ? getRosterFor(bowlingTeamId, state.options.format)
    : null;
  const allBattingPlayers: HcPlayerProfile[] = battingRoster
    ? [...battingRoster.squad, ...battingRoster.extras]
    : [];
  const allBowlingPlayers: HcPlayerProfile[] = bowlingRoster
    ? [...bowlingRoster.squad, ...bowlingRoster.extras]
    : [];
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

  const batterStatSub = (stats: typeof strikerStats) =>
    stats
      ? `${stats.runs}${stats.isOut ? "" : "*"} (${stats.balls})${
          stats.fours ? ` · ${stats.fours}×4` : ""
        }${stats.sixes ? ` · ${stats.sixes}×6` : ""}`
      : "Yet to face";

  const bowlingIsMine = innings.bowlingPlayerId === selfId;
  const waitingForBowler = !currentBowler;

  return (
    // One organic single-stroke sketch box holds all three columns — divided
    // internally by hairlines rather than three separately-bordered cards.
    <div className="relative rounded-lg bg-hc-paper-l/70">
      <RoughBorder roughness={1.6} stroke="rgba(46,40,25,0.5)" strokeWidth={1.6} padding={3} />
      <div className={cn("relative z-[1] grid grid-cols-1 sm:grid-cols-3", big ? "divide-y sm:divide-y-0 sm:divide-x" : "divide-y sm:divide-y-0 sm:divide-x")} style={{ borderColor: "rgba(46,40,25,0.22)" }}>
        <PlayerCard
          label="🏏 Striker ●"
          name={striker?.name ?? "—"}
          sub={batterStatSub(strikerStats)}
          isMine={innings.battingPlayerId === selfId}
          big={big}
        />
        <PlayerCard
          label="🏃 Non-striker"
          name={nonStriker?.name ?? "—"}
          sub={batterStatSub(nonStrikerStats)}
          isMine={innings.battingPlayerId === selfId}
          dimmed
          big={big}
        />
        {/* Bowling column — orange/red hand-inked flag + pulsing "waiting"
            state and a detailed stitched ball while no bowler is picked yet. */}
        <div className={cn("flex items-center justify-between gap-2", big ? "px-3.5 py-2.5" : "px-2.5 py-1.5")}>
          <div className="min-w-0">
            <div
              className="font-extrabold uppercase tracking-[0.12em]"
              style={{ fontSize: big ? 11 : 9, color: waitingForBowler ? "#c2410c" : "#4a5a82" }}
            >
              ⚾ Bowling
              {bowlingIsMine && (
                <span className="ml-1 font-extrabold" style={{ fontSize: big ? 11 : 9, color: "#c2410c" }}>· YOU</span>
              )}
            </div>
            {waitingForBowler ? (
              <div
                className="font-bold leading-tight animate-pulse"
                style={{ fontSize: big ? 15 : 12, color: "#c2410c" }}
              >
                Waiting… Pick a bowler
              </div>
            ) : (
              <>
                <div className="leading-tight font-bold text-hc-ink truncate" style={{ fontSize: big ? 18 : 13 }}>
                  {currentBowler?.name}
                </div>
                <div className="tabular-nums text-hc-ink-lt" style={{ fontSize: big ? 14 : 11 }}>
                  {bowlerStats
                    ? `${Math.floor(bowlerStats.balls / 6)}.${bowlerStats.balls % 6}-${bowlerStats.wickets}-${bowlerStats.runs}`
                    : "0.0-0-0"}
                </div>
              </>
            )}
          </div>
          {waitingForBowler && (
            <div className="flex-shrink-0" style={{ animation: "hc-glow-pulse 1.6s ease-in-out infinite" }}>
              <CricketBallStitchSketch size={big ? 34 : 28} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlayerCard({
  label,
  name,
  sub,
  isMine,
  dimmed = false,
  big = false,
}: {
  label: string;
  name: string;
  sub: string;
  isMine: boolean;
  dimmed?: boolean;
  big?: boolean;
}) {
  return (
    <div className={cn(big ? "px-3.5 py-2.5" : "px-2.5 py-1.5", dimmed && "opacity-80")}>
      <div
        className="font-extrabold uppercase tracking-[0.12em] text-hc-ink-lt"
        style={{ fontSize: big ? 11 : 9 }}
      >
        {label}
        {isMine && <span className="ml-1 text-hc-stamp font-extrabold" style={{ fontSize: big ? 11 : 9 }}>· YOU</span>}
      </div>
      <div className="leading-tight font-bold text-hc-ink" style={{ fontSize: big ? 18 : 13 }}>{name}</div>
      <div className="tabular-nums text-hc-ink-lt" style={{ fontSize: big ? 14 : 11 }}>{sub}</div>
    </div>
  );
}

export function BowlerPicker({
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
  const bowlingSelection = state.teamSelections[innings.bowlingPlayerId];
  const bowlingTeamId = bowlingSelection?.teamId;
  const roster = bowlingTeamId ? getRosterFor(bowlingTeamId, state.options.format) : null;
  const allBowlingPlayers: HcPlayerProfile[] = roster
    ? [...roster.squad, ...roster.extras]
    : [];
  const selectedSquadIds = bowlingSelection?.squadPlayerIds ?? [];
  const candidates = selectedSquadIds
    .map((id) => allBowlingPlayers.find((p) => p.id === id))
    .filter((p): p is HcPlayerProfile => !!p);
  const bowlingName = players.find((p) => p.id === innings.bowlingPlayerId)?.name ?? "Bowler";

  function pickBowler(profileId: string) {
    getSocket().emit("game:move", { type: "selectBowler", data: { playerId: profileId } });
  }

  if (!amBowling) {
    return (
      <PaperPanel tone="soft" pad="md" className="text-center font-notebook">
        <span className="text-hc-ink-lt">⚾ Waiting for </span>
        <span className="font-bold text-hc-ink">{bowlingName}</span>
        <span className="text-hc-ink-lt"> to pick the bowler for over {Math.floor(innings.balls / 6) + 1}…</span>
      </PaperPanel>
    );
  }

  // Only bowlers and all-rounders can bowl.
  const bowlersOnly = candidates
    .filter((p) => p.role === "bowler" || p.role === "allrounder")
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const maxOvers = HC_MAX_OVERS_PER_BOWLER[state.options.format];
  const quotaLabel = maxOvers == null ? "no limit" : `${maxOvers} overs max`;

  return (
    // Distressed parchment card with a curled bottom-right corner — the
    // "Lower Action Box" of the reference layout.
    <PaperPanel tone="soft" pad="md" className="relative space-y-3 font-notebook overflow-visible">
      <CurledCornerFold size={40} />

      <div className="flex items-center justify-center gap-2">
        <BallInMotionIcon size={22} />
        <span className="font-sketch font-bold text-hc-ink text-[15px]">
          Pick your bowler for over {Math.floor(innings.balls / 6) + 1}
        </span>
      </div>

      {bowlersOnly.length === 0 ? (
        <div className="text-center text-sm font-bold py-4 text-hc-amber">
          No bowlers or all-rounders in your XI. (This shouldn't happen if composition rules held.)
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {bowlersOnly.map((p) => {
            const stats = innings.bowlerStats[p.id];
            const completedOvers = stats ? Math.floor(stats.balls / 6) : 0;
            const atQuota = maxOvers != null && completedOvers >= maxOvers;
            return (
              <PaperCard
                key={p.id}
                tone="default"
                disabled={atQuota}
                interactive={!atQuota}
                onClick={() => !atQuota && pickBowler(p.id)}
                ariaLabel={p.name}
              >
                {/* Metal paperclip "pinning" this card to the page. */}
                <PaperclipGraphic />
                <div className="px-2 py-1.5 text-left">
                  <div className="flex items-center gap-1.5">
                    <PaperBadge tone={p.role === "bowler" ? "bowler" : "allrounder"}>
                      {p.role === "bowler" ? "BOWL" : "AR"}
                    </PaperBadge>
                    {p.isCaptain && <PaperBadge tone="captain">C</PaperBadge>}
                    {atQuota && <PaperBadge tone="bowler" className="ml-auto">MAX</PaperBadge>}
                  </div>
                  <div className="text-xs font-bold mt-1 leading-tight text-hc-ink">{p.name}</div>
                  <div className="flex items-center justify-between mt-0.5 gap-2">
                    {stats && (stats.balls > 0 || stats.wickets > 0) ? (
                      <span className="tabular-nums text-[10px] text-hc-ink-lt">
                        {Math.floor(stats.balls / 6)}.{stats.balls % 6}-{stats.wickets}-{stats.runs}
                      </span>
                    ) : (
                      <span className="italic text-[10px] text-hc-ink-lt">unused</span>
                    )}
                    {maxOvers != null && (
                      <span className="font-bold tabular-nums text-[9px] px-1.5 rounded-[3px] bg-hc-ink/10 text-hc-ink-lt">
                        {completedOvers}/{maxOvers}
                      </span>
                    )}
                  </div>
                </div>
              </PaperCard>
            );
          })}
        </div>
      )}

      {/* Hand-scrawled red warning caption. */}
      <div className="text-center font-hand font-bold text-hc-ink-red" style={{ fontSize: 12 }}>
        Only bowlers and all-rounders can bowl · Format quota: {quotaLabel}
      </div>
    </PaperPanel>
  );
}

export function Scoreboard({
  state,
  innings,
  target,
  players,
  big = false,
}: {
  state: HcState;
  innings: HcInnings;
  target: number | null;
  players: Player[];
  big?: boolean;
}) {
  const batterTeam = teamLabel(state, innings.battingPlayerId, players);
  const oversBowled = Math.floor(innings.balls / 6);
  const ballsThisOver = innings.balls % 6;
  return (
    <PaperPanel
      tone="soft"
      strong
      pad="none"
      className={cn("relative flex items-center justify-between gap-3 font-notebook", big ? "px-5 py-3" : "px-3.5 py-2.5")}
    >
      {/* "Taped down" corners — the scoreboard reads as a thick piece of
          cardstock pinned onto the notebook page rather than a flat panel. */}
      <MaskingTapeCorner side="left" />
      <MaskingTapeCorner side="right" />

      <div className="flex items-center gap-3">
        <span className={big ? "text-3xl" : "text-2xl"}>{batterTeam.flag}</span>
        <div>
          <div
            className="font-bold uppercase tracking-[0.12em] text-hc-ink-lt"
            style={{ fontSize: big ? 13 : 11 }}
          >
            Innings {innings.number} · {batterTeam.short} ({batterTeam.playerName}) batting
          </div>
          {/* Giant organic handwritten score — runs in ink, wickets in red pen. */}
          <div
            className="font-sketch tabular-nums leading-none text-hc-ink"
            style={{ fontSize: big ? 66 : 48, fontWeight: 700 }}
          >
            {innings.runs}<span className="text-hc-ink-red">/{innings.wickets}</span>
          </div>
          <div className="tabular-nums text-hc-ink-lt" style={{ fontSize: big ? 14 : 12 }}>
            Overs {oversBowled}.{ballsThisOver} / {innings.overs}
          </div>
        </div>
      </div>

      {/* Three stumps pitched in a scribbled patch of grass — sits between
          the score and the target chip so the card reads as illustrated,
          not just typeset. */}
      <div className="flex-shrink-0 hidden sm:block" style={{ opacity: 0.9 }}>
        <StumpsInGrassSketch size={big ? 58 : 44} />
      </div>

      {target != null && (
        <div className="text-right text-hc-amber flex-shrink-0">
          <div className="uppercase tracking-wider font-bold" style={{ fontSize: big ? 12 : 10 }}>Target</div>
          <div className="font-extrabold tabular-nums" style={{ fontSize: big ? 32 : 24 }}>{target}</div>
        </div>
      )}
    </PaperPanel>
  );
}

export function RevealStage({
  reveal,
  innings,
  myId,
  oppLockedIn,
  myPick,
  big = false,
}: {
  reveal: HcBall | null;
  innings: HcInnings;
  myId: string;
  oppLockedIn: boolean;
  myPick: number | null;
  big?: boolean;
}) {
  const meIsBatter = innings.battingPlayerId === myId;
  if (reveal) {
    const myShown = meIsBatter ? reveal.batterPick : reveal.bowlerPick;
    const oppShown = meIsBatter ? reveal.bowlerPick : reveal.batterPick;
    return (
      <div className={cn("flex items-center justify-center py-3", big ? "gap-10" : "gap-6")}>
        <RevealHand label="You" pick={myShown} side="left" big={big} />
        <div
          className="font-extrabold"
          style={{ fontSize: big ? 40 : 28, color: reveal.wicket ? "#f43f5e" : reveal.isBoundary ? "#d97706" : "#1a2952" }}
        >
          {reveal.wicket ? "WICKET!" : reveal.runs === 4 ? "FOUR!" : reveal.runs === 6 ? "SIX!" : `+${reveal.runs}`}
        </div>
        <RevealHand label="Opp" pick={oppShown} side="right" big={big} />
      </div>
    );
  }
  return (
    <div className={cn("flex items-center justify-center py-3", big ? "gap-10" : "gap-6")}>
      <RevealHand label="You" pick={myPick} side="left" pending={myPick == null} big={big} />
      <div className="text-hc-ink-lt" style={{ fontSize: big ? 26 : 20 }}>vs</div>
      <RevealHand label="Opp" pick={null} side="right" pending={!oppLockedIn} hidden={oppLockedIn} big={big} />
    </div>
  );
}

export function RevealHand({
  label,
  pick,
  side,
  pending,
  hidden,
  big = false,
}: {
  label: string;
  pick: number | null;
  side: "left" | "right";
  pending?: boolean;
  hidden?: boolean;
  big?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`${side === "left" ? "rps-slam-left" : "rps-slam-right"} text-hc-ink`}
        key={pick ?? (hidden ? "h" : "p")}
        style={{ fontSize: big ? 76 : 48 }}
      >
        {pick != null ? HAND_FACES[pick] ?? pick : hidden ? "🤐" : pending ? "❓" : "—"}
      </div>
      <div className="mt-1 text-hc-ink-lt" style={{ fontSize: big ? 15 : 12 }}>{label}{pick != null ? ` · ${pick}` : ""}</div>
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
  const side = big ? 60 : 44;
  return (
    <div className="space-y-2">
      {restrictedNote && (
        <div
          className="text-center text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full mx-auto inline-block"
          style={{
            background: "rgba(180,120,0,0.12)",
            color: "#b45309",
            border: "1px solid rgba(180,120,0,0.4)",
            display: "block",
            maxWidth: "fit-content",
            margin: "0 auto",
          }}
        >
          🔥 {restrictedNote}
        </div>
      )}
      <div className={cn("flex flex-wrap justify-center", big ? "gap-3" : "gap-2")}>
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const isAllowed = allowedPicks.includes(n);
          const isDisabled = disabled || !isAllowed;
          const base = { borderRadius: 8, width: side, height: side, fontWeight: 800, fontSize: big ? 22 : 18 } as const;
          return (
            <button
              key={n}
              onClick={() => isAllowed && onPick(n)}
              disabled={isDisabled}
              title={!isAllowed ? "Restricted during powerplay" : undefined}
              className="relative flex flex-col items-center justify-center font-bold transition hover:scale-[1.05]"
              style={selected === n
                ? { ...base, background: "rgba(22,101,52,0.15)", border: "1.5px solid #166534", color: "#166534" }
                : isDisabled
                ? { ...base, background: "#FBF5E0", border: "1.5px dashed rgba(46,40,25,0.55)", color: "#1a2952", opacity: 0.45, cursor: "not-allowed" }
                : { ...base, background: "#FBF5E0", border: "1.5px dashed rgba(46,40,25,0.55)", color: "#1a2952" }
              }
            >
              <span className="leading-none" style={{ fontSize: big ? 22 : 16 }}>{HAND_FACES[n] ?? n}</span>
              <span className="mt-1 opacity-80" style={{ fontSize: big ? 13 : 11 }}>{n}</span>
              {!isAllowed && (
                <span className="absolute top-0.5 right-1 text-[8px] font-extrabold" style={{ color: "#991b1b" }}>
                  ✕
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PowerplayBanner({
  overNumber,
  totalPowerplayOvers,
  restrictedBalls,
  currentBallInOver,
  bowlerRestricted,
  myRole,
}: {
  overNumber: number;
  totalPowerplayOvers: number;
  restrictedBalls: number[];
  currentBallInOver: number;
  bowlerRestricted: boolean;
  myRole: "batter" | "bowler" | null;
}) {
  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        background: "linear-gradient(135deg, #7c2d12 0%, #b45309 50%, #ea580c 100%)",
        border: "2px solid #fbbf24",
        boxShadow: "0 0 18px rgba(251,191,36,0.35)",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-amber-100">
              Powerplay
            </div>
            <div className="text-xs font-bold text-amber-50">
              Over {overNumber} of {totalPowerplayOvers} · 3 random balls restrict the bowler to 1-3
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6].map((b) => {
            const isRestricted = restrictedBalls.includes(b);
            const isCurrent = b === currentBallInOver;
            return (
              <span
                key={b}
                className="w-6 h-6 rounded text-[10px] font-extrabold flex items-center justify-center tabular-nums"
                style={{
                  background: isRestricted
                    ? isCurrent
                      ? "#fbbf24"
                      : "rgba(251,191,36,0.55)"
                    : "rgba(0,0,0,0.35)",
                  color: isRestricted ? "#7c2d12" : "#fed7aa",
                  border: isCurrent ? "2px solid #fef3c7" : "1px solid rgba(0,0,0,0.3)",
                  boxShadow: isCurrent ? "0 0 6px #fbbf24" : undefined,
                }}
                title={
                  isRestricted
                    ? `Ball ${b}: bowler restricted to 1-3`
                    : `Ball ${b}: no restriction`
                }
              >
                {b}
              </span>
            );
          })}
        </div>
      </div>
      {bowlerRestricted && myRole === "bowler" && (
        <div className="text-center mt-1 text-[11px] font-extrabold" style={{ color: "#92400e" }}>
          ⚠ This ball is restricted — you may only pick 1, 2, or 3
        </div>
      )}
      {bowlerRestricted && myRole === "batter" && (
        <div className="text-center mt-1 text-[11px] font-extrabold" style={{ color: "#166534" }}>
          ✨ This ball: bowler can only pick 1-3. Pick 4, 5, or 6 to score big risk-free!
        </div>
      )}
    </div>
  );
}

export function RecentBalls({ history }: { history: HcBall[] }) {
  return (
    <PaperPanel tone="soft" pad="sm" className="font-notebook">
      <div className="text-[10px] uppercase tracking-[0.12em] text-hc-ink-lt mb-1 pl-1">
        This over
      </div>
      <div className="flex flex-wrap gap-1">
        {history.map((b, i) => (
          <span
            key={`${b.overNumber}-${b.ballInOver}-${i}`}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-kalam border-[1.5px] border-dashed border-hc-border",
              b.wicket
                ? "bg-hc-ink-red/15 text-hc-ink-red"
                : b.isBoundary
                ? "bg-hc-gold/15 text-hc-amber"
                : "bg-hc-paper/80 text-hc-ink",
            )}
            title={`Over ${b.overNumber}.${b.ballInOver}: batter ${b.batterPick} vs bowler ${b.bowlerPick}`}
          >
            {b.wicket ? "W" : b.runs}
          </span>
        ))}
      </div>
    </PaperPanel>
  );
}

/** Aggregated match contribution for one cricketer, used to pick MoM. */
interface MomAgg {
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
  const nameOfPlayer = (pid: string) => players.find((p) => p.id === pid)?.name ?? "Player";

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
  const winnerName = players.find((p) => p.id === state.winnerId)?.name ?? "—";
  const winnerTeam = state.winnerId
    ? teamLabel(state, state.winnerId, players)
    : null;

  const mom = useMemo(() => computeManOfTheMatch(state, players), [state, players]);

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
      </div>

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

type HcCelebrationData =
  | { kind: "four"; id: number; batter: string; message: string }
  | { kind: "six"; id: number; batter: string; message: string }
  | { kind: "wicket"; id: number; batter: string; bowler: string; message: string }
  | { kind: "hattrickWickets"; id: number; bowler: string; message: string }
  | { kind: "streak"; id: number; batter: string; title: string; message: string; variant: "sixes" | "fours" | "mixed" }
  | { kind: "winner"; id: number; youWon: boolean; winnerName: string; margin: string; isTie: boolean };

/** Resolve a batter/bowler profile id to the real player's name (e.g. "Pathum
 *  Nissanka"), not the socket player's display name. Falls back gracefully. */
function profileNameFor(
  state: HcState,
  teamPlayerId: string,
  profileId: string | undefined,
  fallback: string,
): string {
  if (!profileId) return fallback;
  const sel = state.teamSelections[teamPlayerId];
  const roster = sel?.teamId ? getRosterFor(sel.teamId, state.options.format) : null;
  if (!roster) return fallback;
  const found = [...roster.squad, ...roster.extras].find((p) => p.id === profileId);
  return found?.name ?? fallback;
}

/** Pick a random flavour line — keeps the boundary/wicket call-outs from
 *  reading as the same static string every time. */
function pickLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

/** Build a dynamic commentary line for a 3-ball big-hitting streak. */
function describeBoundaryStreak(
  last3: HcBall[],
  batter: string,
): { title: string; message: string; variant: "sixes" | "fours" | "mixed" } {
  const runs = last3.map((b) => b.runs);
  if (runs.every((r) => r === 6)) {
    return {
      variant: "sixes",
      title: "HAT-TRICK OF SIXES!",
      message: pickLine([
        `🚀 ${batter} — three maximums in a row! Monstrous hitting!`,
        `💥 ${batter} clears the ropes three times on the trot!`,
        `🔥 ${batter} is launching everything into the stands!`,
      ]),
    };
  }
  if (runs.every((r) => r === 4)) {
    return {
      variant: "fours",
      title: "THREE IN A ROW!",
      message: pickLine([
        `🏏 ${batter} — three cracking fours on the bounce!`,
        `⚡ ${batter} is finding the fence at will!`,
        `✨ ${batter} rattles off a hat-trick of boundaries!`,
      ]),
    };
  }
  const sum = runs.reduce((a, b) => a + b, 0);
  return {
    variant: "mixed",
    title: "ON FIRE!",
    message: pickLine([
      `🔥 ${batter} is on fire with great shots — ${runs.join(", ")} off the last three!`,
      `💫 ${batter} is dealing in big hits — ${sum} runs in three balls!`,
      `😤 ${batter} has the bowler on the ropes!`,
      `🌟 ${batter} is middling everything right now!`,
    ]),
  };
}

export function HcCelebrationLayer({
  state,
  players,
  selfId,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
}) {
  const [active, setActive] = useState<HcCelebrationData | null>(null);
  const prevLensRef = useRef({
    i1: state.innings1?.history.length ?? 0,
    i2: state.innings2?.history.length ?? 0,
  });
  const prevPhaseRef = useRef(state.phase);

  const nameOf = (id: string | null | undefined) =>
    players.find((p) => p.id === id)?.name ?? "Player";

  // Ball events
  useEffect(() => {
    const i1Len = state.innings1?.history.length ?? 0;
    const i2Len = state.innings2?.history.length ?? 0;
    const prev = prevLensRef.current;

    let inn: HcInnings | null = null;
    if (i1Len > prev.i1) inn = state.innings1!;
    else if (i2Len > prev.i2) inn = state.innings2!;

    if (inn) {
      const last3 = inn.history.slice(-3);
      const lastBall = last3[last3.length - 1];
      // A "big shot" is any non-wicket ball worth 4+ — so 4,5,6 counts as a
      // hot streak even though a 5 isn't a boundary.
      const isBigShot = (b: HcBall) => !b.wicket && b.runs >= 4;
      const allWickets = last3.length === 3 && last3.every((b) => b.wicket);
      const bigStreak = last3.length === 3 && last3.every(isBigShot);

      // Real batsman/bowler names for THIS ball (profile ids on the ball),
      // not the socket player's display name.
      const batterName = profileNameFor(state, inn.battingPlayerId, lastBall.batterId, nameOf(inn.battingPlayerId));
      const bowlerName = profileNameFor(state, inn.bowlingPlayerId, lastBall.bowlerId, nameOf(inn.bowlingPlayerId));
      const stamp = Date.now();

      if (allWickets) {
        setActive({
          kind: "hattrickWickets",
          id: stamp,
          bowler: bowlerName,
          message: pickLine([
            `🎯 ${bowlerName} is unplayable — three in a row!`,
            `🔥 ${bowlerName} rips the heart out of the innings!`,
          ]),
        });
      } else if (bigStreak) {
        const s = describeBoundaryStreak(last3, batterName);
        setActive({ kind: "streak", id: stamp, batter: batterName, ...s });
      } else if (lastBall.wicket) {
        setActive({
          kind: "wicket",
          id: stamp,
          batter: batterName,
          bowler: bowlerName,
          message: pickLine([
            `🎯 ${batterName} has to go — ${bowlerName} strikes!`,
            `💥 ${bowlerName} gets his man! ${batterName} departs.`,
            `😱 Big wicket! ${batterName} is dismissed by ${bowlerName}.`,
          ]),
        });
      } else if (lastBall.runs === 6) {
        setActive({
          kind: "six",
          id: stamp,
          batter: batterName,
          message: pickLine([
            `🚀 ${batterName} sends it out of the park!`,
            `💥 ${batterName} goes big — that's a maximum!`,
            `🔥 ${batterName} deposits it into the stands!`,
          ]),
        });
      } else if (lastBall.runs === 4) {
        setActive({
          kind: "four",
          id: stamp,
          batter: batterName,
          message: pickLine([
            `🏏 ${batterName} finds the fence — cracking shot!`,
            `⚡ ${batterName} pierces the gap for four!`,
            `✨ ${batterName} times it beautifully to the boundary!`,
          ]),
        });
      }
    }

    prevLensRef.current = { i1: i1Len, i2: i2Len };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.innings1?.history.length, state.innings2?.history.length]);

  // Match-over winner celebration
  useEffect(() => {
    if (prevPhaseRef.current !== "finished" && state.phase === "finished") {
      const isTie = state.result === "tie";
      const youWon = !!state.winnerId && state.winnerId === selfId;
      const winnerName = state.winnerId ? nameOf(state.winnerId) : "—";
      let margin = "";
      const i1 = state.innings1;
      const i2 = state.innings2;
      if (!isTie && i1 && i2) {
        const winnerInn = i1.runs > i2.runs ? i1 : i2;
        const gap = Math.abs(i1.runs - i2.runs);
        if (winnerInn.number === 2) {
          const wktsLeft = state.maxWickets - winnerInn.wickets;
          margin = `by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
        } else {
          margin = `by ${gap} run${gap === 1 ? "" : "s"}`;
        }
      }
      setActive({
        kind: "winner",
        id: Date.now(),
        youWon,
        winnerName,
        margin,
        isTie,
      });
    }
    prevPhaseRef.current = state.phase;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.winnerId, state.result]);

  // Auto-dismiss
  useEffect(() => {
    if (!active) return;
    const ms =
      active.kind === "winner" ? 4800
      : active.kind === "hattrickWickets" || active.kind === "streak" ? 3200
      : active.kind === "six" ? 2200
      : active.kind === "wicket" ? 2000
      : 1800;
    const t = setTimeout(() => setActive(null), ms);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;
  return <HcCelebrationOverlay data={active} />;
}

export function HcCelebrationOverlay({ data }: { data: HcCelebrationData }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            data.kind === "wicket" || data.kind === "hattrickWickets"
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
      {data.kind === "winner" && !data.isTie && <ConfettiRain count={60} />}

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
      return (
        <div className="relative hc-streak-wobble text-center px-4">
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
