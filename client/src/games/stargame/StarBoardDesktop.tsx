import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useStarBoard } from "./useStarBoard";
import type { StarBoardModel, StarBoardProps, StarSeat } from "./useStarBoard";
import GameTutorial, { TutorialButton, useTutorialGate } from "../../components/GameTutorial";
import { STARGAME_TUTORIAL } from "../tutorials";
import {
  ActivityFeed,
  Chit,
  DeadlinePill,
  FinalPodium,
  HandRail,
  HandStackButton,
  NostalgiaLine,
  PAPER,
  RoundSummaryTable,
  Scoreboard,
  SeatTile,
  StarButton,
  ThemeChitPicker,
  ValuesLegend,
  GrainOverlay,
  PAGE_BG,
  Confetti,
} from "./star-shared";

/**
 * StarBoardDesktop — the DEDICATED desktop shell for Star Game (≥1280px, mouse +
 * keyboard). A full-height three-column workspace (left standings / center felt /
 * right ledger) over a persistent bottom hand rail. This is a native desktop
 * arrangement, not the mobile shell stretched: the felt is the focus, the rails
 * are reference panels, and the round is fully keyboard-playable.
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

  // Keyboard shortcuts: 1-4 arm the Nth chit while passing, Enter passes,
  // S slaps the STAR, Space places the hand. We ignore keystrokes typed into
  // chat / form fields so the desktop chat panel keeps working.
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

  const selectedCount = m.seats.filter((s) => s.pub.hasSelected).length;
  const shuffledCount = m.seats.filter((s) => s.pub.hasShuffled).length;
  const stillToPass = m.seats.filter((s) => !s.pub.hasPassed).length;

  /** A seat is "active" when it's their shuffle turn, or holds four during STAR. */
  const isActiveSeat = (s: StarSeat): boolean => {
    if (m.phase === "shuffle") return m.state.shuffleTurnId === s.id;
    if (m.phase === "star") return s.pub.starEligible;
    return false;
  };

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col font-sans"
      style={{ background: PAGE_BG, color: PAPER.ink }}
    >
      <GrainOverlay />
      {(m.iAmWinner || m.phase === "finished") && <Confetti count={34} />}
      {/* ── Workspace: three columns ───────────────────────────────────── */}
      <div
        className="grid min-h-0 flex-1 gap-3 p-3"
        style={{ gridTemplateColumns: "260px 1fr 300px" }}
      >
        {/* LEFT — standings, roster, round info */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
          <Panel title="Standings">
            <Scoreboard seats={m.seats} />
          </Panel>

          <Panel title="Players" bodyClass="space-y-1.5">
            {m.seats.map((s) => (
              <SeatTile key={s.id} seat={s} active={isActiveSeat(s)} />
            ))}
          </Panel>

          <Panel title="Round">
            <dl className="space-y-1.5 text-sm">
              <Row label="Round">
                <span className="font-display font-black" style={{ color: PAPER.brown }}>
                  {m.round}/{m.totalRounds}
                </span>
              </Row>
              <Row label="Theme">
                <span className="font-bold">
                  <span aria-hidden className="mr-1">{m.theme.glyph}</span>
                  {m.theme.label}
                </span>
              </Row>
              <Row label="Pass">
                <span className="font-bold" style={{ color: PAPER.pencil }}>
                  clockwise <span aria-hidden>⟳</span>
                </span>
              </Row>
            </dl>
          </Panel>
        </aside>

        {/* CENTER — the felt */}
        <main
          className="relative flex min-h-0 flex-col overflow-y-auto rounded-3xl border-2 p-6"
          style={{
            borderColor: PAPER.rim,
            background: `radial-gradient(circle at 50% 0%, ${PAPER.page}, ${PAPER.cream})`,
            boxShadow: "inset 0 2px 16px rgba(109,67,35,0.08)",
          }}
          aria-live="polite"
        >
          <GrainOverlay vignette={false} />
          <div className="m-auto w-full max-w-2xl">
            <Stage
              m={m}
              reduce={!!reduce}
              selectedCount={selectedCount}
              shuffledCount={shuffledCount}
              stillToPass={stillToPass}
            />
          </div>
        </main>

        {/* RIGHT — theme, activity ledger, status */}
        <aside className="flex min-h-0 flex-col gap-3">
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

          <Panel title="Activity" className="flex min-h-0 flex-1 flex-col" bodyClass="min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto pr-1">
              <ActivityFeed entries={m.state.activity} nameOf={m.nameOf} />
            </div>
          </Panel>

          <Panel title="Now">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold" style={{ color: PAPER.ink }}>
                {statusLine(m)}
              </span>
              <div className="flex items-center gap-2">
                <TutorialButton onClick={() => tut.setOpen(true)} label="How to play Star Game" />
                <DeadlinePill deadline={m.deadline} />
              </div>
            </div>
          </Panel>
        </aside>
      </div>

      {/* ── Persistent bottom hand rail ────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center gap-4 border-t-2 px-4 py-3"
        style={{ borderColor: PAPER.rim, background: PAPER.cream }}
      >
        <div className="min-w-0 flex-1">
          {m.myHand.length > 0 ? (
            <HandRail
              hand={m.myHand}
              armedId={m.state.myArmedCardId}
              onArm={m.armCard}
              disabled={!m.iNeedToPass}
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
            <PassButton onPass={m.pass} disabled={!m.iNeedToPass} />
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

function Stage({
  m,
  reduce,
  selectedCount,
  shuffledCount,
  stillToPass,
}: {
  m: StarBoardModel;
  reduce: boolean;
  selectedCount: number;
  shuffledCount: number;
  stillToPass: number;
}) {
  switch (m.phase) {
    case "themeSelect":
      return (
        <div className="space-y-5 text-center">
          <StageHeading>Pick your secret value</StageHeading>
          {m.iNeedToSelect ? (
            <>
              <p className="text-sm" style={{ color: PAPER.pencil }}>
                Tap one chit to lock it. Nobody sees your choice.
              </p>
              <ThemeChitPicker
                values={m.state.themeValues}
                taken={m.state.takenValues}
                selected={m.state.mySelectedValue}
                onPick={m.selectValue}
                glyph={m.theme.glyph}
              />
            </>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto flex w-fit items-center gap-2 rounded-xl border-2 px-4 py-3"
                style={{ borderColor: PAPER.gold, background: PAPER.page }}>
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
        <div className="space-y-6 text-center">
          <StageHeading>Shuffle time</StageHeading>
          {m.iAmShuffling ? (
            <button
              type="button"
              onClick={m.shuffle}
              aria-label="Give the chits a shuffle"
              className="mx-auto flex flex-col items-center gap-2 rounded-3xl border-4 px-12 py-8 font-display text-2xl font-black uppercase tracking-wide transition active:scale-95"
              style={{ borderColor: PAPER.brown, background: PAPER.gold, color: PAPER.ink }}
            >
              <span aria-hidden className="text-5xl">🔀</span>
              Give them a shuffle!
            </button>
          ) : (
            <p className="font-script text-3xl font-bold" style={{ color: PAPER.brown }}>
              {m.nameOf(m.state.shuffleTurnId!)} is shuffling…
            </p>
          )}
          <p className="text-sm" style={{ color: PAPER.pencil }}>
            {shuffledCount}/{m.seats.length} shuffled
          </p>
        </div>
      );

    case "deal":
      return (
        <div className="space-y-6 text-center">
          <StageHeading>Dealing four chits each…</StageHeading>
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
        </div>
      );

    case "pass":
      return (
        <div className="space-y-6">
          <div className="text-center">
            <ValuesLegend values={m.state.valuesInPlay} glyph={m.theme.glyph} />
          </div>
          <SeatRing seats={m.seats} selfId={m.selfId}>
            <div className="flex w-44 flex-col items-center gap-3 text-center">
              {m.iNeedToPass ? (
                <>
                  <p className="font-script text-2xl font-bold leading-tight" style={{ color: PAPER.brown }}>
                    Arm a chit & pass <span aria-hidden>⟳</span>
                  </p>
                  <PassButton onPass={m.pass} disabled={!m.iNeedToPass} big />
                  <p className="text-[11px]" style={{ color: PAPER.pencil }}>
                    {m.state.myArmedCardId ? "Armed — slide it on!" : "Pick a chit from your rail"}
                  </p>
                </>
              ) : (
                <p className="font-script text-2xl font-bold" style={{ color: PAPER.pencil }}>
                  Passed — waiting for {stillToPass} player{stillToPass === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </SeatRing>
        </div>
      );

    case "star":
      return (
        <div className="flex flex-col items-center gap-6 text-center">
          <StageHeading>Someone got four — slap the STAR!</StageHeading>
          <StarButton onPress={m.pressStar} disabled={!m.iAmEligible} />
          {!m.iAmEligible && (
            <p className="font-script text-2xl font-bold" style={{ color: PAPER.pencil }}>
              Someone got FOUR — watch the STAR!
            </p>
          )}
        </div>
      );

    case "handstack":
      return (
        <div className="flex flex-col items-center gap-6 text-center">
          {m.iAmWinner ? (
            <motion.div
              initial={reduce ? false : { scale: 0.7, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="space-y-2"
            >
              <div className="text-7xl" aria-hidden>★</div>
              <h2 className="font-display text-3xl font-black" style={{ color: PAPER.brown }}>
                You slapped the STAR!
              </h2>
              <p className="text-sm" style={{ color: PAPER.pencil }}>
                Everyone else is racing to stack their hand…
              </p>
            </motion.div>
          ) : (
            <>
              <StageHeading>Stack your hand — fast!</StageHeading>
              <div className="w-full max-w-xs">
                <HandStackButton
                  onPlace={m.placeHand}
                  disabled={!m.iCanStack}
                  placed={m.me?.pub.hasStacked ?? false}
                  rank={m.me?.pub.stackRank ?? null}
                />
              </div>
            </>
          )}
          <StackOrder order={m.state.stackOrder} nameOf={m.nameOf} />
        </div>
      );

    case "roundSummary":
      return (
        <div className="space-y-5">
          <StageHeading>Round {m.round} over</StageHeading>
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
        <div className="space-y-4">
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
      style={{ borderColor: PAPER.rim, background: PAPER.cream }}
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt style={{ color: PAPER.pencil }}>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function StageHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-black" style={{ color: PAPER.brown }}>
      {children}
    </h2>
  );
}

/** Radial arrangement of seats around a central prompt for the pass cycle. Self
 *  is anchored at the bottom; the others fan clockwise to mirror the pass flow. */
function SeatRing({
  seats,
  selfId,
  children,
}: {
  seats: StarSeat[];
  selfId: string | null;
  children: React.ReactNode;
}) {
  const ordered = useMemo(() => {
    const i = seats.findIndex((s) => s.id === selfId);
    if (i <= 0) return seats;
    return [...seats.slice(i), ...seats.slice(0, i)];
  }, [seats, selfId]);

  const n = ordered.length;
  const W = 460;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const rx = W / 2 - 56;
  const ry = H / 2 - 48;

  return (
    <div className="relative mx-auto" style={{ width: W, height: H }}>
      {ordered.map((s, i) => {
        // Start at the bottom (self) and sweep clockwise.
        const angle = Math.PI / 2 + (Math.PI * 2 * i) / n;
        const x = cx + rx * Math.cos(angle);
        const y = cy + ry * Math.sin(angle);
        return (
          <div
            key={s.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: x, top: y }}
          >
            <RingSeat seat={s} />
          </div>
        );
      })}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {children}
      </div>
    </div>
  );
}

function RingSeat({ seat }: { seat: StarSeat }) {
  const { pub, name, isSelf, isBot, isConnected } = seat;
  return (
    <div
      className="flex w-24 flex-col items-center gap-1 text-center"
      style={{ opacity: isConnected ? 1 : 0.5 }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full font-display text-base font-black text-white"
        style={{
          background: pub.hasPassed ? PAPER.green : PAPER.brown,
          boxShadow: pub.hasPassed ? "0 0 0 4px rgba(92,122,58,0.25)" : "none",
        }}
        aria-hidden
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
      <div className="max-w-full truncate text-xs font-bold" style={{ color: PAPER.ink }}>
        {name}
        {isSelf && " (you)"}
        {isBot && <span className="ml-0.5 text-[9px] opacity-60">bot</span>}
      </div>
      <div className="text-[10px]" style={{ color: pub.hasPassed ? PAPER.green : PAPER.pencil }}>
        {pub.hasPassed ? "passed ✓" : "thinking…"}
      </div>
    </div>
  );
}

function StackOrder({
  order,
  nameOf,
}: {
  order: string[];
  nameOf: (id: string) => string;
}) {
  if (order.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {order.map((pid, i) => (
        <span
          key={pid}
          className="rounded-full border px-2.5 py-1 text-xs font-bold"
          style={{ borderColor: PAPER.rim, background: PAPER.page, color: PAPER.ink }}
        >
          <span className="mr-1 font-display font-black" style={{ color: PAPER.brown }}>
            #{i + 1}
          </span>
          {nameOf(pid)}
        </span>
      ))}
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
      aria-label="Pass your armed chit clockwise"
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
      return m.iNeedToPass ? "Arm & pass a chit" : "Passed — waiting";
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
