/**
 * hc-notebook.tsx
 *
 * Hand Cricket notebook / scrapbook-themed presentational layer.
 * 90s Indian school notebook aesthetic — spiral binding, ruled parchment,
 * hand-drawn ink, pencil doodles.
 *
 * VIEWPORT: position fixed; inset 0 — no browser scrolling ever.
 * Content that overflows uses overflow-y: auto inside flex-1 min-h-0 containers.
 */

import type { ReactNode, CSSProperties, SVGProps, ComponentType } from "react";
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
import {
  RoughFrame as RoughBorder,
  PaperCard,
  PaperPanel,
  SketchHeading,
  StickyNote,
} from "../../components/paper";
import { motion, AnimatePresence } from 'framer-motion';
import {
  IN, AU, GB, NZ, ZA, PK, LK, BD, AF,
} from 'country-flag-icons/react/3x2';

/* ─── palette ─── */
const PAPER      = "#F5E9C4";
const PAPER_L    = "#FBF5E0";
const PAPER_D    = "#EDE0C0";
const INK        = "#1a2952";
const INK_LT     = "#4a5a82";
const INK_RED    = "#8B1A1A";
const WOOD       = "#4a2c12";
const LINE_CLR   = "rgba(50,80,160,0.13)";
const MARGIN_CLR = "rgba(180,30,30,0.32)";
const BORDER     = "rgba(46,40,25,0.50)";
const STAMP_G    = "#166534";
const STAMP_R    = "#991b1b"; // eslint-disable-line @typescript-eslint/no-unused-vars
const STAMP_A    = "#92400e"; // eslint-disable-line @typescript-eslint/no-unused-vars
const STAMP_P    = "#6d28d9"; // eslint-disable-line @typescript-eslint/no-unused-vars
const GOLD       = "#C5963A";

/** Ruled + left-margin background (shared across all paper surfaces) */
const RULED_BG = [
  `repeating-linear-gradient(to bottom, transparent, transparent 26px, ${LINE_CLR} 26px, ${LINE_CLR} 27px)`,
  `linear-gradient(to right, ${MARGIN_CLR} 0px, ${MARGIN_CLR} 1.5px, transparent 1.5px)`,
].join(", ");

/** Aged-parchment mottle — soft blotches + edge tea-staining layered UNDER the
 *  ruled lines so the page reads like a well-thumbed 90s school notebook rather
 *  than flat cream card stock. Sits on the page frame, behind all content. */
const VINTAGE_BG = [
  "radial-gradient(120% 80% at 8% 4%, rgba(120,80,20,0.10) 0%, transparent 42%)",
  "radial-gradient(120% 90% at 96% 8%, rgba(120,80,20,0.09) 0%, transparent 40%)",
  "radial-gradient(140% 90% at 92% 98%, rgba(90,55,15,0.11) 0%, transparent 46%)",
  "radial-gradient(120% 80% at 4% 96%, rgba(90,55,15,0.08) 0%, transparent 42%)",
  "radial-gradient(60% 50% at 50% 45%, rgba(255,250,225,0.35) 0%, transparent 70%)",
].join(", ");

