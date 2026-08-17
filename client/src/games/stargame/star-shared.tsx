import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  StarCard,
  StarPhase,
  StarRoundResult,
  StarStanding,
} from "@shared/types";
import type { StarSeat } from "./useStarBoard";

/**
 * Star Game shared visual kit — the heartfelt, handcrafted "folded paper chit"
 * primitives both shells compose. The language is warm 90s nostalgia:
 *
 *   - Nature-distilled earth palette (terracotta / clay / olive / cream).
 *   - Real paper: fractal-noise grain, fold creases, washi-tape strips,
 *     multi-layer warm shadows for genuine depth.
 *   - Handwritten Caveat (font-script) for values + warmth; Fredoka/Righteous
 *     (font-display) for chunky headings.
 *   - Tactile micro-interactions everywhere (lift, toss, scatter, star burst,
 *     paper confetti) — all collapse to instant under prefers-reduced-motion.
 *
 * Body text always uses PAPER.ink on cream (>7:1 contrast); terracotta/clay/
 * gold are reserved for large headings, borders and decoration.
 */

/**
 * CHIT ★ STAR theme tokens.
 *
 * NOTE ON THE NAME: this was a light paper/kraft palette and every component in
 * the game reads from it, so the KEYS are kept (`cream`, `ink`, `paper` …) while
 * the VALUES were inverted to the dark arcade look. Read them by ROLE, not by
 * the colour word:
 *   page/creamDeep = deepest background · cream = panel · paper = raised surface
 *   ink = primary text · pencil = muted text · rim = border
 * Renaming ~400 call sites would have been churn with no visual payoff.
 */
export const PAPER = {
  // surfaces — deep indigo, lit from the table outward
  page: "#0A0F20",
  cream: "#151C34",
  creamDeep: "#0D1428",
  paper: "#1E2745",
  kraft: "#2A3358",
  // text
  ink: "#ECF2FF",
  brown: "#FFD166",
  woodDark: "#00000055",
  pencil: "#93A2C7",
  // the table itself — warm wood, the one warm mass in a cool room
  desk: "#6B4423",
  deskDeep: "#3E2513",
  deskEdge: "#241408",
  // accents
  rim: "#2E3A63",
  gold: "#FFC53D",
  goldDeep: "#E0951C",
  terracotta: "#F0803C",
  clay: "#C2541E",
  olive: "#8FBF4D",
  red: "#F2555A",
  green: "#3ED598",
  tape: "rgba(255,214,102,0.30)",
  slate: "#8698C4",
} as const;

/** Per-seat neon, assigned by seat index — the glowing rings in the reference.
 *  Distinct at a glance and colour-blind-separable by lightness as well as hue. */
export const SEAT_NEON: readonly { ring: string; glow: string; slip: string; from: string; to: string }[] = [
  { ring: "#FF782D", glow: "rgba(255,120,45,0.6)",  slip: "#E05A12", from: "#FF8A3D", to: "#C2410C" },
  { ring: "#EC4899", glow: "rgba(236,72,153,0.6)",  slip: "#BE185D", from: "#F472B6", to: "#BE185D" },
  { ring: "#FBBF24", glow: "rgba(251,191,36,0.6)",  slip: "#D97706", from: "#FDE047", to: "#D97706" },
  { ring: "#06B6D4", glow: "rgba(6,182,212,0.6)",   slip: "#0E7490", from: "#22D3EE", to: "#0F766E" },
  { ring: "#F59E0B", glow: "rgba(245,158,11,0.6)",  slip: "#B45309", from: "#FCD34D", to: "#B45309" },
  { ring: "#10B981", glow: "rgba(16,185,129,0.6)",  slip: "#047857", from: "#34D399", to: "#047857" },
  { ring: "#3B82F6", glow: "rgba(59,130,246,0.6)",  slip: "#1D4ED8", from: "#60A5FA", to: "#1D4ED8" },
  { ring: "#A855F7", glow: "rgba(168,85,247,0.6)",  slip: "#7E22CE", from: "#C084FC", to: "#7E22CE" },
];

export const seatNeon = (i: number) => SEAT_NEON[((i % SEAT_NEON.length) + SEAT_NEON.length) % SEAT_NEON.length];

/** Stable matching dot color for any chit value (colors theme + other themes). */
export function getChitDotColor(value: string): string {
  const v = value.toLowerCase().trim();
  if (v === "red") return "#EF4444";
  if (v === "blue") return "#3B82F6";
  if (v === "green") return "#10B981";
  if (v === "yellow") return "#EAB308";
  if (v === "orange") return "#F97316";
  if (v === "pink") return "#EC4899";
  if (v === "purple") return "#A855F7";
  if (v === "white") return "#F8FAFC";
  const palette = ["#10B981", "#EF4444", "#3B82F6", "#EAB308", "#F97316", "#EC4899", "#A855F7", "#06B6D4"];
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) & 0xffff;
  return palette[h % palette.length];
}

/**
 * The room the table sits in. A supplied photograph, deliberately pushed back
 * behind a scrim: UI panels sit on top of it and have to stay readable, so the
 * image contributes ATMOSPHERE, never contrast. `PAGE_BG`'s gradients still
 * paint underneath, so if the file is ever missing the screen degrades to the
 * procedural room rather than going blank.
 */
export function StarRoomBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/illustrations/Stargame/stargame-room.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          // Tuned by eye against a live screenshot. At 0.40 the room was
          // technically present and visually absent — no point shipping art
          // nobody can see. This is the most it can carry before the side
          // rails start fighting it for attention.
          opacity: 0.72,
        }}
      />
      {/* Scrim. Lightest over the centre, where the table wants the room to
          show through, and heaviest at the edges, where the rails sit. */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            `radial-gradient(58% 50% at 50% 46%, rgba(10,15,32,0.04), rgba(6,9,20,0.72) 82%)`,
            `linear-gradient(180deg, rgba(8,12,28,0.34) 0%, rgba(5,8,18,0.12) 45%, rgba(3,5,12,0.72) 100%)`,
          ].join(", "),
        }}
      />
    </div>
  );
}

/**
 * CHIT ★ STAR wordmark. Drawn, not an image — it stays crisp at any size and
 * the star can carry the same gold glow as the one on the table.
 */
export function StarLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex select-none flex-col leading-none" aria-label="Chit Star">
      <div className="flex items-center gap-1.5 font-display font-black tracking-tight"
           style={{ fontSize: compact ? "1.15rem" : "1.6rem" }}>
        <span style={{ color: "#EAF2FF", textShadow: "0 2px 10px rgba(120,160,255,0.45)" }}>CHIT</span>
        <svg
          viewBox="0 0 24 24"
          width={compact ? 18 : 24}
          height={compact ? 18 : 24}
          aria-hidden
          style={{ filter: `drop-shadow(0 0 6px ${PAPER.gold}) drop-shadow(0 0 14px ${PAPER.gold}88)` }}
        >
          <path
            d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7 5.6 21.2 7 14.1l-5.3-5 7.2-.9z"
            fill={PAPER.gold}
            stroke={PAPER.goldDeep}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
        <span style={{ color: PAPER.gold, textShadow: `0 2px 12px ${PAPER.gold}66` }}>STAR</span>
      </div>
      {!compact && (
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: PAPER.pencil }}>
          The Slip Passing Game
        </span>
      )}
    </div>
  );
}

/**
 * Segmented round progress — one pill per round, filled up to the current one.
 * Reads as "how far through the match are we" at a glance, which a bare
 * "Round 4/9" label does not.
 */
