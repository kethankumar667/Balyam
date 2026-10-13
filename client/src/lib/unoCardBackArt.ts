/**
 * Procedurally drawn card backs for the Color Cards artwork collection.
 *
 * These replace sixteen bitmap backs that all carried a third party's logo.
 * Everything here is original geometry — no wordmark, no embedded raster — so
 * a back can never smuggle a brand mark in. `unoCardBackArt.test.ts` pins that.
 *
 * Each back is a data URI, which keeps every existing `kind: "image"` consumer
 * (thumbnails, preview stage, the in-game draw pile) working unchanged.
 */

const W = 200;
const H = 300;
const CX = W / 2;
const CY = H / 2;

type Motif = "burst" | "rings" | "blocks" | "stripes" | "shapes" | "prism" | "leaf" | "streak";

interface BackSpec {
  readonly id: string;
  readonly motif: Motif;
  readonly body: string;
  readonly palette: readonly string[];
}

const RYGB = ["#E53935", "#FDD835", "#43A047", "#1E88E5"] as const;
const NEON = ["#22D3EE", "#A78BFA", "#F472B6", "#FACC15"] as const;
const GOLD = ["#F5D77A", "#C9A227", "#8A6A12"] as const;

const SPECS: readonly BackSpec[] = [
  { id: "cardback_pigment_blast_uno", motif: "burst", body: "#0B0B10", palette: RYGB },
  { id: "cardback_golden_eclipse_uno", motif: "rings", body: "#0B0B10", palette: GOLD },
  { id: "cardback_retro_blocks_uno", motif: "blocks", body: "#F7F4EC", palette: RYGB },
  { id: "cardback_rainbow_swirl_uno", motif: "rings", body: "#10131C", palette: RYGB },
  { id: "cardback_action_pack_uno", motif: "blocks", body: "#0B0B10", palette: NEON },
  { id: "cardback_neon_vortex_uno", motif: "rings", body: "#06070D", palette: NEON },
  { id: "cardback_prism_shatter_uno", motif: "prism", body: "#0F0F14", palette: RYGB },
  { id: "cardback_brush_strokes_uno", motif: "stripes", body: "#FBFAF6", palette: RYGB },
  { id: "cardback_hazard_stripes_uno", motif: "stripes", body: "#0B0B10", palette: ["#FACC15", "#F59E0B"] },
  { id: "cardback_emerald_leaf_uno", motif: "leaf", body: "#06210F", palette: ["#34D399", "#10B981", "#047857"] },
  { id: "cardback_deep_blue_vortex_uno", motif: "rings", body: "#08183A", palette: ["#60A5FA", "#2563EB", "#1E40AF"] },
  { id: "cardback_crimson_vortex_uno", motif: "rings", body: "#2A0707", palette: ["#F87171", "#DC2626", "#991B1B"] },
  { id: "cardback_confetti_shapes_uno", motif: "shapes", body: "#0B0B10", palette: RYGB },
  { id: "cardback_gilded_swirl_uno", motif: "rings", body: "#120E05", palette: GOLD },
  { id: "cardback_splash_burst_uno", motif: "burst", body: "#10131C", palette: NEON },
  { id: "cardback_neon_streak_uno", motif: "streak", body: "#05060B", palette: NEON },
];

