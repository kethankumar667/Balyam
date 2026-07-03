/**
 * hc-notebook.tsx
 *
 * Hand Cricket notebook / scrapbook-themed presentational layer.
 * Matches the two reference screenshots exactly:
 *
 *  • Country picker — parchment page, pencil-box border, 5×2 country card grid,
 *    large 2-letter country codes in team-colour ink, ★ SELECTED badge,
 *    cricket doodles (ball, stumps, trophy).
 *
 *  • Header — "🏏 HAND CRICKET" title with underline, format + category pills,
 *    team-matchup chip pair (flag · code · player name), room-rail icon row.
 *
 *  • Two-panel desktop wrapper — left column for the active phase content,
 *    right column for the room rail.
 *
 * The existing `hc-shared.tsx` phase components (toss, innings, squad picker,
 * etc.) are wrapped inside HcNotebookPage without touching their own markup,
 * so this file only owns the outer chrome.
 */

import type { ReactNode } from "react";
import type {
  HcCountry,
  HcFranchise,
  HcState,
  Player,
  ChatMessage,
} from "@shared/types";
import {
  HC_COUNTRIES,
  HC_FRANCHISES,
  getRosterFor,
} from "@shared/hc-rosters";
import { getSocket } from "../../lib/socket";
import InlineRoomRail from "../../components/InlineRoomRail";

/* ─── palette ─── */
const PAPER   = "#F5E9C4";
const PAPER_L = "#FBF5E0";
const LINE    = "rgba(100,115,180,0.18)";
const MARGIN  = "rgba(200,80,80,0.35)";
const INK     = "#1a2952";
const INK_LT  = "#4a5a82";
const WOOD    = "#4a2c12";
const BORDER  = "rgba(46,40,25,0.55)";

/** Country display code + ink colour — matching reference image. */
const COUNTRY_META: Record<HcCountry, { code: string; color: string; accent?: string }> = {
  india:       { code: "IN",  color: "#166534" },
  australia:   { code: "AU",  color: "#92400e" },
  england:     { code: "ENG", color: "#991b1b" },
  newzealand:  { code: "NZ",  color: "#1e293b" },
  southafrica: { code: "SA",  color: "#166534" },
  pakistan:    { code: "PK",  color: "#166534" },
  westindies:  { code: "WI",  color: "#7c1d1d" },
  srilanka:    { code: "LK",  color: "#1e3a8a" },
  bangladesh:  { code: "BD",  color: "#6b7280" },
  afghanistan: { code: "AF",  color: "#6b7280" },
};

const COUNTRY_ORDER: HcCountry[] = [
  "india", "australia", "england", "newzealand", "southafrica",
  "pakistan", "westindies", "srilanka", "bangladesh", "afghanistan",
];

/* ═══════════════════════════════════════════════════════════════
   NOTEBOOK PAGE FRAME
═══════════════════════════════════════════════════════════════ */

