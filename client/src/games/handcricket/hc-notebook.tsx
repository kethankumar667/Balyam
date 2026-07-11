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

import { useState, useEffect, useRef } from "react";
import type { ReactNode, CSSProperties, SVGProps, ComponentType } from "react";
import type {
  HcCountry,
  HcFranchise,
  HcState,
  Player,
  ChatMessage,
} from "@shared/types";
import { HC_COUNTRIES, HC_FRANCHISES, getRosterFor } from "@shared/hc-rosters";
import { getSocket } from "../../lib/socket";
import {
  RoughFrame as RoughBorder,
  PaperCard,
  PaperPanel,
  SketchHeading,
  StickyNote,
} from "../../components/paper";
import { motion, AnimatePresence } from "framer-motion";
import {
  IN,
  AU,
  GB,
  NZ,
  ZA,
  PK,
  LK,
  BD,
  AF,
  IE,
  ZW,
} from "country-flag-icons/react/3x2";
import PlayerList from "../../components/PlayerList";
import VoicePanel from "../../components/VoicePanel";
import Chat from "../../components/Chat";

/* ─── palette ─── */
const PAPER = "#F5E9C4";
const PAPER_L = "#FBF5E0";
const PAPER_D = "#EDE0C0";
const INK = "#1a2952";
const INK_LT = "#4a5a82";
const INK_RED = "#8B1A1A";
const WOOD = "#4a2c12";
const LINE_CLR = "rgba(50,80,160,0.13)";
const MARGIN_CLR = "rgba(180,30,30,0.32)";
const BORDER = "rgba(46,40,25,0.50)";
const STAMP_G = "#166534";
const STAMP_R = "#991b1b"; // eslint-disable-line @typescript-eslint/no-unused-vars
const STAMP_A = "#92400e"; // eslint-disable-line @typescript-eslint/no-unused-vars
const STAMP_P = "#6d28d9"; // eslint-disable-line @typescript-eslint/no-unused-vars
const GOLD = "#C5963A";

/** Ruled + left-margin background (shared across all paper surfaces) */
const RULED_BG = [
  `repeating-linear-gradient(to bottom, transparent, transparent 26px, ${LINE_CLR} 26px, ${LINE_CLR} 27px)`,
  `linear-gradient(to right, ${MARGIN_CLR} 0px, ${MARGIN_CLR} 1.5px, transparent 1.5px)`,
].join(", ");

/** Aged-parchment mottle — soft blotches + edge tea-staining layered UNDER the
 *  ruled lines so the page reads like a well-thumbed 90s school notebook rather
 *  than flat cream card stock. Sits on the page frame, behind all content. */
const VINTAGE_BG = [
  // Four-corner tea staining — more pronounced amber aging than the original
  "radial-gradient(130% 90% at 3% 3%, rgba(140,90,25,0.18) 0%, transparent 44%)",
  "radial-gradient(130% 90% at 97% 3%, rgba(130,80,20,0.16) 0%, transparent 44%)",
  "radial-gradient(140% 90% at 97% 97%, rgba(100,60,18,0.20) 0%, transparent 48%)",
  "radial-gradient(130% 80% at 3% 97%, rgba(100,60,18,0.16) 0%, transparent 42%)",
  // Foxing spots — random ink-like blotches mimic genuinely aged paper
  "radial-gradient(8px 8px at 23% 36%, rgba(120,80,30,0.12) 0%, transparent 100%)",
  "radial-gradient(7px 9px at 68% 27%, rgba(100,65,25,0.10) 0%, transparent 100%)",
  "radial-gradient(10px 7px at 76% 67%, rgba(110,70,25,0.08) 0%, transparent 100%)",
  "radial-gradient(7px 10px at 36% 73%, rgba(115,75,28,0.09) 0%, transparent 100%)",
  // Centre lift — subtle 3-D curvature that makes the page feel physical
  "radial-gradient(65% 56% at 50% 48%, rgba(255,252,230,0.40) 0%, transparent 72%)",
].join(", ");

/** Country display code + ink colour */
const COUNTRY_META: Record<HcCountry, { code: string; color: string }> = {
  india: { code: "IN", color: "#166534" },
  australia: { code: "AU", color: "#92400e" },
  england: { code: "ENG", color: "#991b1b" },
  newzealand: { code: "NZ", color: "#1e293b" },
  southafrica: { code: "SA", color: "#166534" },
  pakistan: { code: "PK", color: "#166534" },
  westindies: { code: "WI", color: "#7c1d1d" },
  srilanka: { code: "LK", color: "#1e3a8a" },
  bangladesh: { code: "BD", color: "#6b7280" },
  afghanistan: { code: "AF", color: "#6b7280" },
  ireland: { code: "IE", color: "#166534" },
  zimbabwe: { code: "ZW", color: "#166534" },
};

type FlagComponent = ComponentType<
  SVGProps<SVGSVGElement> & { title?: string }
>;

const FLAG_COMPONENTS: Partial<Record<HcCountry, FlagComponent>> = {
  india: IN as FlagComponent,
  australia: AU as FlagComponent,
  england: GB as FlagComponent,
  newzealand: NZ as FlagComponent,
  southafrica: ZA as FlagComponent,
  pakistan: PK as FlagComponent,
  srilanka: LK as FlagComponent,
  bangladesh: BD as FlagComponent,
  afghanistan: AF as FlagComponent,
  ireland: IE as FlagComponent,
  zimbabwe: ZW as FlagComponent,
};

