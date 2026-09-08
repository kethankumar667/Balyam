import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import type { LudoTheme } from "./settings";

/**
 * Ambient falling motif behind the desktop board, themed per `LudoTheme` —
 * the same fall+sway technique `FallingPetals.tsx` uses on the marketing
 * pages, reimplemented here (not imported) so tuning one never risks
 * regressing the other, and so it can be driven by a theme id instead of a
 * fixed petal/blossom/leaf mix.
 *
 * Sits behind the board/rails, same stacking trick as `LudoDecorBackdrop`:
 * `absolute inset-0 -z-10` on a `relative z-0` parent (the parent is
 * responsible for both classes) keeps it painted behind every real child
 * regardless of DOM order, and `pointer-events-none` keeps it inert.
 *
 * Desktop only for now — mobile's board fills the whole compact viewport
 * (the "no-scroll invariant" in LudoBoardMobile.tsx), so there is no bare
 * background for this to be seen against there.
 */

type ShapeKind = "petal" | "blossom" | "leaf" | "star" | "coin" | "ember";

const KIND_BASE: Record<ShapeKind, { size: number; duration: number; sway: number }> = {
  petal: { size: 10, duration: 5, sway: 16 },
  blossom: { size: 16, duration: 7, sway: 12 },
  leaf: { size: 12, duration: 4.5, sway: 22 },
  star: { size: 9, duration: 6, sway: 10 },
  coin: { size: 11, duration: 6.5, sway: 8 },
  ember: { size: 7, duration: 4, sway: 14 },
};

interface ThemeWeatherPreset {
  kinds: ShapeKind[];
  palette: Partial<Record<ShapeKind, string[]>>;
  count: number;
  /** Multiplier on each kind's base fall duration — >1 reads as slower/calmer. */
  speed?: number;
}

const PRESETS: Record<LudoTheme, ThemeWeatherPreset> = {
  // Warm pink/gold petals — the same "spring breeze" feel the marketing
  // pages use, which already fits Classic's own warm gold palette.
  classic: {
    kinds: ["petal", "blossom", "leaf"],
    palette: {
      petal: ["#F9A8C9", "#FDE68A", "#FCA5A5", "#FFFFFF", "#FBCFE8"],
      blossom: ["#F9A8C9", "#FFFFFF", "#FDE68A", "#FECDD3"],
      leaf: ["#A7D8A0", "#BEE3B8", "#8FCB92", "#CDE8C6"],
    },
    count: 34,
  },
  // Falling autumn leaves in sepia/tan — the notebook/aged-paper feel.
  paper: {
    kinds: ["leaf"],
    palette: { leaf: ["#B08D57", "#C9A66B", "#8C6D46", "#D8C29D", "#A9895A"] },
    count: 24,
  },
  // Neon sparkle drift — violet/magenta/cyan, matching the board's own glow.
  neon: {
    kinds: ["star"],
    palette: { star: ["#C4B5FD", "#F0ABFC", "#67E8F9", "#A78BFA", "#F5D0FE"] },
    count: 28,
  },
  // Small gold coins drifting down over the felt — a casino-table wink.
  emerald: {
    kinds: ["coin"],
    palette: { coin: ["#FDE68A", "#F5C542", "#D4AF37", "#FCD34D"] },
    count: 20,
  },
  // Cool white/blue stars, sparse and slow — "low glare" carries into the
  // weather too, so this stays a whisper, not a light show.
  midnight: {
    kinds: ["star"],
    palette: { star: ["#E2E8F0", "#94A3B8", "#CBD5E1", "#F1F5F9"] },
    count: 14,
    speed: 1.5,
  },
  // Warm embers drifting up the dusk gradient, with a few petals for variety.
  sunset: {
    kinds: ["ember", "petal"],
    palette: {
      ember: ["#FDBA74", "#FB923C", "#F472B6", "#FCA5A5"],
      petal: ["#FDBA74", "#F9A8C9", "#FCA5A5", "#FFE9C7"],
    },
    count: 26,
  },
};

