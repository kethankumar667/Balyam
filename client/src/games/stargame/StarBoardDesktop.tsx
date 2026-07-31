import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useStarBoard } from "./useStarBoard";
import type { StarBoardModel, StarBoardProps } from "./useStarBoard";
import GameTutorial, { TutorialButton, useTutorialGate } from "../../components/GameTutorial";
import InlineRoomRail from "../../components/InlineRoomRail";
import { STARGAME_TUTORIAL } from "../tutorials";
import {
  Chit,
  DeadlinePill,
  DraggableChitRail,
  FinalPodium,
  HandStackButton,
  NostalgiaLine,
  PAPER,
  RoundInfoPanel,
  RoundSummaryTable,
  SeatTile,
  StarButton,
  StarTable,
  ThemeChitPicker,
  CustomChitInput,
  ValuesLegend,
  GrainOverlay,
  PAGE_BG,
  Confetti,
  ShuffleFlourish,
  BotThinkingDots,
  StarLogo,
  RoundProgress,
  StarIconButton,
  StarRoomBackdrop,
  GameFlowPanel,
} from "./star-shared";

/**
 * StarBoardDesktop — the DEDICATED desktop shell for Star Game (≥1280px, mouse +
 * keyboard). A full-height three-column workspace (left standings/roster/round
 * info · center felt with the circular StarTable · right theme/status) over a
 * persistent bottom hand rail. Native desktop arrangement, not the mobile
 * shell stretched: the StarTable is the shared visual language across both
 * shells, the side rails are reference panels, and the round is fully
 * keyboard-playable.
 *
 * Pure presentation over the frozen `useStarBoard` model — every socket emit,
 * derivation and sound cue lives in the hook. Honours prefers-reduced-motion via
 * the shared kit (which collapses its own motion) and gating our own flourishes.
 */
