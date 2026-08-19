import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

/** One tutorial slide: a big emoji, a title, and rich body content. */
export interface TutorialSlide {
  emoji: string;
  title: string;
  body: React.ReactNode;
}

/**
 * Per-browser "has seen this game's tutorial" gate. Generalises the bespoke
 * Rummy/WordBuilding helpers (localStorage key `<game>.tutorial.completed.v1`)
 * so every other game shares ONE modal implementation instead of copying it.
 *
 * Closing via {@link GameTutorial} marks the key seen so it won't auto-open
 * again. A header "?" button ({@link TutorialButton}) can re-open it anytime.
 *
 * SSR/private-mode safe: if localStorage throws we simply don't auto-open.
 *
 * ── `canAutoOpen` — never steal a live turn ────────────────────────────
 * The deck used to auto-open unconditionally on first mount, which on a
 * turn-based board can mean mounting with a live turn timer already running
 * (a page refresh, a rejoin inside the 90s disconnect grace, or simply being
 * first in turn order) — the modal then sits over the board while the real
 * clock underneath keeps counting down and can time the player out of a turn
 * they never got to see. Documented reproduction: Ludo, first play, "10s
 * left" on open → "3s left" four seconds later, board unreachable throughout.
 *
 * `canAutoOpen` (default `true`, so every existing call site is unaffected)
 * lets a turn-based board pass a live boolean meaning "safe to interrupt
 * right now" — typically `!myTurn || noActiveDeadline`. When it is `false`
 * at mount, the storage key is deliberately NOT read yet: the effect below
 * waits for `canAutoOpen` to become `true` and opens then, once, so a
 * first-time player still sees the tutorial — just not mid-countdown.
 */
export function useTutorialGate(
  storageKey: string,
  canAutoOpen: boolean = true,
): {
  open: boolean;
  setOpen: (open: boolean) => void;
} {
  const [open, setOpen] = useState(false);
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    if (hasAutoOpenedRef.current || !canAutoOpen) return;
    let alreadySeen = true;
    try {
      alreadySeen = localStorage.getItem(storageKey) === "1";
    } catch {
      alreadySeen = true; // can't confirm — fail closed, don't auto-open
    }
    if (!alreadySeen) {
      hasAutoOpenedRef.current = true;
      setOpen(true);
    }
  }, [canAutoOpen, storageKey]);

  return { open, setOpen };
}

function markSeen(storageKey: string): void {
  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    /* localStorage unavailable — silent */
  }
}

/**
 * Small "?" pill the game shells drop into their header/control area to re-open
 * the tutorial. Neutral parchment styling so it reads on any board theme.
 */
export function TutorialButton({
  onClick,
  className = "",
  label = "How to play",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-base font-extrabold shadow-sm transition active:scale-95 ${className}`}
      style={{
        background: "rgba(255,255,255,0.88)",
        color: "#6D4323",
        border: "1px solid rgba(109,67,35,0.28)",
      }}
    >
      ?
    </button>
  );
}

/**
 * Shared slide-deck "how to play" modal. One implementation for every game that
 * doesn't ship a bespoke deck (Rummy & WordBuilding keep their richer custom
 * ones). Feed it `slides` + the `storageKey`; closing marks the deck seen.
 *
 * Chrome mirrors the existing Rummy/WordBuilding tutorials — dark branded card,
 * progress dots, Back / Skip / Next — with a configurable `accent` so each game
 * can tint it to its own palette.
 */
export default function GameTutorial({
  slides,
  storageKey,
  onClose,
  accent = "#E4B128",
}: {
  slides: TutorialSlide[];
  storageKey: string;
  onClose: () => void;
  accent?: string;
}) {
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const isFirst = step === 0;
  const isLast = step === slides.length - 1;
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  function done() {
    markSeen(storageKey);
    onClose();
  }
  function next() {
    if (isLast) done();
    else setStep((s) => s + 1);
  }
  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  if (!slide) return null;

  return (
    <Modal
      open
      onClose={done}
      initialFocusRef={nextBtnRef}
      ariaLabelledBy="game-tutorial-title"
      zIndex={60}
      className="overflow-auto"
      panelClassName="rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 relative"
      panelStyle={{
        background: "linear-gradient(160deg, #2a2118 0%, #17110c 100%)",
        border: `2px solid ${accent}`,
      }}
    >
        <button
          onClick={done}
          className="absolute top-3 right-3 text-white/60 hover:text-white text-xl leading-none"
          aria-label="Close tutorial"
        >
          ✕
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5" aria-label="Tutorial progress">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="w-2 h-2 rounded-full transition"
              style={{
                background:
                  i === step
                    ? accent
                    : i < step
                      ? "rgba(228,177,40,0.5)"
                      : "rgba(255,255,255,0.22)",
                transform: i === step ? "scale(1.4)" : "scale(1)",
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Slide */}
        <div className="text-center">
          <div className="text-5xl mb-2">{slide.emoji}</div>
          <h2
            id="game-tutorial-title"
            className="text-xl font-extrabold tracking-wider uppercase"
            style={{ color: accent }}
          >
            {slide.title}
          </h2>
        </div>
        <div className="text-[#f3ead7] text-sm leading-relaxed min-h-[7rem]">
          {slide.body}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
          <button
            onClick={prev}
            disabled={isFirst}
            className="text-sm px-4 py-1.5 rounded-lg font-bold transition bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white"
          >
            ← Back
          </button>
          <button
            onClick={done}
            className="text-xs text-white/50 hover:text-white/80 transition"
          >
            Skip
          </button>
          <button
            ref={nextBtnRef}
            onClick={next}
            className="text-sm px-5 py-1.5 rounded-lg font-extrabold transition text-[#2a2118]"
            style={{ background: accent }}
          >
            {isLast ? "Got it!" : "Next →"}
          </button>
        </div>
    </Modal>
  );
}
