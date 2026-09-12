import { motion, AnimatePresence } from "framer-motion";
import type { GameKind } from "@shared/types";

export type CountdownStep = 3 | 2 | 1 | "GO";

interface StepPalette {
  /** `--chip`/`--chip-dark` for the shared `.ludo-chip` glossy-sphere treatment (see index.css). */
  chip: string;
  chipDark: string;
  ring: string;
  ink: string;
  border: string;
}

/**
 * UNO's own four card colors, one per beat, escalating toward GO — a
 * player who's ever held an UNO hand recognizes this palette instantly.
 */
const UNO_PALETTE: Record<CountdownStep, StepPalette> = {
  3: { chip: "#EF5350", chipDark: "#B71C1C", ring: "#FFCDD2", ink: "#FFF5F5", border: "#FF8A80" },
  2: { chip: "#FDD835", chipDark: "#F57F17", ring: "#FFF9C4", ink: "#3E2723", border: "#FFEE58" },
  1: { chip: "#42A5F5", chipDark: "#0D47A1", ring: "#BBDEFB", ink: "#FFFFFF", border: "#64B5F6" },
  GO: { chip: "#66BB6A", chipDark: "#1B5E20", ring: "#C8E6C9", ink: "#FFFFFF", border: "#81C784" },
};

/** One rich felt-and-gold identity held constant across all four beats — a card room, not a light show. */
const RUMMY_PALETTE: StepPalette = {
  chip: "#1E7A46",
  chipDark: "#0B4227",
  ring: "#F4E3B2",
  ink: "#FFF8E1",
  border: "#D4AF37",
};

/** The existing BHALYAM amber/orange identity, for every game without its own theme. */
const GENERIC_PALETTE: StepPalette = {
  chip: "#F59E0B",
  chipDark: "#C2540A",
  ring: "#FDE68A",
  ink: "#1C1206",
  border: "#FBBF24",
};

function paletteFor(game: GameKind | undefined, step: CountdownStep): StepPalette {
  if (game === "uno") return UNO_PALETTE[step];
  if (game === "rummy") return RUMMY_PALETTE;
  return GENERIC_PALETTE;
}

export interface CountdownChromeAccent {
  /** A single steady identity for the ceremony's surrounding card — the
   *  numeral badge itself is the only thing that cycles per beat (UNO). */
  border: string;
  glow: string;
  eyebrow: string;
}

/** Exported so callers (the ceremony card wrapping this numeral) can theme their own chrome to match, without re-deriving UNO/Rummy/generic branching themselves. */
export function chromeAccentFor(game: GameKind | undefined): CountdownChromeAccent {
  if (game === "uno") return { border: "rgba(66,165,245,0.5)", glow: "rgba(66,165,245,0.2)", eyebrow: "UNO SHOWDOWN INCOMING" };
  if (game === "rummy") return { border: "rgba(212,175,55,0.5)", glow: "rgba(30,122,70,0.25)", eyebrow: "RUMMY TABLE IS LIVE" };
  return { border: "rgba(245,158,11,0.5)", glow: "rgba(245,158,11,0.2)", eyebrow: "MATCH COMMENCED" };
}

export interface CountdownNumeral3DProps {
  step: CountdownStep;
  game?: GameKind;
  /** The funny, per-game line shown under the numeral for this exact beat. */
  slogan: string;
  /** Numeral badge size in px — GameStartSequence's compact card wants smaller than the full-screen fallback. */
  size?: number;
}

/**
 * The one shared "3-2-1-GO" numeral used by both match-start ceremonies
 * (`GameStartSequence` for real, coin-staked matches — the path almost
 * every match takes — and `BhalyamMatchCountdown`, its no-commitment
 * fallback). A single visual identity regardless of which path triggers
 * it, parameterized by `game` for UNO's card-color cycle and Rummy's
 * felt-and-gold table look.
 *
 * The "3D" is a real tumble, not a flat scale: `perspective` on the
 * wrapper plus `rotateX` on the badge itself flips each numeral in from
 * one edge and out the other, like a flip-clock digit dropping into
 * place — while a glossy `.ludo-chip` sphere gives the badge itself
 * actual dimensional shading rather than a flat color fill.
 */
export default function CountdownNumeral3D({ step, game, slogan, size = 140 }: CountdownNumeral3DProps) {
  const palette = paletteFor(game, step);
  const isGo = step === "GO";

  return (
    <div className="flex flex-col items-center gap-3" style={{ perspective: 1200 }}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Impact ring — expands and fades behind each new beat, re-fires every step change via the `step` key. */}
        <AnimatePresence>
          <motion.div
            key={`ring-${step}`}
            initial={{ scale: 0.5, opacity: 0.65 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute inset-0 rounded-[28%] pointer-events-none"
            style={{ border: `3px solid ${palette.ring}` }}
            aria-hidden="true"
          />
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          <motion.div
            key={`badge-${step}`}
            data-testid="countdown-badge"
            initial={{ rotateX: -100, opacity: 0, scale: 0.65 }}
            animate={{ rotateX: 0, opacity: 1, scale: 1 }}
            exit={{ rotateX: 100, opacity: 0, scale: 0.65, transition: { duration: 0.18 } }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={
              {
                width: size,
                height: size,
                transformStyle: "preserve-3d",
                "--chip": palette.chip,
                "--chip-dark": palette.chipDark,
                borderColor: palette.border,
              } as React.CSSProperties
            }
            className="ludo-chip rounded-[28%] border-4 flex items-center justify-center shadow-[0_10px_35px_rgba(0,0,0,0.55)]"
          >
            {isGo ? (
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
                transition={{ type: "spring", stiffness: 450, damping: 16 }}
                className="font-black leading-none select-none tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                style={{
                  fontSize: size * 0.44,
                  textShadow: `0 0 24px ${palette.ring}, 0 4px 12px rgba(0,0,0,0.65)`,
                }}
              >
                GO!
              </motion.span>
            ) : (
              <span
                data-testid="countdown-numeral"
                className="font-black leading-none select-none"
                style={{ fontSize: size * 0.5, color: palette.ink, textShadow: "0 2px 6px rgba(0,0,0,0.35)" }}
              >
                {step}
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={`slogan-${step}`}
          data-testid="countdown-slogan"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -6, opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="text-sm sm:text-base font-extrabold text-center text-white drop-shadow-lg px-4 max-w-xs"
        >
          {slogan}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
