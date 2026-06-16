import { useState } from "react";
import type { Card } from "@shared/types";
import { PlayingCard, FaceDownCard } from "./Card";

const TUTORIAL_STORAGE_KEY = "rummy.tutorial.completed.v1";

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
  } catch {
    /* localStorage unavailable — silent */
  }
}

// Mock cards used for visual examples in the tutorial.
const c = (id: string, suit: Card["suit"], rank: Card["rank"]): Card => ({ id, suit, rank });
const PURE_RUN_EX = [c("ex-p1", "S", "4"), c("ex-p2", "S", "5"), c("ex-p3", "S", "6")];
const IMPURE_RUN_EX = [c("ex-i1", "S", "4"), c("ex-i2", "C", "J"), c("ex-i3", "S", "6")]; // J = wild
const SET_EX = [c("ex-s1", "S", "K"), c("ex-s2", "H", "K"), c("ex-s3", "D", "K")];
const HAND_VALUE_EX = [
  c("ex-h1", "H", "K"), c("ex-h2", "S", "A"), c("ex-h3", "D", "7"), c("ex-h4", "C", "3"),
];
const TUTORIAL_WILD_RANK = "J" as const;

interface Slide {
  title: string;
  emoji: string;
  body: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    emoji: "🎴",
    title: "Welcome to Indian Rummy",
    body: (
      <>
        <p>
          You'll be dealt <strong>13 cards</strong>. Your goal: organize them into valid groups
          (called <em>melds</em>) and call <strong>FINISH</strong> before your opponents do.
        </p>
        <p className="text-amber-300 mt-2">
          This walkthrough takes about 90 seconds. Skip anytime — you can replay it from the
          <span className="mx-1">📘</span>button in the header.
        </p>
      </>
    ),
  },
  {
    emoji: "✋",
    title: "Your hand",
    body: (
      <>
        <p>
          Your 13 cards live at the bottom of the table. <strong>Drag</strong> them to rearrange,
          or <strong>click to multi-select</strong> and use the action buttons.
        </p>
        <p className="mt-2 text-emerald-200">
          The <strong>AUTO</strong> button can find a starting layout for you. The
          <strong> SORT</strong> button reorders ungrouped cards by suit + rank.
        </p>
      </>
    ),
  },
  {
    emoji: "🔄",
    title: "Each turn: draw, then discard",
    body: (
      <>
        <p>
          When it's your turn, you'll <strong>draw 1 card</strong> from either the closed deck
          or the top of the open pile.
        </p>
        <div className="flex justify-center gap-3 my-3">
          <div className="text-center">
            <FaceDownCard />
            <div className="text-[10px] text-emerald-300 mt-1">Closed</div>
          </div>
          <div className="text-center">
            <PlayingCard card={c("ex-o", "D", "7")} />
            <div className="text-[10px] text-emerald-300 mt-1">Open pile</div>
          </div>
        </div>
        <p>
          Then you must <strong>discard 1 card</strong> to the open pile (or call FINISH if your
          hand is ready).
        </p>
      </>
    ),
  },
  {
    emoji: "🟢",
    title: "Pure sequence (the must-have)",
    body: (
      <>
        <p>
          <strong>3 or more consecutive cards of the same suit, with NO joker.</strong>
        </p>
        <div className="flex justify-center gap-1 my-3">
          {PURE_RUN_EX.map((card) => (
            <PlayingCard key={card.id} card={card} />
          ))}
        </div>
        <p className="text-emerald-300">
          ✓ You <strong>must</strong> have at least one pure sequence to declare a winning hand.
        </p>
      </>
    ),
  },
  {
    emoji: "🟦",
    title: "Impure sequence (joker helps)",
    body: (
      <>
        <p>
          Same as a pure sequence, but a <strong>wild joker</strong> substitutes for a missing
          card. In this round, J is the wild joker:
        </p>
        <div className="flex justify-center gap-1 my-3">
          {IMPURE_RUN_EX.map((card) => (
            <PlayingCard
              key={card.id}
              card={card}
              isWildJoker={card.rank === TUTORIAL_WILD_RANK}
            />
          ))}
        </div>
        <p className="text-cyan-300">
          ✓ Counts as a sequence — but doesn't replace your pure sequence requirement.
        </p>
      </>
    ),
  },
  {
    emoji: "🟪",
    title: "Set (same rank, different suits)",
    body: (
      <>
        <p>
          <strong>3 or 4 cards of the same rank, all different suits.</strong> Wild jokers can fill
          in for a missing suit.
        </p>
        <div className="flex justify-center gap-1 my-3">
          {SET_EX.map((card) => (
            <PlayingCard key={card.id} card={card} />
          ))}
        </div>
        <p className="text-blue-300">✓ Sets do NOT count as sequences.</p>
      </>
    ),
  },
  {
    emoji: "🃏",
    title: "The wild joker rank",
    body: (
      <>
        <p>
          Each round, one rank is randomly chosen as the <strong>wild joker</strong>. Every card
          of that rank — regardless of suit — can substitute for any card in an impure sequence
          or set.
        </p>
        <p className="mt-2">
          You'll see the wild joker face-up next to the closed deck, with a 🃏 badge.
        </p>
        <p className="mt-2 text-amber-300">
          Wild jokers are worth <strong>0 points</strong> in your hand value, so they're cheap to
          hold.
        </p>
      </>
    ),
  },
  {
    emoji: "🏆",
    title: "How to win (declare)",
    body: (
      <>
        <p>To declare a winning hand, you must have <strong>all of these</strong>:</p>
        <ul className="list-disc list-inside text-sm mt-2 space-y-1">
          <li>14 cards (you just drew)</li>
          <li>Exactly 1 card to discard (ungrouped)</li>
          <li>13 cards grouped into valid melds</li>
          <li><strong className="text-emerald-300">At least 1 pure sequence</strong></li>
          <li><strong className="text-cyan-300">At least 2 sequences total</strong> (pure + impure)</li>
        </ul>
        <p className="mt-2 text-amber-300">
          The <strong>FINISH</strong> button glows when you've met all 5 conditions.
        </p>
      </>
    ),
  },
  {
    emoji: "⏏",
    title: "Drop if your hand is hopeless",
    body: (
      <>
        <p>
          If you got dealt a bad hand and want to bail before getting caught for more points,
          tap <strong>DROP</strong> at the start of your turn.
        </p>
        <div className="bg-rose-900/50 rounded-lg p-3 my-3 border border-rose-700">
          <div className="text-rose-200 font-bold text-center">DROP penalty: 20 points (fixed)</div>
        </div>
        <p>
          Compare this against the <strong>Risk if caught</strong> number above your action bar —
          if it's bigger than 20, dropping is mathematically cheaper.
        </p>
      </>
    ),
  },
  {
    emoji: "🧮",
    title: "Card values when caught",
    body: (
      <>
        <p>If a rival declares and you haven't, your hand counts against you:</p>
        <div className="flex justify-center gap-1 my-3 items-end">
          {HAND_VALUE_EX.map((card) => (
            <div key={card.id} className="text-center">
              <PlayingCard card={card} />
              <div className="text-[10px] text-amber-300 font-bold mt-1">
                {card.rank === "K" || card.rank === "Q" || card.rank === "J" || card.rank === "A" || card.rank === "T"
                  ? "10"
                  : card.rank}
              </div>
            </div>
          ))}
        </div>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>A, K, Q, J, 10 = <strong>10 points</strong> each</li>
          <li>2 through 9 = <strong>face value</strong></li>
          <li>Wild jokers = <strong>0 points</strong></li>
          <li>Hand value is capped at <strong>80 points</strong></li>
        </ul>
      </>
    ),
  },
  {
    emoji: "🚀",
    title: "You're ready to play!",
    body: (
      <>
        <p>
          That's the whole game. Tap <strong>DONE</strong> to close this guide and start playing.
        </p>
        <p className="mt-2 text-emerald-200">
          Quick tips:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1 mt-1">
          <li>Try the <strong>AUTO</strong> button on your first hand to learn good groupings.</li>
          <li>Watch the <strong>Card Tracker</strong> — knowing what's left in the deck is power.</li>
          <li>The <strong>Risk if caught</strong> meter drops only when you have a pure sequence.</li>
          <li>Drag and drop is faster than clicking SORT + GROUP.</li>
        </ul>
        <p className="mt-3 text-amber-300">Good luck! 🎴</p>
      </>
    ),
  },
];

