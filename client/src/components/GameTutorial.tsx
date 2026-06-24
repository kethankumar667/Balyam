import { useState } from "react";

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
 * `open` starts true the first time this browser opens the game; closing via
 * {@link GameTutorial} marks the key seen so it won't auto-open again. A header
 * "?" button ({@link TutorialButton}) can re-open it anytime.
 *
 * SSR/private-mode safe: if localStorage throws we simply don't auto-open.
 */
export function useTutorialGate(storageKey: string): {
  open: boolean;
  setOpen: (open: boolean) => void;
} {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) !== "1";
    } catch {
      return false;
    }
  });
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
    <div
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 overflow-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 relative"
        style={{
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
            onClick={next}
            className="text-sm px-5 py-1.5 rounded-lg font-extrabold transition text-[#2a2118]"
            style={{ background: accent }}
          >
            {isLast ? "Got it!" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
