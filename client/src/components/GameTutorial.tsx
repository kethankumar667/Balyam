import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { getGameAcademy } from "../features/academy/data";
import { GameAcademyModal } from "../features/academy/components/GameAcademyModal";
import { HapticsManager } from "../services/HapticsManager";

/** One tutorial slide: a big emoji, a title, and rich body content. */
export interface TutorialSlide {
  emoji: string;
  title: string;
  body: React.ReactNode;
}

/**
 * Per-browser "has seen this game's tutorial" gate.
 * SSR/private-mode safe: if localStorage throws we simply don't auto-open.
 *
 * `canAutoOpen` (default `true`) lets a turn-based board pass a live boolean
 * meaning "safe to interrupt right now" (e.g. `!myTurn || noActiveDeadline`)
 * to prevent auto-opening over an active turn countdown.
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

/** Marks a tutorial/rules deck as seen */
export function markSeen(storageKey: string): void {
  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    /* localStorage unavailable — silent */
  }
}

/**
 * Small "?" pill the game shells drop into their header/control area to re-open
 * the tutorial. Neutral parchment styling with golden focus ring and haptic feedback.
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
  const handleClick = () => {
    HapticsManager.getInstance().subtle();
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-1.5 -m-1.5 rounded-full text-base font-extrabold shadow-sm transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer ${className}`}
    >
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold"
        style={{
          background: "rgba(255,255,255,0.88)",
          color: "#6D4323",
          border: "1px solid rgba(109,67,35,0.28)",
        }}
      >
        ?
      </span>
    </button>
  );
}

/**
 * Universal Game Tutorial entrypoint.
 *
 * Renders the Game Academy when the game has an academy spec, otherwise the plain
 * slide deck. The two branches are separate components so neither calls hooks after
 * the other's early return. The academy is looked up by the first segment of the
 * storage key (`uno.tutorial.completed.v2` -> `uno`), which is why callers keep
 * using the `<game>.tutorial.completed.vN` convention.
 */
export default function GameTutorial({
  slides,
  storageKey,
  onClose,
  accent = "#E4B128",
}: {
  slides?: TutorialSlide[];
  storageKey: string;
  onClose: () => void;
  accent?: string;
}) {
  const slug = storageKey.split(".")[0]?.toLowerCase();
  const academySpec = slug ? getGameAcademy(slug) : null;

  function done() {
    markSeen(storageKey);
    onClose();
  }

  if (academySpec) {
    return <GameAcademyModal open spec={academySpec} onClose={done} />;
  }
  return <SlideTutorial slides={slides ?? []} accent={accent} onDone={done} />;
}

/** The plain slide-deck tutorial, for games without an academy spec. */
function SlideTutorial({
  slides: fallbackSlides,
  accent,
  onDone: done,
}: {
  slides: TutorialSlide[];
  accent: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const slide = fallbackSlides[step];
  const isFirst = step === 0;
  const isLast = step === fallbackSlides.length - 1;
  const nextBtnRef = useRef<HTMLButtonElement>(null);

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
      panelClassName="rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 relative backdrop-blur-2xl bg-slate-950/95 border border-stone-800 text-stone-100"
    >
      <button
        onClick={done}
        className="absolute top-4 right-4 text-stone-400 hover:text-white text-xl leading-none cursor-pointer"
        aria-label="Close tutorial"
      >
        ✕
      </button>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5" aria-label="Tutorial progress">
        {fallbackSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className="h-2 rounded-full transition-all cursor-pointer"
            style={{
              width: i === step ? "1.75rem" : "0.5rem",
              background: i === step ? accent : "rgba(255,255,255,0.2)",
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Slide */}
      <div className="text-center space-y-2">
        <div className="text-4xl">{slide.emoji}</div>
        <h2
          id="game-tutorial-title"
          className="text-lg font-black tracking-wider uppercase font-mono"
          style={{ color: accent }}
        >
          {slide.title}
        </h2>
      </div>
      <div className="text-stone-300 text-xs sm:text-sm font-mono leading-relaxed min-h-[5rem] p-3 rounded-xl bg-slate-900/60 border border-stone-800">
        {slide.body}
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-800">
        <button
          onClick={prev}
          disabled={isFirst}
          className="text-xs px-3.5 py-1.5 rounded-lg font-mono font-bold transition bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-white cursor-pointer"
        >
          ← Back
        </button>
        <button
          onClick={done}
          className="text-xs font-mono text-stone-400 hover:text-stone-200 transition cursor-pointer"
        >
          Skip
        </button>
        <button
          ref={nextBtnRef}
          onClick={next}
          className="text-xs px-5 py-1.5 rounded-lg font-black font-mono transition text-slate-950 shadow-md cursor-pointer"
          style={{ background: accent }}
        >
          {isLast ? "Got it!" : "Next →"}
        </button>
      </div>
    </Modal>
  );
}