const COUNTRY_ORDER: HcCountry[] = [
  "india",
  "australia",
  "england",
  "newzealand",
  "southafrica",
  "pakistan",
  "westindies",
  "srilanka",
  "bangladesh",
  "afghanistan",
  "ireland",
  "zimbabwe",
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
      style={{ position: "absolute", overflow: "hidden" }}
      aria-hidden
    >
      <defs>
        {/* Heading-strip torn-paper edge — stronger displacement visibly
            roughens the strip boundary while text inside stays crisp */}
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
            scale={8}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* Card/container edge wobble — subtler than the torn heading */}
        <filter id="rough-card" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045"
            numOctaves={3}
            seed={7}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={3.5}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* Paper-page ambient crinkle — very subtle displacement across the
            whole page to break the perfectly-flat digital rectangle look */}
        <filter id="paper-crinkle" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.012"
            numOctaves={5}
            seed={12}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={1.8}
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
        // Richer wood spine: radial dark-to-medium gradient with subtle
        // horizontal grain streaks — replaces the flat #4a2c12 constant.
        background:
          "radial-gradient(ellipse 60% 100% at 20% 50%, #3a1c08 0%, #4a2c12 50%, #5a3418 100%), repeating-linear-gradient(178deg, transparent, transparent 9px, rgba(0,0,0,0.06) 9px, rgba(0,0,0,0.06) 10px)",
        display: "flex",
        padding: "10px 10px 10px 54px",
        boxShadow:
          "0 0 100px rgba(0,0,0,0.85), inset 0 0 24px rgba(0,0,0,0.35)",
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
          borderRadius: "3px 6px 6px 3px",
          overflow: "hidden",
          background: PAPER,
          backgroundImage: `${RULED_BG}, ${VINTAGE_BG}`,
          backgroundPosition:
            "0 13px, 48px 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0",
          // Tri-layer inset: binding-side cast shadow + top-edge stain + ambient depth
          boxShadow:
            "inset 14px 0 28px rgba(50,20,5,0.26), inset 0 6px 16px rgba(50,20,5,0.14), inset 0 0 70px rgba(90,55,15,0.16)",
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
        width: 54,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-evenly",
        alignItems: "center",
        paddingTop: 16,
        paddingBottom: 16,
        pointerEvents: "none",
      }}
    >
      {/* Cast-shadow strip — the binding bleeds a warm shadow onto the paper edge */}
      <div
        style={{
          position: "absolute",
          right: -10,
          top: 0,
          bottom: 0,
          width: 18,
          background:
            "linear-gradient(to right, rgba(50,20,5,0.28) 0%, rgba(50,20,5,0.06) 70%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {Array.from({ length: 13 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            width: 26,
            height: 26,
            borderRadius: "50%",
            // Near-black punched hole — maximum contrast against wood
            background:
              "radial-gradient(circle at 38% 32%, #2e1408 0%, #0e0401 48%, #070100 100%)",
            border: "2px solid rgba(255,210,150,0.10)",
            boxShadow:
              "inset 0 3px 7px rgba(0,0,0,0.85), inset 0 -1px 3px rgba(255,190,120,0.08), 0 1px 0 rgba(255,230,180,0.07)",
          }}
        >
          {/* Rim highlight — ambient light catching the top of the hole */}
          <div
            style={{
              position: "absolute",
              top: 3,
              left: "50%",
              transform: "translateX(-50%)",
              width: 11,
              height: 4,
              borderRadius: "50%",
              background: "rgba(255,210,140,0.16)",
              filter: "blur(1.5px)",
            }}
          />
          {/* Spiral wire — thicker, high-contrast arcs: back arc + front arc + sheen */}
          <svg
            width={46}
            height={22}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              pointerEvents: "none",
              overflow: "visible",
            }}
            aria-hidden
          >
            {/* Back arc — dark, passes behind the hole */}
            <path
              d="M3 11 C 3 3, 43 3, 43 11"
              stroke="rgba(30,12,3,0.95)"
              strokeWidth="2.8"
              fill="none"
              strokeLinecap="round"
            />
            {/* Front arc — mid-tone, passes in front of hole */}
            <path
              d="M3 11 C 3 19, 43 19, 43 11"
              stroke="rgba(55,26,8,0.88)"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />
            {/* Sheen — specular highlight on the top wire */}
            <path
              d="M9 5.5 C 16 2.5, 30 2.5, 37 5.5"
              stroke="rgba(180,120,55,0.50)"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
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
    state.options.format === "test"
      ? "Test · 30 overs"
      : state.options.format === "odi"
        ? "ODI · 15 overs"
        : "T20 · 10 overs";
  const categoryLabel =
    state.options.category === "ipl" ? "IPL" : "INTERNATIONAL";

  return (
    <div style={{ flexShrink: 0 }}>
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            rowGap: 6,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <CricketBallIcon />
          <div style={{ minWidth: 0 }}>
            <span
              className="font-sketch"
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
          <div
            style={{ display: "flex", gap: 8, marginLeft: 4, flexWrap: "wrap" }}
          >
            <HeaderPill>{formatLabel.toUpperCase()}</HeaderPill>
            <HeaderPill>{categoryLabel}</HeaderPill>
          </div>
        </div>

        {/* ── Right: matchup strip + room rail + help + leave (all torn) ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            rowGap: 8,
            flexWrap: "wrap",
          }}
        >
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

      {/* Inline room rail removed for this notebook composition to keep
          the team-selection board as the primary focal area. */}
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
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(139,26,26,0.18)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "rgba(139,26,26,0.10)")
      }
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

/* ═══════════════════════════════════════════════════════════════
   ACTION BAR STRIP — torn-paper scrap of utility icons
═══════════════════════════════════════════════════════════════ */

type StripPanel = "room" | "players" | "voice" | "chat" | "emoji" | null;
const QUICK_EMOJIS = ["👍", "😂", "🔥", "🎉", "😮", "💯"];

/**
 * The "Top Floating Action Bar" — a single torn-paper strip holding five
 * hand-drawn outline icon buttons (link / team / voice / chat / react).
 * Functionally this is Hand Cricket's own skin over the same room actions
 * InlineRoomRail exposes elsewhere (room code, players, voice, chat,
 * quick-react) — reimplemented here so the icon language and panel chrome
 * match the notebook rather than the app's default dark UI.
 */
function HcActionBarStrip({
  roomCode,
  players,
  selfId,
  messages,
}: {
  roomCode: string;
  players: Player[];
  selfId: string;
  messages: ChatMessage[];
}) {
  const [open, setOpen] = useState<StripPanel>(null);
  const [lastReadCount, setLastReadCount] = useState(messages.length);
  useEffect(() => {
    if (open === "chat") setLastReadCount(messages.length);
  }, [open, messages.length]);
  const unread = messages
    .slice(lastReadCount)
    .filter((m) => m.playerId !== selfId).length;

  const [cooldown, setCooldown] = useState(false);
  function react(emoji: string) {
    if (cooldown) return;
    getSocket().emit("room:reaction", { emoji });
    setCooldown(true);
    window.setTimeout(() => setCooldown(false), 400);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const [copied, setCopied] = useState(false);
  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <div style={{ position: "relative", display: "inline-flex" }}>
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: -5,
            background: PAPER_L,
            filter: "url(#rough-torn)",
            boxShadow: "0 3px 8px rgba(46,25,8,0.22)",
            borderRadius: 3,
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 3,
            padding: "5px 9px",
          }}
        >
          <StripIconBtn
            label="Copy room link"
            active={open === "room"}
            onClick={() => setOpen(open === "room" ? null : "room")}
          >
            <IconLinkSketch />
          </StripIconBtn>
          <StripDivider />
          <StripIconBtn
            label="Players"
            active={open === "players"}
            onClick={() => setOpen(open === "players" ? null : "players")}
          >
            <IconTeamSketch />
          </StripIconBtn>
          <StripIconBtn
            label="Voice chat"
            active={open === "voice"}
            onClick={() => setOpen(open === "voice" ? null : "voice")}
          >
            <IconMicSketch />
          </StripIconBtn>
          <StripIconBtn
            label="Chat"
            active={open === "chat"}
            badge={unread}
            onClick={() => setOpen(open === "chat" ? null : "chat")}
          >
            <IconChatSketch />
          </StripIconBtn>
          <StripDivider />
          <StripIconBtn
            label="React"
            active={open === "emoji"}
            onClick={() => setOpen(open === "emoji" ? null : "emoji")}
          >
            <IconSmileySketch />
          </StripIconBtn>
        </div>
      </div>

      {/* Quick-react popover — sits right under the strip, no backdrop. */}
      {open === "emoji" && (
        <div
          style={{
            position: "fixed",
            zIndex: 57,
            left: "50%",
            top: 108,
            transform: "translateX(-50%)",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              gap: 2,
              padding: "6px 8px",
              background: PAPER_L,
              border: `1.5px solid ${BORDER}`,
              borderRadius: 10,
              boxShadow: "0 6px 18px rgba(46,25,8,0.28)",
            }}
          >
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => react(e)}
                disabled={cooldown}
                style={{
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  background: "transparent",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  opacity: cooldown ? 0.5 : 1,
                }}
                title={`React with ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Side-sheet for the heavier panels — Room / Players / Voice / Chat. */}
      {(open === "room" ||
        open === "players" ||
        open === "voice" ||
        open === "chat") && (
        <>
          <button
            aria-label="Close panel"
            onClick={() => setOpen(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 56,
              background: "rgba(20,14,8,0.35)",
              border: "none",
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              zIndex: 57,
              right: 0,
              top: 0,
              bottom: 0,
              width: "min(92vw,22rem)",
              overflowY: "auto",
              padding: 14,
              background: PAPER_L,
              borderLeft: `2px solid ${BORDER}`,
              boxShadow: "-8px 0 24px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                className="font-notebook"
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: INK,
                }}
              >
                {open === "room" && "Room"}
                {open === "players" && "Players"}
                {open === "voice" && "Voice"}
                {open === "chat" && "Chat"}
              </span>
              <button
                onClick={() => setOpen(null)}
                aria-label="Close"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  fontWeight: 800,
                  background: PAPER_D,
                  color: INK,
                  border: `1px solid ${BORDER}`,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            {open === "room" && (
              <div style={{ textAlign: "center" }}>
                <div
                  className="font-notebook"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: INK_LT,
                    fontWeight: 700,
                  }}
                >
                  Room code
                </div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: 26,
                    letterSpacing: "0.3em",
                    fontWeight: 900,
                    color: INK,
                    marginTop: 4,
                  }}
                >
                  {roomCode}
                </div>
                <button
                  onClick={copyCode}
                  className="font-notebook"
                  style={{
                    marginTop: 12,
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 12,
                    background: STAMP_G,
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {copied ? "✓ Copied" : "Copy code"}
                </button>
              </div>
            )}
            {open === "players" && (
              <PlayerList players={players} selfId={selfId} />
            )}
            {open === "voice" && (
              <VoicePanel
                players={players}
                selfId={selfId}
                restoreOrientation="any"
              />
            )}
            {open === "chat" && <Chat messages={messages} selfId={selfId} />}
          </div>
        </>
      )}
    </>
  );
}

function StripDivider() {
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        alignSelf: "stretch",
        background: BORDER,
        opacity: 0.35,
        margin: "0 2px",
      }}
    />
  );
}

function StripIconBtn({
  label,
  active,
  badge,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        position: "relative",
        width: 30,
        height: 30,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "rgba(139,26,26,0.14)" : "transparent",
        border: active ? `1.5px solid ${INK_RED}` : "1.5px solid transparent",
        color: INK,
        cursor: "pointer",
        transition: "background 120ms ease",
      }}
    >
      {children}
      {badge != null && badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: -3,
            right: -3,
            minWidth: 15,
            height: 15,
            padding: "0 3px",
            borderRadius: 999,
            fontSize: 9,
            fontWeight: 800,
            color: "#fff",
            background: INK_RED,
            border: `1.5px solid ${PAPER_L}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

/* Hand-inked outline icons — thin strokes, slightly organic curves so they
   read as sketched rather than a stock icon font. */
function IconLinkSketch() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={INK}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.3 13.3a5 5 0 0 0 7.4.4l2.6-2.7a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M13.7 10.7a5 5 0 0 0-7.4-.4L3.7 13a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  );
}
function IconTeamSketch() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={INK}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-6A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx={10} cy={8} r={3.5} />
      <path d="M20 20v-1.5a3.3 3.3 0 0 0-2.4-3.2" />
      <path d="M15 4.3a3.5 3.5 0 0 1 0 6.8" />
    </svg>
  );
}
function IconMicSketch() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={INK}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x={9} y={2.5} width={6} height={11} rx={3} />
      <path d="M18.5 10.5v1.2a6.5 6.5 0 0 1-13 0v-1.2" />
      <line x1={12} y1={18.5} x2={12} y2={22} />
      <line x1={8.3} y1={22} x2={15.7} y2={22} />
    </svg>
  );
}
function IconChatSketch() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={INK}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 14.8a2.2 2.2 0 0 1-2.2 2.2H8L3.5 21V5.2A2.2 2.2 0 0 1 5.7 3h13.1A2.2 2.2 0 0 1 21 5.2Z" />
    </svg>
  );
}
function IconSmileySketch() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={INK}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx={12} cy={12} r={9.2} />
      <circle cx={8.6} cy={10.2} r={0.9} fill={INK} stroke="none" />
      <circle cx={15.4} cy={10.2} r={0.9} fill={INK} stroke="none" />
      <path d="M7.8 14.3q4.2 3.4 8.4 0" />
    </svg>
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

