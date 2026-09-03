import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Ambient falling-petals background — inspired by the TTD (Tirumala) online
 * queue page's spring-flower effect: petals, blossoms and leaves drift down
 * continuously behind whatever the page is showing, never in front of it and
 * never clickable.
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

type ShapeKind = "petal" | "blossom" | "leaf";

const PETAL_COLORS = ["#F9A8C9", "#FDE68A", "#FCA5A5", "#FFFFFF", "#FBCFE8"];
const BLOSSOM_COLORS = ["#F9A8C9", "#FFFFFF", "#FDE68A", "#FECDD3"];
const LEAF_COLORS = ["#A7D8A0", "#BEE3B8", "#8FCB92", "#CDE8C6"];

// Weighted so petals still dominate — blossoms and leaves are accents.
const SHAPE_WEIGHTS: { kind: ShapeKind; weight: number }[] = [
  { kind: "petal", weight: 0.5 },
  { kind: "blossom", weight: 0.3 },
  { kind: "leaf", weight: 0.2 },
];

function pickShape(): ShapeKind {
  const r = Math.random();
  let acc = 0;
  for (const { kind, weight } of SHAPE_WEIGHTS) {
    acc += weight;
    if (r <= acc) return kind;
  }
  return "petal";
}

function colorFor(kind: ShapeKind): string {
  const palette = kind === "blossom" ? BLOSSOM_COLORS : kind === "leaf" ? LEAF_COLORS : PETAL_COLORS;
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

function makeItems(): FallingItem[] {
  return Array.from({ length: ITEM_COUNT }, (_, id) => {
    const kind = pickShape();
    // Blossoms read as "heavier" — a bit bigger and slower, with a gentler
    // sway. Leaves flutter the most; petals sit in between.
    const sizeBase = kind === "blossom" ? 16 : kind === "leaf" ? 12 : 10;
    const durationBase = kind === "blossom" ? 7 : kind === "leaf" ? 4.5 : 5;
    const swayBase = kind === "leaf" ? 22 : kind === "blossom" ? 12 : 16;
    return {
      id,
      kind,
      leftPct: Math.round(Math.random() * 96) + 2,
      size: sizeBase + Math.round(Math.random() * 8),
      color: colorFor(kind),
      fallDuration: durationBase + Math.random() * 3,
      fallDelay: Math.random() * 6,
      swayDuration: 2 + Math.random() * 2,
      swayAmplitude: swayBase + Math.random() * 12,
      rotateStart: Math.round(Math.random() * 360),
    };
  });
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

function ItemShape({ kind, size, color }: { kind: ShapeKind; size: number; color: string }) {
  if (kind === "blossom") return <BlossomShape size={size} color={color} />;
  if (kind === "leaf") return <LeafShape size={size} color={color} />;
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

  useEffect(() => {
    setItems(makeItems());
  }, []);

  if (reduce || !items) return null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
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
      `}</style>
    </div>
  );
}
