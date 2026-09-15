/* ─────────────────────────── Workbook ink palette ───────────────────────────
 *
 * Each seat gets one of four schoolroom inks the spec calls out — Reynolds
 * blue, Cello black, Hero red, plus a green ink for the fourth seat. We pick
 * the ink purely by the player's index in `state.playerOrder` so it's stable
 * across reconnects and consistent for everyone watching the board.
 */
export type Ink = {
  name: string;
  inkColor: string;
  neonColor: string;
  inkShadow: string;
  neonShadow: string;
  /** Faint background fill we paint behind a word when it scores. */
  highlight: string;
  neonHighlight: string;
};

export const INKS: Ink[] = [
  {
    name: "Reynolds Blue",
    inkColor: "#1e3a8a",
    neonColor: "#38bdf8", // Electric Sky Cyan
    inkShadow: "0 0 0.4px rgba(30,58,138,0.55)",
    neonShadow: "0 0 10px rgba(56,189,248,0.6)",
    highlight: "rgba(30,58,138,0.14)",
    neonHighlight: "rgba(56,189,248,0.22)",
  },
  {
    name: "Cello Black",
    inkColor: "#111827",
    neonColor: "#fbbf24", // Vibrant Amber Gold (Clear & readable on dark UI)
    inkShadow: "0 0 0.4px rgba(17,24,39,0.55)",
    neonShadow: "0 0 10px rgba(251,191,36,0.6)",
    highlight: "rgba(17,24,39,0.12)",
    neonHighlight: "rgba(251,191,36,0.22)",
  },
  {
    name: "Hero Red",
    inkColor: "#9b1c1c",
    neonColor: "#f43f5e", // Radiant Rose / Coral Red
    inkShadow: "0 0 0.4px rgba(155,28,28,0.55)",
    neonShadow: "0 0 10px rgba(244,63,94,0.6)",
    highlight: "rgba(155,28,28,0.14)",
    neonHighlight: "rgba(244,63,94,0.22)",
  },
  {
    name: "Camlin Green",
    inkColor: "#14532d",
    neonColor: "#34d399", // Neon Emerald Mint
    inkShadow: "0 0 0.4px rgba(20,83,45,0.55)",
    neonShadow: "0 0 10px rgba(52,211,153,0.6)",
    highlight: "rgba(20,83,45,0.14)",
    neonHighlight: "rgba(52,211,153,0.22)",
  },
];

/** Seat-index → ink, negative-safe modulo so reconnect ordering never throws. */
export function inkFor(idx: number): Ink {
  return INKS[((idx % INKS.length) + INKS.length) % INKS.length] ?? INKS[0]!;
}

/** Get context-appropriate ink color (standard ink for notebook, bright neon for dark theme). */
export function getInkDisplayColor(ink: Ink | undefined, isNeon?: boolean, fallback = "#38bdf8"): string {
  if (!ink) return fallback;
  return isNeon ? ink.neonColor : ink.inkColor;
}
