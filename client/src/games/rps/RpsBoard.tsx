import { forwardRef, useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  Player,
  ReactionRecvPayload,
  RpsChoice,
  RpsState,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import FloatingReactionsLayer from "../ludo/FloatingReactionsLayer";
import EmojiRain from "../ludo/EmojiRain";
import Confetti from "../ludo/Confetti";
import InlineRoomRail from "../../components/InlineRoomRail";

const LABEL: Record<RpsChoice, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};
const TAGLINE: Record<RpsChoice, string> = {
  rock: "Crush scissors",
  paper: "Wrap rock",
  scissors: "Slice paper",
};
const CHOICES: RpsChoice[] = ["rock", "paper", "scissors"];

interface ClientRpsState extends RpsState {
  currentChoices: Partial<Record<string, RpsChoice>>;
}

type RoundOutcome = "you-win" | "you-lose" | "tie";

export default function RpsBoard({
  state,
  players,
  selfId,
  messages,
  roomCode,
  roomPhase,
}: {
  state: ClientRpsState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
}) {
  const opponent = players.find((p) => p.id !== selfId);
  const me = players.find((p) => p.id === selfId);
  const myId = selfId ?? "";

  const myChoice = (selfId && state.currentChoices[selfId]) || null;
  const oppChoice = (opponent && state.currentChoices[opponent.id]) || null;
  const bothChose = !!myChoice && !!oppChoice;
  const lastResult = state.history[state.history.length - 1];

  function pick(c: RpsChoice) {
    if (myChoice || state.isOver) return;
    getSocket().emit("game:move", { type: "choose", data: { choice: c } });
  }

  function rematch() {
    getSocket().emit("game:move", { type: "rematch" });
  }

  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }

  // Reveal + outcome banner (driven by state.lastRevealTs) -------------------
  const [revealKey, setRevealKey] = useState(0);
  const [bannerOutcome, setBannerOutcome] = useState<RoundOutcome | null>(null);
  const prevRevealRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state.lastRevealTs || state.lastRevealTs === prevRevealRef.current) return;
    prevRevealRef.current = state.lastRevealTs;
    setRevealKey((k) => k + 1);
    if (lastResult) {
      const outcome: RoundOutcome = !lastResult.winnerId
        ? "tie"
        : lastResult.winnerId === myId
        ? "you-win"
        : "you-lose";
      setBannerOutcome(outcome);
      const t = setTimeout(() => setBannerOutcome(null), 1300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastRevealTs]);

  // Reactions + emoji rain ---------------------------------------------------
  const [reactions, setReactions] = useState<ReactionRecvPayload[]>([]);
  const [rains, setRains] = useState<{ id: string; emoji: string }[]>([]);
  const playerCardRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const socket = getSocket();
    const onReaction = (r: ReactionRecvPayload) => {
      setReactions((prev) => [...prev, r]);
      setRains((prev) => [...prev.slice(-2), { id: r.id, emoji: r.emoji }]);
      setTimeout(() => setReactions((p) => p.filter((x) => x.id !== r.id)), 2000);
      setTimeout(() => setRains((p) => p.filter((x) => x.id !== r.id)), 3200);
    };
    socket.on("room:reaction", onReaction);
    return () => {
      socket.off("room:reaction", onReaction);
    };
  }, []);

  function reactionAnchor(playerId: string): { left: number; top: number } | null {
    const el = playerCardRefs.current.get(playerId);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: ((r.left + r.width / 2) / window.innerWidth) * 100,
      top: (r.top / window.innerHeight) * 100,
    };
  }

  // Streak + score helpers ---------------------------------------------------
  const target = state.target;
  const myScore = state.scores[myId] ?? 0;
  const oppScore = opponent ? state.scores[opponent.id] ?? 0 : 0;
  const myStreak = state.streak[myId] ?? 0;
  const oppStreak = opponent ? state.streak[opponent.id] ?? 0 : 0;
  const myMatchPoint = myScore === target - 1;
  const oppMatchPoint = oppScore === target - 1;

  // Confetti when this player wins the match
  const [confettiUntil, setConfettiUntil] = useState(0);
  const prevWinnerRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.winnerId && state.winnerId !== prevWinnerRef.current) {
      prevWinnerRef.current = state.winnerId;
      if (state.winnerId === myId) {
        setConfettiUntil(Date.now() + 3400);
      }
    } else if (!state.winnerId) {
      prevWinnerRef.current = null;
    }
  }, [state.winnerId, myId]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-3 sm:p-5 space-y-4
                 border border-[var(--rim-soft)] bg-surface-0 shadow-lift-3"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% -5%, rgba(16,185,129,0.18), transparent 38%), " +
          "linear-gradient(180deg, var(--surface-1) 0%, var(--surface-0) 80%)",
      }}
    >
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px
                       bg-gradient-to-r from-transparent via-brand-300/70 to-transparent" />

      <Header round={state.round} target={target} match={state.matchNumber} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlayerScoreCard
          ref={(el) => {
            if (el) playerCardRefs.current.set(myId, el);
            else playerCardRefs.current.delete(myId);
          }}
          name={me?.name ?? "You"}
          isSelf
          score={myScore}
          target={target}
          streak={myStreak}
          best={state.bestStreak[myId] ?? 0}
          matchPoint={myMatchPoint && !state.isOver}
          accent="brand"
        />
        <PlayerScoreCard
          ref={(el) => {
            if (opponent) {
              if (el) playerCardRefs.current.set(opponent.id, el);
              else playerCardRefs.current.delete(opponent.id);
            }
          }}
          name={opponent?.name ?? "Opponent"}
          score={oppScore}
          target={target}
          streak={oppStreak}
          best={opponent ? state.bestStreak[opponent.id] ?? 0 : 0}
          matchPoint={oppMatchPoint && !state.isOver}
          accent="ruby"
          rightAligned
        />
      </div>

      <RevealArena
        revealKey={revealKey}
        myChoice={myChoice}
        oppChoice={oppChoice}
        bothChose={bothChose}
        meName={me?.name ?? "You"}
        oppName={opponent?.name ?? "Opponent"}
        bannerOutcome={bannerOutcome}
      />

      {state.isOver ? (
        <EndPanel
          winner={state.winnerId ? nameOf(state.winnerId) : null}
          youWon={state.winnerId === myId}
          finalScores={{ me: myScore, opp: oppScore }}
          ties={state.ties}
          onRematch={rematch}
        />
      ) : (
        <ChoiceRow myChoice={myChoice} bothChose={bothChose} onPick={pick} />
      )}

      <HistoryStrip state={state} myId={myId} />

      <InlineRoomRail
        code={roomCode}
        game="rps"
        phase={roomPhase}
        players={players}
        selfId={selfId}
        messages={messages}
      />

      <FloatingReactionsLayer
        reactions={reactions}
        anchorOf={reactionAnchor}
        playerColors={{}}
      />
      {rains.map((r) => (
        <EmojiRain key={r.id} emoji={r.emoji} />
      ))}
      {Date.now() < confettiUntil && <Confetti />}
    </div>
  );
}

