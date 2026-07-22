import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { StarPhase } from "@shared/types";
import { useStarBoard } from "./useStarBoard";
import type { StarBoardProps } from "./useStarBoard";
import GameTutorial, { TutorialButton, useTutorialGate } from "../../components/GameTutorial";
import { STARGAME_TUTORIAL } from "../tutorials";
import {
  PAPER,
  Chit,
  ThemeChitPicker,
  CustomChitInput,
  DraggableChitRail,
  StarButton,
  HandStackButton,
  StarTable,
  RoundSummaryTable,
  FinalPodium,
  NostalgiaLine,
  DeadlinePill,
  ValuesLegend,
  GrainOverlay,
  PAGE_BG,
  Confetti,
  ShuffleFlourish,
  BotThinkingDots,
} from "./star-shared";

/**
 * Star Game — MOBILE shell (every non-desktop tier: phones + tablets, portrait,
 * one-hand). A slim header (theme · round · deadline) over a one-line phase
 * title, the circular StarTable as the persistent visual centerpiece (self
 * bottom-center, others fanned clockwise, passing-flow arrows during "pass"),
 * the phase stage/action below it, and a sticky thumb action bar. Pure layout
 * over the frozen `useStarBoard` model + `star-shared` kit.
 *
 * The picker (StarBoard.tsx) mounts EXACTLY one shell, so the hook — and its
 * sound subscription — runs once here.
 */

/** One terse line under the header so the player always knows the beat. */
const PHASE_TITLE: Record<StarPhase, string> = {
  themeSelect: "Pick your secret value",
  shuffle: "Shuffle the deck",
  deal: "Dealing the chits…",
  pass: "Pass it on!",
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
  const tut = useTutorialGate(STARGAME_TUTORIAL.key);

  // Self-tick once a second so the <DeadlinePill> (which reads Date.now() at
  // render) shows a live countdown. Cheap re-render; no other side effects.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Shuffle flourish trigger — flips 0 -> 1 the instant the round's sole
  // designated shuffler (the starter) completes their turn
  // (server-authoritative, not a local click guess).
  const shuffledCount = m.seats.filter((s) => s.pub.hasShuffled).length;

  const selectedCount = m.seats.filter((s) => s.pub.hasSelected).length;

  /** The middle stage — one branch per phase (all eight handled). */
  function renderStage() {
    switch (m.phase) {
      case "themeSelect":
        return m.iNeedToSelect ? (
          m.state.themeId === "custom" ? (
            <CustomChitInput
              taken={m.state.takenValues}
              selected={m.state.mySelectedValue}
              onSubmit={m.selectValue}
            />
          ) : (
            <ThemeChitPicker
              values={m.state.themeValues}
              taken={m.state.takenValues}
              selected={m.state.mySelectedValue}
              onPick={m.selectValue}
              glyph={m.theme.glyph}
            />
          )
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
              {selectedCount}/{m.seats.length} ready
            </p>
          </div>
        );

      case "shuffle":
        return (
          <div className="relative space-y-3 text-center">
            <ShuffleFlourish shuffleKey={shuffledCount} />
            <div aria-hidden className="text-5xl">🔀</div>
            {m.iAmShuffling ? (
              <p className="font-script text-lg" style={{ color: PAPER.ink }}>
                Your turn — give them a shuffle!
              </p>
            ) : m.isBotThinking ? (
              <p className="flex items-center justify-center gap-2 font-script text-lg" style={{ color: PAPER.ink }}>
                {m.nameOf(m.state.shuffleTurnId ?? "")} is thinking
                <BotThinkingDots />
              </p>
            ) : (
              <p className="font-script text-lg" style={{ color: PAPER.ink }}>
                {m.nameOf(m.state.shuffleTurnId ?? "")} is shuffling…
              </p>
            )}
            <p className="text-xs" style={{ color: PAPER.pencil }}>
              One shuffle locks the deck for round {m.round} — then dealing starts.
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
          <div className="flex w-full flex-col items-center gap-3">
            <ValuesLegend values={m.state.valuesInPlay} glyph={m.theme.glyph} />

            {/* Your hand — drag to reorder, tap to arm the chit you'll send. */}
            <DraggableChitRail
              hand={m.myHand}
              armedId={m.state.myArmedCardId}
              onArm={m.armCard}
              onReorder={m.reorderHand}
              disabled={!m.iNeedToPass}
              isBackgrounded={m.isBackgrounded}
            />

            {m.iNeedToPass ? (
              <p className="text-center text-sm" style={{ color: PAPER.brown }} aria-live="polite">
                Your turn — pick a chit and pass it on.
              </p>
            ) : m.isBotThinking ? (
              <p className="flex items-center justify-center gap-2 text-sm" style={{ color: PAPER.pencil }} aria-live="polite">
                {m.nameOf(m.currentPasserId ?? "")} is thinking
                <BotThinkingDots />
              </p>
            ) : (
              <p className="text-center text-sm" style={{ color: PAPER.pencil }} aria-live="polite">
                Waiting for {m.nameOf(m.currentPasserId ?? "")}…
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
  // Table only makes sense once seats + cards exist meaningfully — keep it
  // mounted from "shuffle" onward so it's the constant visual anchor across
  // pass/star/handstack too, matching "Player Table Layout" for the whole
  // game, not just the pass cycle.
  const showTable = m.phase !== "themeSelect" && m.phase !== "finished";

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
        <span className="flex min-w-[3.25rem] items-center justify-end gap-1.5">
          <TutorialButton onClick={() => tut.setOpen(true)} label="How to play Star Game" />
          <DeadlinePill deadline={m.deadline} />
        </span>
      </header>

      {/* phase title line, with starter/direction once it's known */}
      <h2
        className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-center"
        style={{ background: PAPER.cream, borderBottom: `1px dashed ${PAPER.rim}` }}
      >
        <span className="font-script text-base font-bold" style={{ color: PAPER.ink }}>
          {PHASE_TITLE[m.phase]}
        </span>
        {m.starterId && m.phase !== "themeSelect" && (
          <span className="text-[10px] font-semibold" style={{ color: PAPER.pencil }}>
            Starter: {m.nameOf(m.starterId)} · clockwise <span aria-hidden>⟳</span>
          </span>
        )}
      </h2>

      {/* 2 — the circular table: persistent visual centerpiece */}
      {showTable && (
        <div className="flex justify-center py-3">
          <StarTable
            seats={m.seats}
            selfId={m.selfId}
            phase={m.phase}
            shuffleTurnId={m.state.shuffleTurnId}
            currentPasserId={m.currentPasserId}
            passOrder={m.passOrder}
            lastPass={m.lastPass}
            thinkingBotId={m.thinkingBotId}
            starWinnerId={m.state.starWinnerId}
            width={340}
            height={260}
          />
        </div>
      )}

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

      {tut.open && (
        <GameTutorial
          slides={STARGAME_TUTORIAL.slides}
          storageKey={STARGAME_TUTORIAL.key}
          accent={STARGAME_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}
    </div>
  );
}
