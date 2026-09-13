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

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { RpsChoice } from "@shared/types";
import type { RoundOutcome } from "./useRpsBoard";
import { findAvatar } from "../../lib/avatars";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";
import GameThemeToggle from "../../components/theme/GameThemeToggle";
import { useFullscreenToggle } from "../../hooks/useFullscreenToggle";
import { isFullscreenSupported } from "../../lib/fullscreen";

/* ─────────────────────── Palette constants ─────────────────────── */
export const PAPER   = "#F5E9C4";
export const PAPER_L = "#FBF5E0";
export const LINE    = "rgba(100,115,180,0.18)";
export const MARGIN  = "rgba(200,80,80,0.35)";
export const INK     = "#1a2952";
export const INK_LT  = "#4a5a82";
export const P1_C    = "#2e7d32";   // player-1 green
export const P2_C    = "#8B1A1A";   // player-2 dark-red
export const WOOD    = "#4a2c12";
export const BORDER  = "rgba(46,40,25,0.55)";

/* ─────────────────────── Notebook page shell ─────────────────────── */

/**
 * Outer wrapper: full-bleed parchment paper with CSS ruled lines
 * and red vertical margin line.
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
      className={`relative w-full min-h-full overflow-hidden ${className}`}
      style={{
        background: PAPER,
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
      }}
    >
      {children}
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
  onSkin,
}: {
  match: number;
  round: number;
  target: number;
  onLeave?: () => void;
  onHelp?: () => void;
  /** Switch back to the broadcast skin. Styled in the notebook idiom rather
   *  than reusing the pro kit's dark control, which would read as a bug on
   *  parchment. */
  onSkin?: () => void;
}) {
  const { isFullscreen, toggleFullscreen } = useFullscreenToggle();
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

        {onSkin && (
          <GameThemeToggle
            theme="notebook"
            onToggle={onSkin}
            variant="compact"
          />
        )}

        {isFullscreenSupported() && (
          <button
            onClick={toggleFullscreen}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{
              border: `2px solid ${INK_LT}`,
              color: INK_LT,
              background: "transparent",
            }}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            ⛶
          </button>
        )}

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