export function HcNotebookPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{
        background: WOOD,
        borderRadius: 14,
        padding: "10px 10px 10px 50px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
      }}
    >
      <BindingHoles />

      <div
        className="relative overflow-hidden"
        style={{
          background: PAPER,
          borderRadius: 6,
          backgroundImage: [
            `repeating-linear-gradient(to bottom,
              transparent, transparent 27px,
              ${LINE} 27px, ${LINE} 28px)`,
            `linear-gradient(to right, ${MARGIN} 0px, ${MARGIN} 1.5px, transparent 1.5px)`,
          ].join(", "),
          backgroundPosition: "0 12px, 36px 0",
          minHeight: "calc(100vh - 40px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function BindingHoles() {
  return (
    <div
      className="absolute left-0 top-0 bottom-0 flex flex-col justify-evenly items-center pointer-events-none"
      style={{ width: 50, paddingTop: 16, paddingBottom: 16 }}
    >
      {Array.from({ length: 13 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: WOOD,
            border: "2px solid rgba(255,255,255,0.12)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.55)",
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NOTEBOOK HEADER
═══════════════════════════════════════════════════════════════ */

export function HcNotebookHeader({
  state,
  players,
  selfId,
  roomCode,
  roomPhase,
  messages,
  onHelp,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
  roomCode: string;
  roomPhase: string;
  messages: ChatMessage[];
  onHelp?: () => void;
}) {
  const [p0, p1] = state.playerOrder;
  const t0 = labelFor(state, p0, players);
  const t1 = labelFor(state, p1, players);
  const formatLabel =
    state.options.format === "test" ? "Test · 30 overs"
    : state.options.format === "odi" ? "ODI · 15 overs"
    : "T20 · 10 overs";
  const categoryLabel = state.options.category === "ipl" ? "IPL" : "INTERNATIONAL";

  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
      {/* ── Left: title + pills ── */}
      <div className="flex items-start gap-3">
        <CricketBallIcon />
        <div>
          <div className="flex items-center gap-2">
            <span
              className="font-display font-black tracking-wider uppercase"
              style={{ color: INK, fontSize: "clamp(18px,2.5vw,28px)" }}
            >
              Hand Cricket
            </span>
            {/* Underline from reference */}
            <div style={{ width: 40, height: 2, background: "#c0392b", borderRadius: 1, marginTop: 3, flexShrink: 0 }} />
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Pill>{formatLabel.toUpperCase()}</Pill>
            <Pill>{categoryLabel}</Pill>
          </div>
        </div>
      </div>

      {/* ── Right: matchup + rail icons + help ── */}
      <div className="flex items-start gap-3">
        {/* Team matchup chip */}
        <div className="flex items-center gap-2">
          <TeamChipNb
            flag={t0.flag}
            code={t0.short}
            playerName={t0.playerName}
            isSelf={p0 === selfId}
            unknown={!t0.short}
          />
          <span className="font-bold text-sm" style={{ color: INK_LT }}>vs</span>
          <TeamChipNb
            flag={t1.flag}
            code={t1.short}
            playerName={t1.playerName}
            isSelf={p1 === selfId}
            unknown={!t1.short}
          />
        </div>

        {/* Room rail icons */}
        <div
          className="rounded border px-3 py-1.5 flex items-center gap-3"
          style={{ background: PAPER_L, borderColor: BORDER }}
        >
          <InlineRoomRail
            code={roomCode}
            game="handcricket"
            phase={roomPhase}
            players={players}
            selfId={selfId}
            messages={messages}
          />
        </div>

        {onHelp && (
          <button
            onClick={onHelp}
            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 mt-0.5"
            style={{ border: `2px solid ${INK_LT}`, color: INK_LT, background: "transparent" }}
            aria-label="How to play"
          >
            ?
          </button>
        )}
      </div>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span
      className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm"
      style={{
        background: PAPER_L,
        border: `1.5px solid ${BORDER}`,
        color: INK,
        fontFamily: "monospace",
      }}
    >
      {children}
    </span>
  );
}

function TeamChipNb({
  flag,
  code,
  playerName,
  isSelf,
  unknown,
}: {
  flag?: string;
  code?: string;
  playerName: string;
  isSelf: boolean;
  unknown?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-sm"
      style={{
        background: isSelf ? "rgba(22,101,52,0.12)" : PAPER_L,
        border: `1.5px solid ${isSelf ? "#166534" : BORDER}`,
      }}
    >
      {unknown ? (
        <span className="font-black text-base" style={{ color: "#c0392b" }}>?</span>
      ) : (
        <>
          {flag && <span className="text-sm">{flag}</span>}
          {code && (
            <span className="font-black text-xs tracking-wider" style={{ color: INK }}>
              {code}
            </span>
          )}
        </>
      )}
      <span className="font-script text-sm" style={{ color: INK_LT }}>
        ({playerName})
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COUNTRY PICKER (Team Select — International)
═══════════════════════════════════════════════════════════════ */

export function HcCountryPickerNotebook({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";
  const oppPick = state.teamSelections[oppId]?.teamId ?? null;

  function pick(id: HcCountry) {
    getSocket().emit("game:move", { type: "selectTeam", data: { teamId: id } });
  }

  return (
    <div className="px-5 pb-6 pt-1 relative">
      {/* Cricket ball sketch — top right corner */}
      <div className="absolute top-0 right-6 pointer-events-none" aria-hidden>
        <CricketBallSketch size={52} />
      </div>

      {/* Pencil-drawn border box */}
      <div
        className="relative rounded-lg px-6 py-5"
        style={{
          border: `2px solid ${INK}55`,
          background: "rgba(200,210,255,0.04)",
          boxShadow: `inset 0 0 0 4px rgba(200,210,255,0.06)`,
        }}
      >
        {/* Corner tick marks */}
        <CornerTick corner="tl" />
        <CornerTick corner="tr" />
        <CornerTick corner="bl" />
        <CornerTick corner="br" />

        {/* Heading */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <RadiatingArrow />
          <h2
            className="font-display font-black uppercase tracking-[0.22em] text-center"
            style={{ color: INK, fontSize: "clamp(13px,2vw,18px)" }}
          >
            Pick the Country You'll Represent
          </h2>
          <RadiatingArrow flip />
        </div>

        {/* 5×2 country grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {COUNTRY_ORDER.map((id) => {
            const profile = HC_COUNTRIES[id];
            const meta = COUNTRY_META[id];
            const hasRoster = getRosterFor(id, state.options.format) !== null;
            const isOpp = oppPick === id;
            const isSelected = state.teamSelections[selfId]?.teamId === id;

            return (
              <button
                key={id}
                onClick={() => hasRoster && pick(id)}
                disabled={!hasRoster}
                className="relative flex flex-col items-center rounded-lg p-3 transition-all duration-150"
                style={{
                  background: isSelected ? "#edf7ed" : PAPER_L,
                  border: `2px ${isSelected ? "solid" : "dashed"} ${isSelected ? "#166534" : BORDER}`,
                  boxShadow: isSelected
                    ? "0 0 0 2px rgba(22,101,52,0.30), 2px 3px 10px rgba(0,0,0,0.15)"
                    : "2px 3px 8px rgba(0,0,0,0.12)",
                  opacity: !hasRoster ? 0.55 : 1,
                  cursor: !hasRoster ? "not-allowed" : "pointer",
                  transform: isSelected ? "translateY(-2px)" : "none",
                }}
                aria-pressed={isSelected}
              >
                {/* ★ SELECTED badge */}
                {isSelected && (
                  <div
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-wider whitespace-nowrap"
                    style={{ background: "#166534", color: "#fff" }}
                  >
                    ★ Selected
                  </div>
                )}

                {/* Opponent using this team badge */}
                {isOpp && !isSelected && (
                  <div
                    className="absolute -top-2 -right-2 text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: "#1d4ed8", color: "#fff", maxWidth: 56, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
                  >
                    {oppName}
                  </div>
                )}

                {/* Flag emoji */}
                <span className="text-2xl mb-0.5" aria-hidden>
                  {profile.flag}
                </span>

                {/* Large country code */}
                <span
                  className="font-black leading-none"
                  style={{
                    color: hasRoster ? meta.color : "#9ca3af",
                    fontSize: meta.code.length <= 2 ? "clamp(26px,3.5vw,36px)" : "clamp(20px,2.8vw,28px)",
                    fontFamily: "var(--font-display, 'Righteous', system-ui)",
                  }}
                >
                  {meta.code}
                </span>

                {/* Country name */}
                <span
                  className="font-bold text-center leading-tight mt-1"
                  style={{ color: hasRoster ? INK : "#9ca3af", fontSize: 11 }}
                >
                  {profile.name}
                </span>

                {/* Abbreviation */}
                <span
                  className="font-semibold"
                  style={{ color: hasRoster ? INK_LT : "#9ca3af", fontSize: 10 }}
                >
                  {hasRoster ? profile.short : (
                    <span style={{ color: "#c0392b", fontWeight: 700 }}>No roster yet</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom note */}
      <div
        className="text-center mt-4 font-script text-sm"
        style={{ color: INK_LT }}
      >
        Same country? No problem — we'll show it as{" "}
        <span style={{ color: "#166534", fontWeight: 700 }}>India (Kethan)</span>
        {" "}vs{" "}
        <span style={{ color: "#c0392b", fontWeight: 700 }}>India (Monica)</span>.
      </div>

      {/* Bottom doodles */}
      <div className="flex items-end justify-between mt-4 px-4 pointer-events-none" aria-hidden>
        <TrophyDoodle />
        <StarScatter />
        <StumpsDoodle />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   IPL FRANCHISE PICKER
═══════════════════════════════════════════════════════════════ */

export function HcFranchisePickerNotebook({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";
  const oppPick = state.teamSelections[oppId]?.teamId ?? null;

  function pick(id: HcFranchise) {
    getSocket().emit("game:move", { type: "selectTeam", data: { teamId: id } });
  }

  const franchises: HcFranchise[] = [
    "csk", "mi", "rcb", "kkr", "srh", "dc", "pbks", "rr", "gt", "lsg",
  ];

  return (
    <div className="px-5 pb-6 pt-1">
      <div
        className="relative rounded-lg px-6 py-5"
        style={{ border: `2px solid ${INK}55`, background: "rgba(200,210,255,0.04)" }}
      >
        <CornerTick corner="tl" />
        <CornerTick corner="tr" />
        <CornerTick corner="bl" />
        <CornerTick corner="br" />

        <div className="flex items-center justify-center gap-3 mb-5">
          <RadiatingArrow />
          <h2
            className="font-display font-black uppercase tracking-[0.22em] text-center"
            style={{ color: INK, fontSize: "clamp(13px,2vw,18px)" }}
          >
            Pick Your IPL Franchise
          </h2>
          <RadiatingArrow flip />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {franchises.map((id) => {
            const f = HC_FRANCHISES[id];
            const isOpp = oppPick === id;
            const isSelected = state.teamSelections[selfId]?.teamId === id;
            return (
              <button
                key={id}
                onClick={() => pick(id)}
                className="relative flex flex-col items-center rounded-lg p-3 transition-all duration-150"
                style={{
                  background: isSelected ? "#edf7ed" : PAPER_L,
                  border: `2px ${isSelected ? "solid" : "dashed"} ${isSelected ? "#166534" : BORDER}`,
                  boxShadow: isSelected
                    ? "0 0 0 2px rgba(22,101,52,0.30), 2px 3px 10px rgba(0,0,0,0.15)"
                    : "2px 3px 8px rgba(0,0,0,0.12)",
                  transform: isSelected ? "translateY(-2px)" : "none",
                }}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <div
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-wider whitespace-nowrap"
                    style={{ background: "#166534", color: "#fff" }}
                  >
                    ★ Selected
                  </div>
                )}
                {isOpp && !isSelected && (
                  <div
                    className="absolute -top-2 -right-2 text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                    style={{ background: "#1d4ed8", color: "#fff" }}
                  >
                    {oppName}
                  </div>
                )}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm mb-1"
                  style={{ background: f.color, color: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.35)" }}
                >
                  {f.short}
                </div>
                <span className="font-bold text-center text-xs leading-tight" style={{ color: INK }}>
                  {f.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="text-center mt-4 font-script text-sm" style={{ color: INK_LT }}>
        Same franchise? No problem — we'll show it as{" "}
        <span style={{ color: "#166534", fontWeight: 700 }}>CSK (Kethan)</span>
        {" "}vs{" "}
        <span style={{ color: "#c0392b", fontWeight: 700 }}>CSK (Monica)</span>.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PHASE CONTENT WRAPPER
   Wraps existing game-phase components in a parchment card so
   they read as "notebook entries" rather than floating on the page.
═══════════════════════════════════════════════════════════════ */

export function HcPhaseCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-lg px-5 py-4 ${className}`}
      style={{
        background: PAPER_L,
        border: `1.5px solid ${BORDER}`,
        boxShadow: "2px 3px 10px rgba(0,0,0,0.14)",
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: derive team label from state
═══════════════════════════════════════════════════════════════ */

function labelFor(state: HcState, pid: string, players: Player[]) {
  const playerName = players.find((p) => p.id === pid)?.name ?? "?";
  const sel = state.teamSelections[pid];
  if (!sel?.teamId) return { flag: undefined, short: undefined, playerName };
  const id = sel.teamId;
  // Use `in` narrowing — HC_COUNTRIES and HC_FRANCHISES are Records whose
  // key sets are exactly HcCountry and HcFranchise respectively. After
  // confirming `id in HC_COUNTRIES`, TypeScript knows id is a valid HcCountry
  // key, so we narrow the union and access the typed value directly.
  if (id in HC_COUNTRIES) {
    const profile = HC_COUNTRIES[id as HcCountry];
    return { flag: profile.flag, short: profile.short, playerName };
  }
  if (id in HC_FRANCHISES) {
    const f = HC_FRANCHISES[id as HcFranchise];
    return { flag: undefined, short: f.short, playerName };
  }
  return { flag: undefined, short: undefined, playerName };
}

/* ═══════════════════════════════════════════════════════════════
   DECORATIVE SVG ELEMENTS
═══════════════════════════════════════════════════════════════ */

function CricketBallIcon() {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden className="flex-shrink-0 mt-1">
      <circle cx={16} cy={16} r={14} fill="#c0392b" stroke="#7c1d1d" strokeWidth={1.5} />
      <path d="M8 10 Q12 16 8 22" stroke="#f5e9c4" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <path d="M24 10 Q20 16 24 22" stroke="#f5e9c4" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <ellipse cx={16} cy={16} rx={4} ry={13} fill="none" stroke="#f5e9c4" strokeWidth={1.2} opacity={0.5} />
    </svg>
  );
}

function CricketBallSketch({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx={22} cy={22} r={18} fill="#c0392b" stroke="#7c1d1d" strokeWidth={2} opacity={0.85} />
      <path d="M10 14 Q14 22 10 30" stroke="#f5e9c4" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M34 14 Q30 22 34 30" stroke="#f5e9c4" strokeWidth={2} fill="none" strokeLinecap="round" />
      <ellipse cx={22} cy={22} rx={5} ry={17} fill="none" stroke="#f5e9c4" strokeWidth={1.2} opacity={0.4} />
    </svg>
  );
}

function TrophyDoodle() {
  return (
    <svg width={52} height={60} viewBox="0 0 52 60" fill="none" aria-hidden style={{ opacity: 0.3 }}>
      <path d="M14 44 Q14 52 26 52 Q38 52 38 44" stroke={INK} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <path d="M14 16 Q8 16 8 26 Q8 36 16 38 Q16 42 14 44 L38 44 Q36 42 36 38 Q44 36 44 26 Q44 16 38 16 Z" stroke={INK} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <line x1={22} y1={52} x2={22} y2={58} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <line x1={30} y1={52} x2={30} y2={58} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <line x1={18} y1={58} x2={34} y2={58} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path d="M20 26 L23 24 L26 18 L29 24 L32 26 L29 28 L28 34 L26 30 L24 34 L23 28 Z" stroke={INK} strokeWidth={1} fill={INK} opacity={0.6} />
    </svg>
  );
}

function StumpsDoodle() {
  return (
    <svg width={64} height={60} viewBox="0 0 64 60" fill="none" aria-hidden style={{ opacity: 0.3 }}>
      {/* Three stumps */}
      {[14, 26, 38].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={8} x2={x} y2={50} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
          <rect x={x - 2} y={6} width={4} height={4} rx={1} fill={INK} />
        </g>
      ))}
      {/* Bails */}
      <line x1={13} y1={13} x2={27} y2={13} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <line x1={25} y1={13} x2={39} y2={13} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      {/* Ground */}
      <path d="M6 50 Q32 54 58 50" stroke={INK} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* Bat leaning against stumps */}
      <path d="M48 10 L44 48" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d="M44 42 Q44 52 50 52 Q56 52 56 42 Z" fill={INK} opacity={0.7} />
    </svg>
  );
}

function StarScatter() {
  const stars: [number, number, number][] = [
    [10, 8, 14], [50, 4, 12], [30, 12, 10], [70, 10, 13], [20, 18, 9],
  ];
  return (
    <div className="relative w-16 h-20 pointer-events-none" aria-hidden>
      {stars.map(([x, y, size], i) => (
        <div
          key={i}
          className="absolute font-black"
          style={{ left: x, top: y, fontSize: size, color: INK, opacity: 0.22, transform: `rotate(${(i * 37) % 40 - 20}deg)` }}
        >
          ✦
        </div>
      ))}
    </div>
  );
}

function RadiatingArrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width={24} height={18} viewBox="0 0 24 18" fill="none" aria-hidden
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      {[[-10, 0], [-6, -5], [-6, 5], [-12, -9], [-12, 9]].map(([dx, dy], i) => (
        <line
          key={i}
          x1={24} y1={9} x2={24 + dx} y2={9 + dy}
          stroke="#c0392b" strokeWidth={2} strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** Pencil corner tick marks to give the pencil-box border effect. */
function CornerTick({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const style: React.CSSProperties = {
    position: "absolute",
    width: 10, height: 10,
    borderColor: INK,
    borderStyle: "solid",
    opacity: 0.4,
    ...(corner === "tl" ? { top: -1, left: -1, borderWidth: "2px 0 0 2px" }
      : corner === "tr" ? { top: -1, right: -1, borderWidth: "2px 2px 0 0" }
      : corner === "bl" ? { bottom: -1, left: -1, borderWidth: "0 0 2px 2px" }
      : { bottom: -1, right: -1, borderWidth: "0 2px 2px 0" }),
  };
  return <div style={style} aria-hidden />;
}