export default function TutorialModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const isFirst = step === 0;

  function done() {
    markTutorialSeen();
    onClose();
  }

  function next() {
    if (isLast) done();
    else setStep((s) => s + 1);
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-auto">
      <div
        className="rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 relative"
        style={{
          background: "linear-gradient(160deg, #064e3b 0%, #022c22 100%)",
          border: "2px solid #10b981",
        }}
      >
        {/* Close button */}
        <button
          onClick={done}
          className="absolute top-3 right-3 text-emerald-200/70 hover:text-white text-xl"
          aria-label="Close tutorial"
        >
          ✕
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="w-2 h-2 rounded-full transition"
              style={{
                background: i === step ? "#fbbf24" : i < step ? "#10b981" : "rgba(255,255,255,0.2)",
                transform: i === step ? "scale(1.4)" : "scale(1)",
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className="text-center">
          <div className="text-5xl mb-2">{slide.emoji}</div>
          <h2 className="text-xl font-extrabold text-emerald-100 tracking-wider uppercase">
            {slide.title}
          </h2>
        </div>
        <div className="text-emerald-50 text-sm leading-relaxed min-h-[8rem]">
          {slide.body}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-800/50">
          <button
            onClick={prev}
            disabled={isFirst}
            className="text-sm px-4 py-1.5 rounded font-bold transition bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <div className="text-xs text-emerald-300/70 font-mono">
            {step + 1} / {SLIDES.length}
          </div>
          <button
            onClick={next}
            className="text-sm px-5 py-1.5 rounded font-extrabold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 transition"
            style={{ boxShadow: "0 0 14px rgba(16,185,129,0.4)" }}
          >
            {isLast ? "Done 🚀" : "Next →"}
          </button>
        </div>

        {/* Skip link */}
        {!isLast && (
          <div className="text-center">
            <button
              onClick={done}
              className="text-[11px] text-emerald-400/70 hover:text-emerald-200 underline"
            >
              Skip tutorial
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