/**
 * Realistic green washi/masking-tape sticker for the selected country card.
 * Positioned at the top-left corner, tilted ~-4°, so it reads as a physical
 * paper strip pressed onto the card rather than a digital badge.
 */
function WashiTapeSticker({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.6, rotate: 10, opacity: 0 }}
          animate={{ scale: 1, rotate: -4, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          aria-hidden
          style={{
            position: "absolute",
            top: "-6px",
            left: "-6px",
            zIndex: 5,
            pointerEvents: "none",
            transformOrigin: "8px 12px",
          }}
        >
          <svg
            width="88"
            height="22"
            viewBox="0 0 88 22"
            fill="none"
            aria-hidden
          >
            {/* Tape body */}
            <rect
              x="0"
              y="1"
              width="88"
              height="20"
              rx="1.5"
              fill="rgba(22,101,52,0.88)"
            />
            {/* Washi-weave thread lines */}
            {Array.from({ length: 16 }, (_, i) => (i + 1) * 5).map((x, wi) => (
              <line
                key={wi}
                x1={x}
                y1="1"
                x2={x}
                y2="21"
                stroke="rgba(255,255,255,0.065)"
                strokeWidth="1"
              />
            ))}
            {/* Top torn/irregular edge */}
            <path
              d="M0 1 Q9 0 18 1.5 Q27 0.5 38 1 Q50 -0.3 60 1.2 Q72 0.3 80 1 Q84 0.5 88 1"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.9"
              fill="none"
            />
            {/* Bottom shadow edge */}
            <path
              d="M0 21 Q16 22.3 32 21 Q48 22 64 21.2 Q76 22 88 21"
              stroke="rgba(0,0,0,0.22)"
              strokeWidth="0.9"
              fill="none"
            />
            {/* Centre fold-crease highlight */}
            <line
              x1="0"
              y1="11"
              x2="88"
              y2="11"
              stroke="rgba(255,255,255,0.09)"
              strokeWidth="1.5"
            />
            {/* Label */}
            <text
              x="44"
              y="12.5"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="'Kalam', 'Caveat', cursive"
              fontSize="8"
              fontWeight="800"
              fill="rgba(255,255,255,0.96)"
              letterSpacing="0.7"
            >
              ★ SELECTED
            </text>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Faint pencil-sketch doodles rendered at z:0 behind each country card's content.
 * Trophy outline in the bottom-left, cricket ball stitches in the centre,
 * scattered stars in the top-right. Opacity 0.10 → reads as light pencil margin art.
 */
function CardDoodleLayer() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 148"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.1,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Trophy outline — bottom-left corner */}
      <g transform="translate(5, 96)">
        <path
          d="M8 0 Q2 0 2 10 Q2 20 9 21 L9 24 L7 26 L23 26 L21 24 L21 21 Q28 20 28 10 Q28 0 22 0 Z"
          stroke={BORDER}
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
        />
        <line
          x1="11"
          y1="26"
          x2="19"
          y2="26"
          stroke={BORDER}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <line
          x1="13"
          y1="26"
          x2="13"
          y2="30"
          stroke={BORDER}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <line
          x1="17"
          y1="26"
          x2="17"
          y2="30"
          stroke={BORDER}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <line
          x1="10"
          y1="30"
          x2="20"
          y2="30"
          stroke={BORDER}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
      {/* Cricket ball stitches — centre */}
      <g transform="translate(50, 68)">
        <circle
          cx="0"
          cy="0"
          r="13"
          stroke={BORDER}
          strokeWidth="1.2"
          strokeDasharray="2 1.5"
        />
        <path
          d="M-7 -8 Q-12 0 -7 8"
          stroke={BORDER}
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M7 -8 Q12 0 7 8"
          stroke={BORDER}
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
        {([-5, -1, 3, 7] as number[]).map((y, i) => (
          <g key={i}>
            <line
              x1="-10"
              y1={y}
              x2="-5"
              y2={y + 0.5}
              stroke={BORDER}
              strokeWidth="0.8"
              strokeLinecap="round"
            />
            <line
              x1="5"
              y1={y}
              x2="10"
              y2={y + 0.5}
              stroke={BORDER}
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
      {/* Scattered pencil stars — top-right */}
      {(
        [
          [80, 16, 7, 8],
          [90, 32, 4, -5],
          [74, 30, 5, 3],
          [86, 48, 3.5, 7],
        ] as [number, number, number, number][]
      ).map(([x, y, sz, rot], i) => (
        <text
          key={i}
          x={x}
          y={y}
          fontSize={sz}
          fill={GOLD}
          transform={`rotate(${rot}, ${x}, ${y})`}
          style={{ fontFamily: "sans-serif" }}
        >
          ★
        </text>
      ))}
    </svg>
  );
}

/**
 * Country code as thick hand-inked SVG text — fill + matching thin stroke give
 * the ink-bleed weight of a dipped pen nib. Below it, two organically-wobbly
 * pencil paths replace the flat CSS border underlines. Greyed for locked cards.
 */
function InkCountryCode({
  code,
  color,
  hasRoster,
}: {
  code: string;
  color: string;
  hasRoster: boolean;
}) {
  const inkColor = hasRoster ? color : "#9ca3af";
  const filterId = `ink-${code}`;
  return (
    <div
      aria-hidden
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <svg
        viewBox="0 0 80 38"
        width="80"
        height="38"
        style={{ overflow: "visible" }}
        aria-hidden
      >
        <defs>
          <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="0.9"
              floodColor={inkColor}
              floodOpacity="0.32"
            />
          </filter>
        </defs>
        <text
          x="40"
          y="30"
          textAnchor="middle"
          fontFamily="'Kalam', 'Caveat', cursive"
          fontSize="28"
          fontWeight="900"
          fill={inkColor}
          stroke={inkColor}
          strokeWidth="0.5"
          paintOrder="stroke fill"
          filter={hasRoster ? `url(#${filterId})` : undefined}
          letterSpacing="-0.5"
        >
          {code}
        </text>
      </svg>
      {/* Organic double pencil underline */}
      {hasRoster && (
        <svg
          width="58"
          height="10"
          viewBox="0 0 58 10"
          fill="none"
          aria-hidden
          style={{ marginTop: "-5px" }}
        >
          <path
            d="M2 3 Q10 1.8 20 3 Q30 4.2 40 3 Q50 1.8 56 3"
            stroke={inkColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.58"
            fill="none"
          />
          <path
            d="M5 6.5 Q16 5.2 28 6.5 Q40 7.8 53 6.2"
            stroke={inkColor}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.28"
            fill="none"
          />
        </svg>
      )}
    </div>
  );
}

/**
 * Red hand-scrawled "NO ROSTER YET" label pinned to the bottom of locked cards.
 * SVG renders the text at a slight tilt so it reads as urgently scratched in red ink.
 */
function NoRosterScrawl() {
  return (
    <svg
      width="100%"
      height="28"
      viewBox="0 0 96 28"
      fill="none"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* Rough scribble underline */}
      <path
        d="M8 23 Q24 25 48 23 Q70 21 88 23"
        stroke={INK_RED}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.45"
        fill="none"
      />
      <text
        x="48"
        y="16"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Kalam', 'Caveat', cursive"
        fontSize="9"
        fontWeight="900"
        fill={INK_RED}
        letterSpacing="0.2"
        transform="rotate(-2.5, 48, 16)"
      >
        NO ROSTER YET
      </text>
    </svg>
  );
}

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
    <div
      className="flex-1 min-h-0"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* ══════════════════════════════════════════════════════
          ILLUSTRATION LAYER — mirrors IPL picker layout exactly.
          Visible only on lg+ (1024px+).
      ══════════════════════════════════════════════════════ */}
      <div
        aria-hidden
        className="hidden lg:block"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        {/* ─── LEFT SIDE ─── */}
        <img
          src="/illustrations/Handcricket/CricketBat.png"
          alt=""
          style={{
            position: "absolute",
            left: "1%",
            bottom: "1%",
            height: "39%",
            maxHeight: 365,
            objectFit: "contain",
            objectPosition: "bottom left",
            transform: "scaleX(-1)",
            filter: "drop-shadow(-4px 8px 16px rgba(0,0,0,0.20))",
            opacity: 0.9,
          }}
        />
        <IplHeartDoodle
          style={{ position: "absolute", left: "10%", top: "41%" }}
          size={42}
          opacity={0.5}
        />
        <IplHeartDoodle
          style={{
            position: "absolute",
            left: "12.5%",
            top: "52%",
            transform: "rotate(7deg)",
          }}
          size={26}
          opacity={0.36}
        />
        <img
          src="/illustrations/Handcricket/cricket_ball.png"
          alt=""
          style={{
            position: "absolute",
            left: "1.5%",
            bottom: "3.5%",
            width: 84,
            objectFit: "contain",
            filter: "drop-shadow(2px 5px 10px rgba(0,0,0,0.24))",
            opacity: 0.9,
          }}
        />
        <img
          src="/illustrations/Handcricket/clouds.png"
          alt=""
          style={{
            position: "absolute",
            left: "6.6%",
            top: "7.4%",
            width: "22%",
            maxWidth: 248,
            objectFit: "contain",
            opacity: 0.74,
          }}
        />
        <img
          src="/illustrations/Handcricket/Cricket_Helmet.png"
          alt=""
          style={{
            position: "absolute",
            left: "3.8%",
            top: "17.6%",
            width: "9.9%",
            maxWidth: 144,
            objectFit: "contain",
            objectPosition: "top left",
            opacity: 0.88,
            transform: "scaleX(-1) rotate(-12deg)",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.14))",
          }}
        />

        {/* Right-side illustration area (caption removed) */}

        <img
          src="/illustrations/Handcricket/Boy_cheering.png"
          alt=""
          style={{
            position: "absolute",
            right: "2.2%",
            bottom: "10%",
            width: "18%",
            objectFit: "contain",
            objectPosition: "bottom right",
            filter: "drop-shadow(2px 4px 12px rgba(0,0,0,0.16))",
            opacity: 0.91,
          }}
        />

        {/* World Cup trophy — placed in the marked right-side area */}
        <img
          src="/illustrations/Handcricket/worldcup.png"
          alt=""
          style={{
            position: "absolute",
            right: "4%",
            top: "14%",
            width: "14%",
            minWidth: 100,
            maxWidth: 220,
            objectFit: "contain",
            filter: "drop-shadow(4px 8px 18px rgba(0,0,0,0.24))",
            opacity: 0.95,
            pointerEvents: "none",
          }}
        />

        {/* World Cup and star decorations removed per request */}
      </div>

      {/* ══════════════════════════════════════════════════════
          SCROLLABLE CENTER CONTENT — transparent so illustration
          layer bleeds through the side margins.
      ══════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px 0 16px",
          zIndex: 10,
        }}
      >
        <PaperPanel
          tone="sheet"
          strong
          pad="none"
          className="w-full max-w-[920px] m-auto flex flex-col px-[18px] pt-[18px] pb-3.5"
          style={{ marginTop: 42, marginBottom: 6 }}
        >
          <CornerTick corner="tl" />
          <CornerTick corner="tr" />
          <CornerTick corner="bl" />
          <CornerTick corner="br" />

          <div className="mb-2.5">
            <HcSketchHeading size="clamp(15px,2vw,22px)">
              Pick Your Nation
            </HcSketchHeading>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {COUNTRY_ORDER.map((id, idx) => {
              const profile = HC_COUNTRIES[id];
              const meta = COUNTRY_META[id];
              const hasRoster = getRosterFor(id, state.options.format) !== null;
              const isOpp = oppPick === id;
              const isSelected = state.teamSelections[selfId]?.teamId === id;
              const FlagSvg = FLAG_COMPONENTS[id];

              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: idx * 0.045,
                    duration: 0.32,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={hasRoster ? { y: -5, scale: 1.04 } : {}}
                  whileTap={hasRoster ? { scale: 0.96 } : {}}
                  style={{ transformOrigin: "center bottom" }}
                >
                  <button
                    onClick={() => hasRoster && pick(id)}
                    disabled={!hasRoster}
                    aria-pressed={isSelected}
                    aria-label={profile.name}
                    className="relative w-full min-h-[162px] rounded-none border bg-[#fffdf5]"
                    style={{
                      borderColor: "rgba(70,60,40,0.75)",
                      boxShadow: isSelected
                        ? "0 0 0 2px rgba(30,58,138,0.20), 0 3px 8px rgba(0,0,0,0.20)"
                        : "0 2px 7px rgba(0,0,0,0.16)",
                      opacity: hasRoster ? 1 : 0.48,
                      cursor: hasRoster ? "pointer" : "not-allowed",
                    }}
                  >
                    {isOpp && !isSelected && (
                      <span
                        className="font-notebook"
                        style={{
                          position: "absolute",
                          top: -10,
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "#2563eb",
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: 900,
                          letterSpacing: "0.03em",
                          padding: "2px 7px",
                          borderRadius: 2,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
                          textTransform: "uppercase",
                          maxWidth: "82%",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {oppName}
                      </span>
                    )}
                    {isSelected && (
                      <span
                        className="font-notebook"
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: "rgba(22,101,52,0.12)",
                          border: "1px solid rgba(22,101,52,0.45)",
                          color: "#166534",
                          fontSize: 9,
                          fontWeight: 800,
                          padding: "1px 5px",
                          borderRadius: 10,
                          letterSpacing: "0.03em",
                        }}
                      >
                        PICKED
                      </span>
                    )}

                    <div className="flex h-full flex-col items-center justify-center gap-1 px-2 py-4 text-center">
                      {FlagSvg ? (
                        <FlagSvg
                          title={profile.name}
                          className="shrink-0 rounded-[3px] shadow-[0_1px_4px_rgba(0,0,0,0.28)]"
                          style={{ width: 48, height: "auto", marginBottom: 2 }}
                        />
                      ) : (
                        <span className="text-[36px] leading-tight">
                          {profile.flag}
                        </span>
                      )}

                      <span
                        className="font-hand"
                        style={{
                          color: meta.color,
                          fontSize: 38,
                          lineHeight: 1,
                          fontWeight: 900,
                          letterSpacing: "-0.03em",
                          marginTop: 2,
                        }}
                      >
                        {meta.code}
                      </span>

                      <span
                        aria-hidden
                        style={{
                          width: 48,
                          height: 2,
                          background: meta.color,
                          opacity: 0.8,
                          borderRadius: 99,
                          marginTop: -1,
                          marginBottom: 2,
                        }}
                      />

                      <span
                        className="font-notebook"
                        style={{
                          color: INK,
                          fontSize: 10,
                          fontWeight: 700,
                          lineHeight: 1.2,
                        }}
                      >
                        {profile.name}
                      </span>

                      {!hasRoster && (
                        <span
                          style={{
                            fontSize: 9,
                            color: "#b45309",
                            fontFamily: "'Kalam', cursive",
                            fontWeight: 700,
                          }}
                        >
                          No roster yet
                        </span>
                      )}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          <div
            className="font-hand text-center text-xs mt-2 shrink-0"
            style={{ color: INK_LT }}
          >
            Same country? No problem — we'll show it as{" "}
            <span className="font-bold" style={{ color: STAMP_G }}>
              India (Sri Krishna)
            </span>
            {" vs "}
            <span className="font-bold" style={{ color: INK_RED }}>
              India (Radha)
            </span>
            .
          </div>
        </PaperPanel>

        <p
          className="font-hand text-center px-5"
          style={{
            color: "rgba(26,41,82,0.88)",
            fontSize: "clamp(24px, 1.25vw, 120px)",
            lineHeight: 1.25,
            letterSpacing: "0.01em",
            textShadow: "0 1px 0 rgba(255,255,255,0.45)",
            marginTop: 4,
            marginBottom: 2,
            maxWidth: 920,
          }}
        >
          Some matches are scored in runs, but the best ones are remembered in
          smiles, cheers, and heart.
        </p>
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
    "csk",
    "mi",
    "rcb",
    "kkr",
    "srh",
    "dc",
    "pbks",
    "rr",
    "gt",
    "lsg",
  ];

  const fullNames: Record<HcFranchise, string> = {
    csk: "Chennai Super Kings",
    mi: "Mumbai Indians",
    rcb: "Royal Challengers Bengaluru",
    kkr: "Kolkata Knight Riders",
    srh: "Sunrisers Hyderabad",
    dc: "Delhi Capitals",
    pbks: "Punjab Kings",
    rr: "Rajasthan Royals",
    gt: "Gujarat Titans",
    lsg: "Lucknow Super Giants",
  };

  return (
    <div
      className="flex-1 min-h-0"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* ══════════════════════════════════════════════════════
          ILLUSTRATION LAYER — absolutely fills the whole paper
          area, sitting behind the scrollable content (z:0).
          All sizes are percentage-relative to the container so
          they scale naturally with viewport width.
          Visible only on lg+ (1024px+).
      ══════════════════════════════════════════════════════ */}
      <div
        aria-hidden
        className="hidden lg:block"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        {/* ─── LEFT SIDE ─── */}

        {/* Cricket bat — bottom-left, tilted similar to the reference sheet. */}
        <img
          src="/illustrations/Handcricket/CricketBat.png"
          alt=""
          style={{
            position: "absolute",
            left: "1%",
            bottom: "1%",
            height: "39%",
            maxHeight: 365,
            objectFit: "contain",
            objectPosition: "bottom left",
            transform: "scaleX(-1)",
            filter: "drop-shadow(-4px 8px 16px rgba(0,0,0,0.20))",
            opacity: 0.9,
          }}
        />

        {/* Sketched red hearts — mid-left, above the bat handle */}
        <IplHeartDoodle
          style={{ position: "absolute", left: "10%", top: "41%" }}
          size={42}
          opacity={0.5}
        />
        <IplHeartDoodle
          style={{
            position: "absolute",
            left: "12.5%",
            top: "52%",
            transform: "rotate(7deg)",
          }}
          size={26}
          opacity={0.36}
        />

        {/* Cricket ball — bottom-left corner */}
        <img
          src="/illustrations/Handcricket/cricket_ball.png"
          alt=""
          style={{
            position: "absolute",
            left: "1.5%",
            bottom: "3.5%",
            width: 84,
            objectFit: "contain",
            filter: "drop-shadow(2px 5px 10px rgba(0,0,0,0.24))",
            opacity: 0.9,
          }}
        />

        {/* Clouds around the left hero zone */}
        <img
          src="/illustrations/Handcricket/clouds.png"
          alt=""
          style={{
            position: "absolute",
            left: "6.6%",
            top: "7.4%",
            width: "22%",
            maxWidth: 248,
            objectFit: "contain",
            opacity: 0.74,
          }}
        />

        {/* ─── RIGHT SIDE ─── */}

        {/* Cricket helmet — replaces stadium in the top-left hero zone. */}
        <img
          src="/illustrations/Handcricket/Cricket_Helmet.png"
          alt=""
          style={{
            position: "absolute",
            left: "3.8%",
            top: "17.6%",
            width: "9.9%",
            maxWidth: 144,
            objectFit: "contain",
            objectPosition: "top left",
            opacity: 0.88,
            transform: "scaleX(-1) rotate(-12deg)",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.14))",
          }}
        />

        {/* "IPL is not just a game, it's an emotion." — hand-lettered quote */}
        <div
          style={{
            position: "absolute",
            right: "3.2%",
            top: "19.6%",
            textAlign: "right",
            fontFamily: "'Caveat', cursive",
            lineHeight: 1.1,
          }}
        >
          {/* Cloud accent above IPL text */}
          <img
            src="/illustrations/Handcricket/clouds.png"
            alt=""
            style={{
              position: "absolute",
              top: -120,
              right: -20,
              width: 220,
              objectFit: "contain",
              opacity: 0.92,
            }}
          />
          <img
            src="/illustrations/Handcricket/clouds.png"
            alt=""
            style={{
              position: "absolute",
              top: -80,
              right: 88,
              width: 150,
              objectFit: "contain",
              opacity: 0.88,
            }}
          />
          <span
            style={{
              display: "block",
              fontSize: "clamp(76px, 7.2vw, 104px)",
              fontWeight: 900,
              color: "#1e3a8a",
              lineHeight: 0.86,
              letterSpacing: "-1px",
            }}
          >
            IPL
          </span>
          <span
            style={{
              display: "block",
              fontSize: "clamp(19px, 1.55vw, 26px)",
              color: "#1a2952",
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            is not just a game,
          </span>
          <span
            style={{
              display: "block",
              fontSize: "clamp(19px, 1.55vw, 26px)",
              color: "#1a2952",
              fontWeight: 700,
            }}
          >
            {"it's an "}
            <span
              style={{
                color: "#dc2626",
                fontWeight: 900,
                fontSize: "clamp(24px, 1.9vw, 32px)",
              }}
            >
              emotion.
            </span>
            {" ❤"}
          </span>
        </div>

        {/* Celebrating kid — lower right, large and prominent */}
        <img
          src="/illustrations/Handcricket/Boy_cheering.png"
          alt=""
          style={{
            position: "absolute",
            right: "2.2%",
            bottom: "10%",
            width: "18%",
            objectFit: "contain",
            objectPosition: "bottom right",
            filter: "drop-shadow(2px 4px 12px rgba(0,0,0,0.16))",
            opacity: 0.91,
          }}
        />

        {/* Champions Cup trophy — centred below the table (slightly larger) */}
        <img
          src="/illustrations/Handcricket/Champions_cup.png"
          alt=""
          style={{
            position: "absolute",
            left: "50%",
            bottom: "calc(6.4% - 18px)",
            transform: "translateX(-50%)",
            width: "18%",
            minWidth: 140,
            maxWidth: 260,
            objectFit: "contain",
            filter: "drop-shadow(3px 6px 14px rgba(0,0,0,0.22))",
            opacity: 0.95,
          }}
        />

        {/* Star shower for champions cup */}
        <img
          src="/illustrations/Handcricket/stars.png"
          alt=""
          style={{
            position: "absolute",
            left: "48%",
            bottom: "22%",
            width: 220,
            maxWidth: 300,
            objectFit: "contain",
            opacity: 0.95,
            transform: "translateX(-40%) rotate(-8deg)",
            filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.26))",
          }}
        />
        <img
          src="/illustrations/Handcricket/stars.png"
          alt=""
          style={{
            position: "absolute",
            left: "56%",
            bottom: "12%",
            width: 160,
            maxWidth: 240,
            objectFit: "contain",
            opacity: 0.95,
            transform: "translateX(-60%) rotate(14deg)",
            filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.26))",
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════
          SCROLLABLE CENTER CONTENT — transparent background so
          the illustration layer bleeds through the side margins.
          z:10 puts it above the illustrations.
      ══════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px 0 16px",
          zIndex: 10,
        }}
      >
        <PaperPanel
          tone="sheet"
          strong
          pad="none"
          className="w-full max-w-[920px] m-auto flex flex-col px-[18px] pt-[18px] pb-3.5"
          style={{
            marginTop: 42,
            marginBottom: 6,
          }}
        >
          <CornerTick corner="tl" />
          <CornerTick corner="tr" />
          <CornerTick corner="bl" />
          <CornerTick corner="br" />

          {/* Heading with radiating arrows */}
          <div className="mb-2.5">
            <HcSketchHeading size="clamp(15px,2vw,22px)">
              Pick Your IPL Franchise
            </HcSketchHeading>
          </div>

          {/* 5 × 2 franchise grid — stagger-in + hover lift */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {franchises.map((id, idx) => {
              const f = HC_FRANCHISES[id];
              const isOpp = oppPick === id;
              const isSelected = state.teamSelections[selfId]?.teamId === id;

              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: idx * 0.045,
                    duration: 0.32,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={{ y: -5, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  style={{ transformOrigin: "center bottom" }}
                >
                  <button
                    onClick={() => pick(id)}
                    aria-pressed={isSelected}
                    aria-label={f.name}
                    className="relative w-full min-h-[162px] rounded-none border bg-[#fffdf5]"
                    style={{
                      borderColor: "rgba(70,60,40,0.75)",
                      boxShadow: isSelected
                        ? "0 0 0 2px rgba(30,58,138,0.20), 0 3px 8px rgba(0,0,0,0.20)"
                        : "0 2px 7px rgba(0,0,0,0.16)",
                    }}
                  >
                    {isOpp && (
                      <span
                        className="font-notebook"
                        style={{
                          position: "absolute",
                          top: -10,
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "#2563eb",
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: 900,
                          letterSpacing: "0.03em",
                          padding: "2px 7px",
                          borderRadius: 2,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
                          textTransform: "uppercase",
                          maxWidth: "82%",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {oppName}
                      </span>
                    )}

                    {isSelected && (
                      <span
                        className="font-notebook"
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: "rgba(22,101,52,0.12)",
                          border: "1px solid rgba(22,101,52,0.45)",
                          color: "#166534",
                          fontSize: 9,
                          fontWeight: 800,
                          padding: "1px 5px",
                          borderRadius: 10,
                          letterSpacing: "0.03em",
                        }}
                      >
                        PICKED
                      </span>
                    )}

                    <div className="flex h-full flex-col items-center justify-center gap-1 px-2 py-4 text-center">
                      <div
                        aria-hidden
                        className="rounded-full"
                        style={{
                          width: 48,
                          height: 48,
                          background: f.color,
                          boxShadow:
                            "inset 0 1px 4px rgba(255,255,255,0.32), 0 2px 6px rgba(0,0,0,0.20)",
                          border: "1.3px solid rgba(255,255,255,0.22)",
                        }}
                      />

                      <span
                        className="font-hand"
                        style={{
                          color: f.color,
                          fontSize: 46,
                          lineHeight: 1,
                          fontWeight: 900,
                          letterSpacing: "-0.03em",
                          marginTop: 3,
                        }}
                      >
                        {f.short}
                      </span>

                      <span
                        aria-hidden
                        style={{
                          width: 52,
                          height: 2,
                          background: f.color,
                          opacity: 0.8,
                          borderRadius: 99,
                          marginTop: -1,
                          marginBottom: 2,
                        }}
                      />

                      <span
                        className="font-notebook"
                        style={{
                          color: INK,
                          fontSize: 10,
                          fontWeight: 700,
                          lineHeight: 1.2,
                        }}
                      >
                        {fullNames[id]}
                      </span>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Same-franchise note */}
          <div
            className="font-hand text-center text-xs mt-2 shrink-0"
            style={{ color: INK_LT }}
          >
            Same franchise? No problem — we'll show it as{" "}
            <span className="font-bold" style={{ color: STAMP_G }}>
              CSK (Sri Krishna)
            </span>
            {" vs "}
            <span className="font-bold" style={{ color: INK_RED }}>
              CSK (Radha)
            </span>
            .
          </div>

          {/* Removed inline bottom props strip to keep the board clean. */}
        </PaperPanel>
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
        background: "rgba(245,233,196,0.60)",
        // Organic hand-cut corner warp — asymmetric radii break the digital
        // rectangle; the unevenness reads as physically torn / cut paper.
        borderRadius: "255px 14px 228px 16px / 14px 230px 12px 258px",
        padding: 16,
        // Torn-paper lift — the cast shadow grounds the "floating paper" metaphor
        filter:
          "drop-shadow(2px 4px 8px rgba(50,28,8,0.20)) drop-shadow(0 1px 2px rgba(50,28,8,0.10))",
      }}
    >
      <RoughBorder
        roughness={2.4}
        stroke="rgba(46,40,25,0.68)"
        strokeWidth={2.0}
        padding={4}
        bowing={1.5}
      />
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
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* top-left cluster: stumps + a couple of stars */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          opacity: 0.9,
          transform: "rotate(-6deg)",
        }}
      >
        <StumpsDoodle />
      </div>
      <SketchStar x="15%" y="30%" size={16} />
      <SketchStar x="9%" y="58%" size={11} />

      {/* top-right: cricket ball with motion lines */}
      <div style={{ position: "absolute", top: 22, right: 26, opacity: 0.9 }}>
        <CricketBallDoodle size={54} />
        <svg
          width={40}
          height={30}
          viewBox="0 0 40 30"
          style={{ position: "absolute", top: -6, right: 44 }}
          aria-hidden
        >
          <path
            d="M2 6 h16 M0 15 h20 M4 24 h14"
            stroke={BORDER}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.5}
          />
        </svg>
      </div>
      <SketchStar x="90%" y="40%" size={13} />

      {/* bottom-right desk cluster: trophy, bat resting on a ball, backpack,
          and stars scattered over a scribbled grass line — everything the
          gameplay screen's footer whitespace asks for, grouped in one corner
          instead of scattered, so it reads as a little "desk corner" scene. */}
      <div
        style={{
          position: "absolute",
          right: 18,
          bottom: 8,
          width: 190,
          height: 78,
          opacity: 0.88,
        }}
      >
        <div style={{ position: "absolute", left: 0, bottom: 2 }}>
          <TrophyDoodle />
        </div>
        <div style={{ position: "absolute", left: 62, bottom: 0 }}>
          <div style={{ position: "relative", width: 48, height: 60 }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: "rotate(16deg)",
              }}
            >
              <BatDoodle size={46} />
            </div>
            <div style={{ position: "absolute", left: 16, bottom: 2 }}>
              <CricketBallDoodle size={22} />
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 130, bottom: 2 }}>
          <BackpackDoodle />
        </div>
        <SketchStar x="10%" y="2%" size={11} />
        <SketchStar x="52%" y="-4%" size={9} />
        <SketchStar x="88%" y="6%" size={13} />
        <svg
          width={190}
          height={12}
          viewBox="0 0 190 12"
          style={{ position: "absolute", left: 0, bottom: -4 }}
          aria-hidden
        >
          <path
            d="M2 10 q3 -8 6 0 M12 10 q3 -9 6 0 M22 10 q3 -8 6 0 M32 10 q3 -10 6 0 M42 10 q3 -8 6 0 M52 10 q3 -9 6 0 M62 10 q3 -8 6 0 M72 10 q3 -10 6 0 M82 10 q3 -8 6 0 M92 10 q3 -9 6 0 M102 10 q3 -8 6 0 M112 10 q3 -10 6 0 M122 10 q3 -8 6 0 M132 10 q3 -9 6 0 M142 10 q3 -8 6 0 M152 10 q3 -10 6 0 M162 10 q3 -8 6 0 M172 10 q3 -9 6 0 M182 10 q3 -8 6 0"
            stroke={BORDER}
            strokeWidth={1.3}
            fill="none"
            strokeLinecap="round"
            opacity={0.45}
          />
        </svg>
      </div>
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
    <svg
      width={44}
      height={54}
      viewBox="0 0 44 54"
      fill="none"
      aria-hidden
      style={{ opacity: 0.3 }}
    >
      <rect
        x={8}
        y={16}
        width={28}
        height={34}
        rx={8}
        stroke={BORDER}
        strokeWidth={1.8}
      />
      <path
        d="M16 16 Q22 4 28 16"
        stroke={BORDER}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x={15}
        y={28}
        width={14}
        height={14}
        rx={4}
        stroke={BORDER}
        strokeWidth={1.4}
      />
      <line
        x1={8}
        y1={24}
        x2={36}
        y2={24}
        stroke={BORDER}
        strokeWidth={1.2}
        opacity={0.6}
      />
      <line
        x1={22}
        y1={42}
        x2={22}
        y2={48}
        stroke={BORDER}
        strokeWidth={1.2}
        opacity={0.6}
      />
    </svg>
  );
}