/** Country display code + ink colour */
const COUNTRY_META: Record<HcCountry, { code: string; color: string }> = {
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

type FlagComponent = ComponentType<SVGProps<SVGSVGElement> & { title?: string }>;

const FLAG_COMPONENTS: Partial<Record<HcCountry, FlagComponent>> = {
  india:       IN  as FlagComponent,
  australia:   AU  as FlagComponent,
  england:     GB  as FlagComponent,
  newzealand:  NZ  as FlagComponent,
  southafrica: ZA  as FlagComponent,
  pakistan:    PK  as FlagComponent,
  srilanka:    LK  as FlagComponent,
  bangladesh:  BD  as FlagComponent,
  afghanistan: AF  as FlagComponent,
};

const COUNTRY_ORDER: HcCountry[] = [
  "india", "australia", "england", "newzealand", "southafrica",
  "pakistan", "westindies", "srilanka", "bangladesh", "afghanistan",
];

/* ═══════════════════════════════════════════════════════════════
   NOTEBOOK PAGE FRAME — full viewport, zero browser scroll
═══════════════════════════════════════════════════════════════ */

/**
 * Hidden SVG that defines reusable filters for the notebook:
 * - #rough-torn: feTurbulence + feDisplacementMap for the heading strip torn-paper edge
 * - #rough-card:  subtler displacement for card container wobble
 * Mount this once inside HcNotebookPage so all children can reference it.
 */
function NotebookSvgFilters() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute', overflow: 'hidden' }}
      aria-hidden
    >
      <defs>
        <filter id="rough-torn" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.065"
            numOctaves={4}
            seed={3}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={5}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter id="rough-card" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05"
            numOctaves={3}
            seed={7}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={2.5}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

export function HcNotebookPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: WOOD,
        display: "flex",
        padding: "8px 8px 8px 52px",
        boxShadow: "0 0 80px rgba(0,0,0,0.70)",
      }}
    >
      <NotebookSvgFilters />
      <BindingHoles />

      {/* Inner paper — fills all remaining space */}
      <div
        className={className}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: 6,
          overflow: "hidden",
          background: PAPER,
          backgroundImage: `${RULED_BG}, ${VINTAGE_BG}`,
          backgroundPosition: "0 13px, 48px 0, 0 0, 0 0, 0 0, 0 0, 0 0",
          boxShadow: "inset 0 0 60px rgba(90,55,15,0.14)",
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
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 52,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-evenly",
        alignItems: "center",
        paddingTop: 16,
        paddingBottom: 16,
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: 13 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#5c3418",
            border: "2.5px solid rgba(255,255,255,0.15)",
            boxShadow:
              "inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* SVG arc to mimic wire spiral */}
          <svg
            width={32}
            height={14}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            <path
              d="M4 7 C 4 2, 28 2, 28 7 C 28 12, 4 12, 4 7"
              stroke="rgba(100,60,20,0.7)"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NOTEBOOK HEADER — compact horizontal bar ~54–70px tall
═══════════════════════════════════════════════════════════════ */

