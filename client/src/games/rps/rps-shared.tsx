import { forwardRef } from "react";
import type { ReactNode } from "react";
import type { ReactionRecvPayload, RpsChoice } from "@shared/types";
import FloatingReactionsLayer from "../ludo/FloatingReactionsLayer";
import EmojiRain from "../ludo/EmojiRain";
import Confetti from "../ludo/Confetti";
import type { ClientRpsState, RoundOutcome } from "./useRpsBoard";
import {
  CheckIcon,
  ChoiceIcon,
  DashIcon,
  EqualIcon,
  FistIcon,
  FlameIcon,
  HandshakeIcon,
  LockIcon,
  QuestionIcon,
  RefreshIcon,
  TargetIcon,
  TrophyIcon,
  XIcon,
  choiceAccent,
} from "./rps-icons";

/**
 * Presentational primitives + constants shared by the mobile and desktop RPS
 * shells. Nothing here holds game state — every piece takes plain props so it
 * renders identically wherever a shell drops it.
 */

export const LABEL: Record<RpsChoice, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};
export const TAGLINE: Record<RpsChoice, string> = {
  rock: "Crush scissors",
  paper: "Wrap rock",
  scissors: "Slice paper",
};
export const CHOICES: RpsChoice[] = ["rock", "paper", "scissors"];

/* ───────────────────────────── Frame + overlays ───────────────────────────── */

/**
 * The branded board surface (rounded panel, radial brand glow, top hairline).
 * Both shells wrap their content in it; the shell supplies its own padding /
 * spacing via `className` so the inner arrangement can differ per tier.
 */
export function RpsFrame({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--rim-soft)]
                  bg-surface-0 shadow-lift-3 ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% -5%, rgba(16,185,129,0.18), transparent 38%), " +
          "linear-gradient(180deg, var(--surface-1) 0%, var(--surface-0) 80%)",
      }}
    >
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px
                       bg-gradient-to-r from-transparent via-brand-300/70 to-transparent" />
      {children}
    </div>
  );
}

/** The full-viewport reaction / emoji-rain / confetti stack. Mounted once by
 *  whichever shell is live (the layers are `fixed`, so DOM position is moot). */
export function RpsOverlays({
  reactions,
  anchorOf,
  rains,
  confettiUntil,
}: {
  reactions: ReactionRecvPayload[];
  anchorOf: (playerId: string) => { left: number; top: number } | null;
  rains: { id: string; emoji: string }[];
  confettiUntil: number;
}) {
  return (
    <>
      <FloatingReactionsLayer reactions={reactions} anchorOf={anchorOf} playerColors={{}} />
      {rains.map((r) => (
        <EmojiRain key={r.id} emoji={r.emoji} />
      ))}
      {Date.now() < confettiUntil && <Confetti />}
    </>
  );
}

/* ───────────────────────────── Header ───────────────────────────── */