export default function StarBoardDesktop(props: StarBoardProps) {
  const m = useStarBoard(props);
  const reduce = useReducedMotion();
  const tut = useTutorialGate(STARGAME_TUTORIAL.key);

  // Self-tick once per second so the live DeadlinePill (which reads Date.now()
  // at render) actually counts down without any prop change.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Keyboard shortcuts: 1-4 arm the Nth chit (in the player's own on-screen
  // order — reordering changes what each number means, as expected) while
  // passing, Enter passes, S slaps the STAR, Space places the hand. We
  // ignore keystrokes typed into chat / form fields so desktop chat works.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      ) {
        return;
      }
      if (m.phase === "pass" && m.iNeedToPass) {
        if (e.key >= "1" && e.key <= "4") {
          const card = m.myHand[Number(e.key) - 1];
          if (card) {
            e.preventDefault();
            m.armCard(card.id);
          }
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          m.pass();
          return;
        }
      }
      if (e.code === "KeyS" && m.iAmEligible) {
        e.preventDefault();
        m.pressStar();
        return;
      }
      if (e.code === "Space" && m.iCanStack) {
        e.preventDefault();
        m.placeHand();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    m.phase,
    m.iNeedToPass,
    m.iAmEligible,
    m.iCanStack,
    m.myHand,
    m.armCard,
    m.pass,
    m.pressStar,
    m.placeHand,
  ]);

  // Same ordering the retired Scoreboard used, so merging the two panels
  // loses no information.
  const rankedSeats = [...m.seats].sort(
    (a, b) => b.pub.score - a.pub.score || b.pub.roundWins - a.pub.roundWins,
  );
  const selectedCount = m.seats.filter((s) => s.pub.hasSelected).length;
  const shuffledCount = m.seats.filter((s) => s.pub.hasShuffled).length;

  /** A seat is "active" in the left roster when it's their shuffle turn, or
   *  they currently hold four during STAR. StarTable derives its own,
   *  richer version (incl. the sequential pass turn) internally. */
  const isActiveSeat = (s: { id: string; pub: { starEligible: boolean } }): boolean => {
    if (m.phase === "shuffle") return m.state.shuffleTurnId === s.id;
    if (m.phase === "star") return s.pub.starEligible;
    return false;
  };

  const showTable = m.phase !== "themeSelect" && m.phase !== "finished";

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col font-sans"
      // Text colour flips to paper: the page is now a DESK, so anything not
      // inside a cream panel would otherwise be dark-brown ink on dark wood.
      style={{ background: PAGE_BG, color: PAPER.ink }}
    >
      <StarRoomBackdrop />
      <GrainOverlay />
      {(m.iAmWinner || m.phase === "finished") && <Confetti count={34} />}

      {/* ── Title bar: wordmark · round progress · controls ─────────────── */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 px-4 pb-1 pt-3">
        <StarLogo />
        <RoundProgress round={m.round} total={m.totalRounds} />
        {/* `pr-24` keeps this cluster clear of Room's floating Leave button,
            which is positioned over the board rather than laid out in flow. */}
        <div className="flex items-center gap-2 pr-24">
          <StarIconButton onClick={() => tut.setOpen(true)} label="How to play Star Game">
            ?
          </StarIconButton>
          {/* Chat / voice / players / invite / reactions. Star Game was the
              ONLY game in the app without this — no way to talk to the table,
              and no way to even see the room code to invite anyone. */}
          <InlineRoomRail
            code={props.roomCode}
            game="stargame"
            phase={props.roomPhase}
            players={props.players}
            selfId={props.selfId}
            messages={props.messages}
            variant="dark"
          />
        </div>
      </header>

      {/* ── Workspace: three columns ───────────────────────────────────── */}
      <div
        className="relative z-10 grid min-h-0 flex-1 gap-3 p-3 pt-1"
        style={{ gridTemplateColumns: "260px 1fr 300px" }}
      >
        {/* LEFT — standings, roster, round info */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
          {/* GAME INFO, per the reference — and it also removes a duplication
              I had reintroduced: a left roster listing every player and score
              sat opposite a SCORE BOARD listing every player and score. The
              players belong around the TABLE (where their seat colour, slip
              count and turn state live) and in the score board. Naming them a
              third time in the rail said nothing new. */}
          <Panel title="Game info" bodyClass="space-y-2">
            <InfoRow label="Room code" value={props.roomCode} mono />
            <InfoRow label="Players" value={`${m.seats.length}`} />
            <InfoRow label="Rounds" value={`${m.totalRounds}`} />
          </Panel>

          {/* The values in play. This used to render in the middle of the
              table, where five long theme values (Sridevi / Savitri /
              Jayaprada …) stacked into a column that completely buried the
              star. It is reference material, not a live control — the rail is
              where it belongs. */}
          {m.state.valuesInPlay.length > 0 && (
            <Panel title="Values in play">
              <ValuesLegend values={m.state.valuesInPlay} glyph={m.theme.glyph} />
            </Panel>
          )}

          <Panel title="Round">
            <RoundInfoPanel round={m.round} totalRounds={m.totalRounds} starterId={m.starterId} nameOf={m.nameOf} />
          </Panel>
        </aside>

        {/* CENTER — the felt, with the circular table as its centerpiece */}
        <main
          // `self-center` + `max-h-full` makes the sheet SHRINK-WRAP its
          // content instead of stretching to fill the grid row. A real sheet of
          // paper is the size of the sheet; stretching it left the chits
          // marooned in the middle of a vast empty page.
          className="relative flex min-h-0 max-h-full self-center flex-col overflow-y-auto rounded-3xl border-2 p-6"
          // The big sheet in the middle of the desk — where the round happens.
          // Lifted hardest of all the surfaces so the eye lands here first.
          style={{
            borderColor: PAPER.rim,
            background: `radial-gradient(circle at 50% 0%, ${PAPER.paper}, ${PAPER.cream} 70%, ${PAPER.page})`,
            color: PAPER.ink,
            boxShadow:
              "0 24px 48px -16px rgba(0,0,0,0.6), inset 0 2px 16px rgba(109,67,35,0.08), 0 2px 0 rgba(255,255,255,0.55) inset",
          }}
          aria-live="polite"
        >
          <GrainOverlay vignette={false} />
          <div className="m-auto flex w-full max-w-3xl flex-col items-center gap-5">
            <StageHeading phase={m.phase} />
            {showTable && (
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
                iAmEligible={m.iAmEligible}
                iCanStack={m.iCanStack}
                onPressStar={m.pressStar}
                onPlaceHand={m.placeHand}
                width={480}
                height={360}
              >
                <CenterContent m={m} reduce={!!reduce} selectedCount={selectedCount} shuffledCount={shuffledCount} />
              </StarTable>
            )}
            {!showTable && (
              <CenterContent m={m} reduce={!!reduce} selectedCount={selectedCount} shuffledCount={shuffledCount} />
            )}
          </div>
        </main>

        {/* RIGHT — theme + live status. Activity ledger removed (UI only —
            server still tracks it in state.activity for any future use). */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pl-0.5">
          <Panel title="Theme">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 text-2xl"
                style={{ borderColor: PAPER.rim, background: PAPER.page }}
                aria-hidden
              >
                {m.theme.glyph}
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg font-black leading-tight" style={{ color: PAPER.brown }}>
                  {m.theme.label}
                </div>
                <div className="text-xs" style={{ color: PAPER.pencil }}>
                  Your secret pick:{" "}
                  <span className="font-script text-base font-bold" style={{ color: PAPER.ink }}>
                    {m.state.mySelectedValue ?? "hidden"}
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Now">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-bold" style={{ color: PAPER.ink }}>
                {statusLine(m)}
                {m.isBotThinking && <BotThinkingDots />}
              </span>
              <div className="flex items-center gap-2">
                <TutorialButton onClick={() => tut.setOpen(true)} label="How to play Star Game" />
                <DeadlinePill deadline={m.deadline} />
              </div>
            </div>
          </Panel>

          {/* SCORE BOARD — running totals, ranked. Distinct from the left
              rail's roster, which is about who is at the table and what they
              are doing right now; this is purely who is winning. */}
          <Panel title="Score board" bodyClass="space-y-1">
            {rankedSeats.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1"
                style={{ background: i === 0 ? `${PAPER.gold}14` : undefined }}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black tabular-nums"
                  style={{
                    background: i === 0 ? PAPER.gold : "#2A3358",
                    color: i === 0 ? "#2A2115" : PAPER.pencil,
                  }}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold" style={{ color: PAPER.ink }}>
                  {s.name}
                  {s.isSelf && <span className="ml-1 text-[10px]" style={{ color: PAPER.pencil }}>you</span>}
                </span>
                <span className="shrink-0 font-display text-[13px] font-black tabular-nums" style={{ color: PAPER.gold }}>
                  {s.pub.score}
                </span>
              </div>
            ))}
          </Panel>

          {/* ROUND RESULT — only once there IS one. An empty "last round"
              panel in round 1 is a hole, not information. */}
          {m.state.lastResult && (
            <Panel title={`Round ${m.state.lastResult.round} result`}>
              <RoundSummaryTable result={m.state.lastResult} seats={m.seats} nameOf={m.nameOf} />
            </Panel>
          )}

          <Panel title="Game flow">
            <GameFlowPanel phase={m.phase} />
          </Panel>
        </aside>
      </div>

      {/* ── Persistent bottom hand rail ────────────────────────────────── */}
      <div
        className="relative z-10 flex shrink-0 items-center gap-4 border-t-2 px-4 py-3"
        // Your own hand — the strip of paper nearest you on the desk.
        style={{
          borderColor: PAPER.rim,
          background: PAPER.cream,
          color: PAPER.ink,
          boxShadow: "0 -12px 26px -14px rgba(0,0,0,0.6)",
        }}
      >
        {/* "SELECT A SLIP TO PASS" — the rail is only an instruction while it
            is actually your turn; the rest of the time it is just your hand. */}
        {m.phase === "pass" && m.iNeedToPass && m.myHand.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 pr-1">
            <span
              className="max-w-[6.5rem] font-display text-[11px] font-black uppercase leading-tight tracking-[0.14em]"
              style={{ color: PAPER.pencil }}
            >
              Select a slip to pass
            </span>
            <span aria-hidden style={{ color: PAPER.gold }}>→</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {m.myHand.length > 0 ? (
            <DraggableChitRail
              hand={m.myHand}
              armedId={m.state.myArmedCardId}
              onArm={m.armCard}
              onReorder={m.reorderHand}
              disabled={!m.iNeedToPass}
              isBackgrounded={m.isBackgrounded}
              size="lg"
            />
          ) : (
            <p className="px-2 text-sm italic" style={{ color: PAPER.pencil }}>
              No chits in hand yet.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {m.phase === "pass" && (
            <PassToButton
              onPass={m.pass}
              disabled={!m.iNeedToPass}
              toName={m.passTargetName}
              myCount={m.myHand.length}
              theirCount={m.passTargetCount}
            />
          )}
          {m.phase === "handstack" && !m.iAmWinner && (
            <HandStackButtonCompact
              onPlace={m.placeHand}
              disabled={!m.iCanStack}
              placed={m.me?.pub.hasStacked ?? false}
              rank={m.me?.pub.stackRank ?? null}
            />
          )}
          <ShortcutsHint />
        </div>
      </div>

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

/* ─────────────────────────── Center stage ─────────────────────────── */

function StageHeading({ phase }: { phase: StarBoardModel["phase"] }) {
  const TEXT: Record<StarBoardModel["phase"], string> = {
    themeSelect: "Pick your secret value",
    shuffle: "Shuffle time",
    deal: "Dealing four chits each…",
    pass: "Pass it on!",
    star: "Someone got four — slap the STAR!",
    handstack: "Stack your hand — fast!",
    roundSummary: "Round over",
    finished: "Game over",
  };
  return (
    <h2 className="text-center font-display text-2xl font-black" style={{ color: PAPER.brown }}>
      {TEXT[phase]}
    </h2>
  );
}

/** Phase-specific content — rendered either inside the StarTable's center
 *  slot (shuffle/pass/star/handstack, so it sits amid the seat ring) or
 *  standalone above it (themeSelect/deal have no table yet; roundSummary/
 *  finished don't need one). */
function CenterContent({
  m,
  reduce,
  selectedCount,
  shuffledCount,
}: {
  m: StarBoardModel;
  reduce: boolean;
  selectedCount: number;
  shuffledCount: number;
}) {
  switch (m.phase) {
    case "themeSelect":
      return (
        <div className="space-y-5 text-center">
          {m.iNeedToSelect ? (
            <>
              <p className="text-sm" style={{ color: PAPER.pencil }}>
                {m.state.themeId === "custom"
                  ? "Write your own chit name. Nobody sees your choice."
                  : "Tap one chit to lock it. Nobody sees your choice."}
              </p>
              {m.state.themeId === "custom" ? (
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
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div
                className="mx-auto flex w-fit items-center gap-2 rounded-xl border-2 px-4 py-3"
                style={{ borderColor: PAPER.gold, background: PAPER.page }}
              >
                <span aria-hidden className="text-xl">🔒</span>
                <span className="font-script text-2xl font-bold" style={{ color: PAPER.ink }}>
                  Locked: {m.state.mySelectedValue}
                </span>
              </div>
              <p className="text-sm" style={{ color: PAPER.pencil }}>
                Waiting for others… {selectedCount}/{m.seats.length} locked in
              </p>
            </div>
          )}
        </div>
      );

    case "shuffle":
      return (
        <div className="relative space-y-4 text-center">
          <ShuffleFlourish shuffleKey={shuffledCount} />
          {m.iAmShuffling ? (
            <button
              type="button"
              onClick={m.shuffle}
              aria-label="Give the chits a shuffle"
              className="mx-auto flex flex-col items-center gap-2 rounded-3xl border-4 px-10 py-6 font-display text-xl font-black uppercase tracking-wide transition active:scale-95"
              style={{ borderColor: PAPER.brown, background: PAPER.gold, color: PAPER.ink }}
            >
              <span aria-hidden className="text-4xl">🔀</span>
              Give them a shuffle!
            </button>
          ) : m.isBotThinking ? (
            <p className="flex items-center justify-center gap-2 font-script text-2xl font-bold" style={{ color: PAPER.brown }}>
              {m.nameOf(m.state.shuffleTurnId ?? "")} is thinking
              <BotThinkingDots />
            </p>
          ) : (
            <p className="font-script text-2xl font-bold" style={{ color: PAPER.brown }}>
              {m.nameOf(m.state.shuffleTurnId ?? "")} is shuffling…
            </p>
          )}
          <p className="text-sm" style={{ color: PAPER.pencil }}>
            One shuffle locks the deck for round {m.round} — then dealing starts.
          </p>
        </div>
      );

    case "deal":
      return (
        <div className="flex items-center justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={reduce ? false : { y: -40, opacity: 0, rotate: -8 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: reduce ? 0 : i * 0.12, type: "spring", stiffness: 280, damping: 22 }}
            >
              <Chit value="" faceDown size="md" />
            </motion.div>
          ))}
        </div>
      );

    case "pass":
      return (
        // NOTHING sits in the middle of the table on your own turn any more.
        // The action moved to the bottom rail (hand + "Pass to <name>"), and
        // leaving the old big PASS button here put a slab over the star and
        // over your own seat — two copies of one action, the louder of which
        // covered the thing the game is named after. The table shows the
        // TABLE; the rail shows what you do.
        <div className="flex w-44 flex-col items-center gap-3 text-center">
          {/* Legend lives in the left rail now — nothing sits on the star. */}
          {m.iNeedToPass ? null : m.isBotThinking ? (
            <p className="flex items-center justify-center gap-2 font-script text-xl font-bold" style={{ color: PAPER.pencil }}>
              {m.nameOf(m.currentPasserId ?? "")} is thinking
              <BotThinkingDots />
            </p>
          ) : (
            <p className="font-script text-xl font-bold" style={{ color: PAPER.pencil }}>
              Waiting for {m.nameOf(m.currentPasserId ?? "")}
            </p>
          )}
        </div>
      );

    case "star":
      return <StarButton onPress={m.pressStar} disabled={!m.iAmEligible} />;

    case "handstack":
      return m.iAmWinner ? (
        <motion.div
          initial={reduce ? false : { scale: 0.7, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="space-y-2 text-center"
        >
          <div className="text-7xl" aria-hidden>★</div>
          <h3 className="font-display text-2xl font-black" style={{ color: PAPER.brown }}>
            You slapped the STAR!
          </h3>
          <p className="text-sm" style={{ color: PAPER.pencil }}>
            Everyone else is racing to stack their hand…
          </p>
        </motion.div>
      ) : (
        <div className="w-full max-w-xs">
          <HandStackButton
            onPlace={m.placeHand}
            disabled={!m.iCanStack}
            placed={m.me?.pub.hasStacked ?? false}
            rank={m.me?.pub.stackRank ?? null}
          />
        </div>
      );

    case "roundSummary":
      return (
        <div className="w-full max-w-xl space-y-5">
          {m.state.lastResult && (
            <RoundSummaryTable result={m.state.lastResult} seats={m.seats} nameOf={m.nameOf} />
          )}
          <NostalgiaLine text={m.state.nostalgiaMessage} />
          <div className="text-center">
            <button
              type="button"
              onClick={m.nextRound}
              aria-label="Start the next round"
              className="rounded-2xl border-4 px-8 py-3 font-display text-lg font-black uppercase tracking-wide transition active:scale-95"
              style={{ borderColor: PAPER.brown, background: PAPER.gold, color: PAPER.ink }}
            >
              Next round →
            </button>
          </div>
        </div>
      );

    case "finished":
      return (
        <div className="w-full max-w-xl space-y-4">
          <FinalPodium standings={m.state.standings ?? []} nameOf={m.nameOf} />
        </div>
      );

    default:
      return null;
  }
}

/* ─────────────────────────── Sub-components ─────────────────────────── */

function Panel({
  title,
  children,
  className = "",
  bodyClass = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section
      className={`rounded-2xl border-2 ${className}`}
      // Sheets of paper resting ON the desk: ink text, and a cast shadow so
      // they lift off the wood instead of being flush with it.
      style={{
        borderColor: PAPER.rim,
        background: PAPER.cream,
        color: PAPER.ink,
        boxShadow: "0 10px 22px -8px rgba(0,0,0,0.55), 0 2px 0 rgba(255,255,255,0.5) inset",
      }}
    >
      {title && (
        <h2
          className="border-b-2 px-3 py-2 font-display text-xs font-black uppercase tracking-wider"
          style={{ borderColor: PAPER.rim, color: PAPER.brown }}
        >
          {title}
        </h2>
      )}
      <div className={`p-3 ${bodyClass}`}>{children}</div>
    </section>
  );
}

/**
 * The pass action, named and consequential.
 *
 * "Pass ⟳" told you nothing: not who receives it, and not what it costs you.
 * Both facts are already in the model, and stating them turns a blind button
 * into a decision — you can see you are about to drop to 3 while handing the
 * next player a 5th slip, which is exactly the tension the game runs on.
 */
function PassToButton({
  onPass,
  disabled,
  toName,
  myCount,
  theirCount,
}: {
  onPass: () => void;
  disabled: boolean;
  toName: string | null;
  myCount: number;
  theirCount: number;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onPass}
        disabled={disabled}
        aria-label={toName ? `Pass your selected slip to ${toName}` : "Pass your selected slip"}
        className="flex items-center gap-2 rounded-2xl border-2 px-6 py-3 font-display text-base font-black uppercase tracking-wide transition active:scale-95 disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
        style={{
          background: disabled
            ? PAPER.kraft
            : `linear-gradient(160deg, #4C7DF0, #2B4FB8)`,
          borderColor: disabled ? PAPER.rim : "#7BA3FF",
          color: disabled ? PAPER.pencil : "#FFFFFF",
          boxShadow: disabled ? undefined : "0 10px 24px -10px rgba(76,125,240,0.9), 0 0 18px rgba(76,125,240,0.35)",
          opacity: disabled ? 0.65 : 1,
        }}
      >
        <span className="leading-tight">
          {toName ? (
            <>
              Pass to
              <br />
              {toName}
            </>
          ) : (
            "Pass"
          )}
        </span>
        <span aria-hidden>→</span>
      </button>
      {!disabled && toName && (
        <p className="text-right text-[10px] leading-snug" style={{ color: PAPER.pencil }}>
          You will have {Math.max(0, myCount - 1)} slips
          <br />
          {toName} will have {theirCount + 1} slips
        </p>
      )}
    </div>
  );
}

function PassButton({
  onPass,
  disabled,
  big = false,
}: {
  onPass: () => void;
  disabled: boolean;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPass}
      disabled={disabled}
      aria-label="Pass your armed chit"
      className={[
        "rounded-2xl border-4 font-display font-black uppercase tracking-wide transition active:scale-95 disabled:active:scale-100",
        big ? "px-10 py-5 text-2xl" : "px-6 py-3 text-base",
      ].join(" ")}
      style={{
        background: disabled ? "#DCCDB0" : PAPER.gold,
        borderColor: PAPER.brown,
        color: PAPER.ink,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      Pass <span aria-hidden>⟳</span>
    </button>
  );
}

/** Compact stack affordance for the bottom rail (the felt holds the big one). */
function HandStackButtonCompact({
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
    <button
      type="button"
      onClick={onPlace}
      disabled={disabled || placed}
      aria-label="Place your hand"
      className="rounded-2xl border-4 px-6 py-3 font-display text-base font-black uppercase tracking-wide transition active:scale-95 disabled:active:scale-100"
      style={{
        background: placed ? PAPER.green : PAPER.gold,
        borderColor: PAPER.brown,
        color: placed ? "#fff" : PAPER.ink,
        opacity: disabled && !placed ? 0.5 : 1,
      }}
    >
      <span aria-hidden className="mr-1">✋</span>
      {placed ? `Placed${rank != null ? ` · #${rank + 1}` : ""}` : "Place hand"}
    </button>
  );
}

function ShortcutsHint() {
  return (
    <p className="text-[10px]" style={{ color: PAPER.pencil }}>
      <Kbd>1</Kbd>–<Kbd>4</Kbd> arm · <Kbd>↵</Kbd> pass · <Kbd>S</Kbd> star ·{" "}
      <Kbd>Space</Kbd> stack
    </p>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="rounded border px-1 font-mono text-[10px]"
      style={{ borderColor: PAPER.rim, background: PAPER.page, color: PAPER.ink }}
    >
      {children}
    </kbd>
  );
}

/** Right-rail "Now" line — short human status for the current phase / turn. */
function statusLine(m: StarBoardModel): string {
  switch (m.phase) {
    case "themeSelect":
      return m.iNeedToSelect ? "Pick your secret value" : "Locked — waiting";
    case "shuffle":
      return m.iAmShuffling
        ? "Your shuffle!"
        : `${m.nameOf(m.state.shuffleTurnId ?? "")} shuffling…`;
    case "deal":
      return "Dealing chits…";
    case "pass":
      return m.iNeedToPass ? "Arm & pass a chit" : `Waiting for ${m.nameOf(m.currentPasserId ?? "")}`;
    case "star":
      return m.iAmEligible ? "Slap the STAR!" : "Watch the STAR…";
    case "handstack":
      return m.iAmWinner ? "You took the STAR!" : "Stack your hand!";
    case "roundSummary":
      return "Round over";
    case "finished":
      return "Game over";
    default:
      return "";
  }
}

/** One label/value line in the GAME INFO panel. */
function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] uppercase tracking-wider" style={{ color: PAPER.pencil }}>
        {label}
      </span>
      <span
        className={`font-display text-sm font-black ${mono ? "tracking-[0.18em]" : "tabular-nums"}`}
        style={{ color: mono ? PAPER.gold : PAPER.ink }}
      >
        {value}
      </span>
    </div>
  );
}
