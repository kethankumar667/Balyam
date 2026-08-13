import { useCallback, useEffect, useRef, useState } from "react";
import {
  DIR_GLYPH,
  DIR_LABEL,
  PAD_DIRS,
  WEDGE_CLIP,
  geometryOf,
  resolveDir,
  type PadDir,
} from "./quadPad";

export type { PadDir } from "./quadPad";

export interface QuadDPadProps {
  /** A sector became active. Fires once per entry, not per frame. */
  onPress: (dir: PadDir) => void;
  /** That sector stopped being active. Guaranteed to pair with `onPress`. */
  onRelease?: (dir: PadDir) => void;
  /** Ring, glyph and active-fill colour. */
  accent?: string;
  /** The two diagonals that divide the sectors. */
  divider?: string;
  /** Fraction of the radius that is an inert hub. */
  deadZone?: number;
  /** Extra classes on the (square) pad element. */
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** Floor on the rendered diameter, in px. */
  minSize?: number;
  /** Ceiling on the rendered diameter, in px. Keeps tablets sane. */
  maxSize?: number;
  /** Share of the viewport height the wheel may claim. */
  heightFraction?: number;
}

/**
 * A round four-sector pad where the whole quarter is the button.
 *
 * Two behaviours the old four-separate-buttons pads could not have:
 *
 *  • **Slide to steer.** The finger stays down and the sector under it wins,
 *    so UP → LEFT is one motion. With separate buttons, leaving one did not
 *    enter the next — you had to lift and re-aim for every turn, which in
 *    Snake is the difference between a corner taken and a wall hit.
 *  • **Nothing sticks.** Pointer capture means the release always lands on
 *    this element, and cancel/blur/unmount all release too. Space War holds a
 *    key down server-side until told otherwise; a `pointerup` delivered to
 *    some other element (finger drifts off, browser steals the gesture) left
 *    the ship flying into the wall with no way to stop it.
 *
 * Multi-touch is honoured rather than ignored: two thumbs in two sectors hold
 * two directions, which is how you fly a diagonal in Space War.
 *
 * The parent element is treated as the pad's slot — its width sizes the wheel.
 */
