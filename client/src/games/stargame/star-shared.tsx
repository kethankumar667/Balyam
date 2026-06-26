import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import type {
  StarActivityEntry,
  StarCard,
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

export const PAPER = {
  // surfaces
  page: "#F0E0C0",
  cream: "#F7ECD2",
  creamDeep: "#E8D3A6",
  paper: "#FCF5E4",
  kraft: "#D7B98B",
  // ink + wood
  ink: "#3D2B17",
  brown: "#6D4323",
  woodDark: "#46291520",
  pencil: "#8A7355",
  // accents
  rim: "#C9A86A",
  gold: "#E4B128",
  goldDeep: "#B9831C",
  terracotta: "#C2683F",
  clay: "#A6531F",
  olive: "#6E7B3C",
  red: "#B23A2E",
  green: "#5C7A3A",
  tape: "rgba(226,205,150,0.72)",
  slate: "#5A6B7A",
} as const;

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

/** Warm page background gradient shared by both shells' roots. */
export const PAGE_BG = `radial-gradient(120% 90% at 50% -10%, ${PAPER.cream}, ${PAPER.page} 55%, ${PAPER.creamDeep})`;

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

/** A single folded paper slip carrying one theme value (or face-down kraft). */
export function Chit({
  value,
  faceDown = false,
  armed = false,
  dimmed = false,
  size = "md",
  onClick,
  ariaLabel,
}: {
  value: string;
  faceDown?: boolean;
  armed?: boolean;
  dimmed?: boolean;
  size?: keyof typeof SIZE;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const reduce = useReducedMotion();
  const interactive = !!onClick;
  const rot = tilt(value + (faceDown ? "b" : ""));
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
        SIZE[size],
        "relative shrink-0 rounded-[7px] px-1 font-script font-bold leading-tight",
        "flex items-center justify-center text-center",
        interactive ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
      style={{
        background: faceDown
          ? `repeating-linear-gradient(48deg, ${PAPER.kraft}, ${PAPER.kraft} 7px, #CBA87A 7px, #CBA87A 14px)`
          : `linear-gradient(160deg, ${PAPER.paper}, #F2E6CC)`,
        border: `1.5px solid ${armed ? PAPER.gold : PAPER.rim}`,
        color: PAPER.ink,
        boxShadow: armed
          ? `0 14px 22px -6px rgba(166,83,31,0.45), 0 0 0 3px rgba(228,177,40,0.35)`
          : `0 6px 12px -4px rgba(70,41,21,0.32), inset 0 1px 0 rgba(255,255,255,0.6)`,
      }}
    >
      <Tape className="-top-1.5 left-1/2 -translate-x-1/2" rotate={armed ? 0 : rot * 1.4} />
      {/* fold crease */}
      <span
        aria-hidden
        className="absolute left-1.5 right-1.5 top-1/2"
        style={{ borderTop: faceDown ? "none" : "1px dashed rgba(138,115,85,0.5)" }}
      />
      {faceDown ? (
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full text-base"
          style={{ background: PAPER.clay, color: "#F7ECD2", boxShadow: "0 2px 4px rgba(0,0,0,0.25)" }}
        >
          ★
        </span>
      ) : (
        <span className="relative z-10 break-words px-0.5" style={{ textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}>
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
            style={{
              background: isMine ? `linear-gradient(160deg, ${PAPER.gold}, ${PAPER.goldDeep})` : `linear-gradient(160deg, ${PAPER.paper}, #F1E4C9)`,
              border: `1.5px solid ${isMine ? PAPER.brown : PAPER.rim}`,
              color: isTaken ? "#A8997E" : PAPER.ink,
              boxShadow: isMine
                ? "0 10px 18px -6px rgba(166,83,31,0.45)"
                : "0 5px 11px -4px rgba(70,41,21,0.28), inset 0 1px 0 rgba(255,255,255,0.6)",
            }}
          >
            <Tape className="-top-1.5 left-1/2 -translate-x-1/2" rotate={rot * 1.5} />
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
}: {
  seat: StarSeat;
  active?: boolean;
  showScore?: boolean;
}) {
  const { pub, name, isSelf, isBot, isConnected } = seat;
  let badge = "";
  let badgeColor: string = PAPER.pencil;
  if (pub.starEligible) { badge = "★ four!"; badgeColor = PAPER.clay; }
  else if (pub.hasPassed) { badge = "passed ✓"; badgeColor = PAPER.green; }
  else if (pub.hasStacked) { badge = "stacked"; badgeColor = PAPER.olive; }
  else if (pub.hasSelected && !pub.hasShuffled) badge = "ready";
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

/** Fractional-indexed activity feed — a handwritten ledger, newest on top. */
export function ActivityFeed({
  entries,
  nameOf,
  max = 40,
}: {
  entries: StarActivityEntry[];
  nameOf: (id: string) => string;
  max?: number;
}) {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.idx < b.idx ? 1 : a.idx > b.idx ? -1 : 0)).slice(0, max),
    [entries, max],
  );
  return (
    <ul className="space-y-1 overflow-y-auto pl-7 pr-1 text-[13px]" style={{ color: PAPER.ink, ...RULED }} aria-label="Activity feed" aria-live="polite">
      {sorted.map((e, i) => (
        <li
          key={e.idx}
          className="py-0.5 font-script leading-6"
          style={{ color: i === 0 ? PAPER.clay : PAPER.pencil, fontWeight: i === 0 ? 700 : 500 }}
        >
          {e.text}
          {e.playerId && <span className="hidden">{nameOf(e.playerId)}</span>}
        </li>
      ))}
    </ul>
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

/** The legend of distinct values in play — taped target chips. */
export function ValuesLegend({ values, glyph }: { values: string[]; glyph: string }) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {values.map((v) => (
        <span
          key={v}
          className="rounded-full px-2.5 py-1 text-[12px] font-bold"
          style={{ border: `1.5px solid ${PAPER.rim}`, background: PAPER.paper, color: PAPER.ink, boxShadow: "0 2px 5px -2px rgba(70,41,21,0.25)" }}
        >
          {glyph} {v}
        </span>
      ))}
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