function SvgPaperclip({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="36"
      viewBox="0 0 20 36"
      fill="none"
      aria-hidden
      style={{ filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.22))" }}
    >
      <path
        d="M6 10 V26 C6 30 14 30 14 26 V7 C14 3 3 3 3 8 V27 C3 33 17 33 17 26 V11"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────────────── Player score card ─────────────────────── */

export function NotebookPlayerCard({
  name,
  avatar,
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
  targetPlayerId,
  onTarget,
  activeTargetId,
  onCloseTarget,
  locked = false,
  className = "",
}: {
  name: string;
  avatar?: string;
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
  targetPlayerId?: string | null;
  onTarget?: (playerId: string) => void;
  activeTargetId?: string | null;
  onCloseTarget?: () => void;
  locked?: boolean;
  className?: string;
}) {
  const STARS = 7;
  const isTargetActive = targetPlayerId && activeTargetId === targetPlayerId;
  const canTarget = !isSelf && targetPlayerId;
  return (
    <div
      ref={cardRef}
      className={`relative rounded-xl transition-all duration-200 ${canTarget ? "cursor-pointer hover:brightness-105 active:scale-[0.99]" : ""} ${className}`}
      onClick={canTarget ? () => onTarget?.(targetPlayerId) : undefined}
      title={canTarget ? `Tap to react at ${name}` : undefined}
      style={{
        background: PAPER_L,
        border: `1.5px solid ${BORDER}`,
        padding: "12px 14px 14px 14px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.16)",
        minWidth: 170,
        transform: `rotate(${side === "left" ? "-0.8deg" : "0.8deg"})`,
      }}
    >
      {isTargetActive && onCloseTarget && targetPlayerId && (
        <SeatTargetReactionWheel
          game="rps"
          targetPlayerId={targetPlayerId}
          targetPlayerName={name}
          onClose={onCloseTarget}
          position="bottom"
        />
      )}
      {/* Washi tape strip */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
        style={{
          width: 68,
          height: 18,
          borderRadius: 2,
          ...(tapeColor === "green"
            ? { background: "#5cad6e", opacity: 0.9 }
            : {
                background: "#d44",
                opacity: 0.85,
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.6) 2px, transparent 2px)",
                backgroundSize: "8px 8px",
              }),
          transform: `rotate(${side === "left" ? "-2deg" : "2deg"})`,
          boxShadow: "0 2px 4px rgba(0,0,0,0.22)",
        }}
      />

      {/* Paperclip */}
      <div
        className="absolute -top-4 z-20 pointer-events-none"
        style={{
          [side === "left" ? "right" : "left"]: 14,
          transform: `rotate(${side === "left" ? "-10deg" : "10deg"})`,
        }}
        aria-hidden
      >
        <SvgPaperclip color={side === "left" ? "#c0392b" : "#1a50a0"} />
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Avatar + name row */}
          <div className="flex items-center gap-2.5 mt-2">
            <CartoonAvatar color={color} avatar={avatar} />
            <div className="min-w-0 flex-1">
              <div className="font-black leading-tight truncate" style={{ color, fontSize: 15 }}>
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
          <div className="flex items-baseline gap-1 mt-2.5 ml-1">
            <span
              className="font-black tabular-nums"
              style={{
                fontSize: 34,
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
                className="ml-1.5 font-bold uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300"
              >
                MATCH PT
              </span>
            )}
          </div>
        </div>

        {/* Bottom row: Streak stars & ready stamp */}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1">
            {Array.from({ length: STARS }).map((_, i) => (
              <StarIcon
                key={i}
                filled={i < streak}
                color={color}
                size={16}
              />
            ))}
          </div>

          {locked && (
            <div
              className="px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider select-none"
              style={{
                border: "1.5px dashed #15803D",
                color: "#15803D",
                background: "rgba(21,128,61,0.12)",
                transform: "rotate(-3deg)",
              }}
            >
              ✓ Locked In
            </div>
          )}
        </div>
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
      className="relative flex flex-col items-center justify-center w-full h-full"
    >
      {/* Pencil-drawn notebook board */}
      <div
        className="relative w-full h-full flex items-center justify-between gap-3 px-6 py-5 rounded-xl transition-all duration-200"
        style={{
          border: `2px dashed rgba(74, 44, 18, 0.45)`,
          background: "rgba(251, 245, 224, 0.82)",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.10)",
          minHeight: 160,
        }}
      >
        {/* Outcome banner overlay (rubber stamp) */}
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
    <div className="flex flex-col items-center gap-2" style={{ flex: "0 0 auto" }}>
      <div
        className="flex items-center justify-center rounded-xl transition-all duration-300"
        style={{
          width: 104,
          height: 104,
          border: `2px dashed ${choice ? borderColor : "rgba(46,40,25,0.35)"}`,
          background: choice ? "#FFFDF6" : "rgba(255,255,255,0.5)",
          boxShadow: choice
            ? `0 0 0 2px ${borderColor}25, 0 4px 12px rgba(0,0,0,0.12)`
            : "inset 0 2px 4px rgba(0,0,0,0.06)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {choice ? (
          <div className="animate-in zoom-in-75 duration-200">
            <ChoiceSketch choice={choice} size={76} />
          </div>
        ) : chosen ? (
          <div className="flex flex-col items-center gap-1 text-[#2e7d32]">
            <span className="text-2xl font-black">✓</span>
            <span className="font-script text-[11px] font-bold tracking-tight">Ready!</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5 text-[#8c7b6a]">
            <span className="text-2xl font-black opacity-60">?</span>
            <span className="font-script text-[10px] font-semibold opacity-75">{flip ? "Thinking" : "Waiting"}</span>
          </div>
        )}
      </div>
      <span
        className="font-bold text-center truncate max-w-[104px]"
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
      style={{ width: 62, height: 62 }}
    >
      {/* Hand-drawn comic starburst */}
      <svg
        viewBox="0 0 64 64"
        width={62}
        height={62}
        className="absolute inset-0 drop-shadow-sm"
        aria-hidden
      >
        <path
          d="M32 2 L37 20 L54 11 L44 27 L62 25 L48 37 L62 44 L44 44 L53 60 L35 50 L32 64 L30 50 L12 60 L21 44 L3 44 L17 37 L3 25 L21 27 L11 11 L28 20 Z"
          fill="#FDE68A"
          stroke="#D97706"
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="relative font-display font-black tracking-tight"
        style={{ color: "#92400E", fontSize: 15, lineHeight: 1 }}
      >
        VS
      </span>
    </div>
  );
}