export function Header({
  round,
  target,
  match,
}: {
  round: number;
  target: number;
  match: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center w-9 h-9
                         rounded-md bg-brand-500/15 ring-1 ring-brand-400/40">
          <FistIcon className="w-5 h-5 text-brand-300" />
        </span>
        <div>
          <h2 className="font-display font-bold text-h2 text-ink-hi leading-none">
            Rock · Paper · Scissors
          </h2>
          <div className="text-caption text-ink-lo font-semibold mt-0.5">
            Match #{match}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Pill>
          <span className="text-ink-lo">Round</span>
          <span className="font-mono font-bold text-ink-hi tabular-nums">{round}</span>
        </Pill>
        <Pill tone="gold">
          <span className="text-gold-400/80">First to</span>
          <span className="font-mono font-bold text-gold-400 tabular-nums">{target}</span>
        </Pill>
      </div>
    </div>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1
                  text-caption font-bold border ${
                    tone === "gold"
                      ? "bg-gold-500/10 border-gold-500/30"
                      : "bg-surface-2 border-[var(--rim-soft)]"
                  }`}
    >
      {children}
    </span>
  );
}

/* ───────────────────────────── Player score card ───────────────────────────── */

interface PlayerScoreCardProps {
  name: string;
  score: number;
  target: number;
  streak: number;
  best: number;
  isSelf?: boolean;
  matchPoint?: boolean;
  accent: "brand" | "ruby";
  rightAligned?: boolean;
}

export const PlayerScoreCard = forwardRef<HTMLDivElement, PlayerScoreCardProps>(
  function PlayerScoreCard(props, ref) {
    const { name, score, target, streak, best, isSelf, matchPoint, accent, rightAligned } = props;
    const pct = Math.min(100, (score / target) * 100);

    const accentVar =
      accent === "brand" ? "var(--color-brand-500)" : "var(--color-player-1)";
    const accentLight =
      accent === "brand" ? "var(--color-brand-300)" : "#fca5a5";

    const dots = Math.max(3, Math.min(target, 5));

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden rounded-xl p-3.5 bg-surface-1
                    border transition-colors duration-180
                    ${matchPoint
                      ? "border-gold-500/70 shadow-glow-gold"
                      : "border-[var(--rim-soft)]"}`}
      >
        {/* Soft accent glow blob — purely decorative */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-28 opacity-25 blur-3xl"
          style={{
            [rightAligned ? "right" : "left"]: "-2.5rem",
            background: accentVar,
          }}
        />

        <div className={`flex items-center gap-2 ${rightAligned ? "flex-row-reverse text-right" : ""}`}>
          <Avatar name={name} color={accentVar} />
          <div className={`min-w-0 ${rightAligned ? "text-right" : ""}`}>
            <div
              className="font-display font-bold text-meta leading-none truncate"
              style={{ color: accentLight }}
            >
              {name}
              {isSelf && (
                <span className="text-ink-mute font-normal"> (you)</span>
              )}
            </div>
            <div className="text-caption text-ink-lo mt-0.5">
              Best streak {best}
            </div>
          </div>
          {matchPoint && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-pill
                            bg-gold-500 text-surface-0 px-2 py-0.5
                            text-caption font-black uppercase tracking-widest">
              <TargetIcon className="w-3 h-3" />
              Match pt
            </span>
          )}
        </div>

        <div className={`mt-3 flex items-baseline gap-2 ${rightAligned ? "flex-row-reverse" : ""}`}>
          <span className="font-mono font-bold tabular-nums text-ink-hi"
                style={{ fontSize: "clamp(2.25rem, 6vw, 3rem)", lineHeight: 1 }}>
            {score}
          </span>
          <span className="text-meta text-ink-lo">/ {target}</span>
          {streak >= 2 && (
            <span
              className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5
                          text-caption font-bold ml-auto streak-bob`}
              style={{
                background: "rgba(245,158,11,0.15)",
                color: "var(--color-gold-400)",
              }}
            >
              <FlameIcon className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{streak}</span>
            </span>
          )}
        </div>

        <div className="mt-3 h-2 rounded-pill bg-surface-3 overflow-hidden ring-1 ring-white/5">
          <div
            className="h-full rounded-pill transition-all duration-360 ease-out"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${accentVar}, ${accentLight})`,
            }}
          />
        </div>

        <div className="mt-2.5 flex items-center gap-1" aria-label={`Streak ${streak} of ${dots}`}>
          {Array.from({ length: dots }).map((_, i) => {
            const lit = i < Math.min(streak, dots);
            return (
              <span
                key={i}
                className={`h-1.5 flex-1 min-w-3 rounded-pill transition-colors duration-180`}
                style={{
                  background: lit ? "var(--color-gold-400)" : "var(--surface-3)",
                  boxShadow: lit ? "0 0 8px rgba(251,191,36,0.6)" : "none",
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }
);

function Avatar({ name, color }: { name: string; color: string }) {
  const initial = (name || "?").slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden
      className="inline-flex w-9 h-9 rounded-pill items-center justify-center
                 font-display font-bold text-meta text-surface-0 flex-shrink-0"
      style={{
        background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 60%, #000))`,
        boxShadow: `0 0 0 2px var(--surface-1), 0 0 0 3px ${color}55`,
      }}
    >
      {initial}
    </span>
  );
}

/* ───────────────────────────── Reveal Arena ───────────────────────────── */

type ArenaSize = "compact" | "spacious";

/**
 * Size presets for the arena. `compact` is the original phone/tablet sizing
 * (kept byte-for-byte); `spacious` is the desktop-only enlargement so the
 * board genuinely grows with the extra width instead of stretching.
 */
const ARENA_SIZE: Record<
  ArenaSize,
  { wrap: string; slot: string; icon: string; question: string; dash: string; vs: string }
> = {
  compact: {
    wrap: "min-h-[200px] sm:min-h-[220px] px-3 py-5 sm:py-7",
    slot: "h-24 w-24 sm:h-28 sm:w-28",
    icon: "h-16 w-16 sm:h-20 sm:w-20",
    question: "w-12 h-12 sm:w-14 sm:h-14",
    dash: "w-12 h-12",
    vs: "h-16 w-16 sm:h-20 sm:w-20 text-2xl sm:text-3xl",
  },
  spacious: {
    wrap: "min-h-[320px] px-6 py-10",
    slot: "h-36 w-36",
    icon: "h-24 w-24",
    question: "h-20 w-20",
    dash: "h-20 w-20",
    vs: "h-24 w-24 text-4xl",
  },
};

export function RevealArena({
  revealKey,
  myChoice,
  oppChoice,
  bothChose,
  meName,
  oppName,
  bannerOutcome,
  size = "compact",
}: {
  revealKey: number;
  myChoice: RpsChoice | null;
  oppChoice: RpsChoice | null;
  bothChose: boolean;
  meName: string;
  oppName: string;
  bannerOutcome: RoundOutcome | null;
  size?: ArenaSize;
}) {
  const s = ARENA_SIZE[size];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--rim-soft)]
                  flex items-center justify-around shadow-inner ${s.wrap}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 50%, rgba(245,158,11,0.10) 0%, transparent 42%), " +
          "linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)",
      }}
    >
      <span className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2
                       bg-gradient-to-b from-transparent via-ink-mute/60 to-transparent" />

      <HandSlot
        key={`me-${revealKey}`}
        choice={myChoice}
        hidden={false}
        revealed={!!myChoice}
        side="left"
        label={meName}
        sizes={s}
      />

      {/* VS pill — decorative chip between the two hand slots. Hide
          it the moment a round outcome banner is up, since the banner
          spans the full width and the pill would otherwise punch
          through "ROUND LOST" / "ROUND WIN" mid-text. */}
      {!bannerOutcome && (
        <div
          className={`rps-vs-pop relative z-10 flex items-center justify-center
                      rounded-pill bg-surface-0 font-display font-black text-gold-400
                      select-none border-2 border-gold-500/60 ${s.vs}`}
          style={{ boxShadow: "0 0 30px rgba(245,158,11,0.35), inset 0 0 12px rgba(245,158,11,0.15)" }}
        >
          VS
        </div>
      )}

      <HandSlot
        key={`opp-${revealKey}`}
        choice={oppChoice}
        hidden={!bothChose}
        revealed={bothChose}
        side="right"
        label={oppName}
        sizes={s}
      />

      {bannerOutcome && <OutcomeBanner outcome={bannerOutcome} />}
    </div>
  );
}

