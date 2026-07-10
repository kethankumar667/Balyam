/**
 * rps-notebook.tsx
 *
 * Handwritten-notebook / scrapbook themed components for the Rock-Paper-Scissors
 * board. Matches the reference design: vintage ruled parchment paper, washi-tape
 * strips on player cards, pencil-drawn borders, hand-sketch choice icons,
 * spiral binding holes down the left side, scattered ink doodles.
 *
 * Exported pieces:
 *   NotebookPage         — outer frame (wood border + parchment + ruled lines + holes)
 *   NotebookTopBar       — title strip + round badge + leave button
 *   NotebookPlayerCard   — sticky-note score card with avatar, streak stars, washi tape
 *   NotebookArena        — pencil-box VS arena
 *   NotebookChoiceRow    — "Pick your move" choice cards with sketch icons
 *   NotebookHistoryPanel — round history + room rail
 *   NotebookOutcomeBanner— win / lose / tie banner that pulses then fades
 *
 * DIALECT NOTE — migration target
 * ─────────────────────────────────────────────────────────────────────────
 * This file is an independent notebook dialect. The shared kit lives in
 * `components/paper/` (RoughFrame, PaperCard, PaperButton, SketchHeading,
 * StickyNote, TornChip, PaperBadge, PaperPanel) and
 * `components/nostalgia/NotebookSheet`.
 *
 * To unify the dialect:
 *   1. Replace `NotebookPage`'s inline background/border/line-rule logic
 *      with `<NotebookSheet>` as the outer shell. The binding holes SVG
 *      (`BindingHoles`) can remain as an absolute-positioned overlay.
 *   2. Source PAPER and INK from the same CSS custom properties as the
 *      shared kit: `--nostalgia-paper-bg` and `--nostalgia-pen-color`
 *      (defined in `index.css`), rather than the hardcoded hex values below.
 *   3. Player cards (`NotebookPlayerCard`) can then adopt `StickyNote` from
 *      the shared kit as their base, with only the washi-tape decoration
 *      remaining here as an overlay.
 *
 * Until that migration lands, keep changes in this file minimal so the
 * dialect stays close to Hand Cricket's reference rather than diverging
 * further. Do NOT add new hardcoded paper/ink values outside this file.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { ReactNode } from "react";
import type { RpsChoice } from "@shared/types";
import type { RoundOutcome } from "./useRpsBoard";

/* ─────────────────────── Palette constants ─────────────────────── */
const PAPER   = "#F5E9C4";
const PAPER_L = "#FBF5E0";
const LINE    = "rgba(100,115,180,0.18)";
const MARGIN  = "rgba(200,80,80,0.35)";
const INK     = "#1a2952";
const INK_LT  = "#4a5a82";
const P1_C    = "#2e7d32";   // player-1 green
const P2_C    = "#8B1A1A";   // player-2 dark-red
const WOOD    = "#4a2c12";
const BORDER  = "rgba(46,40,25,0.55)";

/* ─────────────────────── Notebook page shell ─────────────────────── */

/**
 * Outer wrapper: dark-wood frame → parchment paper with CSS ruled lines,
 * red vertical margin line, and spiral binding holes on the left edge.
 */