export default function QuadDPad({
  onPress,
  onRelease,
  accent = "#00ff88",
  divider = "#ff2a5f",
  deadZone = 0.17,
  className = "",
  ariaLabel = "Direction pad",
  disabled = false,
  minSize = 132,
  maxSize = 260,
  heightFraction = 0.26,
}: QuadDPadProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<number | null>(null);
  /** pointerId → the sector it is currently holding. */
  const pointers = useRef(new Map<number, PadDir>());
  const [active, setActive] = useState<PadDir[]>([]);

  // Callbacks arrive as fresh closures from Room.tsx on every broadcast (30
  // times a second in Space War). Reading them from a ref keeps the pointer
  // handlers stable so a re-render mid-press cannot drop the gesture.
  const pressRef = useRef(onPress);
  const releaseRef = useRef(onRelease);
  pressRef.current = onPress;
  releaseRef.current = onRelease;

  const syncActive = useCallback(() => {
    const held = new Set(pointers.current.values());
    setActive(PAD_DIRS.filter((d) => held.has(d)));
  }, []);

  /** Apply a pointer's new sector, firing only on genuine transitions. */
  const applyDir = useCallback(
    (pointerId: number, next: PadDir | null) => {
      const prev = pointers.current.get(pointerId) ?? null;
      if (prev === next) return;

      if (prev !== null) {
        pointers.current.delete(pointerId);
        // Only release the direction if no OTHER finger is still on it.
        if (![...pointers.current.values()].includes(prev)) releaseRef.current?.(prev);
      }
      if (next !== null) {
        const alreadyHeld = [...pointers.current.values()].includes(next);
        pointers.current.set(pointerId, next);
        if (!alreadyHeld) pressRef.current(next);
      }
      syncActive();
    },
    [syncActive],
  );

  const dirFor = useCallback(
    (clientX: number, clientY: number): PadDir | null => {
      const el = padRef.current;
      if (!el) return null;
      return resolveDir(geometryOf(el.getBoundingClientRect()), clientX, clientY, deadZone);
    },
    [deadZone],
  );

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    // Capture so move/up keep coming here even once the finger leaves the pad.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    applyDir(e.pointerId, dirFor(e.clientX, e.clientY));
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !pointers.current.has(e.pointerId)) return;
    e.preventDefault();
    applyDir(e.pointerId, dirFor(e.clientX, e.clientY));
  };

  const handleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    e.preventDefault();
    applyDir(e.pointerId, null);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const releaseEverything = useCallback(() => {
    for (const id of [...pointers.current.keys()]) applyDir(id, null);
  }, [applyDir]);

  // The gesture can also end somewhere the element never hears about: the app
  // is backgrounded mid-press, or the board unmounts because the run ended.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") releaseEverything();
    };
    window.addEventListener("blur", releaseEverything);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("blur", releaseEverything);
      document.removeEventListener("visibilitychange", onHide);
      releaseEverything();
    };
  }, [releaseEverything]);

  useEffect(() => {
    if (disabled) releaseEverything();
  }, [disabled, releaseEverything]);

  /**
   * Size the circle from its slot's WIDTH and the viewport height.
   *
   * Not `h-full aspect-square`, and not the slot's height either. The console
   * shells these pads live in are content-sized: the shell's own height is
   * indefinite, so percentage heights and `flex-basis: 0%` never resolve and
   * every card is simply as tall as what is inside it. Measuring the slot's
   * height therefore measures the pad's own contribution to it — each
   * measurement inflating the box that feeds the next, until the pad pushed
   * the utility row off the bottom of the screen. Removing the pad from flow
   * to break the loop just collapsed the deck to nothing instead.
   *
   * Width has no such circularity: the slot is as wide as the shell whatever
   * the pad does. Pairing it with a share of the viewport height keeps the
   * wheel big on a tall phone and out of the way on a short one.
   */
  useEffect(() => {
    const slot = padRef.current?.parentElement;
    if (!slot) return;
    const measure = () => {
      const width = slot.getBoundingClientRect().width;
      if (width <= 0) return;
      const fit = Math.min(width, window.innerHeight * heightFraction);
      setSize(Math.round(Math.max(minSize, Math.min(maxSize, fit))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [minSize, maxSize, heightFraction]);

  return (
    <div
      ref={padRef}
      role="group"
      aria-label={ariaLabel}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onLostPointerCapture={handleUp}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative shrink-0 select-none overflow-hidden rounded-full ${className}`}
      style={{
        width: size ?? minSize,
        height: size ?? minSize,
        touchAction: "none",
        background: "radial-gradient(circle at 50% 42%, #141a2c 0%, #0a0c16 68%, #05060d 100%)",
        border: `2px solid ${hexA(accent, 0.45)}`,
        boxShadow: `inset 0 0 28px rgba(0,0,0,0.92), 0 0 22px ${hexA(accent, 0.16)}`,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {/* One filled quarter per direction. These are the buttons — the glyphs
          below are only labels sitting on top of them. */}
      {PAD_DIRS.map((d) => {
        const on = active.includes(d);
        return (
          <div
            key={d}
            aria-hidden
            className="pointer-events-none absolute inset-0 transition-[background,opacity] duration-75"
            style={{
              clipPath: WEDGE_CLIP[d],
              // The lit wedge has to read at arm's length on a bright screen,
              // so it stays strong all the way out to the rim rather than
              // fading to nothing a third of the way.
              background: on
                ? `radial-gradient(circle at 50% 50%, ${hexA(accent, 0.62)} 0%, ${hexA(accent, 0.42)} 62%, ${hexA(accent, 0.24)} 100%)`
                : `radial-gradient(circle at 50% 50%, ${hexA(accent, 0.1)} 0%, transparent 72%)`,
            }}
          />
        );
      })}

      {/* The diagonals, drawn last so the lit wedge does not swallow them. */}
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <line x1="14" y1="14" x2="86" y2="86" stroke={divider} strokeWidth="2.4" opacity="0.85" />
        <line x1="86" y1="14" x2="14" y2="86" stroke={divider} strokeWidth="2.4" opacity="0.85" />
      </svg>

      {PAD_DIRS.map((d) => {
        const on = active.includes(d);
        return (
          <span
            key={`g-${d}`}
            aria-hidden
            className={`pointer-events-none absolute font-black leading-none transition-transform duration-75 ${GLYPH_POS[d]}`}
            style={{
              color: accent,
              // Sized off the measured pad, not a percentage: a percentage
              // font-size resolves against the INHERITED size, so it would
              // have been a fixed ~2px here regardless of the pad.
              fontSize: Math.round((size ?? minSize) * 0.115),
              textShadow: on ? `0 0 14px ${accent}` : `0 0 6px ${hexA(accent, 0.5)}`,
              transform: `${GLYPH_NUDGE[d]} scale(${on ? 1.18 : 1})`,
              opacity: on ? 1 : 0.78,
            }}
          >
            {DIR_GLYPH[d]}
          </span>
        );
      })}

      {/* Dead hub. Purely decorative — `resolveDir` owns the real dead zone. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 flex items-center justify-center rounded-full"
        style={{
          width: `${deadZone * 200}%`,
          height: `${deadZone * 200}%`,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, #101526 0%, #070910 100%)",
          border: `2px solid ${hexA(accent, 0.8)}`,
          boxShadow: `0 0 12px ${hexA(accent, 0.35)}`,
        }}
      >
        <span
          className="block rounded-full"
          style={{ width: "26%", height: "26%", background: accent, boxShadow: `0 0 8px ${accent}` }}
        />
      </div>

      {/* Keyboard and screen-reader access. Kept out of the pointer path so it
          cannot interfere with the sector hit-testing. */}
      <div className="pointer-events-none absolute inset-0">
        {PAD_DIRS.map((d) => (
          <button
            key={`a11y-${d}`}
            type="button"
            aria-label={DIR_LABEL[d]}
            disabled={disabled}
            onClick={() => {
              pressRef.current(d);
              releaseRef.current?.(d);
            }}
            className="sr-only"
          />
        ))}
      </div>
    </div>
  );
}

const GLYPH_POS: Record<PadDir, string> = {
  UP: "left-1/2 top-[7%]",
  RIGHT: "right-[7%] top-1/2",
  DOWN: "bottom-[7%] left-1/2",
  LEFT: "left-[7%] top-1/2",
};

const GLYPH_NUDGE: Record<PadDir, string> = {
  UP: "translateX(-50%)",
  RIGHT: "translateY(-50%)",
  DOWN: "translateX(-50%)",
  LEFT: "translateY(-50%)",
};

/** `#rrggbb` + alpha → `rgba(...)`, so one accent prop drives every layer. */
function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
