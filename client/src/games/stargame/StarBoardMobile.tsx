import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { StarPhase } from "@shared/types";
import { useStarBoard } from "./useStarBoard";
import type { StarBoardProps } from "./useStarBoard";
import {
  PAPER,
  Chit,
  ThemeChitPicker,
  HandRail,
  StarButton,
  HandStackButton,
  SeatTile,
  RoundSummaryTable,
  FinalPodium,
  NostalgiaLine,
  DeadlinePill,
  ValuesLegend,
  GrainOverlay,
  PAGE_BG,
  Confetti,
} from "./star-shared";

/**
 * Star Game — MOBILE shell (every non-desktop tier: phones + tablets, portrait,
 * one-hand). Single column on a paper page: a slim header (theme · round ·
 * deadline) over a one-line phase title, a swipeable seat strip, the phase
 * stage in the flexible middle, and a sticky thumb action bar pinned to the
 * bottom. Pure layout over the frozen `useStarBoard` model + `star-shared` kit.
 *
 * The picker (StarBoard.tsx) mounts EXACTLY one shell, so the hook — and its
 * sound subscription — runs once here.
 */

/** One terse line under the header so the player always knows the beat. */
const PHASE_TITLE: Record<StarPhase, string> = {
  themeSelect: "Pick your secret value",
  shuffle: "Shuffle the deck",
  deal: "Dealing the chits…",
  pass: "Pass clockwise!",
  star: "SLAP THE STAR",
  handstack: "Stack your hands!",
  roundSummary: "Round over",
  finished: "Game over",
};

