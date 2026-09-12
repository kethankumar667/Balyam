import { useEffect, useRef, useState } from "react";
import type { HcPhase } from "@shared/types";
import { DD } from "./doordarshan-kit";

const FX_KEYFRAMES = `
@keyframes dd-bumper-static {
  0% { opacity: 1; }
  30% { opacity: 0.15; }
  38% { opacity: 0.8; }
  46% { opacity: 0.05; }
  100% { opacity: 0; }
}
@keyframes dd-bumper-title {
  0% { opacity: 0; letter-spacing: 0.5em; }
  100% { opacity: 1; letter-spacing: 0.14em; }
}
@keyframes dd-bumper-out {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes dd-wipe-bars {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
@keyframes dd-wipe-flash {
  0%, 100% { opacity: 0; }
  10%, 30% { opacity: 0.9; }
  20% { opacity: 0.1; }
}
`;

const BUMPER_MS = 2000;
const BUMPER_FADE_MS = 400;

/**
 * The channel ident that plays once when a match is tuned into on this
 * theme — "DD NATIONAL PRESENTS · HAND CRICKET" — the same beat a real
 * broadcast opens a program with. Fires once per shell mount (switching to
 * Doordarshan re-triggers it, same as actually tuning the channel back in).
 */
export function DoordarshanBumper() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), BUMPER_MS - BUMPER_FADE_MS);
    const hideTimer = window.setTimeout(() => setVisible(false), BUMPER_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[80] flex flex-col items-center justify-center"
      style={{
        background: DD.bg0,
        animation: fading ? `dd-bumper-out ${BUMPER_FADE_MS}ms ease-out 1 forwards` : undefined,
      }}
    >
      <style>{FX_KEYFRAMES}</style>
      <div aria-hidden className="absolute inset-0" style={{ background: DD.ink, animation: "dd-bumper-static 900ms ease-out 1" }} />
      <div className="relative text-center" style={{ animation: "dd-bumper-title 900ms ease-out 1 both" }}>
        <div className="font-crt text-[15px] uppercase" style={{ color: DD.inkLo, letterSpacing: "0.3em" }}>
          DD National Presents
        </div>
        <div
          className="font-crt mt-2 text-[15vw] leading-none sm:text-[64px]"
          style={{ color: DD.amber, textShadow: "0 0 24px rgba(217,138,61,0.5)" }}
        >
          HAND CRICKET
        </div>
      </div>
    </div>
  );
}

/** Tracks `phase` and reports a short window after every change — the beat
 *  a themed glitch-wipe should render during. */
export function usePhaseGlitch(phase: HcPhase, durationMs = 360): boolean {
  const [glitching, setGlitching] = useState(false);
  const prevRef = useRef(phase);

  useEffect(() => {
    if (prevRef.current === phase) return;
    prevRef.current = phase;
    setGlitching(true);
    const t = window.setTimeout(() => setGlitching(false), durationMs);
    return () => window.clearTimeout(t);
  }, [phase, durationMs]);

  return glitching;
}

/**
 * The tracking-bar/static flash that sells a phase change as a tape cut
 * rather than an instant swap. Purely decorative (`pointer-events-none`) so
 * it never blocks the content it's covering.
 */
export function DoordarshanGlitchWipe() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[55] overflow-hidden" aria-hidden>
      <style>{FX_KEYFRAMES}</style>
      <div className="absolute inset-0" style={{ background: DD.ink, animation: "dd-wipe-flash 360ms ease-out 1" }} />
      <div
        className="absolute inset-x-0"
        style={{
          top: "20%",
          height: 10,
          background: `linear-gradient(90deg, transparent, ${DD.amber}, transparent)`,
          opacity: 0.7,
          animation: "dd-wipe-bars 360ms linear 1",
        }}
      />
      <div
        className="absolute inset-x-0"
        style={{
          top: "60%",
          height: 6,
          background: `linear-gradient(90deg, transparent, ${DD.teal}, transparent)`,
          opacity: 0.6,
          animation: "dd-wipe-bars 360ms linear 1 60ms",
        }}
      />
    </div>
  );
}