/** Hand-sketched red heart — decorates the left margin of the IPL franchise picker. */
function IplHeartDoodle({
  style,
  size = 30,
  opacity = 0.82,
}: {
  style?: CSSProperties;
  size?: number;
  opacity?: number;
}) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.9)}
      viewBox="0 0 30 27"
      fill="none"
      aria-hidden
      style={{ opacity, ...style }}
    >
      <path
        d="M15 25 C15 25 2.5 16 2.5 8.5C2.5 5 5.2 2.2 8.5 2.2C10.7 2.2 12.8 3.4 14 5.2C15.2 3.4 17.3 2.2 19.5 2.2C22.8 2.2 25.5 5 25.5 8.5C25.5 16 15 25 15 25Z"
        fill="#dc2626"
        fillOpacity="0.76"
        stroke="#9b1c1c"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 7 Q11.5 5 13.5 7.5"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
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
      <circle
        cx={16}
        cy={16}
        r={14}
        fill="#c0392b"
        stroke="#7c1d1d"
        strokeWidth={1.5}
      />
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
      <line
        x1={13}
        y1={13}
        x2={27}
        y2={13}
        stroke={BORDER}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={25}
        y1={13}
        x2={39}
        y2={13}
        stroke={BORDER}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Ground curve */}
      <path
        d="M6 50 Q32 54 58 50"
        stroke={BORDER}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      {/* Bat handle */}
      <path
        d="M48 10 L44 48"
        stroke={BORDER}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* Bat blade */}
      <path
        d="M44 42 Q44 52 50 52 Q56 52 56 42 Z"
        fill={BORDER}
        opacity={0.5}
      />
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
      <line
        x1={22}
        y1={52}
        x2={22}
        y2={58}
        stroke={BORDER}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={30}
        y1={52}
        x2={30}
        y2={58}
        stroke={BORDER}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={18}
        y1={58}
        x2={34}
        y2={58}
        stroke={BORDER}
        strokeWidth={2}
        strokeLinecap="round"
      />
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
      <line
        x1={28}
        y1={4}
        x2={28}
        y2={18}
        stroke={BORDER}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Grip tape wraps */}
      <line
        x1={25}
        y1={8}
        x2={31}
        y2={10}
        stroke={BORDER}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.5}
      />
      <line
        x1={25}
        y1={12}
        x2={31}
        y2={14}
        stroke={BORDER}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.5}
      />
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
    <svg
      width={64}
      height={44}
      viewBox="0 0 64 44"
      aria-hidden
      style={{ opacity: 0.35 }}
    >
      {(
        [
          [10, 28, 13, 0],
          [26, 14, 10, -8],
          [38, 32, 9, 5],
          [52, 18, 12, 3],
          [20, 8, 7, -4],
        ] as [number, number, number, number][]
      ).map(([x, y, sz, rot], i) => (
        <text
          key={i}
          x={x}
          y={y}
          fontSize={sz}
          fill={GOLD}
          transform={`rotate(${rot}, ${x}, ${y})`}
          style={{ fontFamily: "sans-serif" }}
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
        background:
          tint ?? (selected ? "rgba(22,101,52,0.12)" : "rgba(251,245,224,0.9)"),
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
        <RoughBorder
          roughness={1.8}
          strokeWidth={2}
          bowing={1.1}
          stroke="rgba(46,40,25,0.72)"
          padding={3}
        />
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
      {(
        [
          [-10, 0],
          [-6, -5],
          [-6, 5],
          [-12, -9],
          [-12, 9],
        ] as [number, number][]
      ).map(([dx, dy], i) => (
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
      ))}
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

/* ═══════════════════════════════════════════════════════════════
   GAMEPLAY SCREEN — skeuomorphic detail pieces for the innings screen:
   masking-tape scoreboard corners, stumps-in-grass, a stitched ball, the
   ripped-parchment role ribbon, a paperclip + curled-corner bowler card,
   and the bottom-right desk-doodle cluster.
═══════════════════════════════════════════════════════════════ */

/** Translucent masking-tape strip pinned at a card's top-left/top-right
 *  corner — woven thread lines + a torn top edge read as real tape, not a
 *  digital sticker. */
export function MaskingTapeCorner({ side }: { side: "left" | "right" }) {
  const rotate = side === "left" ? -7 : 7;
  const pos: CSSProperties =
    side === "left" ? { left: -14, top: -13 } : { right: -14, top: -13 };
  return (
    <svg
      width={72}
      height={26}
      viewBox="0 0 72 26"
      aria-hidden
      style={{
        position: "absolute",
        ...pos,
        transform: `rotate(${rotate}deg)`,
        pointerEvents: "none",
      }}
    >
      <rect
        x={1}
        y={1}
        width={70}
        height={22}
        rx={1.5}
        fill="rgba(251,245,224,0.62)"
        stroke="rgba(46,40,25,0.22)"
        strokeWidth={0.75}
      />
      {Array.from({ length: 13 }, (_, i) => (i + 1) * 5).map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={1}
          x2={x}
          y2={23}
          stroke="rgba(46,40,25,0.07)"
          strokeWidth={1}
        />
      ))}
      <path
        d="M1 1 Q11 -0.6 21 1 Q35 2.3 47 1 Q59 -0.5 71 1"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={0.8}
        fill="none"
      />
      <path
        d="M1 23 Q17 24.4 33 23 Q49 24.2 71 23"
        stroke="rgba(0,0,0,0.14)"
        strokeWidth={0.8}
        fill="none"
      />
    </svg>
  );
}

/** Three stumps + bails pitched in a scribbled tuft of grass — the graphic
 *  element that sits beside the giant score on the match status card. */
export function StumpsInGrassSketch({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      {[16, 28, 40].map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={8}
          x2={x}
          y2={40}
          stroke={INK}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      ))}
      <line
        x1={15}
        y1={12}
        x2={29}
        y2={12}
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={27}
        y1={12}
        x2={41}
        y2={12}
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M4 42 q3 -10 6 0 M10 42 q3 -11 6 0 M16 42 q3 -9 6 0 M22 42 q3 -12 6 0 M28 42 q3 -9 6 0 M34 42 q3 -11 6 0 M40 42 q3 -9 6 0 M46 42 q3 -10 6 0"
        stroke={STAMP_G}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
        opacity={0.72}
      />
      <path
        d="M2 43 Q28 47 54 43"
        stroke={STAMP_G}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        opacity={0.5}
      />
    </svg>
  );
}