function OutcomeBanner({ outcome }: { outcome: RoundOutcome }) {
  const win = outcome === "you-win";
  const tie = outcome === "tie";
  const text = win ? "★ YOU WIN! ★" : tie ? "DRAW — TIE!" : "THEY WIN";
  const color = win ? "#15803D" : tie ? "#B45309" : "#B91C1C";
  const bg = win ? "rgba(220, 252, 231, 0.96)" : tie ? "rgba(254, 243, 199, 0.96)" : "rgba(254, 226, 226, 0.96)";

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
      style={{ animation: "rummy-win-burst 1.3s ease-out forwards" }}
    >
      <div
        className="px-6 py-2.5 rounded-lg font-display font-black text-xl tracking-wider uppercase"
        style={{
          color,
          background: bg,
          border: `2.5px dashed ${color}`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
          transform: "rotate(-3deg)",
        }}
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
      <div className="flex gap-4 justify-center flex-wrap">
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
              className="group relative flex flex-col items-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e7d32]"
              style={{
                width: 136,
                background: chosen ? "#ECFDF5" : PAPER_L,
                border: `2px ${chosen ? "solid #15803D" : "dashed " + BORDER}`,
                boxShadow: chosen
                  ? "0 0 0 2px rgba(21,128,61,0.25), 0 8px 18px rgba(0,0,0,0.18)"
                  : "0 3px 8px rgba(0,0,0,0.12)",
                padding: "14px 10px 10px 10px",
                opacity: locked ? 0.4 : 1,
                cursor: myChoice || bothChose ? "not-allowed" : "pointer",
                transform: chosen ? "translateY(-5px) scale(1.04)" : "none",
              }}
            >
              {/* Keyboard hint corner stamp */}
              <span
                className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded font-black text-[10px]"
                style={{
                  background: chosen ? "rgba(21,128,61,0.15)" : "rgba(0,0,0,0.06)",
                  color: chosen ? "#15803D" : INK_LT,
                  border: `1px solid ${chosen ? "rgba(21,128,61,0.3)" : "rgba(0,0,0,0.12)"}`,
                }}
              >
                {kbd}
              </span>

              {/* Check indicator if chosen */}
              {chosen && (
                <span
                  className="absolute top-1.5 right-2 font-black text-xs text-[#15803D]"
                  title="Selected"
                >
                  ✓
                </span>
              )}

              {/* Sketch icon */}
              <div className="transition-transform duration-200 group-hover:scale-105">
                <ChoiceSketch choice={c} size={72} />
              </div>

              {/* Label */}
              <span
                className="font-display font-black mt-2 leading-tight tracking-wide"
                style={{ color: chosen ? "#15803D" : INK, fontSize: 15 }}
              >
                {label}
              </span>
              <span
                className="font-script font-semibold"
                style={{ color: chosen ? "#166534" : INK_LT, fontSize: 11, marginTop: 2 }}
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
              className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-transform hover:scale-110"
              title={`Round ${h.round}: ${tie ? "tie" : win ? "won" : "lost"}`}
              style={{
                background: win
                  ? "rgba(21,128,61,0.16)"
                  : tie
                  ? "rgba(245,158,11,0.18)"
                  : "rgba(185,28,28,0.16)",
                border: `1.5px ${tie ? "dashed" : "solid"} ${win ? "#15803D" : tie ? "#B45309" : "#B91C1C"}`,
                color: win ? "#15803D" : tie ? "#B45309" : "#B91C1C",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              {tie ? "D" : win ? "W" : "L"}
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

/** The player's chosen picture in a colored ring — or, when they haven't
 *  picked one (or it fails to load), the original circular face sketch. */
function CartoonAvatar({ color, avatar }: { color: string; avatar?: string }) {
  const option = findAvatar(avatar);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [option?.src]);

  if (option && !imgFailed) {
    return (
      <span
        className="inline-block rounded-full overflow-hidden flex-shrink-0"
        style={{ width: 44, height: 44, border: `2.5px solid ${color}` }}
      >
        <img
          src={option.src}
          alt=""
          aria-hidden
          className="w-full h-full object-cover scale-[1.25] origin-center"
          style={{ objectPosition: "50% 22%" }}
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      </span>
    );
  }

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
      <defs>
        <linearGradient id="nb-rock-skin-grad" x1="20" y1="15" x2="75" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D4D9DF" />
          <stop offset="45%" stopColor="#9AA5B1" />
          <stop offset="100%" stopColor="#5B6875" />
        </linearGradient>
      </defs>
      {/* Soft drop shadow under rock */}
      <ellipse cx={50} cy={82} rx={32} ry={6} fill="rgba(0,0,0,0.14)" />
      {/* Main chiseled boulder body */}
      <path
        d="M26 28 L46 16 L72 20 L84 40 L80 68 L58 80 L30 78 L16 60 L18 38 Z"
        fill="url(#nb-rock-skin-grad)"
        stroke="#273238"
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      {/* Facet lines */}
      <path
        d="M46 16 L48 42 L26 28 M48 42 L72 20 M48 42 L84 40 M48 42 L64 64 L80 68 M64 64 L58 80 M48 42 L34 62 L30 78 M34 62 L16 60"
        stroke="#273238"
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Light highlight facet on top left */}
      <polygon points="26,28 46,16 48,42" fill="rgba(255,255,255,0.4)" />
      {/* Shadow facets on bottom right */}
      <polygon points="48,42 64,64 80,68 84,40" fill="rgba(0,0,0,0.24)" />
      <polygon points="48,42 34,62 58,80 64,64" fill="rgba(0,0,0,0.14)" />
      {/* Hand cross-hatching texture in shadow area */}
      <path d="M68 48 L80 58 M70 54 L78 62 M62 54 L74 64" stroke="#273238" strokeWidth={1.4} strokeLinecap="round" />
      {/* Little sparkle glint on top peak */}
      <path d="M46 10 V14 M44 12 H48" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function PaperSketch({ scale: _ }: { scale: number }) {
  return (
    <g>
      {/* Cast shadow under paper */}
      <path d="M22 84 L76 84 L80 28 L24 28 Z" fill="rgba(0,0,0,0.12)" />
      {/* Main parchment sheet */}
      <path
        d="M22 14 L62 14 L78 30 L78 82 C78 84 76 86 74 86 L24 86 C22 86 20 84 20 82 L20 16 C20 14 22 14 22 14 Z"
        fill="#FCF9EE"
        stroke="#273238"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* Folded corner flap */}
      <path
        d="M62 14 L62 30 L78 30 Z"
        fill="#E8DFCA"
        stroke="#273238"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Red margin line */}
      <line x1={32} y1={18} x2={32} y2={82} stroke="#DC2626" strokeWidth={1.6} strokeOpacity={0.65} />
      {/* Ruled blue ink notebook lines */}
      <line x1={36} y1={36} x2={70} y2={36} stroke="#3B82F6" strokeWidth={1.6} strokeOpacity={0.5} strokeLinecap="round" />
      <line x1={36} y1={46} x2={72} y2={46} stroke="#3B82F6" strokeWidth={1.6} strokeOpacity={0.5} strokeLinecap="round" />
      <line x1={36} y1={56} x2={68} y2={56} stroke="#3B82F6" strokeWidth={1.6} strokeOpacity={0.5} strokeLinecap="round" />
      <line x1={36} y1={66} x2={72} y2={66} stroke="#3B82F6" strokeWidth={1.6} strokeOpacity={0.5} strokeLinecap="round" />
      <line x1={36} y1={76} x2={60} y2={76} stroke="#3B82F6" strokeWidth={1.6} strokeOpacity={0.5} strokeLinecap="round" />
      {/* Cute ink stamp star */}
      <path
        d="M26 24 L27.2 27.5 L31 27.5 L28 29.5 L29.2 33 L26 31 L22.8 33 L24 29.5 L21 27.5 L24.8 27.5 Z"
        fill="#F59E0B"
        opacity={0.85}
      />
    </g>
  );
}

