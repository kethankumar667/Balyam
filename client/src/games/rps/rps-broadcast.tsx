import { useEffect, useState, type ReactNode } from "react";
import type { RpsChoice } from "@shared/types";
import type { ClientRpsState, RoundOutcome } from "./useRpsBoard";
import {
  PRO,
  PRO_SIDES,
  ProAvatar,
  ProChip,
  ProIconButton,
  ProLabel,
  ProLive,
  ProPanel,
  ProPips,
  IconClose,
  IconFlame,
  IconHelp,
  IconSkin,
  IconTrophy,
  type ProSide,
} from "../pro/pro-kit";

/**
 * ROCK PAPER SCISSORS — broadcast skin.
 *
 * The esports-duel counterpart to rps-notebook.tsx, consuming the exact same
 * `useRpsBoard` model. Nothing here holds state or talks to a socket; swapping
 * skins is purely a change of which of these two modules the shell renders.
 *
 * Composition follows a fight-card broadcast: the two competitors face each
 * other across a centre column, scores read as big tabular numerals with pips
 * showing distance to the target, and the throw reveal happens on a raised
 * centre stage rather than inline with the controls.
 */

/* ── throw glyphs ────────────────────────────────────────────────────────── */

const THROW_ACCENT: Record<RpsChoice, string> = {
  rock: "#9FB3CC",
  paper: "#5AA9F0",
  scissors: "#F5C451",
};

export const THROW_LABEL: Record<RpsChoice, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};

/** Keyboard hint — matches the R/P/S shortcuts wired in useRpsBoard. */
const THROW_KEY: Record<RpsChoice, string> = { rock: "R", paper: "P", scissors: "S" };

/**
 * Broadcast throw marks. Deliberately geometric rather than the notebook's
 * sketched hands: at arena size a heavy silhouette reads instantly across the
 * room, which is the whole job of a broadcast graphic.
 */
export function ProThrow({ choice, size = 64 }: { choice: RpsChoice; size?: number }) {
  const a = THROW_ACCENT[choice];
  const common = {
    fill: "none",
    stroke: a,
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (choice === "rock") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r="13" fill={`${a}1F`} stroke={a} strokeWidth="2.4" />
        <path d="M17 20c1.6-3 4-4.5 7-4.5M31 26c-1.2 3.4-3.8 5.4-7.2 5.6" {...common} />
      </svg>
    );
  }
  if (choice === "paper") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
        <path d="M15 11h13l6 6v20H15V11Z" fill={`${a}1F`} stroke={a} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M28 11v6h6" {...common} />
        <path d="M20 24h9M20 30h7" {...common} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="17" cy="34" r="5" fill={`${a}1F`} stroke={a} strokeWidth="2.4" />
      <circle cx="31" cy="34" r="5" fill={`${a}1F`} stroke={a} strokeWidth="2.4" />
      <path d="M20.5 30 33 12M27.5 30 15 12" {...common} />
    </svg>
  );
}

/* ── top bar ─────────────────────────────────────────────────────────────── */