/** Leather cricket ball with visible seam stitching — used in the bowling
 *  column while the "You are BOWLING · Waiting…" state is shown. */
export function CricketBallStitchSketch({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden>
      <circle
        cx={17}
        cy={17}
        r={14.5}
        fill="#A9362B"
        stroke="#5E1B14"
        strokeWidth={1.4}
      />
      <circle cx={13} cy={13} r={5} fill="rgba(255,255,255,0.16)" />
      <path
        d="M9 6 Q14.5 17 9 28"
        stroke="#F5E9C4"
        strokeWidth={1.3}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M25 6 Q19.5 17 25 28"
        stroke="#F5E9C4"
        strokeWidth={1.3}
        fill="none"
        strokeLinecap="round"
      />
      {[-8, -4, 0, 4, 8].map((y, i) => (
        <g key={i}>
          <line
            x1={7.6}
            y1={17 + y}
            x2={11.2}
            y2={17 + y * 0.94}
            stroke="#F5E9C4"
            strokeWidth={0.85}
            strokeLinecap="round"
          />
          <line
            x1={22.8}
            y1={17 + y}
            x2={26.4}
            y2={17 + y * 0.94}
            stroke="#F5E9C4"
            strokeWidth={0.85}
            strokeLinecap="round"
          />
        </g>
      ))}
      <ellipse
        cx={17}
        cy={17}
        rx={4.2}
        ry={13.5}
        fill="none"
        stroke="#F5E9C4"
        strokeWidth={0.9}
        opacity={0.5}
      />
    </svg>
  );
}