/** Small deterministic generator so a back looks identical on every device. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (palette: readonly string[], i: number): string => palette[i % palette.length];

function burst(palette: readonly string[]): string {
  const rays = 24;
  return Array.from({ length: rays }, (_, i) => {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = ((i + 0.55) / rays) * Math.PI * 2;
    const r = 210;
    const pts = `${CX},${CY} ${CX + Math.cos(a0) * r},${CY + Math.sin(a0) * r} ${CX + Math.cos(a1) * r},${CY + Math.sin(a1) * r}`;
    return `<polygon points="${pts}" fill="${pick(palette, i)}" opacity="0.85"/>`;
  }).join("");
}

function rings(palette: readonly string[]): string {
  return Array.from({ length: 7 }, (_, i) => {
    const r = 30 + i * 22;
    return `<ellipse cx="${CX}" cy="${CY}" rx="${r * 0.82}" ry="${r}" fill="none" stroke="${pick(palette, i)}" stroke-width="${7 - i * 0.5}" transform="rotate(${-24 + i * 9} ${CX} ${CY})" opacity="0.9"/>`;
  }).join("");
}

function blocks(palette: readonly string[]): string {
  const rnd = seeded(7);
  return Array.from({ length: 9 }, (_, i) => {
    const x = 14 + (i % 3) * 62 + rnd() * 10;
    const y = 18 + Math.floor(i / 3) * 92 + rnd() * 10;
    const rot = Math.round(rnd() * 50 - 25);
    return `<rect x="${x}" y="${y}" width="46" height="68" rx="9" fill="${pick(palette, i)}" transform="rotate(${rot} ${x + 23} ${y + 34})" opacity="0.92"/>`;
  }).join("");
}

function stripes(palette: readonly string[]): string {
  return Array.from({ length: 9 }, (_, i) => {
    const x = -140 + i * 46;
    return `<polygon points="${x},${H} ${x + 22},${H} ${x + 22 + H},0 ${x + H},0" fill="${pick(palette, i)}" opacity="0.9"/>`;
  }).join("");
}

function shapes(palette: readonly string[]): string {
  const rnd = seeded(31);
  return Array.from({ length: 26 }, (_, i) => {
    const x = 16 + rnd() * 168;
    const y = 16 + rnd() * 268;
    const s = 8 + rnd() * 14;
    const c = pick(palette, i);
    if (i % 3 === 0) return `<circle cx="${x}" cy="${y}" r="${s / 2}" fill="${c}"/>`;
    if (i % 3 === 1) {
      return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="2" fill="${c}" transform="rotate(${Math.round(rnd() * 80)} ${x} ${y})"/>`;
    }
    return `<polygon points="${x},${y - s} ${x + s},${y + s} ${x - s},${y + s}" fill="${c}"/>`;
  }).join("");
}

function prism(palette: readonly string[]): string {
  const rnd = seeded(19);
  const pts = Array.from({ length: 12 }, () => [rnd() * W, rnd() * H] as const);
  return pts
    .map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const r = pts[(i + 5) % pts.length];
      return `<polygon points="${p[0]},${p[1]} ${q[0]},${q[1]} ${r[0]},${r[1]}" fill="${pick(palette, i)}" opacity="0.8"/>`;
    })
    .join("");
}

function leaf(palette: readonly string[]): string {
  return Array.from({ length: 8 }, (_, i) =>
    `<ellipse cx="${CX}" cy="${CY - 62}" rx="22" ry="64" fill="${pick(palette, i)}" transform="rotate(${i * 45} ${CX} ${CY})" opacity="0.9"/>`,
  ).join("");
}

function streak(palette: readonly string[]): string {
  return Array.from({ length: 6 }, (_, i) => {
    const off = i * 12;
    return `<path d="M -10 ${40 + off * 4} C 70 ${-20 + off * 3}, 130 ${300 - off * 3}, 210 ${220 - off * 2}" fill="none" stroke="${pick(palette, i)}" stroke-width="${5 - i * 0.4}" stroke-linecap="round"/>`;
  }).join("");
}

const MOTIFS: Record<Motif, (palette: readonly string[]) => string> = {
  burst, rings, blocks, stripes, shapes, prism, leaf, streak,
};

/** A four-point rosette, so every back has a focal mark that is ours alone. */
function emblem(ink: string, rim: string): string {
  const d = `M ${CX} ${CY - 34} L ${CX + 12} ${CY - 12} L ${CX + 34} ${CY} L ${CX + 12} ${CY + 12} L ${CX} ${CY + 34} L ${CX - 12} ${CY + 12} L ${CX - 34} ${CY} L ${CX - 12} ${CY - 12} Z`;
  return `<path d="${d}" fill="${ink}" stroke="${rim}" stroke-width="5" stroke-linejoin="round"/><circle cx="${CX}" cy="${CY}" r="7" fill="${rim}"/>`;
}

function toDataUri(spec: BackSpec): string {
  const isLight = spec.body.toUpperCase().startsWith("#F");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" rx="22" fill="#FFFFFF"/>` +
    `<clipPath id="c"><rect x="9" y="9" width="${W - 18}" height="${H - 18}" rx="15"/></clipPath>` +
    `<g clip-path="url(#c)"><rect width="${W}" height="${H}" fill="${spec.body}"/>${MOTIFS[spec.motif](spec.palette)}</g>` +
    emblem(isLight ? "#17181D" : "#FFFFFF", isLight ? "#FFFFFF" : "#17181D") +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const UNO_BACK_ART_IDS: readonly string[] = SPECS.map((s) => s.id);

export const UNO_BACK_ART: Readonly<Record<string, string>> = Object.fromEntries(
  SPECS.map((s) => [s.id, toDataUri(s)]),
);
