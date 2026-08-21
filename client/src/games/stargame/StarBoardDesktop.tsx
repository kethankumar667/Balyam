import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useStarBoard } from "./useStarBoard";
import type { StarBoardModel, StarBoardProps } from "./useStarBoard";
import GameTutorial, { TutorialButton, useTutorialGate } from "../../components/GameTutorial";
import InlineRoomRail from "../../components/InlineRoomRail";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import { STARGAME_TUTORIAL } from "../tutorials";
import { getSocket } from "../../lib/socket";
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
  KidsPassingChitsIllustration,
  getChitDotColor,
} from "./star-shared";

/**
 * StarBoardDesktop — Dedicated desktop shell matching the new design screenshot.
 * Full-height three-column workspace:
 * - Left column: Game Info (with Copy code), Values in Play chips, Round Details, Tip Card with Kids Illustration
 * - Center column: Festive Stage heading, Dark Orbit Table with Glowing Avatars, Center Star, Directional pass arrows
 * - Right column: Theme with secret pick, Now action status with timer, Score Board ranking, Game Flow checklist
 * - Bottom bar: Hand chits with matching value dots, Pass Action Button with slip count preview, Keyboard hints
 */
export default function StarBoardDesktop(props: StarBoardProps) {
  const m = useStarBoard(props);
  const reduce = useReducedMotion();
  const reactions = useSeatReactions();
  // Never over a live action window — Star Game has two ("themeSelect" and
  // "pass"), so both must be clear, or no deadline is running at all.
  // See GameTutorial.tsx's useTutorialGate doc.
  const tut = useTutorialGate(
    STARGAME_TUTORIAL.key,
    (!m.iNeedToSelect && !m.iNeedToPass) || m.deadline == null,
  );
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Self-tick once per second so the live DeadlinePill counts down
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Keyboard shortcuts: 1-4 arm the Nth chit, Enter passes, S slaps star, Space stacks
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(props.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    const s = getSocket();
    s.emit("room:leave");
    navigate("/");
  };

  const rankedSeats = [...m.seats].sort(
    (a, b) => b.pub.score - a.pub.score || b.pub.roundWins - a.pub.roundWins,
  );
  const selectedCount = m.seats.filter((s) => s.pub.hasSelected).length;
  const shuffledCount = m.seats.filter((s) => s.pub.hasShuffled).length;

  const showTable = m.phase !== "themeSelect" && m.phase !== "finished";
  const secretPickDot = m.state.mySelectedValue ? getChitDotColor(m.state.mySelectedValue) : null;
  const mainRef = useRef<HTMLElement>(null);
  const [arenaDim, setArenaDim] = useState<{ width: number; height: number }>({
    width: 780,
    height: 520,
  });

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setArenaDim({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Compute responsive table size filling ~85-92% of the main felt arena
  const availW = Math.max(480, arenaDim.width - 40);
  const availH = Math.max(340, arenaDim.height - 92);
  const targetAspect = 1.34;
  let dynamicTableW = availW;
  let dynamicTableH = dynamicTableW / targetAspect;
  if (dynamicTableH > availH) {
    dynamicTableH = availH;
    dynamicTableW = dynamicTableH * targetAspect;
  }
  const tableWidth = Math.max(480, Math.min(1080, Math.floor(dynamicTableW)));
  const tableHeight = Math.max(340, Math.min(760, Math.floor(dynamicTableH)));

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col font-sans select-none"
      style={{ background: "#060814", color: "#F8FAFC" }}
    >
      <StarRoomBackdrop />
      <GrainOverlay />
      {(m.iAmWinner || m.phase === "finished") && <Confetti count={34} />}

      {/* ── Top Navigation Bar ───────────────────────────────────────────── */}
      <header
        className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#1E294B]/90 px-5 bg-[#090E22]/95 backdrop-blur-md shadow-md"
      >
        <StarLogo />

        <div className="flex items-center gap-3">
          <RoundProgress round={m.round} total={m.totalRounds} />
          <button
            type="button"
            onClick={handleLeaveRoom}
            aria-label="Exit room"
            className="h-8 w-8 rounded-full bg-[#0D1428] border border-[#1E294B] text-zinc-300 hover:text-white hover:bg-[#1A2342] flex items-center justify-center text-xs font-bold transition shadow-sm"
          >
            ✕
          </button>
        </div>

        {/* Right Controls & Leave Button */}
        <div className="flex items-center gap-2.5">
          <StarIconButton onClick={() => tut.setOpen(true)} label="How to play Star Game">
            ?
          </StarIconButton>
          <InlineRoomRail
            code={props.roomCode}
            game="stargame"
            phase={props.roomPhase}
            players={props.players}
            selfId={props.selfId}
            messages={props.messages}
            variant="dark"
          />
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <span aria-hidden>🚪</span>
            <span>Leave Room</span>
          </button>
        </div>
      </header>

      {/* ── Workspace: Three Columns ────────────────────────────────────── */}
      <div
        className="relative z-10 grid min-h-0 flex-1 gap-3.5 p-3.5 pt-2"
        style={{
          gridTemplateColumns:
            arenaDim.width < 640 ? "210px 1fr 230px" : "240px 1fr 265px",
        }}
      >
        {/* LEFT COLUMN — Game Info, Values in Play, Round Details, Tip Card */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
          {/* Card 1: GAME INFO */}
          <Panel title="Game info" bodyClass="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">ROOM CODE</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 font-display text-sm font-black text-amber-400 hover:text-amber-300 transition"
              >
                <span>{props.roomCode}</span>
                <span className="text-xs opacity-75">{copied ? "✓" : "⧉"}</span>
              </button>
            </div>
            <InfoRow label="PLAYERS" value={`${m.seats.length} / ${m.seats.length}`} />
            <InfoRow label="ROUNDS" value={`${m.totalRounds}`} />
          </Panel>

          {/* Card 2: VALUES IN PLAY */}
          {m.state.valuesInPlay.length > 0 && (
            <Panel title="Values in play">
              <ValuesLegend values={m.state.valuesInPlay} glyph={m.theme.glyph} />
            </Panel>
          )}

          {/* Card 3: ROUND DETAILS */}
          <Panel title="Round details" bodyClass="space-y-2">
            <InfoRow label="Round" value={`${m.round} / ${m.totalRounds}`} />
            <InfoRow
              label="Starter"
              value={`${m.nameOf(m.starterId ?? "") || "—"}${m.starterId && m.starterId === m.selfId ? " (you)" : ""}`}
            />
            <InfoRow label="Direction" value="clockwise ↻" />
          </Panel>

          {/* Card 4: TIP CARD with Vector Kids Illustration */}
          <div className="rounded-2xl border border-[#1E294B]/90 bg-[#0D1326]/90 p-3.5 space-y-2 shadow-lg">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <span aria-hidden>💡</span>
              <span>Pass smart, win more!</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Quick passes and remembering values can help you score big.
            </p>
            <KidsPassingChitsIllustration />
          </div>
        </aside>

        {/* CENTER COLUMN — Main Felt Arena with Circular Orbit Table */}
        <main
          ref={mainRef}
          className="relative flex min-h-0 flex-1 flex-col justify-between items-center overflow-hidden rounded-3xl border border-[#1E294B]/90 p-4 sm:p-5 shadow-2xl"
          style={{
            background: "radial-gradient(ellipse at 50% 30%, #101633 0%, #090E22 65%, #050814 100%)",
          }}
          aria-live="polite"
        >
          <div className="w-full flex-1 flex flex-col items-center justify-center gap-2 sm:gap-3">
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
                width={tableWidth}
                height={tableHeight}
                registerCardRef={reactions.registerCardRef}
              >
                <CenterContent m={m} reduce={!!reduce} selectedCount={selectedCount} shuffledCount={shuffledCount} />
              </StarTable>
            )}
            {!showTable && (
              <CenterContent m={m} reduce={!!reduce} selectedCount={selectedCount} shuffledCount={shuffledCount} />
            )}
          </div>
        </main>

        {/* RIGHT COLUMN — Theme, Now status, Scoreboard, Game Flow */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pl-0.5">
          {/* Card 1: THEME */}
          <Panel title="Theme">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#2A3764] text-2xl bg-[#090E22] shadow-inner"
                aria-hidden
              >
                {m.theme.glyph}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-black text-amber-400 leading-tight">
                  {m.theme.label}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                  <span>Your secret pick:</span>
                  {secretPickDot && (
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: secretPickDot, boxShadow: `0 0 5px ${secretPickDot}` }}
                    />
                  )}
                  <span className="font-script text-sm font-bold text-slate-100 italic truncate">
                    {m.state.mySelectedValue ?? "None"}
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Card 2: NOW */}
          <Panel title="Now">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-100">
                {statusLine(m)}
                {m.isBotThinking && <BotThinkingDots />}
              </span>
              <div className="flex items-center gap-1.5">
                <TutorialButton onClick={() => tut.setOpen(true)} label="How to play Star Game" />
                <DeadlinePill deadline={m.deadline} />
              </div>
            </div>
          </Panel>

          {/* Card 3: SCORE BOARD */}
          <Panel title="Score board" bodyClass="space-y-1">
            {rankedSeats.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 transition"
                style={{ background: i === 0 ? "rgba(251,191,36,0.12)" : "transparent" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black tabular-nums"
                    style={{
                      background: i === 0 ? "#FBBF24" : "#1E294B",
                      color: i === 0 ? "#1C1917" : "#94A3B8",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-xs font-bold text-zinc-200">
                    {s.name}
                    {s.isSelf && <span className="ml-1 text-[10px] font-normal text-zinc-400">(you)</span>}
                  </span>
                </div>
                <span className="shrink-0 font-display text-sm font-black tabular-nums text-amber-400">
                  {s.pub.score}
                </span>
              </div>
            ))}
          </Panel>

          {/* Card 4: ROUND RESULT (if completed) */}
          {m.state.lastResult && (
            <Panel title={`Round ${m.state.lastResult.round} result`}>
              <RoundSummaryTable result={m.state.lastResult} seats={m.seats} nameOf={m.nameOf} />
            </Panel>
          )}

          {/* Card 5: GAME FLOW */}
          <Panel title="Game flow">
            <GameFlowPanel phase={m.phase} />
          </Panel>
        </aside>
      </div>

      {/* ── Persistent Bottom Hand Area ─────────────────────────────────── */}
      <footer
        className="relative z-20 flex shrink-0 items-center justify-between gap-6 border-t border-[#1E294B]/90 px-6 py-3.5 bg-[#0A0F24]/95 shadow-[0_-12px_28px_rgba(0,0,0,0.6)]"
      >
        {/* Left: YOUR HAND title + Curved Arrow */}
        <div className="flex shrink-0 flex-col items-start gap-0.5">
          <span className="font-display text-xs font-black uppercase tracking-wider text-amber-400">
            YOUR HAND
          </span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Select a chit to pass</span>
            <span aria-hidden className="text-amber-400 text-sm">⤷</span>
          </div>
        </div>

        {/* Center: Hand Chits Rail */}
        <div className="min-w-0 flex-1 flex justify-center">
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
            <p className="px-2 text-sm italic text-zinc-500">
              No chits in hand yet.
            </p>
          )}
        </div>

        {/* Right: Pass Button + Shortcuts Hint */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
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
      </footer>

      {tut.open && (
        <GameTutorial
          slides={STARGAME_TUTORIAL.slides}
          storageKey={STARGAME_TUTORIAL.key}
          accent={STARGAME_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
  );
}

/* ─────────────────────────── Center stage ─────────────────────────── */

function StageHeading({ phase }: { phase: StarBoardModel["phase"] }) {
  const HEADINGS: Record<StarBoardModel["phase"], { title: string; subtitle: string }> = {
    themeSelect: { title: "Pick a secret value!", subtitle: "Select one value to lock it secretly. Nobody sees your choice." },
    shuffle: { title: "Shuffle time!", subtitle: "The starter mixes the chits for this round." },
    deal: { title: "Four chits each!", subtitle: "Dealing folded paper slips to all players…" },
    pass: { title: "Pass it on!", subtitle: "Arm & pass a chit to the next player in clockwise order." },
    star: { title: "★ Four same → tap STAR! ★", subtitle: "Slap the STAR the instant you hold four of a kind!" },
    handstack: { title: "Hands on the line!", subtitle: "Stack your hand down fast — arrival order decides points." },
    roundSummary: { title: "Round complete!", subtitle: "Review scores and prepare for the next lap." },
    finished: { title: "Game Over!", subtitle: "Final standings and house champions." },
  };
  const { title, subtitle } = HEADINGS[phase] ?? { title: "Star Game", subtitle: "" };
  return (
    <div className="text-center space-y-1 select-none">
      <div className="flex items-center justify-center gap-2">
        <span className="text-xl" aria-hidden>🎉</span>
        <h2 className="font-display text-2xl lg:text-3xl font-black text-amber-400 drop-shadow-[0_2px_12px_rgba(251,191,36,0.35)]">
          {title}
        </h2>
        <span className="text-xl" aria-hidden>🎊</span>
      </div>
      <p className="text-xs text-zinc-400 max-w-md mx-auto">
        {subtitle}
      </p>
    </div>
  );
}

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
              <p className="text-sm text-zinc-400">
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
                className="mx-auto flex w-fit items-center gap-2 rounded-xl border border-amber-400/60 px-5 py-3 bg-[#0D1428] shadow-lg"
              >
                <span aria-hidden className="text-xl">🔒</span>
                <span className="font-script text-2xl font-bold text-amber-300">
                  Locked: {m.state.mySelectedValue}
                </span>
              </div>
              <p className="text-sm text-zinc-400">
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
              className="mx-auto flex flex-col items-center gap-2 rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-yellow-500 px-10 py-5 font-display text-xl font-black uppercase tracking-wide text-zinc-900 shadow-[0_0_24px_rgba(251,191,36,0.6)] transition active:scale-95 hover:brightness-110"
            >
              <span aria-hidden className="text-3xl">🔀</span>
              Give them a shuffle!
            </button>
          ) : m.isBotThinking ? (
            <p className="flex items-center justify-center gap-2 font-script text-2xl font-bold text-amber-300">
              {m.nameOf(m.state.shuffleTurnId ?? "")} is thinking
              <BotThinkingDots />
            </p>
          ) : (
            <p className="font-script text-2xl font-bold text-amber-300">
              {m.nameOf(m.state.shuffleTurnId ?? "")} is shuffling…
            </p>
          )}
          <p className="text-xs text-zinc-400">
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
        <div className="flex w-44 flex-col items-center gap-2 text-center">
          {m.iNeedToPass ? null : m.isBotThinking ? (
            <p className="flex items-center justify-center gap-2 font-script text-lg font-bold text-zinc-400">
              {m.nameOf(m.currentPasserId ?? "")} is thinking
              <BotThinkingDots />
            </p>
          ) : (
            <p className="font-script text-lg font-bold text-zinc-400">
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
          <div className="text-7xl text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]" aria-hidden>★</div>
          <h3 className="font-display text-2xl font-black text-amber-300">
            You slapped the STAR!
          </h3>
          <p className="text-xs text-zinc-400">
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
              className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-yellow-500 px-8 py-3 font-display text-lg font-black uppercase tracking-wide text-zinc-900 shadow-lg transition active:scale-95 hover:brightness-110"
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
      className={`rounded-2xl border border-[#1E294B]/90 bg-[#0D1326]/90 shadow-lg ${className}`}
    >
      {title && (
        <h2
          className="border-b border-[#1E294B]/80 px-3.5 py-2 font-display text-[11px] font-black uppercase tracking-wider text-amber-400"
        >
          {title}
        </h2>
      )}
      <div className={`p-3.5 ${bodyClass}`}>{children}</div>
    </section>
  );
}