export function HcNotebookHeader({
  state,
  players,
  selfId,
  roomCode,
  roomPhase,
  messages,
  onHelp,
  onLeave,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
  roomCode: string;
  roomPhase: string;
  messages: ChatMessage[];
  onHelp?: () => void;
  onLeave?: () => void;
}) {
  const [p0, p1] = state.playerOrder;
  const t0 = labelFor(state, p0, players);
  const t1 = labelFor(state, p1, players);
  const formatLabel =
    state.options.format === "test" ? "Test · 30 overs"
    : state.options.format === "odi"  ? "ODI · 15 overs"
    : "T20 · 10 overs";
  const categoryLabel = state.options.category === "ipl" ? "IPL" : "INTERNATIONAL";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        rowGap: 8,
        flexWrap: "wrap",
        padding: "12px 18px 10px",
        borderBottom: `1.5px solid ${LINE_CLR}`,
        background: "transparent",
        flexShrink: 0,
        minHeight: 58,
      }}
    >
      {/* ── Left: ball icon + title + format/category torn chips ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, rowGap: 6, flexWrap: "wrap", minWidth: 0 }}>
        <CricketBallIcon />
        <div style={{ minWidth: 0 }}>
          <span
            className="font-notebook"
            style={{
              color: INK,
              fontSize: "clamp(15px,2vw,22px)",
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              display: "block",
              lineHeight: 1.05,
              whiteSpace: "nowrap",
            }}
          >
            Hand Cricket
          </span>
          <RoughUnderline />
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: 4, flexWrap: "wrap" }}>
          <HeaderPill>{formatLabel.toUpperCase()}</HeaderPill>
          <HeaderPill>{categoryLabel}</HeaderPill>
        </div>
      </div>

      {/* ── Right: matchup strip + room rail + help + leave (all torn) ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, rowGap: 8, flexWrap: "wrap" }}>
        {/* Team matchup on a single torn strip */}
        <TornChip padding="4px 12px" rotate={-0.6}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <TeamChipNb
              flag={t0.flag}
              code={t0.short}
              playerName={t0.playerName}
              isSelf={p0 === selfId}
              unknown={!t0.short}
            />
            <span
              className="font-notebook"
              style={{ color: INK_LT, fontSize: 11, fontWeight: 700 }}
            >
              vs
            </span>
            <TeamChipNb
              flag={t1.flag}
              code={t1.short}
              playerName={t1.playerName}
              isSelf={p1 === selfId}
              unknown={!t1.short}
            />
          </div>
        </TornChip>

        {/* Help button */}
        {onHelp && (
          <button
            onClick={onHelp}
            aria-label="How to play"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${INK_LT}`,
              color: INK_LT,
              background: "transparent",
              cursor: "pointer",
              fontFamily: "'Kalam', cursive",
              fontWeight: 900,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ?
          </button>
        )}

        {/* Leave button — the fixed notebook overlay covers Room.tsx's own
            Leave control, so the shell must surface its own exit. */}
        {onLeave && <HcLeaveButton onLeave={onLeave} />}
      </div>
    </div>
  );
}

/** Ink-stamp Leave control. Styled to echo the wooden binding / dark exit
 *  affordance used elsewhere, but tucked into the notebook header so it reads
 *  as part of the page rather than a floating browser chrome element. */
export function HcLeaveButton({ onLeave }: { onLeave: () => void }) {
  return (
    <button
      onClick={onLeave}
      aria-label="Leave room"
      className="font-notebook"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        height: 32,
        padding: "0 12px",
        borderRadius: 5,
        border: "1.5px solid rgba(139,26,26,0.55)",
        background: "rgba(139,26,26,0.10)",
        color: INK_RED,
        cursor: "pointer",
        fontFamily: "'Kalam', cursive",
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        flexShrink: 0,
        transition: "background 140ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,26,26,0.18)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(139,26,26,0.10)")}
    >
      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M10 3H4v10h6M10 8H8m6 0-2.5-2.5M14 8l-2.5 2.5"
          stroke={INK_RED}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Leave
    </button>
  );
}

/**
 * Torn-paper "washi tape" chip. The visible torn edge is a background layer
 * pushed through the #rough-torn feTurbulence/feDisplacement filter so only the
 * paper wobbles — the text on top stays crisp. Used for every header chip so
 * the strip reads like scraps taped onto the page (matches the reference).
 */
export function TornChip({
  children,
  rotate = 0,
  tint = PAPER_L,
  padding = "4px 10px",
  style,
}: {
  children: ReactNode;
  rotate?: number;
  tint?: string;
  padding?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: -3,
          background: tint,
          filter: "url(#rough-torn)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.16)",
          borderRadius: 2,
        }}
      />
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          padding,
        }}
      >
        {children}
      </span>
    </div>
  );
}

function HeaderPill({ children }: { children: ReactNode }) {
  return (
    <TornChip padding="2px 8px">
      <span
        className="font-notebook"
        style={{
          color: INK,
          fontFamily: "'Kalam', cursive",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </TornChip>
  );
}

/** Hand-drawn red underline for the "HAND CRICKET" wordmark (matches design). */
function RoughUnderline() {
  return (
    <svg
      width="100%"
      height={7}
      viewBox="0 0 200 7"
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: "block", marginTop: 1, filter: "url(#rough-torn)" }}
    >
      <path
        d="M2 4 Q 50 1, 100 4 T 198 3"
        stroke={INK_RED}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
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
      style={{
        background: isSelf ? "rgba(22,101,52,0.14)" : "transparent",
        border: isSelf ? `1.5px solid ${STAMP_G}` : "1.5px solid transparent",
        borderRadius: 4,
        padding: "2px 7px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        minHeight: 26,
      }}
    >
      {unknown ? (
        <span
          className="font-notebook"
          style={{ color: INK_RED, fontWeight: 900, fontSize: 14 }}
        >
          ?
        </span>
      ) : (
        <>
          {flag && <span style={{ fontSize: 12 }}>{flag}</span>}
          {code && (
            <span
              className="font-notebook"
              style={{
                color: INK,
                fontWeight: 900,
                fontSize: 11,
                letterSpacing: "0.06em",
              }}
            >
              {code}
            </span>
          )}
        </>
      )}
      <span className="font-hand" style={{ color: INK_LT, fontSize: 11 }}>
        ({playerName})
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROUGH BORDER — canonical impl now lives in components/paper as
   RoughFrame. Imported above (aliased RoughBorder) and re-exported so the
   existing hc-shared consumer keeps importing it from here.
═══════════════════════════════════════════════════════════════ */

export { RoughBorder };

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
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-3 pb-2.5 pt-1">
      {/* Vertically-centred scroll area — keeps the framed sheet mid-page and
          (via margin:auto, not justify-center) keeps the top reachable when it
          overflows. overflow-x-hidden clips the few-px card-corner stamps. */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center py-2">
        <PaperPanel
          tone="sheet"
          strong
          pad="none"
          className="w-full max-w-[1000px] m-auto flex flex-col px-[18px] pt-[18px] pb-3.5"
        >
          <CornerTick corner="tl" />
          <CornerTick corner="tr" />
          <CornerTick corner="bl" />
          <CornerTick corner="br" />

          <SketchHeading className="mb-2.5">Pick The Country You'll Represent</SketchHeading>

          {/* 5×2 country grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {COUNTRY_ORDER.map((id) => {
              const profile = HC_COUNTRIES[id];
              const meta = COUNTRY_META[id];
              const hasRoster = getRosterFor(id, state.options.format) !== null;
              const isOpp = oppPick === id;
              const isSelected = state.teamSelections[selfId]?.teamId === id;
              const FlagSvg = FLAG_COMPONENTS[id];

              return (
                <PaperCard
                  key={id}
                  tone={isSelected ? "selected" : "default"}
                  disabled={!hasRoster}
                  interactive={hasRoster}
                  onClick={() => hasRoster && pick(id)}
                  ariaPressed={isSelected}
                  ariaLabel={profile.name}
                  className="min-h-[148px]"
                >
                  <StickyNote show={isSelected} tone="selected" place="top">★ Selected</StickyNote>
                  {isOpp && !isSelected && (
                    <StickyNote show tone="opponent" place="corner" className="max-w-[54px] overflow-hidden text-ellipsis">
                      {oppName}
                    </StickyNote>
                  )}

                  <div className="flex h-full flex-col items-center justify-center gap-1 px-2 py-4 text-center">
                    {/* Flag — real SVG when available, emoji fallback (WI palm) */}
                    {FlagSvg ? (
                      <FlagSvg
                        title={profile.name}
                        className="w-10 h-auto rounded-[3px] shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.25)] mb-0.5"
                      />
                    ) : (
                      <span className="text-[28px] leading-tight">{profile.flag}</span>
                    )}

                    <span
                      className="font-kalam font-bold text-[32px] leading-none tracking-tight"
                      style={{ color: hasRoster ? meta.color : "#9ca3af" }}
                    >
                      {meta.code}
                    </span>

                    <span
                      className="font-hand font-bold text-xs leading-tight"
                      style={{ color: hasRoster ? INK : "#9ca3af" }}
                    >
                      {profile.name}
                    </span>

                    <span
                      className="font-hand text-[10px] tracking-wider"
                      style={{ color: hasRoster ? INK_LT : "#c0392b", fontWeight: hasRoster ? 400 : 700 }}
                    >
                      {hasRoster ? profile.short : "NO ROSTER YET"}
                    </span>

                    {/* Team-colour ruled underline accent */}
                    {hasRoster && (
                      <div aria-hidden className="w-[56%] mt-1.5 flex flex-col gap-0.5">
                        <div className="h-0 border-t-2 opacity-55" style={{ borderColor: meta.color }} />
                        <div className="h-0 border-t opacity-30" style={{ borderColor: meta.color }} />
                      </div>
                    )}
                  </div>
                </PaperCard>
              );
            })}
          </div>

          {/* Bottom note */}
          <div className="font-hand text-center text-xs mt-2 shrink-0" style={{ color: INK_LT }}>
            Same country? No problem — we&#39;ll show it as{" "}
            <span className="font-bold" style={{ color: STAMP_G }}>India (Sri Krishna)</span>{" vs "}
            <span className="font-bold" style={{ color: "#c0392b" }}>India (Radha)</span>.
          </div>

          {/* Ink doodles along the base of the sheet */}
          <div className="flex items-end justify-between mt-0.5 px-1.5 pointer-events-none shrink-0" aria-hidden>
            <TrophyDoodle />
            <StarScatter />
            <CricketBallDoodle size={44} />
            <BatDoodle size={48} />
            <StumpsDoodle />
          </div>
        </PaperPanel>
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
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "10px 14px 6px",
      }}
    >
      {/* Pencil border box */}
      <div
        style={{
          position: "relative",
          border: `1.5px dashed ${BORDER}`,
          borderRadius: 10,
          padding: "10px 12px 8px",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <CornerTick corner="tl" />
        <CornerTick corner="tr" />
        <CornerTick corner="bl" />
        <CornerTick corner="br" />

        {/* Heading */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 10,
            flexShrink: 0,
          }}
        >
          <RadiatingArrow />
          <h2
            className="font-notebook"
            style={{
              color: INK,
              fontSize: "clamp(13px,1.8vw,18px)",
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textAlign: "center",
              margin: 0,
            }}
          >
            Pick Your IPL Franchise
          </h2>
          <RadiatingArrow flip />
        </div>

        {/* 5×2 franchise grid */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div className="grid grid-cols-2 sm:grid-cols-5" style={{ gap: 8 }}>
            {franchises.map((id) => {
              const f = HC_FRANCHISES[id];
              const isOpp = oppPick === id;
              const isSelected = state.teamSelections[selfId]?.teamId === id;
              return (
                <button
                  key={id}
                  onClick={() => pick(id)}
                  aria-pressed={isSelected}
                  style={{
                    background: isSelected ? "rgba(22,101,52,0.10)" : PAPER_L,
                    border: `2px ${isSelected ? "solid" : "dashed"} ${
                      isSelected ? STAMP_G : BORDER
                    }`,
                    borderRadius: 8,
                    padding: "10px 6px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    transform: isSelected
                      ? "translateY(-3px) rotate(-0.5deg)"
                      : "none",
                    transition: "all 180ms cubic-bezier(0.34,1.56,0.64,1)",
                    cursor: "pointer",
                    boxShadow: isSelected
                      ? "0 4px 16px rgba(22,101,52,0.25), 2px 4px 12px rgba(0,0,0,0.18)"
                      : "2px 3px 8px rgba(0,0,0,0.12)",
                    position: "relative",
                    minHeight: 44,
                  }}
                >
                  {/* ★ SELECTED stamp */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: -10,
                        left: "50%",
                        transform: "translateX(-50%) rotate(-2deg)",
                        background: STAMP_G,
                        color: "#fff",
                        fontSize: 8,
                        fontWeight: 800,
                        padding: "1px 6px",
                        borderRadius: 2,
                        whiteSpace: "nowrap",
                        border: "1px solid rgba(255,255,255,0.25)",
                        fontFamily: "'Kalam', cursive",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      ★ SELECTED
                    </div>
                  )}

                  {/* Opponent badge */}
                  {isOpp && !isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        background: "#1d4ed8",
                        color: "#fff",
                        fontSize: 8,
                        fontWeight: 800,
                        padding: "1px 5px",
                        borderRadius: 2,
                        maxWidth: 54,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: "'Kalam', cursive",
                      }}
                    >
                      {oppName}
                    </div>
                  )}

                  {/* Franchise colour circle */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: f.color,
                      color: "#fff",
                      fontFamily: "'Kalam', cursive",
                      fontWeight: 900,
                      fontSize: 12,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
                      marginBottom: 4,
                    }}
                  >
                    {f.short}
                  </div>
                  <span
                    className="font-notebook"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: INK,
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    {f.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Same-franchise note */}
        <div
          className="font-hand"
          style={{
            textAlign: "center",
            marginTop: 8,
            fontSize: 12,
            color: INK_LT,
            flexShrink: 0,
          }}
        >
          Same franchise? No problem — we'll show it as{" "}
          <span style={{ color: STAMP_G, fontWeight: 700 }}>CSK (Sri Krishna)</span>
          {" "}vs{" "}
          <span style={{ color: INK_RED, fontWeight: 700 }}>CSK (Radha)</span>.
        </div>
      </div>

      {/* Bottom doodles */}
      <div
        aria-hidden
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "4px 12px 0",
          pointerEvents: "none",
          flexShrink: 0,
        }}
      >
        <TrophyDoodle />
        <CricketBallDoodle />
        <StumpsDoodle />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PHASE CONTENT WRAPPER
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
      className={className}
      style={{
        position: "relative",
        background: "rgba(245,233,196,0.55)",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <RoughBorder roughness={1.7} stroke="rgba(46,40,25,0.52)" strokeWidth={1.5} padding={3} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
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
  // key sets are exactly HcCountry and HcFranchise respectively.
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
   SCRAPBOOK DOODLE LAYER — fills the page margins so post-teamSelect
   phases (toss, innings, summary) never read as a small card floating
   in dead space. Absolutely positioned, non-interactive, low opacity.
═══════════════════════════════════════════════════════════════ */

export function HcScrapbookDoodles() {
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      {/* top-left cluster: stumps + a couple of stars */}
      <div style={{ position: "absolute", top: 18, left: 18, opacity: 0.9, transform: "rotate(-6deg)" }}>
        <StumpsDoodle />
      </div>
      <SketchStar x="15%" y="30%" size={16} />
      <SketchStar x="9%" y="58%" size={11} />

      {/* top-right: cricket ball with motion lines */}
      <div style={{ position: "absolute", top: 22, right: 26, opacity: 0.9 }}>
        <CricketBallDoodle size={54} />
        <svg width={40} height={30} viewBox="0 0 40 30" style={{ position: "absolute", top: -6, right: 44 }} aria-hidden>
          <path d="M2 6 h16 M0 15 h20 M4 24 h14" stroke={BORDER} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
        </svg>
      </div>
      <SketchStar x="90%" y="40%" size={13} />

      {/* bottom-left: trophy on a little grass tuft */}
      <div style={{ position: "absolute", bottom: 20, left: 22, opacity: 0.9 }}>
        <TrophyDoodle />
        <svg width={70} height={12} viewBox="0 0 70 12" style={{ position: "absolute", bottom: -4, left: -8 }} aria-hidden>
          <path d="M4 10 q3 -8 6 0 M14 10 q3 -9 6 0 M24 10 q3 -8 6 0" stroke={BORDER} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.5} />
        </svg>
      </div>
      <SketchStar x="16%" y="82%" size={12} />

      {/* bottom-center: leaning bat + ball */}
      <div style={{ position: "absolute", bottom: 16, left: "48%", opacity: 0.85, transform: "translateX(-50%) rotate(4deg)" }}>
        <BatDoodle size={60} />
      </div>

      {/* bottom-right: backpack + stars */}
      <div style={{ position: "absolute", bottom: 22, right: 26, opacity: 0.85 }}>
        <BackpackDoodle />
      </div>
      <SketchStar x="86%" y="72%" size={14} />
      <SketchStar x="93%" y="88%" size={10} />
    </div>
  );
}

function SketchStar({ x, y, size }: { x: string; y: string; size: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontSize: size,
        color: GOLD,
        opacity: 0.4,
        transform: "translate(-50%,-50%)",
        fontFamily: "'Kalam', cursive",
      }}
    >
      ★
    </span>
  );
}

/** Small sketched backpack (matches the reference doodle). */
function BackpackDoodle() {
  return (
    <svg width={44} height={54} viewBox="0 0 44 54" fill="none" aria-hidden style={{ opacity: 0.3 }}>
      <rect x={8} y={16} width={28} height={34} rx={8} stroke={BORDER} strokeWidth={1.8} />
      <path d="M16 16 Q22 4 28 16" stroke={BORDER} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <rect x={15} y={28} width={14} height={14} rx={4} stroke={BORDER} strokeWidth={1.4} />
      <line x1={8} y1={24} x2={36} y2={24} stroke={BORDER} strokeWidth={1.2} opacity={0.6} />
      <line x1={22} y1={42} x2={22} y2={48} stroke={BORDER} strokeWidth={1.2} opacity={0.6} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DECORATIVE SVG ELEMENTS
═══════════════════════════════════════════════════════════════ */

/** Cricket ball header icon (filled, coloured — used in header) */
function CricketBallIcon() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <circle cx={16} cy={16} r={14} fill="#c0392b" stroke="#7c1d1d" strokeWidth={1.5} />
      <path
        d="M8 10 Q12 16 8 22"
        stroke="#f5e9c4"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M24 10 Q20 16 24 22"
        stroke="#f5e9c4"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
      <ellipse
        cx={16}
        cy={16}
        rx={4}
        ry={13}
        fill="none"
        stroke="#f5e9c4"
        strokeWidth={1.2}
        opacity={0.5}
      />
    </svg>
  );
}

/** Pencil-sketch cricket ball doodle */
function CricketBallDoodle({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      style={{ opacity: 0.5 }}
    >
      <circle
        cx={24}
        cy={24}
        r={18}
        stroke={BORDER}
        strokeWidth={1.8}
        strokeDasharray="3 2"
      />
      <path
        d="M10 16 Q14 24 10 32"
        stroke={BORDER}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M38 16 Q34 24 38 32"
        stroke={BORDER}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <ellipse
        cx={24}
        cy={24}
        rx={5}
        ry={17}
        fill="none"
        stroke={BORDER}
        strokeWidth={1}
        opacity={0.6}
      />
    </svg>
  );
}

/** Three stumps with bails and a leaning bat */
function StumpsDoodle() {
  return (
    <svg
      width={64}
      height={60}
      viewBox="0 0 64 60"
      fill="none"
      aria-hidden
      style={{ opacity: 0.5 }}
    >
      {[14, 26, 38].map((x, i) => (
        <g key={i}>
          <line
            x1={x}
            y1={8}
            x2={x}
            y2={50}
            stroke={BORDER}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <rect x={x - 2} y={6} width={4} height={4} rx={1} fill={BORDER} />
        </g>
      ))}
      {/* Bails */}
      <line x1={13} y1={13} x2={27} y2={13} stroke={BORDER} strokeWidth={2} strokeLinecap="round" />
      <line x1={25} y1={13} x2={39} y2={13} stroke={BORDER} strokeWidth={2} strokeLinecap="round" />
      {/* Ground curve */}
      <path
        d="M6 50 Q32 54 58 50"
        stroke={BORDER}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      {/* Bat handle */}
      <path d="M48 10 L44 48" stroke={BORDER} strokeWidth={3} strokeLinecap="round" />
      {/* Bat blade */}
      <path d="M44 42 Q44 52 50 52 Q56 52 56 42 Z" fill={BORDER} opacity={0.5} />
    </svg>
  );
}

/** Trophy cup with handles */
function TrophyDoodle() {
  return (
    <svg
      width={52}
      height={60}
      viewBox="0 0 52 60"
      fill="none"
      aria-hidden
      style={{ opacity: 0.5 }}
    >
      <path
        d="M14 44 Q14 52 26 52 Q38 52 38 44"
        stroke={BORDER}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M14 16 Q8 16 8 26 Q8 36 16 38 Q16 42 14 44 L38 44 Q36 42 36 38 Q44 36 44 26 Q44 16 38 16 Z"
        stroke={BORDER}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
      />
      <line x1={22} y1={52} x2={22} y2={58} stroke={BORDER} strokeWidth={2} strokeLinecap="round" />
      <line x1={30} y1={52} x2={30} y2={58} stroke={BORDER} strokeWidth={2} strokeLinecap="round" />
      <line x1={18} y1={58} x2={34} y2={58} stroke={BORDER} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** Cricket bat elongated paddle shape */
function BatDoodle({ size = 52 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden
      style={{ opacity: 0.5 }}
    >
      {/* Handle */}
      <line x1={28} y1={4} x2={28} y2={18} stroke={BORDER} strokeWidth={2.5} strokeLinecap="round" />
      {/* Grip tape wraps */}
      <line x1={25} y1={8}  x2={31} y2={10} stroke={BORDER} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
      <line x1={25} y1={12} x2={31} y2={14} stroke={BORDER} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
      {/* Blade */}
      <path
        d="M20 18 Q17 20 17 30 Q17 44 22 50 Q25 54 28 54 Q31 54 34 50 Q39 44 39 30 Q39 20 36 18 Z"
        stroke={BORDER}
        strokeWidth={1.8}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Blade grain */}
      <line
        x1={28}
        y1={22}
        x2={28}
        y2={48}
        stroke={BORDER}
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.4}
      />
    </svg>
  );
}

/** Scattered pencil-style stars — used as center doodle accent in country picker */
function StarScatter() {
  return (
    <svg width={64} height={44} viewBox="0 0 64 44" aria-hidden style={{ opacity: 0.35 }}>
      {([
        [10, 28, 13,  0],
        [26, 14, 10, -8],
        [38, 32,  9,  5],
        [52, 18, 12,  3],
        [20,  8,  7,  -4],
      ] as [number, number, number, number][]).map(([x, y, sz, rot], i) => (
        <text
          key={i}
          x={x}
          y={y}
          fontSize={sz}
          fill={GOLD}
          transform={`rotate(${rot}, ${x}, ${y})`}
          style={{ fontFamily: 'sans-serif' }}
        >
          ★
        </text>
      ))}
    </svg>
  );
}

/**
 * Shared sketch heading — red radiating arrows flanking an Architects-Daughter
 * marker title. Used by every Hand Cricket team-select / squad sheet so the
 * headings read identically across screens.
 */
export function HcSketchHeading({
  children,
  size = "clamp(15px,2vw,22px)",
}: {
  children: ReactNode;
  size?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        flexShrink: 0,
      }}
    >
      <RadiatingArrow />
      <h2
        style={{
          color: INK,
          fontFamily: "'Architects Daughter', 'Kalam', cursive",
          fontSize: size,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          textAlign: "center",
          margin: 0,
        }}
      >
        {children}
      </h2>
      <RadiatingArrow flip />
    </div>
  );
}

/** Reusable roughjs-bordered "index card" — the shared card primitive for the
 *  squad picker (XI, bench, legends) mirroring the country-picker tiles. */
export function RoughCard({
  children,
  selected = false,
  tint,
  style,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  selected?: boolean;
  tint?: string;
  style?: CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        position: "relative",
        background: tint ?? (selected ? "rgba(22,101,52,0.12)" : "rgba(251,245,224,0.9)"),
        border: selected ? "2.5px solid #166534" : "1px solid transparent",
        borderRadius: 8,
        boxShadow: selected
          ? "0 4px 14px rgba(22,101,52,0.2)"
          : "2px 3px 8px rgba(74,44,18,0.13)",
        cursor: disabled ? "not-allowed" : onClick ? "pointer" : "default",
        opacity: disabled ? 0.5 : 1,
        overflow: "visible",
        ...style,
      }}
    >
      {!selected && !disabled && (
        <RoughBorder roughness={1.8} strokeWidth={2} bowing={1.1} stroke="rgba(46,40,25,0.72)" padding={3} />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function RadiatingArrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width={24}
      height={18}
      viewBox="0 0 24 18"
      fill="none"
      aria-hidden
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      {([[-10, 0], [-6, -5], [-6, 5], [-12, -9], [-12, 9]] as [number, number][]).map(
        ([dx, dy], i) => (
          <line
            key={i}
            x1={24}
            y1={9}
            x2={24 + dx}
            y2={9 + dy}
            stroke={INK_RED}
            strokeWidth={2}
            strokeLinecap="round"
          />
        )
      )}
    </svg>
  );
}

/** Pencil corner tick marks — pencil-box border effect */
function CornerTick({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const style: CSSProperties = {
    position: "absolute",
    width: 10,
    height: 10,
    borderColor: INK,
    borderStyle: "solid",
    opacity: 0.4,
    ...(corner === "tl"
      ? { top: -1, left: -1, borderWidth: "2px 0 0 2px" }
      : corner === "tr"
      ? { top: -1, right: -1, borderWidth: "2px 2px 0 0" }
      : corner === "bl"
      ? { bottom: -1, left: -1, borderWidth: "0 0 2px 2px" }
      : { bottom: -1, right: -1, borderWidth: "0 2px 2px 0" }),
  };
  return <div style={style} aria-hidden />;
}