function ScissorsSketch({ scale: _ }: { scale: number }) {
  return (
    <g>
      <defs>
        <linearGradient id="nb-blade-metal" x1="30" y1="20" x2="60" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
      {/* Left steel blade */}
      <path
        d="M50 48 L28 14 C26 10 32 8 35 11 L53 45 Z"
        fill="url(#nb-blade-metal)"
        stroke="#273238"
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      {/* Right steel blade */}
      <path
        d="M50 48 L72 14 C74 10 68 8 65 11 L47 45 Z"
        fill="url(#nb-blade-metal)"
        stroke="#273238"
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      {/* Blade bevel edge shine */}
      <line x1={32} y1={14} x2={49} y2={44} stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
      <line x1={68} y1={14} x2={51} y2={44} stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
      {/* Left crimson handle */}
      <circle cx={34} cy={72} r={13} fill="none" stroke="#DC2626" strokeWidth={5.5} />
      <circle cx={34} cy={72} r={13} fill="none" stroke="#273238" strokeWidth={1.5} />
      {/* Right crimson handle */}
      <circle cx={66} cy={72} r={13} fill="none" stroke="#DC2626" strokeWidth={5.5} />
      <circle cx={66} cy={72} r={13} fill="none" stroke="#273238" strokeWidth={1.5} />
      {/* Shank connectors */}
      <path d="M47 48 L34 60" stroke="#DC2626" strokeWidth={5.5} strokeLinecap="round" />
      <path d="M53 48 L66 60" stroke="#DC2626" strokeWidth={5.5} strokeLinecap="round" />
      <path d="M47 48 L34 60" stroke="#273238" strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <path d="M53 48 L66 60" stroke="#273238" strokeWidth={1.5} strokeLinecap="round" fill="none" />
      {/* Pivot screw (brass/gold) */}
      <circle cx={50} cy={48} r={4.5} fill="#F59E0B" stroke="#273238" strokeWidth={1.8} />
      <circle cx={50} cy={48} r={1.5} fill="#273238" />
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