export function ProTopBar({
  match,
  round,
  target,
  live,
  onLeave,
  onHelp,
  onSkin,
}: {
  match: number;
  round: number;
  target: number;
  live: boolean;
  onLeave?: () => void;
  onHelp?: () => void;
  onSkin?: () => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5"
      style={{ borderBottom: `1px solid ${PRO.line}`, background: "rgba(4,10,20,0.55)" }}
    >
      {/* Wordmark */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md"
          style={{ background: `linear-gradient(150deg, ${PRO.gold}, ${PRO.goldDeep})`, color: "#2A1D05" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
            <path d="M5 8h6M5 12h4M5 16h7" />
            <circle cx="17" cy="12" r="3" />
          </svg>
        </div>
        <div className="min-w-0">
          <div
            className="truncate text-[12px] font-black uppercase leading-none"
            style={{ letterSpacing: "0.18em", color: PRO.ink }}
          >
            Rock&nbsp;Paper&nbsp;Scissors
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase leading-none" style={{ letterSpacing: "0.14em", color: PRO.inkLo }}>
            Match {match}
          </div>
        </div>
      </div>

      {/* Centre: live context */}
      <div className="flex items-center gap-2">
        {live && <ProLive />}
        <ProChip>Round {round}</ProChip>
        <ProChip tone="gold">
          <IconTrophy size={11} />
          First to {target}
        </ProChip>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {onSkin && (
          <ProIconButton title="Switch skin" onClick={onSkin}>
            <IconSkin size={15} />
          </ProIconButton>
        )}
        {onHelp && (
          <ProIconButton title="How to play" onClick={onHelp}>
            <IconHelp size={15} />
          </ProIconButton>
        )}
        {onLeave && (
          <ProIconButton title="Leave table" onClick={onLeave}>
            <IconClose size={15} />
          </ProIconButton>
        )}
      </div>
    </div>
  );
}

/* ── competitor card ─────────────────────────────────────────────────────── */

export function ProPlayerCard({
  name,
  avatar,
  isSelf,
  score,
  target,
  streak,
  best,
  matchPoint,
  side,
  align = "left",
  locked,
  cardRef,
  compact = false,
}: {
  name: string;
  avatar?: string;
  isSelf?: boolean;
  score: number;
  target: number;
  streak: number;
  best: number;
  matchPoint: boolean;
  side: ProSide;
  align?: "left" | "right";
  /** They have thrown this round (hidden until reveal). */
  locked: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
  compact?: boolean;
}) {
  const right = align === "right";
  return (
    <ProPanel glow={matchPoint} className={compact ? "p-3" : ""}>
      <div ref={cardRef}>
        <div className={`flex items-center gap-3 ${right ? "flex-row-reverse text-right" : ""}`}>
          <ProAvatar name={name} avatar={avatar} side={side} size={compact ? 34 : 44} ring={matchPoint} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5" style={{ justifyContent: right ? "flex-end" : "flex-start" }}>
              <span className="truncate text-[13px] font-extrabold" style={{ color: PRO.ink }}>
                {name}
              </span>
              {isSelf && <ProChip>You</ProChip>}
            </div>
            <div
              className={`mt-1.5 flex items-center gap-2 ${right ? "justify-end" : ""}`}
            >
              <span
                className={`${compact ? "text-[26px]" : "text-[34px]"} font-black leading-none tabular-nums`}
                style={{ color: matchPoint ? PRO.gold : PRO.ink }}
              >
                {score}
              </span>
              <span className="text-[11px] font-bold" style={{ color: PRO.inkLo }}>
                / {target}
              </span>
            </div>
          </div>
        </div>

        <div className={`mt-3 flex items-center gap-2 ${right ? "justify-end" : ""}`}>
          <ProPips total={target} filled={score} accent={matchPoint ? PRO.gold : side.base} size={compact ? 6 : 7} />
        </div>

        <div className={`mt-3 flex flex-wrap items-center gap-1.5 ${right ? "justify-end" : ""}`}>
          {matchPoint && <ProChip tone="gold">Match point</ProChip>}
          {streak >= 2 && (
            <ProChip tone="live">
              <IconFlame size={11} />
              {streak} streak
            </ProChip>
          )}
          {best >= 2 && <ProChip>Best {best}</ProChip>}
          {locked && <ProChip tone="info">Locked in</ProChip>}
        </div>
      </div>
    </ProPanel>
  );
}

/* ── arena ───────────────────────────────────────────────────────────────── */

/** Hidden-throw placeholder: a sealed plate, not an empty hole. */
function SealedPlate({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect x="10" y="10" width="28" height="28" rx="7" fill="rgba(255,255,255,0.05)" stroke={PRO.lineStrong} strokeWidth="2" strokeDasharray="4 4" />
      <path d="M20 24h8" stroke={PRO.inkLo} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ThrowPlate({
  choice,
  revealed,
  side,
  size,
  label,
}: {
  choice: RpsChoice | null;
  revealed: boolean;
  side: ProSide;
  size: number;
  label: string;
}) {
  const show = revealed && choice;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="grid place-items-center rounded-2xl transition-all duration-300"
        style={{
          width: size * 1.6,
          height: size * 1.6,
          background: show
            ? `radial-gradient(circle at 50% 38%, ${side.base}26, rgba(255,255,255,0.03) 70%)`
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${show ? `${side.base}66` : PRO.line}`,
          boxShadow: show ? `0 0 26px ${side.base}33` : "none",
        }}
      >
        {show ? <ProThrow choice={choice} size={size} /> : <SealedPlate size={size} />}
      </div>
      <ProLabel color={PRO.inkLo}>{show ? THROW_LABEL[choice] : label}</ProLabel>
    </div>
  );
}

export function ProArena({
  myName,
  oppName,
  myChoice,
  oppChoice,
  bothChose,
  revealKey,
  bannerOutcome,
  mySide,
  oppSide,
  compact = false,
}: {
  myName: string;
  oppName: string;
  myChoice: RpsChoice | null;
  oppChoice: RpsChoice | null;
  bothChose: boolean;
  revealKey: number;
  bannerOutcome: RoundOutcome | null;
  mySide: ProSide;
  oppSide: ProSide;
  compact?: boolean;
}) {
  // The arena is the hero of the desktop composition — undersized glyphs left
  // it reading as a small plate adrift in the middle of a wide screen.
  const glyph = compact ? 40 : 76;
  const banner =
    bannerOutcome === "you-win"
      ? { text: "Round won", tone: PRO.win }
      : bannerOutcome === "you-lose"
      ? { text: "Round lost", tone: PRO.loss }
      : bannerOutcome === "tie"
      ? { text: "Drawn", tone: PRO.inkMid }
      : null;

  return (
    <ProPanel padded={false} className={compact ? "px-3 py-4" : "px-6 py-6"}>
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        <ThrowPlate
          choice={myChoice}
          // Own throw is visible to its owner immediately — only the OPPONENT's
          // stays sealed until both are in, which is what keeps the round fair.
          revealed={!!myChoice}
          side={mySide}
          size={glyph}
          label={myChoice ? "Ready" : "Waiting"}
        />

        {/* Centre diamond */}
        <div key={revealKey} className="flex flex-col items-center gap-1.5">
          <div
            className="grid place-items-center rounded-lg text-[11px] font-black"
            style={{
              width: compact ? 30 : 38,
              height: compact ? 30 : 38,
              transform: "rotate(45deg)",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${PRO.lineStrong}`,
              color: PRO.inkMid,
              letterSpacing: "0.06em",
            }}
          >
            <span style={{ transform: "rotate(-45deg)" }}>VS</span>
          </div>
        </div>

        <ThrowPlate
          choice={oppChoice}
          revealed={bothChose}
          side={oppSide}
          size={glyph}
          label={oppChoice ? "Locked in" : "Waiting"}
        />
      </div>

      {/* Names under the plates */}
      <div className="mt-3 flex items-center justify-center gap-4 sm:gap-8">
        <div className="w-[104px] truncate text-center text-[11px] font-bold" style={{ color: PRO.inkMid }}>
          {myName}
        </div>
        <div style={{ width: compact ? 30 : 38 }} />
        <div className="w-[104px] truncate text-center text-[11px] font-bold" style={{ color: PRO.inkMid }}>
          {oppName}
        </div>
      </div>

      {/* Result banner — fixed-height slot so the arena never jumps as it
          appears and clears between rounds. */}
      <div className="mt-3 flex h-7 items-center justify-center">
        {banner && (
          <div
            key={revealKey}
            className="rounded-full px-4 py-1.5 text-[11px] font-black uppercase"
            style={{
              letterSpacing: "0.16em",
              color: banner.tone,
              background: `${banner.tone}1A`,
              border: `1px solid ${banner.tone}55`,
            }}
          >
            {banner.text}
          </div>
        )}
      </div>
    </ProPanel>
  );
}

/* ── controls ────────────────────────────────────────────────────────────── */

export function ProChoiceRow({
  myChoice,
  bothChose,
  onPick,
  compact = false,
}: {
  myChoice: RpsChoice | null;
  bothChose: boolean;
  onPick: (c: RpsChoice) => void;
  compact?: boolean;
}) {
  const locked = !!myChoice || bothChose;
  return (
    <div>
      <ProLabel className="mb-2">{locked ? "Throw locked" : "Make your throw"}</ProLabel>
      <div className="grid grid-cols-3 gap-2.5">
        {(["rock", "paper", "scissors"] as RpsChoice[]).map((c) => {
          const chosen = myChoice === c;
          const accent = THROW_ACCENT[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => onPick(c)}
              disabled={locked}
              aria-pressed={chosen}
              className="group relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition active:scale-[0.97] disabled:cursor-not-allowed"
              style={{
                background: chosen
                  ? `linear-gradient(168deg, ${accent}2E, ${accent}0F)`
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${chosen ? `${accent}AA` : PRO.line}`,
                boxShadow: chosen ? `0 0 20px ${accent}33` : "none",
                opacity: locked && !chosen ? 0.35 : 1,
              }}
            >
              <ProThrow choice={c} size={compact ? 34 : 42} />
              <span
                className="text-[10px] font-extrabold uppercase"
                style={{ letterSpacing: "0.14em", color: chosen ? accent : PRO.inkMid }}
              >
                {THROW_LABEL[c]}
              </span>
              {!compact && (
                <span
                  className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded text-[9px] font-black"
                  style={{ background: "rgba(255,255,255,0.07)", color: PRO.inkLo }}
                >
                  {THROW_KEY[c]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── history ─────────────────────────────────────────────────────────────── */

export function ProHistoryStrip({
  state,
  myId,
  max = 12,
}: {
  state: ClientRpsState;
  myId: string;
  max?: number;
}) {
  const rounds = state.history.slice(-max);
  if (rounds.length === 0) {
    return (
      <div className="py-3 text-center text-[11px] font-semibold" style={{ color: PRO.inkLo }}>
        No rounds played yet
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {rounds.map((r) => {
        const outcome = !r.winnerId ? "tie" : r.winnerId === myId ? "win" : "loss";
        const tone =
          outcome === "win" ? PRO.win : outcome === "loss" ? PRO.loss : PRO.inkLo;
        const mark = outcome === "win" ? "W" : outcome === "loss" ? "L" : "D";
        return (
          <div
            key={r.round}
            title={`Round ${r.round}`}
            className="grid h-6 w-6 place-items-center rounded-md text-[10px] font-black tabular-nums"
            style={{ background: `${tone}1F`, color: tone, border: `1px solid ${tone}44` }}
          >
            {mark}
          </div>
        );
      })}
    </div>
  );
}

/* ── result ──────────────────────────────────────────────────────────────── */

export function ProResultCard({
  won,
  myName,
  oppName,
  myScore,
  oppScore,
  rounds,
  onClose,
}: {
  won: boolean;
  myName: string;
  oppName: string;
  myScore: number;
  oppScore: number;
  rounds: number;
  onClose?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(3,8,16,0.82)" }}>
      <ProPanel glow className="w-full max-w-[420px] text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full" style={{ background: won ? `${PRO.gold}22` : "rgba(255,255,255,0.06)", color: won ? PRO.gold : PRO.inkMid, border: `1px solid ${won ? `${PRO.gold}66` : PRO.line}` }}>
          <IconTrophy size={22} />
        </div>
        <ProLabel className="mb-2">Match complete</ProLabel>
        <div className="text-[22px] font-black" style={{ color: won ? PRO.gold : PRO.ink }}>
          {won ? "You win" : `${oppName} wins`}
        </div>

        <div className="my-5 flex items-center justify-center gap-5">
          <div className="text-center">
            <div className="text-[34px] font-black leading-none tabular-nums" style={{ color: won ? PRO.gold : PRO.ink }}>
              {myScore}
            </div>
            <div className="mt-1.5 max-w-[110px] truncate text-[11px] font-bold" style={{ color: PRO.inkLo }}>
              {myName}
            </div>
          </div>
          <div className="text-[13px] font-black" style={{ color: PRO.inkLo }}>—</div>
          <div className="text-center">
            <div className="text-[34px] font-black leading-none tabular-nums" style={{ color: !won ? PRO.gold : PRO.ink }}>
              {oppScore}
            </div>
            <div className="mt-1.5 max-w-[110px] truncate text-[11px] font-bold" style={{ color: PRO.inkLo }}>
              {oppName}
            </div>
          </div>
        </div>

        <ProChip>{rounds} rounds played</ProChip>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl py-2.5 text-[12px] font-extrabold uppercase transition active:scale-[0.98]"
            style={{
              letterSpacing: "0.14em",
              background: `linear-gradient(168deg, ${PRO.gold}, ${PRO.goldDeep})`,
              color: "#2A1D05",
            }}
          >
            Continue
          </button>
        )}
      </ProPanel>
    </div>
  );
}

/* ── layout helper ───────────────────────────────────────────────────────── */

/** Titled section wrapper used by both shells' side rails. */
export function ProSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <ProLabel className="mb-2">{title}</ProLabel>
      {children}
    </div>
  );
}

/** Side accents: index 0 for the local player, 1 for the opponent. */
export const MY_SIDE = PRO_SIDES[0];
export const OPP_SIDE = PRO_SIDES[1];

/** Count-up round clock shown while a throw is pending. */
export function ProRoundClock({ deadline, active }: { deadline: number | null; active: boolean }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline || !active) {
      setLeft(null);
      return;
    }
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline, active]);
  if (left == null) return null;
  const urgent = left <= 5;
  return (
    <ProChip tone={urgent ? "live" : "neutral"}>
      <span className="tabular-nums">{left}s</span>
    </ProChip>
  );
}