function OutcomeBanner({ outcome }: { outcome: RoundOutcome }) {
  const cfg =
    outcome === "you-win"
      ? { bg: "linear-gradient(135deg, #10b981, #047857)", label: "Round win", icon: <CheckIcon className="w-7 h-7" /> }
      : outcome === "you-lose"
      ? { bg: "linear-gradient(135deg, #ef4444, #b91c1c)", label: "Round lost", icon: <XIcon className="w-7 h-7" /> }
      : { bg: "linear-gradient(135deg, #f59e0b, #b45309)", label: "Tie — replay", icon: <EqualIcon className="w-7 h-7" /> };
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="rps-banner rounded-2xl px-6 py-3.5 sm:px-8 sm:py-4
                   inline-flex items-center gap-3 font-display font-black
                   text-2xl sm:text-3xl text-ink-hi shadow-lift-3"
        style={{ background: cfg.bg }}
      >
        {cfg.icon}
        <span className="uppercase tracking-wide">{cfg.label}</span>
      </div>
    </div>
  );
}

function HandSlot({
  choice,
  hidden,
  revealed,
  side,
  label,
  sizes,
}: {
  choice: RpsChoice | null;
  hidden: boolean;
  revealed: boolean;
  side: "left" | "right";
  label: string;
  sizes: (typeof ARENA_SIZE)[ArenaSize];
}) {
  const accent = choice ? choiceAccent(choice) : "rgba(148,163,184,0.28)";
  return (
    <div className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-2">
      <div
        className={`flex items-center justify-center rounded-2xl border-2 bg-surface-1 select-none
                    ${sizes.slot}
                    ${revealed && choice ? (side === "left" ? "rps-slam-left" : "rps-slam-right") : ""}`}
        style={{
          borderColor: accent,
          boxShadow: choice
            ? `0 0 32px ${accent}55, inset 0 0 0 1px rgba(255,255,255,0.04)`
            : "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {hidden ? (
          <QuestionIcon className={`${sizes.question} text-ink-mute`} />
        ) : choice ? (
          <ChoiceIcon choice={choice} className={sizes.icon} />
        ) : (
          <DashIcon className={`${sizes.dash} text-ink-mute`} />
        )}
      </div>
      <div className="max-w-full truncate text-caption font-semibold text-ink-lo">
        {label}
        {choice && !hidden && (
          <span className="text-ink-mid"> · {LABEL[choice]}</span>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Choice cards ───────────────────────────── */

export function ChoiceRow({
  myChoice,
  bothChose,
  onPick,
}: {
  myChoice: RpsChoice | null;
  bothChose: boolean;
  onPick: (c: RpsChoice) => void;
}) {
  const status = myChoice
    ? bothChose
      ? "Revealing…"
      : "Locked in — waiting for opponent…"
    : "Pick your move";
  return (
    <div className="space-y-3">
      <div className="text-center text-meta text-ink-mid font-semibold">{status}</div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {CHOICES.map((c) => (
          <ChoiceCard
            key={c}
            choice={c}
            selected={myChoice === c}
            disabled={!!myChoice}
            onClick={() => onPick(c)}
          />
        ))}
      </div>
    </div>
  );
}

function ChoiceCard({
  choice,
  selected,
  disabled,
  onClick,
}: {
  choice: RpsChoice;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const accent = choiceAccent(choice);
  // Don't half-dim a card that's currently the user's choice
  const inactive = disabled && !selected;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      data-selected={selected || undefined}
      className={`group relative isolate overflow-hidden rounded-2xl p-3 sm:p-4
                  min-h-[8.5rem] sm:min-h-[9.5rem]
                  border-2 bg-surface-1 select-none
                  transition-all duration-180 ease-out-quart
                  ${inactive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  ${!disabled ? "hover:-translate-y-1 hover:shadow-lift-2 active:translate-y-0 active:scale-[0.98]" : ""}
                  ${selected ? "rps-pulse" : ""}`}
      style={{
        borderColor: selected ? "var(--color-gold-400)" : "var(--rim-soft)",
        boxShadow: selected
          ? `0 0 28px ${accent}55, inset 0 0 0 1px var(--color-gold-400)`
          : undefined,
      }}
      title={LABEL[choice]}
    >
      {/* Decorative gradient halo behind the icon, intensifies on hover/selected */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 opacity-0
                    transition-opacity duration-240
                    ${!disabled ? "group-hover:opacity-100" : ""}
                    ${selected ? "opacity-100" : ""}`}
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${accent}33 0%, transparent 60%)`,
        }}
      />

      {selected && (
        <span
          className="absolute right-2.5 top-2.5 inline-flex items-center gap-1
                     rounded-pill bg-gold-500 text-surface-0 px-2 py-0.5
                     text-[10px] font-black uppercase tracking-widest"
        >
          <LockIcon className="w-3 h-3" />
          Locked
        </span>
      )}

      <div className="relative flex flex-col items-center gap-2">
        <span
          className="inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center
                     rounded-2xl bg-surface-0 ring-1 ring-[var(--rim-soft)]"
          style={{
            boxShadow: selected ? `inset 0 0 0 1px ${accent}55` : undefined,
          }}
          aria-hidden
        >
          <ChoiceIcon choice={choice} className="h-10 w-10 sm:h-12 sm:w-12" />
        </span>
        <span className="font-display font-black text-body text-ink-hi">
          {LABEL[choice]}
        </span>
        <span className="text-caption text-ink-lo">{TAGLINE[choice]}</span>
      </div>
    </button>
  );
}

/* ───────────────────────────── History strip ───────────────────────────── */

export function HistoryStrip({ state, myId }: { state: ClientRpsState; myId: string }) {
  const cells = state.history.slice(-12);
  if (cells.length === 0) {
    return (
      <div className="text-caption text-ink-mute text-center">
        Round history will appear here as you play.
      </div>
    );
  }
  return (
    <div>
      <div className="text-caption uppercase text-ink-lo mb-1.5 tracking-widest font-bold">
        Last rounds
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cells.map((h, i) => {
          const win = h.winnerId === myId;
          const lose = h.winnerId && h.winnerId !== myId;
          const tie = !h.winnerId;
          const bg = win
            ? "var(--color-success)"
            : lose
            ? "var(--color-danger)"
            : "var(--color-warning)";
          return (
            <span
              key={i}
              className="w-7 h-7 rounded-md flex items-center justify-center
                         text-caption font-black text-surface-0"
              style={{ background: bg }}
              title={`Round ${h.round}: ${tie ? "tie" : win ? "won" : "lost"}`}
            >
              {tie ? "=" : win ? "W" : "L"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────────── End panel ───────────────────────────── */

export function EndPanel({
  winner,
  youWon,
  finalScores,
  ties,
  onRematch,
}: {
  winner: string | null;
  youWon: boolean;
  finalScores: { me: number; opp: number };
  ties: number;
  onRematch: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-6 text-center space-y-3 border border-[var(--rim-soft)]"
      style={{
        background: youWon
          ? "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(4,120,87,0.6))"
          : "linear-gradient(135deg, rgba(30,41,59,0.65), rgba(2,6,23,0.85))",
        boxShadow: youWon ? "0 0 40px rgba(16,185,129,0.4)" : undefined,
      }}
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-pill
                      bg-gold-500/15 ring-2 ring-gold-500/60">
        {youWon ? (
          <TrophyIcon className="w-9 h-9 text-gold-400" />
        ) : (
          <HandshakeIcon className="w-9 h-9 text-ink-mid" />
        )}
      </div>
      <div className="font-display font-black text-h1 text-ink-hi">
        {winner ? `${winner} wins the match` : "Match over"}
      </div>
      <div className="text-meta text-ink-mid font-semibold">
        Final{" "}
        <span className="font-mono font-bold text-ink-hi tabular-nums">{finalScores.me}</span>
        <span className="text-ink-lo"> – </span>
        <span className="font-mono font-bold text-ink-hi tabular-nums">{finalScores.opp}</span>
        {ties > 0 && (
          <span className="text-ink-lo">
            {" "}· {ties} tie{ties === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <button
        onClick={onRematch}
        className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400
                   active:translate-y-px text-surface-0 rounded-md px-6 py-2.5
                   font-display font-bold text-meta shadow-glow-brand
                   transition-all duration-180"
      >
        <RefreshIcon className="w-4 h-4" />
        Rematch
      </button>
    </div>
  );
}