function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface WeatherItem {
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

function makeItems(preset: ThemeWeatherPreset): WeatherItem[] {
  const speed = preset.speed ?? 1;
  return Array.from({ length: preset.count }, (_, id) => {
    const kind = pickFrom(preset.kinds);
    const base = KIND_BASE[kind];
    const palette = preset.palette[kind] ?? ["#FFFFFF"];
    return {
      id,
      kind,
      leftPct: Math.round(Math.random() * 96) + 2,
      size: base.size + Math.round(Math.random() * 6),
      color: pickFrom(palette),
      fallDuration: (base.duration + Math.random() * 3) * speed,
      fallDelay: Math.random() * 6,
      swayDuration: 2 + Math.random() * 2,
      swayAmplitude: base.sway + Math.random() * 10,
      rotateStart: Math.round(Math.random() * 360),
    };
  });
}

function StarShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill={color} opacity={0.85} />
    </svg>
  );
}

function CoinShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <circle cx="12" cy="12" r="10" fill={color} opacity={0.88} />
      <circle cx="12" cy="12" r="10" fill="none" stroke="#00000030" strokeWidth="1" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#00000025" strokeWidth="0.8" />
    </svg>
  );
}

function EmberShape({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", filter: "blur(0.6px)" }}
    >
      <circle cx="12" cy="12" r="6" fill={color} opacity={0.8} />
    </svg>
  );
}

function PetalShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 3C17 7 17 14 12 21C7 14 7 7 12 3Z" fill={color} opacity={0.75} />
    </svg>
  );
}

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

function LeafShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 3C18 6.5 18 14 12 21C6 14 6 6.5 12 3Z" fill={color} opacity={0.7} />
      <path d="M12 5V19" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
    </svg>
  );
}

function ItemShape({ kind, size, color }: { kind: ShapeKind; size: number; color: string }) {
  switch (kind) {
    case "blossom":
      return <BlossomShape size={size} color={color} />;
    case "leaf":
      return <LeafShape size={size} color={color} />;
    case "star":
      return <StarShape size={size} color={color} />;
    case "coin":
      return <CoinShape size={size} color={color} />;
    case "ember":
      return <EmberShape size={size} color={color} />;
    default:
      return <PetalShape size={size} color={color} />;
  }
}

export default function LudoThemeWeather({ theme }: { theme: LudoTheme }) {
  const reduce = useReducedMotion();
  // Deferred to a post-mount effect, same reasoning as FallingPetals.tsx:
  // this component is purely decorative (aria-hidden, pointer-events-none),
  // so appearing one tick after mount instead of on first paint costs
  // nothing, and keeps randomized item generation out of render.
  const [items, setItems] = useState<WeatherItem[] | null>(null);

  useEffect(() => {
    setItems(makeItems(PRESETS[theme]));
  }, [theme]);

  if (reduce || !items) return null;

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {items.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: "-8%",
            left: `${p.leftPct}%`,
            animation: `ludo-weather-fall ${p.fallDuration}s linear ${p.fallDelay}s infinite`,
            willChange: "transform, opacity",
          }}
        >
          <div
            style={
              {
                animation: `ludo-weather-sway ${p.swayDuration}s ease-in-out infinite`,
                "--weather-sway": `${p.swayAmplitude}px`,
                "--weather-rotate": `${p.rotateStart}deg`,
              } as CSSProperties
            }
          >
            <ItemShape kind={p.kind} size={p.size} color={p.color} />
          </div>
        </div>
      ))}

      <style>{`
        @keyframes ludo-weather-fall {
          0% { transform: translateY(0); opacity: 0; }
          8% { opacity: 0.8; }
          92% { opacity: 0.8; }
          100% { transform: translateY(116vh); opacity: 0; }
        }
        @keyframes ludo-weather-sway {
          0%, 100% { transform: translateX(0) rotate(var(--weather-rotate, 0deg)); }
          25% { transform: translateX(var(--weather-sway)) rotate(calc(var(--weather-rotate, 0deg) + 18deg)); }
          50% { transform: translateX(0) rotate(var(--weather-rotate, 0deg)); }
          75% { transform: translateX(calc(var(--weather-sway) * -1)) rotate(calc(var(--weather-rotate, 0deg) - 18deg)); }
        }
      `}</style>
    </div>
  );
}
