import { useState } from "react";

const TUTORIAL_STORAGE_KEY = "wordbuilding.tutorial.completed.v1";

export function hasSeenWordBuildingTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWordBuildingTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
  } catch {
    /* localStorage unavailable — silent */
  }
}

interface Slide {
  emoji: string;
  title: string;
  body: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    emoji: "📘",
    title: "Welcome to Word Building",
    body: (
      <>
        <p>
          Take turns writing a single letter into any empty cell on the
          shared workbook page. When your letter completes a real English
          word along a row, column or diagonal, forwards or backwards, you score points equal to the word's
          length.
        </p>
        <p className="mt-2" style={{ color: "#7c2d12" }}>
          ★ The longer the word, the more marks. Build small words to set
          up big ones.
        </p>
      </>
    ),
  },
  {
    emoji: "✍️",
    title: "Your turn",
    body: (
      <>
        <p>
          When it's your turn, tap any empty cell. A dashed border shows
          your pick. Then pick a letter from the pad — or just type on
          your keyboard to preview it. Change the letter or cell freely, then press Place or Enter to confirm. Cancel or Escape discards the preview.
        </p>
        <p className="mt-2" style={{ color: "#7c2d12" }}>
          Each player writes in their own ink color so you can see who
          built which word.
        </p>
      </>
    ),
  },
  {
    emoji: "🎯",
    title: "How words score",
    body: (
      <>
        <p>
          After every letter, the engine scans all eight straight directions
          through it. The longest new 3+ letter dictionary word credits the player who completed it, even if others placed earlier letters.
        </p>
        <p className="mt-2">
          Only ONE best word scores per placement, not every crossing word.
          Equal lengths prefer row, column, downward diagonal, then upward diagonal.
          The same word scores once per match. Other letter contributors are acknowledged, not awarded points.
        </p>
        <p className="mt-2" style={{ color: "#7c2d12" }}>
          ✓ Good (3) · ✓ Well done (4) · ✓ Very Good (5) · ✓ Excellent (6+)
        </p>
      </>
    ),
  },
  {
    emoji: "🧠",
    title: "Strategy tips",
    body: (
      <>
        <ul className="list-disc pl-5 space-y-1">
          <li>Place letters near existing words — empty corners score nothing.</li>
          <li>
            Plan two moves ahead — a single letter often closes a 5- or
            6-letter word someone (maybe you) primed earlier.
          </li>
          <li>
            Common middle letters (A, E, I, R, S, T) tend to extend rows
            in multiple directions.
          </li>
          <li>
            Classic ends when the board fills. Quick Match uses an 8×8 board, 15-second turns and eight turns per seat; missed turns count. Human timeouts pass without an automatic letter. Equal highest scores are a draw.
          </li>
          <li>In Claim &amp; Vote, identify a straight word through your new letter. A strict majority of opponents must accept; silence and tied votes do not score.</li>
        </ul>
      </>
    ),
  },
  {
    emoji: "📝",
    title: "Dictionary modes",
    body: (
      <>
        <p>
          The host picks the dictionary at the lobby:
        </p>
        <p className="mt-2">
          <strong>Classroom</strong> — about 20,000 everyday English words.
          What a teacher would recognize. The default.
        </p>
        <p className="mt-1">
          <strong>Tournament</strong> — the full Scrabble dictionary
          (~275k). Includes rare entries like EDH, ABACA, CESSER. Only
          for word-game enthusiasts.
        </p>
        <p className="mt-2" style={{ color: "#7c2d12" }}>
          Ready? Start your first round and let's see what you can build.
        </p>
      </>
    ),
  },
];

export default function WordBuildingTutorialModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx] ?? SLIDES[0]!;
  const isLast = idx === SLIDES.length - 1;

  function finish() {
    markWordBuildingTutorialSeen();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={finish}
      role="dialog"
      aria-modal="true"
      aria-label="How to play Word Building"
    >
      <div
        className="relative w-full max-w-md rounded-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          // Solid cream paper first — without this, the modal renders
          // transparent because the next-line `backgroundImage` only
          // sets *image* layers and there's no fallback color (the
          // `background:` shorthand would reset background-color to
          // initial). Stacking color + image keeps the workbook page
          // behind the modal hidden so the tutorial copy actually reads.
          backgroundColor: "#fbf3df",
          backgroundImage:
            "linear-gradient(180deg, rgba(251,243,223,0) 0%, rgba(246,235,208,1) 100%), " +
            "repeating-linear-gradient(to bottom, transparent 0 26px, rgba(56,89,168,0.32) 26px 27px, transparent 27px 28px), " +
            "linear-gradient(to right, transparent 0 38px, #c2403a 38px 39px, transparent 39px 100%)",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)",
          padding: "20px 22px 16px 50px",
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
          minHeight: 320,
        }}
      >
        {/* Page number stamp */}
        <div
          className="absolute top-2 right-3 pointer-events-none"
          style={{ fontSize: 18, color: "#5a4a3a", transform: "rotate(-3deg)" }}
          aria-hidden
        >
          — {idx + 1} —
        </div>

        <div className="flex items-baseline gap-3 mb-2">
          <span style={{ fontSize: 30 }} aria-hidden>{slide.emoji}</span>
          <h2
            style={{
              fontSize: 26,
              color: "#7c2d12",
              borderBottom: "2px solid #7c2d12",
              paddingBottom: 2,
              lineHeight: 1,
              flex: 1,
            }}
          >
            {slide.title}
          </h2>
        </div>

        <div
          className="text-zinc-800 leading-relaxed dark:text-slate-200"
          style={{
            fontSize: 19,
            color: "#1f2937",
            fontFamily: "'Patrick Hand', 'Caveat', serif",
            minHeight: 180,
          }}
        >
          {slide.body}
        </div>

        {/* Slide indicator + nav */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5" aria-label="Tutorial progress">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition"
                style={{
                  width: i === idx ? 18 : 8,
                  height: 8,
                  background: i === idx ? "#7c2d12" : "rgba(124,45,18,0.3)",
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {idx > 0 && (
              <button
                onClick={() => setIdx((i) => i - 1)}
                className="rounded-md px-3 py-1.5 transition active:translate-y-px"
                style={{
                  background: "rgba(255,255,255,0.65)",
                  border: "1px solid #c2a578",
                  color: "#7c2d12",
                  fontFamily: "'Caveat', cursive",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={isLast ? finish : () => setIdx((i) => i + 1)}
              className="rounded-md px-4 py-1.5 transition active:translate-y-px"
              style={{
                background: "#7c2d12",
                color: "#fbf3df",
                fontFamily: "'Caveat', cursive",
                fontSize: 20,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {isLast ? "Let's play! ✓" : "Next →"}
            </button>
          </div>
        </div>

        {/* Skip link */}
        {!isLast && (
          <button
            onClick={finish}
            className="absolute bottom-3 left-12 underline"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: 15,
              color: "#7a6651",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}
