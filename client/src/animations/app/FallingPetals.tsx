import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Ambient falling-petals background — inspired by the TTD (Tirumala) online
 * queue page's spring-flower effect: petals, blossoms and leaves drift down
 * continuously behind whatever the page is showing, never in front of it and
 * never clickable.
 *
 * ── Day vs. night ──────────────────────────────────────────────────────
 * Between 7pm and 6am local device time, the mix swaps to falling snow
 * (white/pale-blue snowflakes, slower fall, gentler sway) instead of the
 * spring petal/blossom/leaf set — the same "ambient weather behind the
 * page" idea, just matching what the player would actually see out a
 * window at that hour. This is the single call site every layout page
 * already renders (`Room.tsx`, `BhalyamHome.tsx`, and friends — see the
 * grep), so the swap lives here rather than asking each of those 9 call
 * sites to pass a mode prop.
 *
 * Night also adds a second, independent layer: fixed-position twinkling
 * stars scattered across the sky. These do NOT fall — a star sliding down
 * the screen reads as a shooting star or a bug, not a night sky — so they
 * get their own opacity/scale "twinkle" keyframe instead of reusing the
 * fall+sway pair the weather items use. Day mode renders none.
 *
 * ── Staying "in the background" ───────────────────────────────────────
 * `pointer-events-none` keeps every piece out of the hit-testing tree, so it
 * can never eat a tap meant for a button underneath it. Being non-interactive
 * is not enough on its own though — a `position:fixed` layer paints ABOVE
 * ordinary static content by default (CSS's stacking rules put positioned
 * elements over non-positioned ones regardless of z-index), so this alone
 * would sit on top of page text, not behind it. The caller is responsible
 * for giving its own content wrapper `relative z-10` (see BhalyamHome.tsx and
 * Room.tsx's lobby branch) so the numeric z-index comparison — not the
 * positioned/non-positioned default — decides the stacking order.
 *
 * ── Why two nested elements per piece ─────────────────────────────────
 * The fall (vertical, `vh`-based so it always spans exactly one viewport
 * regardless of size) and the sway+spin (horizontal, small, on a shorter
 * loop) are two independent CSS animations. Both would target `transform`
 * on the same element and clobber each other; nested elements let each own
 * its own `transform` and have the parent's fall carry the child's sway
 * along with it.
 *
 * ── Three shapes, not one ───────────────────────────────────────────────
 * A single elongated teardrop, alone, reads as a balloon (narrow neck,
 * round body) rather than anything botanical. Mixing in a proper radial
 * 5-petal blossom and a veined leaf breaks that reading and gives the
 * effect the "garden breeze" variety the single shape couldn't.
 *
 * ── Cost ───────────────────────────────────────────────────────────────
 * Fixed count, computed once via `useMemo`, animated with `transform` +
 * `opacity` only (no layout, no per-frame JS) — cheap enough to leave
 * running behind a whole page. Skipped entirely under reduced motion.
 */

type ShapeKind = "petal" | "blossom" | "leaf" | "snowflake";

const PETAL_COLORS = ["#F9A8C9", "#FDE68A", "#FCA5A5", "#FFFFFF", "#FBCFE8"];
const BLOSSOM_COLORS = ["#F9A8C9", "#FFFFFF", "#FDE68A", "#FECDD3"];
const LEAF_COLORS = ["#A7D8A0", "#BEE3B8", "#8FCB92", "#CDE8C6"];
// Weighted toward visible ice-blues, not near-white — plain white read fine
// against the dark theme's navy panel but nearly vanished against the light
// theme's cream one (#FFFDF7), which is exactly where night mode is more
// likely to be seen (evening play, system still in its default light theme).
const SNOW_COLORS = ["#7DD3FC", "#38BDF8", "#BAE6FD", "#FFFFFF", "#93C5FD"];
// Warm-white/gold, not ice-blue — stars need to read as a different thing
// from the snow they share the sky with, not a fifth snow shade.
const STAR_COLORS = ["#FDE68A", "#FFFFFF", "#FEF3C7", "#FCD34D"];

// Weighted so petals still dominate — blossoms and leaves are accents.
const DAY_SHAPE_WEIGHTS: { kind: ShapeKind; weight: number }[] = [
  { kind: "petal", weight: 0.5 },
  { kind: "blossom", weight: 0.3 },
  { kind: "leaf", weight: 0.2 },
];

// Night is just snow — mixing petals in would read as a mistake, not variety.
const NIGHT_SHAPE_WEIGHTS: { kind: ShapeKind; weight: number }[] = [
  { kind: "snowflake", weight: 1 },
];

/** 7pm–6am local device time reads as "night" for this ambient effect. */
export function isNightTime(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 19 || hour < 6;
}

function pickShape(night: boolean): ShapeKind {
  const weights = night ? NIGHT_SHAPE_WEIGHTS : DAY_SHAPE_WEIGHTS;
  const r = Math.random();
  let acc = 0;
  for (const { kind, weight } of weights) {
    acc += weight;
    if (r <= acc) return kind;
  }
  return night ? "snowflake" : "petal";
}

function colorFor(kind: ShapeKind): string {
  const palette =
    kind === "blossom" ? BLOSSOM_COLORS
    : kind === "leaf" ? LEAF_COLORS
    : kind === "snowflake" ? SNOW_COLORS
    : PETAL_COLORS;
  return palette[Math.floor(Math.random() * palette.length)];
}

const ITEM_COUNT = 40;

interface FallingItem {
  id: number;
  kind: ShapeKind;
  leftPct: number;
  size: number;
  color: string;
  fallDuration: number;
  fallDelay: number;
  swayDuration: number;
  swayAmplitude: number;
  rotateStart: number;
}

function makeItems(night: boolean): FallingItem[] {
  return Array.from({ length: ITEM_COUNT }, (_, id) => {
    const kind = pickShape(night);
    // Blossoms read as "heavier" — a bit bigger and slower, with a gentler
    // sway. Leaves flutter the most; petals sit in between. Snowflakes drift
    // rather than flutter: mostly small and slow, with an occasional larger
    // "closer" flake for depth, and much less side-to-side sway than a
    // petal caught in a breeze.
    const sizeBase = kind === "blossom" ? 16 : kind === "leaf" ? 12 : kind === "snowflake" ? 5 : 10;
    const durationBase = kind === "blossom" ? 7 : kind === "leaf" ? 4.5 : kind === "snowflake" ? 8 : 5;
    const swayBase = kind === "leaf" ? 22 : kind === "blossom" ? 12 : kind === "snowflake" ? 6 : 16;
    const sizeJitter = kind === "snowflake" ? Math.round(Math.random() * 10) : Math.round(Math.random() * 8);
    return {
      id,
      kind,
      leftPct: Math.round(Math.random() * 96) + 2,
      size: sizeBase + sizeJitter,
      color: colorFor(kind),
      fallDuration: durationBase + Math.random() * 3,
      fallDelay: Math.random() * 6,
      swayDuration: 2 + Math.random() * 2,
      swayAmplitude: swayBase + Math.random() * (kind === "snowflake" ? 6 : 12),
      rotateStart: Math.round(Math.random() * 360),
    };
  });
}

const STAR_COUNT = 22;

interface TwinkleStar {
  id: number;
  topPct: number;
  leftPct: number;
  size: number;
  color: string;
  twinkleDuration: number;
  twinkleDelay: number;
}

/** Fixed positions, spread across the full viewport height — unlike the
 *  weather layer this never moves, only its own opacity/scale pulses. */
function makeStars(): TwinkleStar[] {
  return Array.from({ length: STAR_COUNT }, (_, id) => ({
    id,
    topPct: Math.round(Math.random() * 92) + 2,
    leftPct: Math.round(Math.random() * 96) + 2,
    size: 4 + Math.round(Math.random() * 6),
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    twinkleDuration: 1.8 + Math.random() * 2.4,
    twinkleDelay: Math.random() * 4,
  }));
}

/** A single elongated, symmetric petal — pointed at both ends, like a
 *  cherry-blossom petal, not the rounded-bottom "balloon" shape this
 *  started as. */
function PetalShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 3C17 7 17 14 12 21C7 14 7 7 12 3Z" fill={color} opacity={0.75} />
    </svg>
  );
}