/** Tiny cricket ball with motion streaks — sits beside "PICK YOUR BOWLER…". */
export function BallInMotionIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 24" fill="none" aria-hidden>
      <circle
        cx={16}
        cy={12}
        r={7.4}
        fill="#A9362B"
        stroke="#5E1B14"
        strokeWidth={1.2}
      />
      <path
        d="M12 6 Q15.5 12 12 18"
        stroke="#F5E9C4"
        strokeWidth={1}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M1 8 h6 M0 12 h7 M1 16 h6"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.55}
      />
    </svg>
  );
}

/** Small metallic paperclip "clipping" a bowler card to the page. */
export function PaperclipGraphic() {
  return (
    <svg
      width={20}
      height={28}
      viewBox="0 0 20 28"
      fill="none"
      aria-hidden
      style={{
        position: "absolute",
        top: -11,
        left: 10,
        transform: "rotate(-9deg)",
        filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.38))",
      }}
    >
      <defs>
        <linearGradient id="hc-clip-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#5B6675" />
        </linearGradient>
      </defs>
      <path
        d="M7 4 v15 a4.5 4.5 0 0 0 9 0 v-13 a3 3 0 0 0 -6 0 v11"
        stroke="url(#hc-clip-metal)"
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Subtle curled-page shading at a card's bottom-right corner — reads as a
 *  distressed sheet whose corner has lifted, without a full 3-D fold. */