/* ───────────────────────────── Header ───────────────────────────── */

function Header({
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
  children: React.ReactNode;
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

const PlayerScoreCard = forwardRef<HTMLDivElement, PlayerScoreCardProps>(
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

function RevealArena({
  revealKey,
  myChoice,
  oppChoice,
  bothChose,
  meName,
  oppName,
  bannerOutcome,
}: {
  revealKey: number;
  myChoice: RpsChoice | null;
  oppChoice: RpsChoice | null;
  bothChose: boolean;
  meName: string;
  oppName: string;
  bannerOutcome: RoundOutcome | null;
}) {
  return (
    <div
      className="relative min-h-[200px] sm:min-h-[220px] overflow-hidden rounded-2xl
                 border border-[var(--rim-soft)] px-3 py-5 sm:py-7
                 flex items-center justify-around shadow-inner"
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
      />

      {/* VS pill — decorative chip between the two hand slots. Hide
          it the moment a round outcome banner is up, since the banner
          spans the full width and the pill would otherwise punch
          through "ROUND LOST" / "ROUND WIN" mid-text. */}
      {!bannerOutcome && (
        <div
          className="rps-vs-pop relative z-10 flex h-16 w-16 sm:h-20 sm:w-20
                     items-center justify-center rounded-pill bg-surface-0
                     font-display font-black text-2xl sm:text-3xl text-gold-400
                     select-none border-2 border-gold-500/60"
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
}: {
  choice: RpsChoice | null;
  hidden: boolean;
  revealed: boolean;
  side: "left" | "right";
  label: string;
}) {
  const accent = choice ? choiceAccent(choice) : "rgba(148,163,184,0.28)";
  return (
    <div className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-2">
      <div
        className={`flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center
                    rounded-2xl border-2 bg-surface-1 select-none
                    ${revealed && choice ? (side === "left" ? "rps-slam-left" : "rps-slam-right") : ""}`}
        style={{
          borderColor: accent,
          boxShadow: choice
            ? `0 0 32px ${accent}55, inset 0 0 0 1px rgba(255,255,255,0.04)`
            : "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {hidden ? (
          <QuestionIcon className="w-12 h-12 sm:w-14 sm:h-14 text-ink-mute" />
        ) : choice ? (
          <ChoiceIcon choice={choice} className="h-16 w-16 sm:h-20 sm:w-20" />
        ) : (
          <DashIcon className="w-12 h-12 text-ink-mute" />
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

function choiceAccent(choice: RpsChoice): string {
  if (choice === "rock") return "#94a3b8";
  if (choice === "paper") return "#38bdf8";
  return "#f59e0b";
}

/* ───────────────────────────── Choice cards ───────────────────────────── */

function ChoiceRow({
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

function HistoryStrip({ state, myId }: { state: ClientRpsState; myId: string }) {
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

function EndPanel({
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

/* ───────────────────────────── Icons ───────────────────────────── */

type IconProps = { className?: string };

function ChoiceIcon({ choice, className = "h-12 w-12" }: { choice: RpsChoice; className?: string }) {
  const accent = choiceAccent(choice);
  if (choice === "rock") {
    return (
      <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
        <path d="M18 43c0-17 11-29 27-29 12 0 22 8 22 22 0 18-12 31-29 31-12 0-20-9-20-24Z" fill="#e2e8f0" stroke="#334155" strokeWidth="5" />
        <path d="M27 36c2-9 8-14 17-14M33 55c11 2 20-4 24-15" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
        <circle cx="51" cy="31" r="4" fill={accent} />
      </svg>
    );
  }
  if (choice === "paper") {
    return (
      <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
        <path d="M23 12h28l13 13v43H23V12Z" fill="#f8fafc" stroke="#0ea5e9" strokeWidth="5" strokeLinejoin="round" />
        <path d="M50 13v14h14M32 39h22M32 50h18M32 28h11" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <circle cx="27" cy="55" r="11" fill="#f8fafc" stroke="#92400e" strokeWidth="5" />
      <circle cx="53" cy="55" r="11" fill="#f8fafc" stroke="#92400e" strokeWidth="5" />
      <path d="M34 48 59 15M46 48 21 15" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
      <path d="M40 39 31 27M40 39l9-12" fill="none" stroke="#fff7ed" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FistIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 4c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v3h2c.6 0 1 .4 1 1v3h1c.6 0 1 .4 1 1v5c0 2.8-2.2 5-5 5h-4c-2.8 0-5-2.2-5-5v-7c0-.6.4-1 1-1h2V4Z" />
    </svg>
  );
}
function FlameIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2s4 4 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s-3 1-4 5a7 7 0 0 0 14 0c0-7-7-11-7-11Z" />
    </svg>
  );
}
function TargetIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function EqualIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className} aria-hidden>
      <path d="M5 9h14M5 15h14" />
    </svg>
  );
}
function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6 10V8a6 6 0 1 1 12 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm2 0h8V8a4 4 0 1 0-8 0v2Z" />
    </svg>
  );
}
function QuestionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}
function DashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className} aria-hidden>
      <path d="M6 12h12" />
    </svg>
  );
}
function TrophyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M5 4h14v3a4 4 0 0 1-4 4h-.3a4 4 0 0 1-5.4 0H9a4 4 0 0 1-4-4V4Zm-2 1h2v2a6 6 0 0 0 1 3.3A3 3 0 0 1 3 8V5Zm18 0h-2v2a6 6 0 0 1-1 3.3A3 3 0 0 0 21 8V5ZM10 13h4l-.5 4H17v2H7v-2h3.5L10 13Z" />
    </svg>
  );
}
function HandshakeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3L15 8.5l-2 2-1.5-1.5a2 2 0 0 0-2.8 0L6 12l-2-2 4-4h2l3 3" />
    </svg>
  );
}
function RefreshIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 11A8 8 0 0 0 6.6 5.6L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 13.4 5.4L20 16" />
      <path d="M20 20v-4h-4" />
    </svg>
  );
}