export function NotebookPage({
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
        padding: "10px 10px 10px 52px", // extra left for holes
        minHeight: "100%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
      }}
    >
      {/* Spiral binding holes */}
      <BindingHoles />

      {/* Paper surface */}
      <div
        className="relative overflow-hidden"
        style={{
          background: PAPER,
          borderRadius: 6,
          // Ruled lines + red margin via CSS
          backgroundImage: [
            `repeating-linear-gradient(
              to bottom,
              transparent,
              transparent 27px,
              ${LINE} 27px,
              ${LINE} 28px
            )`,
            `linear-gradient(to right, ${MARGIN} 0px, ${MARGIN} 1.5px, transparent 1.5px)`,
          ].join(", "),
          backgroundPosition: "0 12px, 38px 0",
          minHeight: "calc(100vh - 40px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function BindingHoles() {
  const holes = Array.from({ length: 14 });
  return (
    <div
      className="absolute left-0 top-0 bottom-0 flex flex-col justify-evenly items-center pointer-events-none"
      style={{ width: 52, paddingTop: 20, paddingBottom: 20 }}
    >
      {holes.map((_, i) => (
        <div
          key={i}
          style={{
            width: 22,
            height: 22,
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

/* ─────────────────────── Top bar ─────────────────────── */

export function NotebookTopBar({
  match,
  round,
  target,
  onLeave,
  onHelp,
}: {
  match: number;
  round: number;
  target: number;
  onLeave?: () => void;
  onHelp?: () => void;
}) {
  return (
    <div className="flex items-start justify-between px-6 pt-4 pb-1">
      {/* Left: game title */}
      <div className="flex items-start gap-3">
        <SlingIcon />
        <div>
          <div
            className="font-display font-black leading-tight"
            style={{ color: INK, fontSize: "clamp(16px,2.2vw,26px)" }}
          >
            Rock &bull; Paper &bull; Scissors
          </div>
          <div
            className="font-script"
            style={{ color: INK_LT, fontSize: 13, marginTop: 1 }}
          >
            Match #{match}
          </div>
        </div>
      </div>

      {/* Right: round badge + target + leave */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-baseline gap-1.5 px-3 py-1.5 rounded-md"
          style={{
            background: "#f0e04a",
            border: `1.5px solid rgba(140,120,0,0.45)`,
            boxShadow: "1px 2px 5px rgba(0,0,0,0.18)",
            transform: "rotate(-1deg)",
          }}
        >
          <span
            className="font-script font-bold"
            style={{ color: INK, fontSize: 14 }}
          >
            Round
          </span>
          <span
            className="font-black"
            style={{ color: INK, fontSize: 22, lineHeight: 1 }}
          >
            #{round}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="font-bold"
            style={{ color: INK_LT, fontSize: 14 }}
          >
            First to{" "}
          </span>
          <span
            className="font-black"
            style={{ color: "#c0392b", fontSize: 16 }}
          >
            {target}
          </span>
        </div>

        {onHelp && (
          <button
            onClick={onHelp}
            className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm"
            style={{
              border: `2px solid ${INK_LT}`,
              color: INK_LT,
              background: "transparent",
            }}
            aria-label="How to play"
          >
            ?
          </button>
        )}

        {onLeave && (
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded font-bold transition hover:brightness-95 active:scale-[0.97]"
            style={{
              background: PAPER_L,
              border: `1.5px solid ${BORDER}`,
              color: INK,
              fontSize: 13,
              boxShadow: "1px 2px 5px rgba(0,0,0,0.18)",
            }}
          >
            <span style={{ color: P2_C }}>←</span> Leave
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Player score card ─────────────────────── */

export function NotebookPlayerCard({
  name,
  isSelf,
  score,
  target,
  streak,
  best,
  matchPoint,
  color,     // P1_C or P2_C
  tapeColor, // "green" | "red-dots"
  side,      // "left" | "right"
  cardRef,
}: {
  name: string;
  isSelf?: boolean;
  score: number;
  target: number;
  streak: number;
  best: number;
  matchPoint: boolean;
  color: string;
  tapeColor: "green" | "red-dots";
  side: "left" | "right";
  cardRef?: (el: HTMLDivElement | null) => void;
}) {
  const STARS = 7;
  return (
    <div
      ref={cardRef}
      className="relative"
      style={{
        background: PAPER_L,
        border: `1.5px solid ${BORDER}`,
        borderRadius: 8,
        padding: "10px 12px 12px 14px",
        boxShadow: "2px 4px 12px rgba(0,0,0,0.18)",
        minWidth: 160,
      }}
    >
      {/* Washi tape strip */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2"
        style={{
          width: 60,
          height: 18,
          borderRadius: 2,
          ...(tapeColor === "green"
            ? { background: "#5cad6e", opacity: 0.85 }
            : {
                background: "#d44",
                opacity: 0.80,
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.6) 2px, transparent 2px)",
                backgroundSize: "8px 8px",
              }),
          transform: `rotate(${side === "left" ? "-2deg" : "2deg"})`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />

      {/* Paperclip */}
      <div
        className="absolute -top-1"
        style={{
          [side === "left" ? "right" : "left"]: 16,
          fontSize: 28,
          transform: "rotate(-10deg)",
          color: side === "left" ? "#c0392b" : "#1a50a0",
          lineHeight: 1,
          userSelect: "none",
        }}
        aria-hidden
      >
        🖇
      </div>

      {/* Avatar + name row */}
      <div className="flex items-center gap-2.5 mt-2">
        <CartoonAvatar color={color} />
        <div>
          <div className="font-black leading-tight" style={{ color, fontSize: 15 }}>
            {name}
            {isSelf && (
              <span className="font-normal ml-1" style={{ color: INK_LT, fontSize: 12 }}>
                (you)
              </span>
            )}
          </div>
          <div style={{ color: INK_LT, fontSize: 11 }}>Best streak {best}</div>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-1 mt-2 ml-1">
        <span
          className="font-black tabular-nums"
          style={{
            fontSize: 32,
            color: matchPoint ? "#f97316" : color,
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span style={{ color: INK_LT, fontSize: 15, fontWeight: 700 }}>
          / {target}
        </span>
        {matchPoint && (
          <span
            className="ml-1 font-bold uppercase text-[10px] tracking-wider"
            style={{ color: "#f97316" }}
          >
            MATCH PT
          </span>
        )}
      </div>

      {/* Streak stars */}
      <div className="flex gap-1 mt-2 ml-0.5">
        {Array.from({ length: STARS }).map((_, i) => (
          <StarIcon
            key={i}
            filled={i < streak}
            color={color}
            size={16}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── Arena (VS pencil box) ─────────────────────── */

export function NotebookArena({
  myName,
  oppName,
  myChoice,
  oppChoice,
  bothChose,
  revealKey,
  bannerOutcome,
  myColor,
  oppColor,
}: {
  myName: string;
  oppName: string;
  myChoice: RpsChoice | null;
  oppChoice: RpsChoice | null;
  bothChose: boolean;
  revealKey: number;
  bannerOutcome: RoundOutcome | null;
  myColor: string;
  oppColor: string;
}) {
  return (
    <div
      className="relative flex flex-col items-center"
      style={{ flex: 1 }}
    >
      {/* Pencil-drawn double border */}
      <div
        className="relative w-full flex items-center justify-between gap-2 px-5 py-4 rounded"
        style={{
          border: `2.5px dashed rgba(60,90,180,0.50)`,
          background: "rgba(200,210,255,0.05)",
          boxShadow: "inset 0 0 0 5px rgba(200,210,255,0.08)",
          minHeight: 140,
        }}
      >
        {/* Outcome banner overlay */}
        {bannerOutcome && (
          <OutcomeBanner outcome={bannerOutcome} key={revealKey} />
        )}

        {/* Player 1 choice cell */}
        <ChoiceCell choice={myChoice} chosen={!!myChoice} label={myName} borderColor={myColor} />

        {/* VS burst */}
        <VSBurst />

        {/* Opponent choice cell */}
        <ChoiceCell choice={oppChoice} chosen={bothChose} label={oppName} borderColor={oppColor} flip />
      </div>
    </div>
  );
}

function ChoiceCell({
  choice,
  chosen,
  label,
  borderColor,
  flip,
}: {
  choice: RpsChoice | null;
  chosen: boolean;
  label: string;
  borderColor: string;
  flip?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ flex: "0 0 auto" }}>
      <div
        className="flex items-center justify-center rounded"
        style={{
          width: 96,
          height: 96,
          border: `2px dashed ${borderColor}60`,
          background: PAPER,
          boxShadow: "1px 2px 6px rgba(0,0,0,0.12)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {choice ? (
          <ChoiceSketch choice={choice} size={70} />
        ) : (
          <span
            className="font-black"
            style={{
              fontSize: chosen ? 22 : 32,
              color: chosen ? "#888" : INK_LT,
              opacity: 0.6,
            }}
          >
            {chosen ? "✓" : flip ? "?" : "—"}
          </span>
        )}
      </div>
      <span
        className="font-bold text-center"
        style={{ color: INK, fontSize: 13 }}
      >
        {label}
      </span>
    </div>
  );
}

function VSBurst() {
  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center"
      style={{ width: 56, height: 56 }}
    >
      {/* Jagged burst background */}
      <svg
        viewBox="0 0 56 56"
        width={56}
        height={56}
        className="absolute inset-0"
        aria-hidden
      >
        <path
          d="M28 2 L32 18 L46 10 L38 24 L54 22 L42 32 L54 38 L38 38 L46 52 L30 44 L28 56 L26 44 L10 52 L18 38 L2 38 L14 32 L2 22 L18 24 L10 10 L24 18 Z"
          fill="#f59e0b"
          opacity={0.90}
        />
      </svg>
      <span
        className="relative font-black uppercase tracking-tighter"
        style={{ color: "#7c2d12", fontSize: 13, lineHeight: 1 }}
      >
        VS
      </span>
    </div>
  );
}

function OutcomeBanner({ outcome }: { outcome: RoundOutcome }) {
  const text =
    outcome === "you-win" ? "🎉 You Win!" : outcome === "you-lose" ? "😬 They Win" : "🤝 Tie!";
  const bg =
    outcome === "you-win"
      ? "rgba(16,185,129,0.92)"
      : outcome === "you-lose"
      ? "rgba(239,68,68,0.88)"
      : "rgba(245,158,11,0.90)";
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
      style={{ animation: "rummy-win-burst 1.3s ease-out forwards" }}
    >
      <div
        className="px-5 py-2 rounded-full font-black text-white text-lg shadow-lg"
        style={{ background: bg }}
      >
        {text}
      </div>
    </div>
  );
}

/* ─────────────────────── Choice cards row ─────────────────────── */

export function NotebookChoiceRow({
  myChoice,
  bothChose,
  onPick,
}: {
  myChoice: RpsChoice | null;
  bothChose: boolean;
  onPick: (c: RpsChoice) => void;
}) {
  const choices: { c: RpsChoice; kbd: string; label: string; sub: string }[] = [
    { c: "rock",     kbd: "R", label: "Rock",     sub: "Crush scissors" },
    { c: "paper",    kbd: "P", label: "Paper",    sub: "Wrap rock"      },
    { c: "scissors", kbd: "S", label: "Scissors", sub: "Slice paper"    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Heading row */}
      <div className="flex items-center justify-center gap-3">
        <RadiatingLines side="left" />
        <span
          className="font-script font-bold"
          style={{ color: INK, fontSize: 16 }}
        >
          Pick your move
        </span>
        <RadiatingLines side="right" />
        {/* Paper plane doodle */}
        <span className="text-lg ml-2 pointer-events-none" aria-hidden>✈</span>
      </div>

      {/* Three choice cards */}
      <div className="flex gap-3 justify-center flex-wrap">
        {choices.map(({ c, kbd, label, sub }) => {
          const chosen = myChoice === c;
          const locked = !!myChoice && !chosen;
          return (
            <button
              key={c}
              onClick={() => !myChoice && !bothChose && onPick(c)}
              disabled={!!myChoice || bothChose}
              aria-pressed={chosen}
              aria-label={label}
              className="relative flex flex-col items-center rounded transition-all duration-150"
              style={{
                width: 120,
                background: chosen ? "#e8f5e9" : PAPER_L,
                border: `2px dashed ${chosen ? P1_C : BORDER}`,
                boxShadow: chosen
                  ? `0 0 0 2px ${P1_C}50, 2px 4px 10px rgba(0,0,0,0.18)`
                  : "2px 4px 8px rgba(0,0,0,0.14)",
                padding: "10px 8px 8px 8px",
                opacity: locked ? 0.45 : 1,
                cursor: myChoice || bothChose ? "not-allowed" : "pointer",
                transform: chosen ? "translateY(-4px) scale(1.04)" : "none",
              }}
            >
              {/* Keyboard hint corner */}
              <span
                className="absolute top-1.5 left-2 font-black"
                style={{ color: INK_LT, fontSize: 12 }}
              >
                {kbd}
              </span>

              {/* Sketch icon */}
              <ChoiceSketch choice={c} size={68} />

              {/* Label */}
              <span
                className="font-display font-black mt-1.5 leading-tight"
                style={{ color: INK, fontSize: 15 }}
              >
                {label}
              </span>
              <span
                className="font-script"
                style={{ color: INK_LT, fontSize: 11, marginTop: 1 }}
              >
                {sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────── History panel ─────────────────────── */

export function NotebookHistoryPanel({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <div
      className="relative rounded"
      style={{
        background: PAPER_L,
        border: `1.5px solid ${BORDER}`,
        boxShadow: "2px 4px 10px rgba(0,0,0,0.12)",
        minWidth: 200,
        padding: "12px 14px",
      }}
    >
      {/* Torn top edge effect */}
      <div
        className="absolute -top-2 left-0 right-0 h-2 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='8'%3E%3Cpath d='M0 8 Q5 0 10 8 Q15 0 20 8 Q25 0 30 8 Q35 0 40 8 Q45 0 50 8 Q55 0 60 8 Q65 0 70 8 Q75 0 80 8 Q85 0 90 8 Q95 0 100 8' fill='%23F5E9C4' stroke='rgba(46,40,25,0.45)' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "100px 8px",
        }}
      />
      {children}
    </div>
  );
}

/* ─────────────────────── History strip ─────────────────────── */

export function NotebookHistoryStrip({
  history,
  myId,
}: {
  history: Array<{ round: number; winnerId: string | null }>;
  myId: string;
}) {
  if (history.length === 0) {
    return (
      <>
        <p
          className="font-script text-center leading-snug"
          style={{ color: INK_LT, fontSize: 13 }}
        >
          Round history will appear here
          <br />as you play.
        </p>
        <div className="mt-3 space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="w-full"
              style={{ height: 1, background: LINE }}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div>
      <div
        className="font-script font-bold mb-2"
        style={{ color: INK_LT, fontSize: 12 }}
      >
        Round history
      </div>
      <div className="flex flex-wrap gap-1.5">
        {history.slice().reverse().map((h, i) => {
          const win = h.winnerId === myId;
          const tie = !h.winnerId;
          return (
            <div
              key={i}
              className="w-7 h-7 rounded-md flex items-center justify-center font-black text-sm"
              title={`Round ${h.round}: ${tie ? "tie" : win ? "won" : "lost"}`}
              style={{
                background: win
                  ? "rgba(46,125,50,0.20)"
                  : tie
                  ? "rgba(245,158,11,0.20)"
                  : "rgba(139,26,26,0.18)",
                border: `1.5px solid ${win ? P1_C + "55" : tie ? "#f59e0b55" : P2_C + "55"}`,
                color: win ? P1_C : tie ? "#b45309" : P2_C,
              }}
            >
              {tie ? "=" : win ? "W" : "L"}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────── Decorative doodles ─────────────────────── */

export function NotebookDoodles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* Scattered hand-drawn stars */}
      {([
        [7, 19, 14, P1_C],   [94, 12, 13, "#f59e0b"],
        [4, 44, 10, "#a0a0c0"],  [96, 55, 11, "#f59e0b"],
        [8, 78, 10, "#a0a0c0"],  [92, 82, 10, P2_C],
        [50, 90, 12, "#f59e0b"],
      ] as [number, number, number, string][]).map(([lp, tp, sz, cl], i) => (
        <div
          key={i}
          className="absolute font-black leading-none"
          style={{
            left: `${lp}%`, top: `${tp}%`,
            fontSize: sz, color: cl,
            opacity: 0.55,
            transform: `rotate(${(i * 23) % 30 - 15}deg)`,
          }}
        >
          ✦
        </div>
      ))}

      {/* Cricket bat + ball — bottom-left */}
      <svg
        viewBox="0 0 80 80"
        width={56}
        height={56}
        className="absolute"
        style={{ bottom: 8, left: 4, opacity: 0.28 }}
      >
        <g transform="rotate(25 40 40)">
          <rect x="36" y="8" width="8" height="46" rx="3" fill={INK} />
          <rect x="32" y="48" width="16" height="12" rx="3" fill={INK} />
        </g>
        <circle cx="22" cy="60" r="7" fill={INK} />
      </svg>

      {/* Paper boat — bottom-right */}
      <svg
        viewBox="0 0 60 40"
        width={44}
        height={30}
        className="absolute"
        style={{ bottom: 10, right: 12, opacity: 0.28 }}
      >
        <path d="M5 28 L30 4 L55 28 Z" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M5 28 Q30 38 55 28" fill={INK} opacity={0.25} />
      </svg>
    </div>
  );
}

/* ─────────────────────── SVG sub-components ─────────────────────── */

/** 5-point star, optionally filled. */
function StarIcon({
  filled,
  color,
  size = 18,
}: {
  filled: boolean;
  color: string;
  size?: number;
}) {
  const r = size / 2;
  const pts = Array.from({ length: 5 }, (_, i) => {
    const out = ((i * 72 - 90) * Math.PI) / 180;
    const inn = (((i * 72 + 36) - 90) * Math.PI) / 180;
    return (
      `${r + Math.cos(out) * r * 0.92},${r + Math.sin(out) * r * 0.92} ` +
      `${r + Math.cos(inn) * r * 0.38},${r + Math.sin(inn) * r * 0.38}`
    );
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <polygon
        points={pts}
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={1.4}
        opacity={filled ? 1 : 0.4}
      />
    </svg>
  );
}

/** Cartoon avatar — simple circular face sketch. */
function CartoonAvatar({ color }: { color: string }) {
  return (
    <svg
      width={44}
      height={44}
      viewBox="0 0 44 44"
      aria-hidden
      className="flex-shrink-0"
    >
      {/* Outer circle border (colored) */}
      <circle cx={22} cy={22} r={20} fill={PAPER_L} stroke={color} strokeWidth={2.5} />
      {/* Face */}
      <circle cx={22} cy={22} r={16} fill="#FFDDB5" />
      {/* Hair */}
      <path d="M10 20 Q12 10 22 10 Q32 10 34 20" fill="#6b3a1f" />
      {/* Eyes */}
      <circle cx={17} cy={21} r={2} fill="#2e2419" />
      <circle cx={27} cy={21} r={2} fill="#2e2419" />
      {/* Smile */}
      <path
        d="M16 28 Q22 33 28 28"
        fill="none"
        stroke="#2e2419"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Hand-sketch SVG icons for each choice. */
export function ChoiceSketch({
  choice,
  size = 72,
}: {
  choice: RpsChoice;
  size?: number;
}) {
  const scale = size / 100;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden
      style={{ overflow: "visible" }}
    >
      {choice === "rock" && <RockSketch scale={scale} />}
      {choice === "paper" && <PaperSketch scale={scale} />}
      {choice === "scissors" && <ScissorsSketch scale={scale} />}
    </svg>
  );
}

function RockSketch({ scale: _ }: { scale: number }) {
  return (
    <g>
      {/* Main stone blob */}
      <path
        d="M18 68 Q12 55 14 42 Q16 26 28 18 Q42 10 56 14 Q70 18 78 30 Q86 44 82 58 Q78 72 66 78 Q52 84 38 80 Q24 76 18 68Z"
        fill="#9e9e9e"
        stroke="#6b6b6b"
        strokeWidth={2}
      />
      {/* Highlight */}
      <ellipse cx={36} cy={32} rx={10} ry={7} fill="rgba(255,255,255,0.25)" transform="rotate(-20,36,32)" />
      {/* Texture lines */}
      <path d="M28 55 Q36 62 32 70" stroke="#7a7a7a" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <path d="M50 42 Q58 50 54 60" stroke="#7a7a7a" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <path d="M38 38 Q44 44 40 52" stroke="#7a7a7a" strokeWidth={1.3} fill="none" strokeLinecap="round" />
    </g>
  );
}

function PaperSketch({ scale: _ }: { scale: number }) {
  return (
    <g>
      {/* Page rectangle */}
      <rect x={18} y={10} width={64} height={80} rx={3} fill={PAPER} stroke="#9c8970" strokeWidth={2} />
      {/* Ruled lines */}
      {[28, 40, 52, 64, 76].map((y) => (
        <line key={y} x1={26} y1={y} x2={74} y2={y} stroke="#b0a085" strokeWidth={1.5} />
      ))}
      {/* Left margin line */}
      <line x1={34} y1={18} x2={34} y2={86} stroke="#e09090" strokeWidth={1.2} opacity={0.7} />
      {/* Dog-ear corner */}
      <path d="M64 10 L82 28 L64 28 Z" fill="#c8b89a" stroke="#9c8970" strokeWidth={1.2} />
    </g>
  );
}

function ScissorsSketch({ scale: _ }: { scale: number }) {
  return (
    <g>
      {/* Left blade */}
      <path
        d="M50 50 L26 18 Q22 12 30 10 Q38 8 42 16 L50 50"
        fill="#cc2222"
        stroke="#991111"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Right blade */}
      <path
        d="M50 50 L74 18 Q78 12 70 10 Q62 8 58 16 L50 50"
        fill="#cc2222"
        stroke="#991111"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Left handle loop */}
      <ellipse
        cx={34} cy={70} rx={14} ry={10}
        fill="none" stroke="#cc2222" strokeWidth={3}
      />
      {/* Right handle loop */}
      <ellipse
        cx={66} cy={70} rx={14} ry={10}
        fill="none" stroke="#cc2222" strokeWidth={3}
      />
      {/* Shank lines to handles */}
      <line x1={34} y1={60} x2={50} y2={50} stroke="#cc2222" strokeWidth={3} strokeLinecap="round" />
      <line x1={66} y1={60} x2={50} y2={50} stroke="#cc2222" strokeWidth={3} strokeLinecap="round" />
      {/* Pivot screw */}
      <circle cx={50} cy={50} r={4} fill="#cc2222" stroke="#fff" strokeWidth={1.5} />
      {/* Shine on blades */}
      <path d="M38 18 L32 32" stroke="rgba(255,255,255,0.40)" strokeWidth={2} strokeLinecap="round" />
      <path d="M62 18 L68 32" stroke="rgba(255,255,255,0.40)" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

/** Radiating ink lines — used beside "Pick your move". */
function RadiatingLines({ side }: { side: "left" | "right" }) {
  const flip = side === "right";
  return (
    <svg
      width={20}
      height={18}
      viewBox="0 0 20 18"
      aria-hidden
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      {[[-8, 0], [-4, -5], [-4, 5], [-10, -9], [-10, 9]].map(([dx, dy], i) => (
        <line
          key={i}
          x1={20} y1={9}
          x2={20 + dx} y2={9 + dy}
          stroke="#c0392b"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** Slingshot icon for the game title. */
function SlingIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" aria-hidden className="mt-0.5 flex-shrink-0">
      {/* Y-frame */}
      <path d="M14 24 L14 14" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M14 14 L6 6"  stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M14 14 L22 6" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      {/* Fork tips */}
      <circle cx={6}  cy={6}  r={2.5} fill={INK} />
      <circle cx={22} cy={6}  r={2.5} fill={INK} />
      {/* Elastic band */}
      <path d="M6 6 Q14 16 22 6" fill="none" stroke="#c0392b" strokeWidth={1.8} strokeLinecap="round" />
      {/* Projectile */}
      <circle cx={14} cy={15} r={3.5} fill="#888" />
    </svg>
  );
}