export function CurledCornerFold({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        pointerEvents: "none",
      }}
    >
      <path
        d="M40 6 Q39 22 27 30 Q17 37 0 40 L40 40 Z"
        fill="rgba(46,40,25,0.10)"
      />
      <path
        d="M40 6 Q38 22 27 30 Q17 37 2 40"
        fill="none"
        stroke="rgba(46,40,25,0.32)"
        strokeWidth={1}
      />
      <path
        d="M40 9 Q33 22 24 28"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1}
        opacity={0.4}
      />
    </svg>
  );
}

/**
 * Ripped-parchment ribbon banner — floats between the scoreboard and the
 * bowler-selection card, dynamically announcing the local player's role
 * ("YOU ARE BOWLING" / "YOU ARE BATTING"). Jagged top+bottom edge via a
 * percentage-based clip-path (scales to any label), lifted off the page
 * with a real drop-shadow (clip-path elements ignore box-shadow).
 */
const RIBBON_CLIP =
  "polygon(0% 30%, 5% 4%, 10% 30%, 15% 4%, 20% 30%, 25% 4%, 30% 30%, 35% 4%, 40% 30%, 45% 4%, 50% 30%, 55% 4%, 60% 30%, 65% 4%, 70% 30%, 75% 4%, 80% 30%, 85% 4%, 90% 30%, 95% 4%, 100% 30%, 100% 70%, 95% 96%, 90% 70%, 85% 96%, 80% 70%, 75% 96%, 70% 70%, 65% 96%, 60% 70%, 55% 96%, 50% 70%, 45% 96%, 40% 70%, 35% 96%, 30% 70%, 25% 96%, 20% 70%, 15% 96%, 10% 70%, 5% 96%, 0% 70%)";

export function HcRibbonBanner({
  children,
  tone = "bowling",
}: {
  children: ReactNode;
  tone?: "batting" | "bowling";
}) {
  const ink = tone === "batting" ? STAMP_G : INK_RED;
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "2px 0" }}>
      <div
        style={{
          position: "relative",
          padding: "11px 30px 13px",
          background: PAPER_L,
          clipPath: RIBBON_CLIP,
          filter:
            "drop-shadow(0 6px 8px rgba(40,24,8,0.32)) drop-shadow(0 1px 2px rgba(40,24,8,0.2))",
        }}
      >
        <span
          className="font-notebook"
          style={{
            color: ink,
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {children}
        </span>
      </div>
    </div>
  );
}