/** The prominent Pass button matching the screenshot with purple/indigo aura. */
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
  const target = toName?.toUpperCase() ?? "PASS";
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onPass}
        disabled={disabled}
        aria-label={toName ? `Pass your selected slip to ${toName}` : "Pass your selected slip"}
        className="flex items-center justify-center gap-2.5 rounded-2xl px-7 py-3 font-display text-base font-black uppercase tracking-wider text-white transition active:scale-95 disabled:active:scale-100 disabled:opacity-50"
        style={{
          background: disabled
            ? "#2A3358"
            : "linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)",
          border: disabled ? "1px solid #1E294B" : "1px solid rgba(165,180,252,0.5)",
          boxShadow: disabled
            ? undefined
            : "0 0 24px rgba(99,102,241,0.6), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
      >
        <span>{toName ? `PASS TO ${target}` : "PASS"}</span>
        <span aria-hidden className="text-lg">→</span>
      </button>
      {!disabled && toName && (
        <p className="text-right text-[11px] text-zinc-400 font-medium">
          You will have {Math.max(0, myCount - 1)} slips
        </p>
      )}
    </div>
  );
}

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
      className="rounded-2xl border border-amber-400 px-6 py-3 font-display text-base font-black uppercase tracking-wide transition active:scale-95 disabled:active:scale-100 shadow-md"
      style={{
        background: placed ? "#10B981" : "#F59E0B",
        color: placed ? "#FFFFFF" : "#1C1917",
        opacity: disabled && !placed ? 0.5 : 1,
      }}
    >
      <span aria-hidden className="mr-1.5">✋</span>
      {placed ? `Placed${rank != null ? ` · #${rank + 1}` : ""}` : "Place hand"}
    </button>
  );
}

function ShortcutsHint() {
  return (
    <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
      <span className="font-semibold text-slate-200">1 - 4</span> arm  •  <span className="font-semibold text-slate-200">↵</span> pass  •  <span className="text-amber-400 font-bold">★</span> STAR  •  <span className="font-semibold text-slate-200">␣</span> score
    </p>
  );
}

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
        {label}
      </span>
      <span className="font-display text-sm font-black text-slate-200 tabular-nums">
        {value}
      </span>
    </div>
  );
}