/** A small radial 5-petal blossom with a warm center — the actual "flower"
 *  the earlier single-petal shape only gestured at. */
function BlossomShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse key={deg} cx="12" cy="7" rx="3.1" ry="5.2" fill={color} opacity={0.78} transform={`rotate(${deg} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2" fill="#F5B942" opacity={0.9} />
    </svg>
  );
}

/** A veined leaf — same pointed-oval family as the petal, in spring greens,
 *  with a faint center vein so it doesn't just read as a green petal. */
function LeafShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 3C18 6.5 18 14 12 21C6 14 6 6.5 12 3Z" fill={color} opacity={0.7} />
      <path d="M12 5V19" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
    </svg>
  );
}

/** A 6-armed snowflake — 3 spokes through the center at 60° apart, each with
 *  a small pair of side ticks, plus a center dot. Reads clearly as ice even
 *  at the small sizes this drifts at, unlike a plain dot or asterisk. */
function SnowflakeShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <g stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity={0.9}>
        {[0, 60, 120].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 12 12)`}>
            <line x1="12" y1="3" x2="12" y2="21" />
            <line x1="12" y1="7" x2="9.5" y2="5.2" />
            <line x1="12" y1="7" x2="14.5" y2="5.2" />
            <line x1="12" y1="17" x2="9.5" y2="18.8" />
            <line x1="12" y1="17" x2="14.5" y2="18.8" />
          </g>
        ))}
      </g>
      <circle cx="12" cy="12" r="1.6" fill={color} opacity={0.95} />
    </svg>
  );
}

/** A 4-point sparkle — a long vertical ray crossed with a short horizontal
 *  one, the classic "star glint" mark, distinct from the snowflake's 6-armed
 *  crystal so the two read as different things sharing one sky. */
function StarShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 1C12.6 8 13.5 10.4 23 12C13.5 13.6 12.6 16 12 23C11.4 16 10.5 13.6 1 12C10.5 10.4 11.4 8 12 1Z" />
    </svg>
  );
}

function ItemShape({ kind, size, color }: { kind: ShapeKind; size: number; color: string }) {
  if (kind === "blossom") return <BlossomShape size={size} color={color} />;
  if (kind === "leaf") return <LeafShape size={size} color={color} />;
  if (kind === "snowflake") return <SnowflakeShape size={size} color={color} />;
  return <PetalShape size={size} color={color} />;
}

export default function FallingPetals() {
  const reduce = useReducedMotion();
  /**
   * `Math.random()`-seeded, and deliberately NOT computed during the initial
   * render (server or client). Per-item left/size/color/duration/delay/sway/
   * rotation all come from `makeItems()`'s ~7 `Math.random()` calls per item
   * — evaluated once during SSR (`entry-server.tsx`'s `renderToString`) and
   * again, independently, during React's client hydration pass, producing
   * two DIFFERENT sets of 40 items' worth of mismatched inline `style`
   * attributes. That was the confirmed cause of the homepage hydration
   * mismatch (React errors #418/#423) this component was rendering directly
   * into on every page that includes it.
   *
   * The fix: both the server render and the FIRST client render produce the
   * identical, trivial output (`null`, exactly like the existing
   * reduced-motion branch below) — nothing to mismatch. The real, randomized
   * petals are generated only after mount, client-side, via `useEffect`,
   * exactly like `useReducedMotion()`'s own hydration-safe pattern. This is
   * the smallest possible client-only boundary: the component is already
   * `aria-hidden="true"` and `pointer-events-none` — purely decorative, carries
   * no SEO or accessible content — and its own fall/sway keyframes already
   * fade each item in from `opacity: 0`, so appearing one tick after mount
   * instead of on the very first paint is not a visible regression.
   */
  const [items, setItems] = useState<FallingItem[] | null>(null);
  // Night-only twinkling stars, layered under the falling snow. `null` in
  // day mode (rather than an empty array) so the render below can tell
  // "not generated yet" apart from "generated, none to show" — though in
  // practice this is always all-or-nothing with `items`, set together.
  const [stars, setStars] = useState<TwinkleStar[] | null>(null);

  useEffect(() => {
    // `isNightTime()` reads the device clock, so it's deferred to this same
    // client-only effect for the identical reason the random items are —
    // computing it during render could disagree between the server render
    // and the client's first render and reintroduce the hydration mismatch
    // described above.
    let night = isNightTime();
    setItems(makeItems(night));
    setStars(night ? makeStars() : null);

    // Re-check periodically so a session left open across the day/night
    // boundary (a long lobby wait, an idle tab) still switches over instead
    // of staying on whatever mode it happened to mount in. Only regenerates
    // when the mode actually flips — never mid-session for no reason.
    const interval = setInterval(() => {
      const nowNight = isNightTime();
      if (nowNight !== night) {
        night = nowNight;
        setItems(makeItems(night));
        setStars(night ? makeStars() : null);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (reduce || !items) return null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {stars?.map((s) => (
        <div
          key={`star-${s.id}`}
          style={{
            position: "absolute",
            top: `${s.topPct}%`,
            left: `${s.leftPct}%`,
            animation: `bhalyam-star-twinkle ${s.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
            willChange: "transform, opacity",
          }}
        >
          <StarShape size={s.size} color={s.color} />
        </div>
      ))}

      {items.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: "-8vh",
            left: `${p.leftPct}%`,
            animation: `bhalyam-petal-fall ${p.fallDuration}s linear ${p.fallDelay}s infinite`,
            willChange: "transform, opacity",
          }}
        >
          <div
            style={
              {
                animation: `bhalyam-petal-sway ${p.swayDuration}s ease-in-out infinite`,
                // Per-item sway width and starting spin via CSS custom
                // properties, so one shared @keyframes rule still gives
                // every item a different drift and rotation.
                "--petal-sway": `${p.swayAmplitude}px`,
                "--petal-rotate": `${p.rotateStart}deg`,
              } as CSSProperties
            }
          >
            <ItemShape kind={p.kind} size={p.size} color={p.color} />
          </div>
        </div>
      ))}

      <style>{`
        @keyframes bhalyam-petal-fall {
          0% { transform: translateY(0); opacity: 0; }
          8% { opacity: 0.85; }
          92% { opacity: 0.85; }
          100% { transform: translateY(116vh); opacity: 0; }
        }
        @keyframes bhalyam-petal-sway {
          0%, 100% { transform: translateX(0) rotate(var(--petal-rotate, 0deg)); }
          25% { transform: translateX(var(--petal-sway)) rotate(calc(var(--petal-rotate, 0deg) + 18deg)); }
          50% { transform: translateX(0) rotate(var(--petal-rotate, 0deg)); }
          75% { transform: translateX(calc(var(--petal-sway) * -1)) rotate(calc(var(--petal-rotate, 0deg) - 18deg)); }
        }
        @keyframes bhalyam-star-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.75); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