/** Full-width, thumb-sized (>=44px) primary action for the sticky bottom bar. */
function ActionButton({
  label,
  onPress,
  disabled,
  tone = "go",
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  tone?: "go" | "pass";
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      className="min-h-[3.25rem] w-full rounded-2xl border-4 font-display text-lg font-black tracking-wide transition active:scale-[0.98] disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-700"
      style={{
        background: disabled ? PAPER.creamDeep : tone === "pass" ? PAPER.brown : PAPER.gold,
        borderColor: PAPER.brown,
        color: disabled ? PAPER.pencil : tone === "pass" ? "#fff" : PAPER.ink,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

export default function StarBoardMobile(props: StarBoardProps) {
  const m = useStarBoard(props);
  const reduce = useReducedMotion();

  // Self-tick once a second so the <DeadlinePill> (which reads Date.now() at
  // render) shows a live countdown. Cheap re-render; no other side effects.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => window.clearInterval(id);
  }, []);

  const seatCount = m.seats.length;
  const selectedCount = m.seats.filter((s) => s.pub.hasSelected).length;
  const shuffledCount = m.seats.filter((s) => s.pub.hasShuffled).length;
  const waitingToPass = m.seats.filter((s) => !s.pub.hasPassed).length;
  const others = m.seats.filter((s) => !s.isSelf);

  /** The middle stage — one branch per phase (all eight handled). */
  function renderStage() {
    switch (m.phase) {
      case "themeSelect":
        return m.iNeedToSelect ? (
          <ThemeChitPicker
            values={m.state.themeValues}
            taken={m.state.takenValues}
            selected={m.state.mySelectedValue}
            onPick={m.selectValue}
            glyph={m.theme.glyph}
          />
        ) : (
          <div className="space-y-2 text-center">
            <p className="font-script text-lg" style={{ color: PAPER.ink }}>
              Locked:{" "}
              <strong style={{ color: PAPER.brown }}>{m.state.mySelectedValue}</strong>
            </p>
            <p className="text-sm" style={{ color: PAPER.pencil }}>
              waiting for others…
            </p>
            <p className="font-display text-sm font-bold tabular-nums" style={{ color: PAPER.brown }}>
              {selectedCount}/{seatCount} ready
            </p>
          </div>
        );

      case "shuffle":
        return (
          <div className="space-y-3 text-center">
            <div aria-hidden className="text-5xl">🔀</div>
            {m.iAmShuffling ? (
              <p className="font-script text-lg" style={{ color: PAPER.ink }}>
                Your turn — give them a shuffle!
              </p>
            ) : (
              <p className="font-script text-lg" style={{ color: PAPER.ink }}>
                {m.nameOf(m.state.shuffleTurnId ?? "")} is shuffling…
              </p>
            )}
            <p className="font-display text-sm font-bold tabular-nums" style={{ color: PAPER.brown }}>
              {shuffledCount}/{seatCount} shuffled
            </p>
          </div>
        );

      case "deal":
        return (
          <div className="flex flex-col items-center gap-4">
            <p className="font-script text-lg" style={{ color: PAPER.ink }}>
              Dealing four chits each…
            </p>
            <motion.div
              className="flex gap-2"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.08 }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <Chit key={i} value="" faceDown size="sm" />
              ))}
            </motion.div>
          </div>
        );

      case "pass":
        return (
          <div className="flex w-full flex-col items-center gap-4">
            <ValuesLegend values={m.state.valuesInPlay} glyph={m.theme.glyph} />

            {/* Other players: face-down chit counts, clockwise. */}
            {others.length > 0 && (
              <div className="flex flex-wrap items-start justify-center gap-3">
                {others.map((s) => (
                  <div key={s.id} className="flex flex-col items-center gap-1">
                    <div className="relative">
                      <Chit value="" faceDown size="sm" />
                      <span
                        className="absolute -bottom-1 -right-1 rounded-full px-1.5 text-[10px] font-black tabular-nums"
                        style={{ background: PAPER.brown, color: "#fff" }}
                        aria-hidden
                      >
                        {s.pub.cardCount}
                      </span>
                    </div>
                    <span
                      className="max-w-[4.5rem] truncate text-[10px]"
                      style={{ color: PAPER.pencil }}
                    >
                      {s.name}
                      {s.pub.hasPassed ? " ✓" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Your hand — tap to arm the chit you'll slide. */}
            <HandRail
              hand={m.myHand}
              armedId={m.state.myArmedCardId}
              onArm={m.armCard}
              disabled={!m.iNeedToPass}
            />

            {!m.iNeedToPass && (
              <p className="text-center text-sm" style={{ color: PAPER.pencil }} aria-live="polite">
                Passed — waiting for {waitingToPass} player{waitingToPass === 1 ? "" : "s"}…
              </p>
            )}
          </div>
        );

      case "star":
        return (
          <div className="flex flex-col items-center gap-4">
            <StarButton onPress={m.pressStar} disabled={!m.iAmEligible} />
            {!m.iAmEligible && (
              <p className="text-center font-script text-base" style={{ color: PAPER.ink }}>
                Someone got FOUR — watch the STAR!
              </p>
            )}
          </div>
        );

      case "handstack":
        return (
          <div className="flex w-full flex-col items-center gap-4">
            {m.iAmWinner ? (
              <div className="space-y-1 text-center">
                <motion.div
                  aria-hidden
                  className="text-6xl"
                  animate={reduce ? {} : { rotate: [0, -12, 12, 0], scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1.1 }}
                >
                  ★
                </motion.div>
                <p className="font-display text-xl font-black" style={{ color: PAPER.gold }}>
                  You slapped the STAR!
                </p>
                <p className="text-sm" style={{ color: PAPER.pencil }}>
                  Watch the others scramble to stack.
                </p>
              </div>
            ) : (
              <HandStackButton
                onPlace={m.placeHand}
                disabled={!m.iCanStack}
                placed={m.me?.pub.hasStacked ?? false}
                rank={m.me?.pub.stackRank ?? null}
              />
            )}

            {/* Live stack order as it fills in. */}
            {m.state.stackOrder.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5" aria-live="polite">
                {m.state.stackOrder.map((pid, i) => (
                  <span
                    key={pid}
                    className="rounded-full border px-2 py-0.5 text-[11px] font-bold"
                    style={{ borderColor: PAPER.rim, background: PAPER.page, color: PAPER.ink }}
                  >
                    #{i + 1} {m.nameOf(pid)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );

      case "roundSummary":
        return (
          <div className="w-full space-y-3">
            {m.state.lastResult && (
              <RoundSummaryTable result={m.state.lastResult} seats={m.seats} nameOf={m.nameOf} />
            )}
            <NostalgiaLine text={m.state.nostalgiaMessage} />
          </div>
        );

      case "finished":
        return <FinalPodium standings={m.state.standings ?? []} nameOf={m.nameOf} />;

      default:
        return null;
    }
  }

  /** The single sticky thumb action for the phase, or null when the stage owns it. */
  function renderAction() {
    switch (m.phase) {
      case "shuffle":
        return <ActionButton label="Shuffle!" onPress={m.shuffle} disabled={!m.iAmShuffling} />;
      case "pass":
        return <ActionButton label="PASS" onPress={m.pass} disabled={!m.iNeedToPass} tone="pass" />;
      case "roundSummary":
        return <ActionButton label="Next round →" onPress={m.nextRound} disabled={false} />;
      default:
        return null;
    }
  }

  const action = renderAction();

  return (
    <div
      className="relative flex w-full flex-col overflow-x-hidden"
      style={{ minHeight: "100dvh", background: PAGE_BG, color: PAPER.ink }}
    >
      <GrainOverlay />
      {(m.iAmWinner || m.phase === "finished") && <Confetti count={30} />}
      {/* 1 — slim header: theme · round · deadline */}
      <header
        className="flex items-center justify-between gap-2 border-b-2 px-3 py-2"
        style={{ borderColor: PAPER.rim, background: PAPER.cream }}
      >
        <h1 className="flex min-w-0 items-center gap-1.5 font-display text-sm font-black">
          <span aria-hidden className="text-xl">
            {m.theme.glyph}
          </span>
          <span className="truncate" style={{ color: PAPER.brown }}>
            {m.theme.label}
          </span>
        </h1>
        <span className="shrink-0 font-display text-xs font-bold tabular-nums" style={{ color: PAPER.pencil }}>
          Round {m.round}/{m.totalRounds}
        </span>
        <span className="flex min-w-[3.25rem] justify-end">
          <DeadlinePill deadline={m.deadline} />
        </span>
      </header>

      {/* phase title line */}
      <h2
        className="px-3 py-1.5 text-center font-script text-base font-bold"
        style={{ color: PAPER.ink, background: PAPER.cream, borderBottom: `1px dashed ${PAPER.rim}` }}
      >
        {PHASE_TITLE[m.phase]}
      </h2>

      {/* 2 — player status strip (swipeable) */}
      <nav
        aria-label="Players"
        className="flex gap-2 overflow-x-auto px-3 py-2"
        style={{ borderBottom: `1px dashed ${PAPER.rim}` }}
      >
        {m.seats.map((s) => {
          const active =
            (m.phase === "shuffle" && s.id === m.state.shuffleTurnId) ||
            ((m.phase === "star" || m.phase === "handstack") && s.id === m.state.starWinnerId);
          return (
            <div key={s.id} className="w-40 shrink-0">
              <SeatTile seat={s} showScore active={active} />
            </div>
          );
        })}
      </nav>

      {/* 3 — game area (flex-1, centered) */}
      <main className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-3 py-4">
        {renderStage()}
      </main>

      {/* 4 — sticky bottom action bar (only when the phase has a bar action) */}
      {action && (
        <div
          className="sticky bottom-0 z-10 border-t-2 px-3 py-2"
          style={{
            borderColor: PAPER.rim,
            background: PAPER.cream,
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          }}
        >
          {action}
        </div>
      )}
    </div>
  );
}