export function RoundProgress({ round, total }: { round: number; total: number }) {
  const safeTotal = Math.max(1, total);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-display text-xs font-black uppercase tracking-[0.18em]" style={{ color: PAPER.ink }}>
        Round {Math.min(round, safeTotal)} / {safeTotal}
      </span>
      <div className="flex items-center gap-1" role="img" aria-label={`Round ${round} of ${safeTotal}`}>
        {Array.from({ length: safeTotal }, (_, i) => {
          const done = i < round - 1;
          const now = i === round - 1;
          return (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: now ? 26 : 16,
                background: now ? PAPER.gold : done ? "#6E7BB5" : "#2A3358",
                boxShadow: now ? `0 0 10px ${PAPER.gold}AA` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * GAME FLOW — the round's beats, with the CURRENT one lit.
 *
 * The reference shows this as a static numbered list. Bound to the live phase
 * instead it stops being decoration and becomes the answer to "what is
 * happening and what comes next", which matters here because the rules are
 * unusual: a secret pick, a relay, then two different reflex races.
 */
const FLOW_STEPS: { phase: StarPhase; label: string }[] = [
  { phase: "themeSelect", label: "Pick a secret value" },
  { phase: "shuffle", label: "Starter shuffles" },
  { phase: "deal", label: "Four chits each" },
  { phase: "pass", label: "Pass slips in order" },
  { phase: "star", label: "Four same → tap STAR" },
  { phase: "handstack", label: "Hands on the line" },
  { phase: "roundSummary", label: "Score & repeat" },
];

export function GameFlowPanel({ phase }: { phase: StarPhase }) {
  const activeIdx = FLOW_STEPS.findIndex((s) => s.phase === phase);
  return (
    <ol className="space-y-1">
      {FLOW_STEPS.map((s, i) => {
        const now = i === activeIdx;
        const done = activeIdx >= 0 && i < activeIdx;
        return (
          <li
            key={s.phase}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition"
            style={{
              background: now ? `${PAPER.gold}1A` : undefined,
              boxShadow: now ? `inset 0 0 0 1px ${PAPER.gold}55` : undefined,
            }}
            aria-current={now ? "step" : undefined}
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black tabular-nums"
              style={{
                background: now ? PAPER.gold : done ? "#3A4570" : "transparent",
                border: now || done ? "none" : `1px solid ${PAPER.rim}`,
                color: now ? "#2A2115" : done ? PAPER.ink : PAPER.pencil,
              }}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className="truncate text-[11px]"
              style={{
                color: now ? PAPER.ink : done ? PAPER.pencil : PAPER.slate,
                fontWeight: now ? 800 : 500,
              }}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Circular dark icon button — the sound/help/settings cluster. */
export function StarIconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
      style={{
        background: PAPER.cream,
        border: `1.5px solid ${PAPER.rim}`,
        color: PAPER.ink,
        boxShadow: "0 4px 12px -4px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </button>
  );
}

/** Subtle monochrome paper grain (inline SVG, no asset). Layer at low opacity. */
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

/** Drop-in paper-grain + warm vignette overlay (absolute, non-interactive). */
export function GrainOverlay({ vignette = true }: { vignette?: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: GRAIN, backgroundSize: "140px 140px", opacity: 0.05, mixBlendMode: "multiply" }}
      />
      {vignette && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 140px rgba(70,41,21,0.18)" }}
        />
      )}
    </>
  );
}

/**
 * The desk both shells sit on — a warm walnut surface lit from above, with a
 * faint grain running across it. Everything the game renders is PAPER, so the
 * page itself has to be the one thing that isn't: cream panels on a cream page
 * gave the screen no figure/ground at all.
 */
export const PAGE_BG = [
  // warm pool where the table sits — the room's only light source
  `radial-gradient(58% 46% at 50% 44%, rgba(255,178,84,0.16), transparent 72%)`,
  // cool rim light from above, so the top edge doesn't read as flat black
  `radial-gradient(120% 70% at 50% -12%, rgba(96,128,255,0.14), transparent 62%)`,
  `linear-gradient(180deg, #101838 0%, ${PAPER.page} 52%, #05080F 100%)`,
].join(", ");

/** Stable, value-derived tiny rotation so chits feel hand-stacked, not aligned. */
function tilt(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return ((h % 9) - 4) * 0.8;
}

/** A torn strip of washi tape, rotated, for pinning slips to the felt. */
function Tape({ className = "", rotate = -4 }: { className?: string; rotate?: number }) {
  return (
    <span
      aria-hidden
      className={`absolute h-3 w-10 ${className}`}
      style={{
        background: PAPER.tape,
        transform: `rotate(${rotate}deg)`,
        boxShadow: "0 1px 2px rgba(70,41,21,0.18)",
        borderRadius: 1,
      }}
    />
  );
}

const SIZE = {
  sm: "h-16 w-12 text-[11px]",
  md: "h-24 w-[4.5rem] text-[13px]",
  lg: "h-32 w-24 text-base",
} as const;

export function Chit({
  value,
  faceDown = false,
  armed = false,
  dimmed = false,
  size = "md",
  fluid = false,
  onClick,
  ariaLabel,
}: {
  value: string;
  faceDown?: boolean;
  armed?: boolean;
  dimmed?: boolean;
  size?: keyof typeof SIZE;
  /** Explicit width, overriding the `size` class. */
  fluid?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const reduce = useReducedMotion();
  const interactive = !!onClick;
  const rot = tilt(value + (faceDown ? "b" : ""));
  const dotColor = getChitDotColor(value);
  return (
    <motion.button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      aria-label={ariaLabel ?? (faceDown ? "Hidden chit" : value)}
      aria-pressed={armed}
      initial={reduce ? false : { y: 16, opacity: 0, rotate: rot - 6 }}
      animate={{ y: armed ? -16 : 0, opacity: dimmed ? 0.5 : 1, rotate: rot }}
      whileHover={interactive && !reduce ? { y: armed ? -20 : -9, rotate: rot * 0.4 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      transition={{ type: "spring", stiffness: 340, damping: 24 }}
      className={[
        fluid ? "" : SIZE[size],
        "relative shrink-0 rounded-2xl px-1 font-script font-bold leading-tight",
        "flex flex-col items-center justify-between py-2 text-center",
        interactive ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
      style={{
        ...(fluid ? { width: "100%", height: "auto", aspectRatio: "3 / 4" } : null),
        background: faceDown
          ? `repeating-linear-gradient(48deg, #24305A, #24305A 7px, #1B2547 7px, #1B2547 14px)`
          : `linear-gradient(168deg, #FFFDF6 0%, #F9F2E2 100%)`,
        border: `2px solid ${armed ? PAPER.gold : faceDown ? PAPER.rim : "#E8D8B8"}`,
        color: faceDown ? PAPER.pencil : "#1C1917",
        boxShadow: armed
          ? `0 16px 28px -6px rgba(0,0,0,0.7), 0 0 0 3px ${PAPER.gold}88, 0 0 24px ${PAPER.gold}66`
          : `0 8px 16px -6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.85)`,
      }}
    >
      {/* Top Value Dot */}
      {!faceDown && (
        <span
          className="h-3.5 w-3.5 rounded-full shrink-0 shadow-sm"
          style={{ background: dotColor, boxShadow: `0 1px 4px ${dotColor}88` }}
          aria-hidden
        />
      )}

      {/* Center fold crease */}
      <span
        aria-hidden
        className="absolute left-2 right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ borderTop: faceDown ? "none" : "1px dashed rgba(180,150,110,0.45)" }}
      />

      {faceDown ? (
        <span
          aria-hidden
          className="m-auto flex h-7 w-7 items-center justify-center rounded-full text-base"
          style={{ background: PAPER.clay, color: "#F7ECD2", boxShadow: "0 2px 4px rgba(0,0,0,0.25)" }}
        >
          ★
        </span>
      ) : (
        <span
          className="relative z-10 break-words px-1 font-script font-bold text-base sm:text-lg mb-1 leading-none"
          style={{ color: "#1C1917", textShadow: "0 1px 0 rgba(255,255,255,0.7)" }}
        >
          {value}
        </span>
      )}
    </motion.button>
  );
}

/** themeSelect: tap one taped slip to lock it secretly. Taken slips are crossed out. */
export function ThemeChitPicker({
  values,
  taken,
  selected,
  onPick,
  glyph,
}: {
  values: string[];
  taken: string[];
  selected: string | null;
  onPick: (value: string) => void;
  glyph: string;
}) {
  const reduce = useReducedMotion();
  const takenSet = new Set(taken);
  return (
    <div role="radiogroup" aria-label="Pick your secret value" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {values.map((v, i) => {
        const isTaken = takenSet.has(v) && v !== selected;
        const isMine = v === selected;
        const rot = tilt(v);
        return (
          <motion.button
            key={v}
            type="button"
            role="radio"
            aria-checked={isMine}
            disabled={isTaken || selected != null}
            onClick={() => onPick(v)}
            initial={reduce ? false : { opacity: 0, y: 14, rotate: rot - 5 }}
            animate={{ opacity: isTaken ? 0.55 : 1, y: 0, rotate: isMine ? 0 : rot }}
            whileHover={!isTaken && selected == null && !reduce ? { y: -5, rotate: 0 } : undefined}
            whileTap={!isTaken && selected == null ? { scale: 0.96 } : undefined}
            transition={{ delay: reduce ? 0 : i * 0.03, type: "spring", stiffness: 300, damping: 22 }}
            className="relative cursor-pointer rounded-lg px-2 py-3.5 text-center font-script text-lg font-bold disabled:cursor-not-allowed"
            // Same rule as <Chit>: the slip FACE stays light on the dark
            // theme, colour identity lives on the rim/glow. Literals, not
            // PAPER tokens — those now resolve to dark surfaces and produced
            // light text on a light half-gradient.
            style={{
              background: isMine
                ? `linear-gradient(160deg, ${PAPER.gold}, ${PAPER.goldDeep})`
                : `linear-gradient(168deg, #FFFDF6 0%, #F6EAD2 100%)`,
              border: `2px solid ${isMine ? PAPER.gold : "#D9C7A2"}`,
              color: isTaken ? "#9A8F7C" : "#2A2115",
              boxShadow: isMine
                ? `0 12px 22px -6px rgba(0,0,0,0.7), 0 0 0 3px ${PAPER.gold}55, 0 0 20px ${PAPER.gold}55`
                : "0 8px 16px -6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.85)",
            }}
          >
            <span aria-hidden className="mr-1">{glyph}</span>
            {v}
            {isMine && <span aria-hidden className="ml-1">✓</span>}
            {isTaken && (
              <span className="mt-0.5 block text-[10px] font-sans italic" style={{ color: PAPER.clay }}>
                taken
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * themeSelect (custom theme): write your own chit name instead of picking
 * from a preset list — same "taped paper slip" visual language as
 * ThemeChitPicker, a text field standing in for the value grid. Locks the
 * moment `onSubmit` fires; the server is the sole authority on validity
 * (length cap, non-empty, case-insensitive uniqueness) — this just gives
 * instant client-side feedback so a doomed submit never round-trips.
 */
const CUSTOM_CHIT_MAX_LEN = 24;

export function CustomChitInput({
  taken,
  selected,
  onSubmit,
}: {
  taken: string[];
  selected: string | null;
  onSubmit: (value: string) => void;
}) {
  const [text, setText] = useState(selected ?? "");
  const locked = selected != null;
  const trimmed = text.trim();
  const takenLower = useMemo(() => new Set(taken.map((t) => t.toLowerCase())), [taken]);
  const isDuplicate = trimmed.length > 0 && takenLower.has(trimmed.toLowerCase());
  const canSubmit = !locked && trimmed.length > 0 && trimmed.length <= CUSTOM_CHIT_MAX_LEN && !isDuplicate;

  function submit() {
    if (!canSubmit) return;
    onSubmit(trimmed);
  }

  return (
    <div className="mx-auto w-full max-w-xs space-y-3">
      <div
        className="relative rounded-lg px-4 py-4 text-center"
        style={{
          background: locked
            ? `linear-gradient(160deg, ${PAPER.gold}, ${PAPER.goldDeep})`
            : `linear-gradient(160deg, ${PAPER.paper}, #F1E4C9)`,
          border: `1.5px solid ${locked ? PAPER.brown : PAPER.rim}`,
          boxShadow: locked
            ? "0 10px 18px -6px rgba(166,83,31,0.45)"
            : "0 5px 11px -4px rgba(70,41,21,0.28), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        <Tape className="-top-1.5 left-1/2 -translate-x-1/2" rotate={-3} />
        <input
          type="text"
          value={locked ? (selected ?? "") : text}
          onChange={(e) => !locked && setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          disabled={locked}
          maxLength={CUSTOM_CHIT_MAX_LEN}
          placeholder="Write your own chit name…"
          aria-label="Your custom chit name"
          className="w-full bg-transparent text-center font-script text-lg font-bold outline-none placeholder:opacity-50 disabled:cursor-not-allowed"
          style={{ color: PAPER.ink }}
        />
        {locked && <span aria-hidden className="ml-1">✓</span>}
      </div>
      {!locked && (
        <>
          {isDuplicate ? (
            <p className="text-center text-[11px] font-sans italic" style={{ color: PAPER.clay }}>
              Someone already picked that — try another.
            </p>
          ) : (
            <p className="text-center text-[11px] font-sans" style={{ color: PAPER.pencil }}>
              {trimmed.length}/{CUSTOM_CHIT_MAX_LEN}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="w-full rounded-lg py-2.5 font-sans text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: `linear-gradient(160deg, ${PAPER.gold}, ${PAPER.goldDeep})`,
              color: PAPER.ink,
              border: `1.5px solid ${PAPER.brown}`,
            }}
          >
            Lock it in
          </button>
        </>
      )}
    </div>
  );
}

/** The player's own four chits — tap to arm the one you'll slide clockwise. */
export function HandRail({
  hand,
  armedId,
  onArm,
  disabled = false,
  size = "lg",
}: {
  hand: StarCard[];
  armedId: string | null;
  onArm: (cardId: string) => void;
  disabled?: boolean;
  size?: keyof typeof SIZE;
}) {
  return (
    <div className="flex items-end justify-center gap-2.5 overflow-x-auto px-2 py-2">
      {hand.map((c) => (
        <Chit
          key={c.id}
          value={c.value}
          armed={c.id === armedId}
          size={size}
          onClick={disabled ? undefined : () => onArm(c.id)}
          ariaLabel={`${c.value}${c.id === armedId ? " (armed to pass)" : ""}`}
        />
      ))}
    </div>
  );
}

/**
 * Pointer Events-based drag-and-drop reorderable hand — same gesture
 * grammar as Rummy's useCardPointerDrag (client/src/games/rummy/
 * RummyBoardMobile.tsx: capture the pointer on down, declare a drag past
 * 6px of movement so a quick tap still arms the chit to pass, resolve the
 * drop position from the fingertip's x among sibling chits), simplified
 * to single-lane insert-before-index reordering — no lanes/melds here.
 * `hand` is trusted as already-correctly-ordered (the caller's
 * useStarBoard.reorderHand owns the authoritative order); this component
 * only tracks a TRANSIENT live-reorder preview during the gesture itself,
 * discarded the instant the drag ends or the drop lands via `onReorder`.
 */
export function DraggableChitRail({
  hand,
  armedId,
  onArm,
  onReorder,
  disabled = false,
  size = "lg",
  isBackgrounded = false,
}: {
  hand: StarCard[];
  armedId: string | null;
  onArm: (cardId: string) => void;
  onReorder: (cardIds: string[]) => void;
  disabled?: boolean;
  size?: keyof typeof SIZE;
  /** Cancels any in-flight drag the instant the tab backgrounds — a
   *  pointer that never receives its up/cancel event (the OS can suspend
   *  JS mid-gesture) must not resume into a stale drag on return. */
  isBackgrounded?: boolean;
}) {
  /**
   * Chits are sized to the width the rail ACTUALLY has, not a fixed class.
   *
   * During a relay you briefly hold five (your four plus the one just
   * received). Five fixed 96px cards plus gaps need ~520px, which overflows a
   * phone — and `touchAction: "none"` (required for drag-to-reorder) disables
   * the horizontal scroll that would otherwise have reached the fifth, so it
   * was not merely off-screen but unreachable.
   */
  const railRef = useRef<HTMLDivElement>(null);
  const [railW, setRailW] = useState(0);
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const measure = () => setRailW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const MAX_W = size === "lg" ? 96 : size === "md" ? 72 : 48;
  const GAP = 10;
  const cardW =
    railW > 0 && hand.length > 0
      ? Math.max(44, Math.min(MAX_W, Math.floor((railW - 16 - GAP * (hand.length - 1)) / hand.length)))
      : undefined;

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [previewOrder, setPreviewOrder] = useState<string[] | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragStateRef = useRef<{ pointerId: number; x0: number; y0: number; dragging: boolean } | null>(null);

  useEffect(() => {
    if (!isBackgrounded) return;
    dragStateRef.current = null;
    setPreviewOrder(null);
    setDraggedId(null);
  }, [isBackgrounded]);

  const baseOrder = useMemo(() => hand.map((c) => c.id), [hand]);
  const displayOrder = previewOrder ?? baseOrder;
  const byId = useMemo(() => new Map(hand.map((c) => [c.id, c] as const)), [hand]);

  const computeInsertOrder = useCallback(
    (cardId: string, clientX: number): string[] => {
      const without = baseOrder.filter((id) => id !== cardId);
      let insertAt = without.length;
      for (let i = 0; i < without.length; i++) {
        const el = cardRefs.current.get(without[i]);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) {
          insertAt = i;
          break;
        }
      }
      const next = [...without];
      next.splice(insertAt, 0, cardId);
      return next;
    },
    [baseOrder],
  );

  return (
    <div ref={railRef} data-star-hand className="flex w-full items-end justify-center gap-2.5 px-2 py-2" style={{ touchAction: disabled ? "auto" : "none" }}>
      {displayOrder.map((id) => {
        const c = byId.get(id);
        if (!c) return null;
        return (
          <motion.div
            key={id}
            layout={!disabled}
            ref={(el) => {
              if (el) cardRefs.current.set(id, el);
              else cardRefs.current.delete(id);
            }}
            onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
              if (disabled) return;
              if (e.pointerType === "mouse" && e.button !== 0) return;
              dragStateRef.current = { pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, dragging: false };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
              const st = dragStateRef.current;
              if (!st || st.pointerId !== e.pointerId) return;
              const dist = Math.hypot(e.clientX - st.x0, e.clientY - st.y0);
              if (!st.dragging) {
                if (dist < 6) return;
                st.dragging = true;
                setDraggedId(id);
              }
              setPreviewOrder(computeInsertOrder(id, e.clientX));
            }}
            onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => {
              const st = dragStateRef.current;
              dragStateRef.current = null;
              if (!st || st.pointerId !== e.pointerId) return;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* element may already have lost capture */
              }
              if (st.dragging) {
                const finalOrder = computeInsertOrder(id, e.clientX);
                setPreviewOrder(null);
                setDraggedId(null);
                onReorder(finalOrder);
              } else if (!disabled) {
                onArm(id);
              }
            }}
            onPointerCancel={() => {
              dragStateRef.current = null;
              setPreviewOrder(null);
              setDraggedId(null);
            }}
            // Each chit takes an equal share of the row and never exceeds its
            // natural size — so four sit at full size and five shrink to fit
            // rather than the fifth landing off-screen.
            style={{
              flex: "1 1 0",
              minWidth: 0,
              maxWidth: size === "lg" ? 96 : size === "md" ? 72 : 48,
              opacity: draggedId === id ? 0.5 : 1,
              cursor: disabled ? "default" : "grab",
              touchAction: "none",
            }}
          >
            {/* Chit's own onClick is a no-op — the wrapper's onPointerUp owns
                tap-vs-drag resolution, matching Rummy's DraggableHandCard. */}
            <Chit
              value={c.value}
              armed={c.id === armedId}
              size={size}
              fluid
              onClick={() => {}}
              ariaLabel={`${c.value}${c.id === armedId ? " (armed to pass)" : ""}`}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Shuffle ceremony flourish — plays once per successful shuffle tap (the
 * premium sequence's compress/spread/regroup beats), purely decorative
 * and declaratively keyframed via Framer Motion's own `transition.times`
 * — no internal setTimeout chain to get stuck mid-sequence (see
 * client/src/games/uno/rotation-sync.tsx's fix for exactly that bug
 * class: a stage machine driven by bare setTimeouts can freeze if its own
 * dependency flips before they fire). Caller re-mounts by changing
 * `shuffleKey` on every successful shuffle.
 */
export function ShuffleFlourish({ shuffleKey }: { shuffleKey: string | number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <AnimatePresence>
        <motion.div
          key={shuffleKey}
          className="absolute flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, times: [0, 0.15, 0.75, 1] }}
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const spreadAngle = (i - 2) * 16; // fan out ±32deg
            return (
              <motion.div
                key={i}
                aria-hidden
                className="absolute h-16 w-11 rounded-[5px]"
                style={{
                  background: `repeating-linear-gradient(48deg, ${PAPER.kraft}, ${PAPER.kraft} 6px, #CBA87A 6px, #CBA87A 12px)`,
                  border: `1px solid ${PAPER.rim}`,
                  boxShadow: "0 4px 10px rgba(70,41,21,0.35)",
                }}
                initial={{ x: 0, y: 0, rotate: 0, scale: 0.6 }}
                animate={{
                  x: [0, 0, spreadAngle * 1.4, 0],
                  y: [0, -4, -14, 0],
                  rotate: [0, 0, spreadAngle, 0],
                  scale: [0.6, 0.9, 1, 0.6],
                }}
                transition={{ duration: 0.9, times: [0, 0.15, 0.55, 1], ease: "easeInOut" }}
              />
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Big STAR slap — rotating burst rays, glossy sticker, pulsing glow. */
export function StarButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex items-center justify-center">
      {!disabled && (
        <motion.div
          aria-hidden
          className="absolute"
          animate={reduce ? {} : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
          style={{ width: 230, height: 230 }}
        >
          <svg viewBox="0 0 100 100" width="230" height="230">
            {Array.from({ length: 16 }).map((_, i) => (
              <line
                key={i}
                x1="50" y1="50" x2="50" y2="3"
                stroke={i % 2 ? PAPER.gold : PAPER.terracotta}
                strokeWidth={i % 2 ? 3 : 6}
                strokeLinecap="round"
                opacity="0.5"
                transform={`rotate(${i * 22.5} 50 50)`}
              />
            ))}
          </svg>
        </motion.div>
      )}
      <motion.button
        type="button"
        onClick={onPress}
        disabled={disabled}
        aria-label="Slap the STAR"
        animate={reduce || disabled ? {} : { scale: [1, 1.09, 1] }}
        transition={{ repeat: Infinity, duration: 0.85 }}
        whileTap={{ scale: 0.88, rotate: -6 }}
        className="relative flex h-40 w-40 items-center justify-center rounded-full font-display text-2xl font-black text-white disabled:opacity-40 sm:h-44 sm:w-44"
        style={{
          background: `radial-gradient(circle at 38% 30%, #FBE08C, ${PAPER.gold} 45%, ${PAPER.clay})`,
          boxShadow: disabled
            ? "none"
            : "0 0 0 6px rgba(228,177,40,0.28), 0 18px 34px -8px rgba(166,83,31,0.6), inset 0 4px 10px rgba(255,255,255,0.5)",
          textShadow: "0 2px 3px rgba(70,41,21,0.5)",
        }}
      >
        <span aria-hidden className="absolute text-8xl opacity-25">★</span>
        <span className="relative tracking-wide">STAR</span>
      </motion.button>
    </div>
  );
}

/** Big PLACE HAND tap for the reflex stack race. */
export function HandStackButton({
  onPlace,
  disabled,
  placed,
  rank,
}: {
  onPlace: () => void;
  disabled: boolean;
  placed: boolean;
  rank: number | null;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPlace}
      disabled={disabled || placed}
      aria-label="Place your hand"
      whileTap={{ scale: 0.93, y: 4 }}
      className="flex h-36 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-1 rounded-3xl font-display text-xl font-black transition disabled:cursor-default"
      style={{
        background: placed ? `linear-gradient(160deg, ${PAPER.olive}, #4F5C2A)` : `linear-gradient(160deg, ${PAPER.paper}, #EFE0C2)`,
        border: `3px solid ${PAPER.brown}`,
        color: placed ? "#F7ECD2" : PAPER.ink,
        opacity: disabled && !placed ? 0.45 : 1,
        boxShadow: placed ? "0 10px 20px -8px rgba(79,92,42,0.6)" : "0 8px 16px -6px rgba(70,41,21,0.35)",
      }}
    >
      <span aria-hidden className="text-5xl">✋</span>
      {placed ? `Placed${rank != null ? ` · #${rank + 1}` : ""}` : "PLACE HAND"}
    </motion.button>
  );
}

const MEDAL_GLYPH: Record<string, string> = { gold: "🥇", silver: "🥈", bronze: "🥉" };

/** Compact seat card: avatar with colored ring, name, score stamp + status. */
export function SeatTile({
  seat,
  active = false,
  showScore = true,
  phase,
}: {
  seat: StarSeat;
  active?: boolean;
  showScore?: boolean;
  /** Gates the "ready" badge to the shuffle phase only - `hasShuffled`
   *  stays false forever for every seat except the round's one starter
   *  (single-shuffler model), so without this gate every other player's
   *  tile would misleadingly show "ready" through pass/star/handstack too. */
  phase?: StarPhase;
}) {
  const { pub, name, isSelf, isBot, isConnected } = seat;
  let badge = "";
  let badgeColor: string = PAPER.pencil;
  if (pub.starEligible) { badge = "★ four!"; badgeColor = PAPER.clay; }
  else if (pub.hasPassed) { badge = "passed ✓"; badgeColor = PAPER.green; }
  else if (pub.hasStacked) { badge = "stacked"; badgeColor = PAPER.olive; }
  else if (pub.hasSelected && phase === "shuffle" && !pub.hasShuffled) badge = "ready";
  return (
    <motion.div
      animate={active ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={active ? { repeat: Infinity, duration: 1.1 } : { duration: 0.2 }}
      className="flex items-center gap-2.5 rounded-2xl px-2.5 py-2"
      style={{
        border: `2px solid ${active ? PAPER.gold : PAPER.rim}`,
        background: isSelf ? `linear-gradient(160deg, ${PAPER.cream}, ${PAPER.creamDeep})` : PAPER.paper,
        opacity: isConnected ? 1 : 0.5,
        boxShadow: active ? "0 0 0 3px rgba(228,177,40,0.28)" : "0 3px 8px -4px rgba(70,41,21,0.25)",
      }}
    >
      <div className="relative shrink-0">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-black text-white"
          style={{ background: active ? `linear-gradient(160deg, ${PAPER.gold}, ${PAPER.goldDeep})` : `linear-gradient(160deg, ${PAPER.terracotta}, ${PAPER.clay})`, boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3)" }}
          aria-hidden
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
          style={{ background: isConnected ? PAPER.green : PAPER.red, borderColor: PAPER.paper }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 truncate text-sm font-bold" style={{ color: PAPER.ink }}>
          <span className="truncate">{name}</span>
          {isSelf && <span className="text-[9px] opacity-60">you</span>}
          {isBot && <span className="text-[9px] opacity-50">bot</span>}
        </div>
        {badge && <div className="text-[10px] font-semibold" style={{ color: badgeColor }}>{badge}</div>}
      </div>
      {showScore && (
        <div className="flex flex-col items-center">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full font-display text-base font-black"
            style={{ background: PAPER.cream, border: `2px solid ${PAPER.rim}`, color: PAPER.brown }}
          >
            {pub.score}
          </div>
          {pub.roundWins > 0 && <div className="mt-0.5 text-[9px]" style={{ color: PAPER.gold }}>{"★".repeat(Math.min(pub.roundWins, 3))}</div>}
        </div>
      )}
    </motion.div>
  );
}

/** Three bouncing dots for a live "thinking…" state — same recipe as Hand
 *  Cricket's TossStatusPill (client/src/games/handcricket/hc-shared.tsx):
 *  0.85s duration, 0.18s stagger, y:[0,-5,0] + opacity:[0.4,1,0.4]. */
export function BotThinkingDots({ color = PAPER.pencil }: { color?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
          animate={reduce ? {} : { y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.85, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/** Round info panel: current round / total, this round's starter, and the
 *  fixed circulation direction — the "who started, which way" summary the
 *  table's own geometry only shows visually. */
export function RoundInfoPanel({
  round,
  totalRounds,
  starterId,
  nameOf,
}: {
  round: number;
  totalRounds: number;
  starterId: string | null;
  nameOf: (id: string) => string;
}) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <dt style={{ color: PAPER.pencil }}>Round</dt>
        <dd className="font-display font-black" style={{ color: PAPER.brown }}>
          {round}/{totalRounds}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-2">
        <dt style={{ color: PAPER.pencil }}>Starter</dt>
        <dd className="font-bold" style={{ color: PAPER.ink }}>
          {starterId ? nameOf(starterId) : "—"}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-2">
        <dt style={{ color: PAPER.pencil }}>Direction</dt>
        <dd className="font-bold" style={{ color: PAPER.pencil }}>
          clockwise <span aria-hidden>⟳</span>
        </dd>
      </div>
    </dl>
  );
}

/** Card-count badge with gold chip design matching screenshot. */
function CountBadge({ count }: { count: number }) {
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full font-display text-[10px] font-black text-[#2A1800] border border-black/20"
      style={{ background: "#FBBF24", boxShadow: "0 2px 5px rgba(0,0,0,0.5)" }}
      aria-label={`${count} cards`}
    >
      {count}
    </span>
  );
}

/**
 * The circular/star table — the game's persistent visual centerpiece across
 * EVERY phase, not just the pass cycle (previously only StarBoardDesktop's
 * pass-phase-only `SeatRing`). Self anchored bottom-center, other seats
 * fanned clockwise, so the seating order itself reads as the circulation
 * route. Passing-flow arrows (full route dim, the active leg bright +
 * animated) and a flying-chit travel animation only render during "pass";
 * every other phase shows the plain ring with live per-seat status.
 */
export function StarTable({
  seats,
  selfId,
  phase,
  shuffleTurnId,
  currentPasserId,
  passOrder,
  lastPass,
  thinkingBotId,
  starWinnerId,
  iAmEligible = false,
  iCanStack = false,
  onPressStar,
  onPlaceHand,
  width = 420,
  height = 340,
  children,
}: {
  seats: StarSeat[];
  selfId: string | null;
  phase: StarPhase;
  shuffleTurnId: string | null;
  currentPasserId: string | null;
  passOrder: string[];
  lastPass: { fromId: string; toId: string; cardId: string } | null;
  thinkingBotId: string | null;
  starWinnerId: string | null;
  /** Local player holds four right now — the star is theirs to slap. */
  iAmEligible?: boolean;
  /** Star already claimed; the local player still has to get their hand down,
   *  and arrival order decides points. */
  iCanStack?: boolean;
  onPressStar?: () => void;
  onPlaceHand?: () => void;
  width?: number;
  height?: number;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const ordered = useMemo(() => {
    const i = seats.findIndex((s) => s.id === selfId);
    if (i <= 0) return seats;
    return [...seats.slice(i), ...seats.slice(0, i)];
  }, [seats, selfId]);

  const n = ordered.length;
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2 - 54;
  const ry = height / 2 - 46;
  const posOf = useCallback(
    (i: number) => {
      const angle = Math.PI / 2 + (Math.PI * 2 * i) / Math.max(n, 1);
      return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
    },
    [n, cx, cy, rx, ry],
  );
  const indexById = useMemo(() => new Map(ordered.map((s, i) => [s.id, i] as const)), [ordered]);

  const isActive = (s: StarSeat): boolean => {
    if (phase === "shuffle") return s.id === shuffleTurnId;
    if (phase === "pass") return s.id === currentPasserId;
    if (phase === "star") return s.pub.starEligible && starWinnerId == null;
    if (phase === "handstack") return s.id !== starWinnerId && !s.pub.hasStacked && starWinnerId != null;
    return false;
  };
  const isReceiving = (s: StarSeat): boolean => phase === "pass" && lastPass?.toId === s.id;

  const lastPassKey = lastPass ? `${lastPass.fromId}-${lastPass.toId}-${lastPass.cardId}` : null;

  // The table's own footprint — an ellipse just inside the seat ring, so seats
  // sit ON its rim the way people sit around a real table.
  const tableW = rx * 2 + 40;
  const tableH = ry * 2 + 36;
  const scale = Math.min(1.45, Math.max(0.9, width / 520));

  return (
    <div className="relative mx-auto flex items-center justify-center" style={{ width, height }}>
      {/* ── The subtle dark circular orbit track ────────────────────────── */}
      <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="rgba(251,191,36,0.18)"
          strokeWidth={scale >= 1.2 ? "2" : "1.5"}
          strokeDasharray="5 7"
        />
      </svg>

      {/* ── Center Gold Star Silhouette ─────────────────────────────────── */}
      {(() => {
        const armed = phase === "star" && iAmEligible;
        const racing = phase === "handstack" && iCanStack;
        const size = Math.max(120, Math.min(240, Math.min(tableW, tableH) * 0.44));
        const hot = armed || racing;
        const onTap = armed ? onPressStar : racing ? onPlaceHand : undefined;
        return (
          <div
            className="absolute left-1/2 top-1/2 flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2 z-10"
          >
            <button
              type="button"
              onClick={onTap}
              disabled={!onTap}
              aria-label={
                armed
                  ? "Slap the star — you have four of a kind"
                  : racing
                    ? "Get your hand on the line"
                    : "The star"
              }
              className={`rounded-full transition ${onTap ? "cursor-pointer active:scale-95" : "cursor-default"} focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300`}
              style={{ lineHeight: 0 }}
            >
              <svg
                viewBox="0 0 24 24"
                width={size}
                height={size}
                className={hot && !reduce ? "star-pulse" : undefined}
                style={{
                  filter: hot
                    ? `drop-shadow(0 0 20px ${PAPER.gold}) drop-shadow(0 0 45px ${PAPER.gold}EE)`
                    : "drop-shadow(0 0 16px rgba(251,191,36,0.3))",
                  opacity: hot ? 1 : 0.55,
                }}
              >
                <path
                  d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7 5.6 21.2 7 14.1l-5.3-5 7.2-.9z"
                  fill={hot ? PAPER.gold : "rgba(251,191,36,0.08)"}
                  stroke={hot ? "#FFFFFF" : "#F59E0B"}
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {(armed || racing) && (
              <div className="text-center">
                <div
                  className="font-display text-sm sm:text-base font-black uppercase tracking-[0.16em]"
                  style={{ color: PAPER.gold, textShadow: `0 0 12px ${PAPER.gold}88` }}
                >
                  {armed ? "Tap the star" : "Hands on the line!"}
                </div>
                <div className="text-[10px] sm:text-xs font-semibold" style={{ color: PAPER.pencil }}>
                  {armed ? "You have four of a kind" : "Fastest hand scores higher"}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Clockwise flow connector arrows */}
      {phase === "pass" && n >= 2 && (
        <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
          <defs>
            <marker id="star-flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#FBBF24" />
            </marker>
            <marker id="star-flow-dim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="rgba(251,191,36,0.3)" />
            </marker>
          </defs>
          {passOrder.map((pid) => {
            const idx = passOrder.indexOf(pid);
            const nextId = passOrder[(idx + 1) % passOrder.length];
            const a = indexById.get(pid);
            const b = indexById.get(nextId);
            if (a == null || b == null) return null;
            const pa = posOf(a);
            const pb = posOf(b);
            const activeLeg = pid === currentPasserId;
            return (
              <line
                key={pid}
                x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={activeLeg ? "#FBBF24" : "rgba(251,191,36,0.25)"}
                strokeWidth={activeLeg ? 3.5 : 1.5}
                strokeDasharray={activeLeg ? undefined : "4 5"}
                opacity={activeLeg ? 1 : 0.45}
                markerEnd={activeLeg ? "url(#star-flow-arrow)" : "url(#star-flow-dim)"}
              />
            );
          })}
        </svg>
      )}

      {/* Flying chit travel animation */}
      <AnimatePresence>
        {!reduce && lastPass && lastPassKey && (
          <FlyingChit
            key={lastPassKey}
            from={indexById.has(lastPass.fromId) ? posOf(indexById.get(lastPass.fromId)!) : null}
            to={indexById.has(lastPass.toId) ? posOf(indexById.get(lastPass.toId)!) : null}
          />
        )}
      </AnimatePresence>

      {ordered.map((s, i) => {
        const pos = posOf(i);
        return (
          <div
            key={s.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ left: pos.x, top: pos.y }}
          >
            <TableSeat
              seat={s}
              active={isActive(s)}
              receiving={isReceiving(s)}
              thinking={thinkingBotId === s.id}
              seatIndex={i}
              scale={scale}
            />
          </div>
        );
      })}

      {children && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">{children}</div>
      )}
    </div>
  );
}

/** One seat on the StarTable ring: avatar with neon glow, name, count badge, indicator */
function TableSeat({
  seat,
  active,
  receiving,
  thinking,
  seatIndex = 0,
  scale = 1,
}: {
  seat: StarSeat;
  active: boolean;
  receiving: boolean;
  thinking: boolean;
  seatIndex?: number;
  scale?: number;
}) {
  const neon = seatNeon(seatIndex);
  const { pub, name, isSelf, isBot, isConnected } = seat;
  const statusText = thinking
    ? null
    : pub.starEligible
      ? "★ four!"
      : receiving
        ? "receiving…"
        : pub.hasPassed
          ? "passed ✓"
          : pub.hasStacked
            ? "stacked"
            : null;

  const isLarge = scale >= 1.2;
  const isMed = scale >= 1.05;

  return (
    <div
      className={`flex flex-col items-center gap-0.5 text-center select-none ${
        isLarge ? "w-28" : isMed ? "w-26" : "w-24"
      }`}
      style={{ opacity: isConnected ? 1 : 0.5 }}
    >
      <motion.div
        className="relative"
        animate={active ? { scale: [1, 1.08, 1] } : receiving ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={active || receiving ? { repeat: Infinity, duration: receiving ? 0.6 : 1.1 } : { duration: 0.2 }}
      >
        <div
          className={`flex items-center justify-center rounded-full font-display font-black text-white ${
            isLarge
              ? "h-16 w-16 text-xl"
              : isMed
              ? "h-14 w-14 text-lg"
              : "h-13 w-13 text-base"
          }`}
          style={{
            background: `linear-gradient(145deg, ${neon.from}, ${neon.to})`,
            boxShadow: active
              ? `0 0 0 3.5px ${PAPER.gold}, 0 0 28px ${PAPER.gold}AA, inset 0 2px 4px rgba(255,255,255,0.4)`
              : receiving
                ? `0 0 0 3.5px ${PAPER.green}, 0 0 24px ${PAPER.green}AA, inset 0 2px 4px rgba(255,255,255,0.4)`
                : `0 0 0 2.5px ${neon.ring}AA, 0 0 18px ${neon.glow}, inset 0 2px 4px rgba(255,255,255,0.3)`,
          }}
          aria-hidden
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <CountBadge count={pub.cardCount} />
      </motion.div>
      <div
        className={`max-w-full truncate font-bold mt-1 text-slate-100 flex items-center justify-center gap-1 ${
          isLarge ? "text-sm" : "text-xs"
        }`}
      >
        <span className="truncate">{name}</span>
        {isSelf && <span className="text-[10px] text-zinc-400 font-normal">(you)</span>}
        {isBot && <span className="text-[9px] text-zinc-400 font-normal">bot</span>}
      </div>
      {active && (
        <span aria-hidden className="text-xs leading-none text-amber-400 animate-bounce">
          ▲
        </span>
      )}
      <div className="h-3 text-[10px]" style={{ color: receiving ? PAPER.green : active ? PAPER.gold : PAPER.pencil }}>
        {thinking ? <BotThinkingDots color={PAPER.pencil} /> : statusText}
      </div>
    </div>
  );
}

/** Framer-motion overlay chit flying from one seat position to another —
 *  the visible "card travel" cue for a single relay handoff. */
function FlyingChit({
  from,
  to,
}: {
  from: { x: number; y: number } | null;
  to: { x: number; y: number } | null;
}) {
  if (!from || !to) return null;
  return (
    <motion.div
      className="pointer-events-none absolute rounded-[4px]"
      style={{
        width: 20,
        height: 28,
        left: from.x - 10,
        top: from.y - 14,
        background: `linear-gradient(160deg, ${PAPER.paper}, #F2E6CC)`,
        border: `1px solid ${PAPER.gold}`,
        boxShadow: "0 4px 10px rgba(70,41,21,0.4)",
      }}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.7 }}
      animate={{ x: to.x - from.x, y: to.y - from.y, opacity: [0, 1, 1, 0], scale: 1 }}
      transition={{ duration: 0.55, times: [0, 0.15, 0.75, 1], ease: "easeInOut" }}
    />
  );
}

/** Ranked standings used in the desktop sidebar. */
export function Scoreboard({ seats }: { seats: StarSeat[] }) {
  const ranked = [...seats].sort((a, b) => b.pub.score - a.pub.score || b.pub.roundWins - a.pub.roundWins);
  return (
    <ol className="space-y-1.5">
      {ranked.map((s, i) => (
        <li
          key={s.id}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm"
          style={{ color: PAPER.ink, background: i === 0 ? "rgba(228,177,40,0.16)" : "transparent" }}
        >
          <span className="w-5 text-center font-display font-black" style={{ color: i === 0 ? PAPER.goldDeep : PAPER.pencil }}>
            {i + 1}
          </span>
          <span className="flex-1 truncate font-semibold">{s.name}</span>
          {s.pub.roundWins > 0 && <span className="text-[10px]" style={{ color: PAPER.gold }}>★{s.pub.roundWins}</span>}
          <span className="font-display text-base font-black" style={{ color: PAPER.brown }}>{s.pub.score}</span>
        </li>
      ))}
    </ol>
  );
}

/** Ruled-notebook page style for ledgers / report cards. */
const RULED: React.CSSProperties = {
  backgroundImage:
    `linear-gradient(90deg, transparent 26px, rgba(178,58,46,0.25) 26px, rgba(178,58,46,0.25) 27px, transparent 27px),` +
    `repeating-linear-gradient(transparent, transparent 23px, rgba(90,107,122,0.18) 23px, rgba(90,107,122,0.18) 24px)`,
};

/** Round summary — a school report card on ruled paper. */
export function RoundSummaryTable({
  result,
  seats,
  nameOf,
}: {
  result: StarRoundResult;
  seats: StarSeat[];
  nameOf: (id: string) => string;
}) {
  const scoreById = new Map(seats.map((s) => [s.id, s.pub.score]));
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: `2px solid ${PAPER.rim}`, background: PAPER.paper, ...RULED, backgroundColor: PAPER.paper }}>
      <table className="w-full text-sm" style={{ color: PAPER.ink }}>
        <thead>
          <tr style={{ background: `linear-gradient(${PAPER.creamDeep}, ${PAPER.cream})` }}>
            <th className="px-3 py-2 text-left font-display">Place</th>
            <th className="px-2 py-2 text-left font-display">Player</th>
            <th className="px-2 py-2 text-right font-display">+Pts</th>
            <th className="px-3 py-2 text-right font-display">Total</th>
          </tr>
        </thead>
        <tbody>
          {result.order.map((pid, i) => (
            <tr key={pid} style={{ background: i === 0 ? "rgba(228,177,40,0.14)" : "transparent" }}>
              <td className="px-3 py-1.5 font-display text-lg font-black" style={{ color: i === 0 ? PAPER.goldDeep : PAPER.pencil }}>
                {i === 0 ? "★1" : `${i + 1}`}
              </td>
              <td className="px-2 py-1.5 font-semibold">
                {nameOf(pid)}
                {i === 0 && result.winningValue && (
                  <span className="ml-1 font-script text-base" style={{ color: PAPER.clay }}>
                    four {result.winningValue}!
                  </span>
                )}
              </td>
              <td className="px-2 py-1.5 text-right font-script text-base font-bold" style={{ color: PAPER.green }}>
                +{result.points[pid] ?? 0}
              </td>
              <td className="px-3 py-1.5 text-right font-display font-black" style={{ color: PAPER.brown }}>
                {scoreById.get(pid) ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Final podium — medals, shine, tiebreaker stats, paper confetti. */
export function FinalPodium({
  standings,
  nameOf,
}: {
  standings: StarStanding[];
  nameOf: (id: string) => string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="relative space-y-3">
      <Confetti count={28} />
      <h3 className="text-center font-display text-3xl font-black" style={{ color: PAPER.brown, textShadow: "0 2px 0 rgba(255,255,255,0.4)" }}>
        🎉 Final Standings
      </h3>
      <ol className="space-y-2">
        {standings.map((s, i) => (
          <motion.li
            key={s.playerId}
            initial={reduce ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduce ? 0 : i * 0.12, type: "spring", stiffness: 240, damping: 20 }}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
            style={{
              border: `2px solid ${s.medal ? PAPER.gold : PAPER.rim}`,
              background: s.rank === 0 ? `linear-gradient(120deg, #FBEFC8, ${PAPER.cream})` : PAPER.paper,
              boxShadow: s.rank === 0 ? "0 8px 18px -6px rgba(228,177,40,0.55)" : "0 3px 8px -4px rgba(70,41,21,0.25)",
            }}
          >
            <span className="w-8 text-center text-2xl">{s.medal ? MEDAL_GLYPH[s.medal] : s.rank + 1}</span>
            <span className="flex-1 truncate font-display text-lg font-bold" style={{ color: PAPER.ink }}>{nameOf(s.playerId)}</span>
            <span className="text-[11px]" style={{ color: PAPER.pencil }}>
              ★{s.roundWins}
              {s.avgStarMs != null && ` · ${(s.avgStarMs / 1000).toFixed(1)}s`}
            </span>
            <span className="font-display text-2xl font-black" style={{ color: PAPER.brown }}>{s.score}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}


/** Prominent, optional between-rounds nostalgia line with a pencil underline. */
export function NostalgiaLine({ text }: { text: string | null }) {
  const reduce = useReducedMotion();
  if (!text) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center gap-1 text-center"
      >
        <p className="font-script text-xl italic leading-snug" style={{ color: PAPER.clay }}>
          &ldquo;{text}&rdquo;
        </p>
        <svg width="160" height="7" viewBox="0 0 160 7" aria-hidden>
          <path d="M2 4 C 40 1, 120 7, 158 3" fill="none" stroke={PAPER.terracotta} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </svg>
      </motion.div>
    </AnimatePresence>
  );
}

/** Live ticking stopwatch sticker (seconds remaining for the current phase). */
export function DeadlinePill({ deadline }: { deadline: number | null }) {
  if (deadline == null) return null;
  const secs = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const urgent = secs <= 5;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums"
      style={{
        background: urgent ? PAPER.red : PAPER.cream,
        color: urgent ? "#fff" : PAPER.brown,
        border: `1.5px solid ${urgent ? PAPER.red : PAPER.rim}`,
        animation: urgent ? "pulse 0.7s ease-in-out infinite" : undefined,
      }}
      aria-label={`${secs} seconds left`}
    >
      ⏱ {secs}s
    </span>
  );
}

/** The legend of distinct values in play — chip pills with matching colored dots. */
export function ValuesLegend({ values, glyph }: { values: string[]; glyph?: string }) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((v) => {
        const dotColor = getChitDotColor(v);
        return (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              background: "#141C36",
              border: "1px solid #232F54",
              color: "#E2E8F0",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}AA` }}
            />
            <span className="truncate max-w-[120px]">{v}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Nostalgic cartoon illustration of three friends passing paper slips at a table. */
export function KidsPassingChitsIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-t from-[#060917] to-[#101732] pt-2 pb-1 ${className}`}>
      <svg viewBox="0 0 280 100" className="w-full h-auto max-h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Warm wooden table surface */}
        <ellipse cx="140" cy="92" rx="130" ry="16" fill="#452712" />
        <ellipse cx="140" cy="89" rx="125" ry="13" fill="#6B4123" stroke="#8F5831" strokeWidth="1.2" />
        
        {/* Left Kid (Boy in blue shirt holding paper chit) */}
        <g>
          <path d="M52 92 C52 74 62 70 74 70 C86 70 96 74 96 92 Z" fill="#2563EB" />
          <path d="M68 70 L74 78 L80 70 Z" fill="#1D4ED8" />
          <ellipse cx="74" cy="52" rx="13" ry="14" fill="#D97706" />
          <ellipse cx="74" cy="51" rx="12" ry="13" fill="#FBBF24" />
          <path d="M62 48 C62 35 86 35 86 48 C86 42 80 38 74 38 C68 38 62 42 62 48 Z" fill="#0F172A" />
          <circle cx="70" cy="50" r="1.5" fill="#0F172A" />
          <circle cx="78" cy="50" r="1.5" fill="#0F172A" />
          <path d="M71 57 Q74 61 77 57" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="84" cy="80" r="4" fill="#FBBF24" />
          <rect x="80" y="72" width="10" height="13" rx="1.5" fill="#FFFDF6" stroke="#D97706" strokeWidth="0.8" transform="rotate(-12 85 78)" />
        </g>

        {/* Center Kid (Girl/Boy in orange shirt smiling and passing chit) */}
        <g>
          <path d="M118 92 C118 72 128 68 140 68 C152 68 162 72 162 92 Z" fill="#EA580C" />
          <ellipse cx="140" cy="50" rx="13" ry="14" fill="#D97706" />
          <ellipse cx="140" cy="49" rx="12" ry="13" fill="#FBBF24" />
          <path d="M128 46 C128 33 152 33 152 46 C152 39 146 35 140 35 C134 35 128 39 128 46 Z" fill="#381D0B" />
          <circle cx="136" cy="48" r="1.5" fill="#0F172A" />
          <circle cx="144" cy="48" r="1.5" fill="#0F172A" />
          <path d="M137 55 Q140 59 143 55" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="140" cy="78" r="4" fill="#FBBF24" />
          <rect x="135" y="70" width="10" height="13" rx="1.5" fill="#FFFDF6" stroke="#EA580C" strokeWidth="0.8" />
        </g>

        {/* Right Kid (Boy in green shirt holding paper chit) */}
        <g>
          <path d="M184 92 C184 74 194 70 206 70 C218 70 228 74 228 92 Z" fill="#16A34A" />
          <ellipse cx="206" cy="52" rx="13" ry="14" fill="#D97706" />
          <ellipse cx="206" cy="51" rx="12" ry="13" fill="#FBBF24" />
          <path d="M194 48 C194 35 218 35 218 48 C218 42 212 38 206 38 C200 38 194 42 194 48 Z" fill="#0F172A" />
          <circle cx="202" cy="50" r="1.5" fill="#0F172A" />
          <circle cx="210" cy="50" r="1.5" fill="#0F172A" />
          <path d="M203 57 Q206 61 209 57" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="196" cy="80" r="4" fill="#FBBF24" />
          <rect x="190" y="72" width="10" height="13" rx="1.5" fill="#FFFDF6" stroke="#16A34A" strokeWidth="0.8" transform="rotate(12 195 78)" />
        </g>
      </svg>
    </div>
  );
}

/** Lightweight paper confetti burst (warm scraps). No-op under reduced motion. */
export function Confetti({ count = 24 }: { count?: number }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        dur: 1.6 + Math.random() * 1.2,
        rot: Math.random() * 360,
        color: [PAPER.gold, PAPER.terracotta, PAPER.olive, PAPER.clay, PAPER.green][i % 5],
        size: 6 + Math.round(Math.random() * 6),
      })),
    [count],
  );
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute top-0"
          style={{ left: `${b.left}%`, width: b.size, height: b.size * 1.4, background: b.color, borderRadius: 1 }}
          initial={{ y: -20, opacity: 0, rotate: b.rot }}
          animate={{ y: "120%", opacity: [0, 1, 1, 0], rotate: b.rot + 220 }}
          transition={{ duration: b.dur, delay: b.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
